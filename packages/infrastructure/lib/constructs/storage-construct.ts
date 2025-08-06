import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export interface StorageConstructProps {
  stage: string;
  bucketName: string;
}

export class StorageConstruct extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: StorageConstructProps) {
    super(scope, id);

    const { stage, bucketName } = props;

    // S3 Bucket principal
    this.bucket = new s3.Bucket(this, 'StorageBucket', {
      bucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: stage === 'prod',
      removalPolicy: stage === 'prod' ? 
        cdk.RemovalPolicy.RETAIN : 
        cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: stage !== 'prod',
      lifecycleRules: [{
        id: 'delete-incomplete-multipart-uploads',
        abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        enabled: true
      }, {
        id: 'archive-old-versions',
        enabled: stage === 'prod',
        noncurrentVersionExpiration: cdk.Duration.days(90)
      }],
      cors: [{
        allowedOrigins: [
          stage === 'prod' ? 'https://eduretain.com' : `https://${stage}.eduretain.com`,
          'http://localhost:3000',
          'http://localhost:4000'
        ],
        allowedMethods: [
          s3.HttpMethods.GET,
          s3.HttpMethods.POST,
          s3.HttpMethods.PUT,
          s3.HttpMethods.DELETE,
          s3.HttpMethods.HEAD
        ],
        allowedHeaders: ['*'],
        maxAge: 300
      }]
    });

    // Origin Access Identity para CloudFront
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for EduRetain ${stage}`
    });

    // Permitir acceso desde CloudFront
    this.bucket.grantRead(originAccessIdentity);

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
      },
      additionalBehaviors: {
        // Archivos estáticos (imágenes, documentos)
        '/uploads/*': {
          origin: new origins.S3Origin(this.bucket, {
            originAccessIdentity
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS
        },
        // Templates de email
        '/templates/*': {
          origin: new origins.S3Origin(this.bucket, {
            originAccessIdentity
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED // Templates pueden cambiar
        },
        // Logos y branding
        '/branding/*': {
          origin: new origins.S3Origin(this.bucket, {
            originAccessIdentity
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
        }
      },
      priceClass: stage === 'prod' ? 
        cloudfront.PriceClass.PRICE_CLASS_ALL : 
        cloudfront.PriceClass.PRICE_CLASS_100,
      enabled: true,
      comment: `EduRetain ${stage} Distribution`,
      defaultRootObject: 'index.html',
      errorResponses: [{
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: '/index.html', // Para SPA
        ttl: cdk.Duration.seconds(300)
      }]
    });

    // Bucket para logs de acceso (si es producción)
    if (stage === 'prod') {
      const logsBucket = new s3.Bucket(this, 'LogsBucket', {
        bucketName: `${bucketName}-logs`,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption: s3.BucketEncryption.S3_MANAGED,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        lifecycleRules: [{
          id: 'delete-old-logs',
          enabled: true,
          expiration: cdk.Duration.days(90)
        }]
      });

      // Habilitar logs de acceso
      this.bucket.addToResourcePolicy(new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        principals: [new cdk.aws_iam.ServicePrincipal('logging.s3.amazonaws.com')],
        actions: ['s3:PutObject'],
        resources: [`${logsBucket.bucketArn}/access-logs/*`]
      }));
    }

    // Tags
    cdk.Tags.of(this.bucket).add('Component', 'Storage');
    cdk.Tags.of(this.bucket).add('Stage', stage);
    cdk.Tags.of(this.distribution).add('Component', 'CDN');
    cdk.Tags.of(this.distribution).add('Stage', stage);
  }
}