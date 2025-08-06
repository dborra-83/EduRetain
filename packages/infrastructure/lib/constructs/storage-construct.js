"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const constructs_1 = require("constructs");
class StorageConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
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
exports.StorageConstruct = StorageConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS1jb25zdHJ1Y3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdG9yYWdlLWNvbnN0cnVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsdURBQXlDO0FBQ3pDLHVFQUF5RDtBQUN6RCw0RUFBOEQ7QUFFOUQsMkNBQXVDO0FBT3ZDLE1BQWEsZ0JBQWlCLFNBQVEsc0JBQVM7SUFJN0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUE0QjtRQUNwRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRXBDLHNCQUFzQjtRQUN0QixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ2pELFVBQVU7WUFDVixpQkFBaUIsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUNqRCxVQUFVLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVU7WUFDMUMsU0FBUyxFQUFFLEtBQUssS0FBSyxNQUFNO1lBQzNCLGFBQWEsRUFBRSxLQUFLLEtBQUssTUFBTSxDQUFDLENBQUM7Z0JBQy9CLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzFCLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUMzQixpQkFBaUIsRUFBRSxLQUFLLEtBQUssTUFBTTtZQUNuQyxjQUFjLEVBQUUsQ0FBQztvQkFDZixFQUFFLEVBQUUscUNBQXFDO29CQUN6QyxtQ0FBbUMsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBQ3pELE9BQU8sRUFBRSxJQUFJO2lCQUNkLEVBQUU7b0JBQ0QsRUFBRSxFQUFFLHNCQUFzQjtvQkFD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QUM7Z0JBQzlELE1BQU0sRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLO2dCQUNoQyxVQUFVLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsMEJBQTBCLENBQUMsQ0FBQztnQkFDMUUsT0FBTyxFQUFFLENBQUMsY0FBYyxDQUFDO2dCQUN6QixTQUFTLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxTQUFTLGdCQUFnQixDQUFDO2FBQ3JELENBQUMsQ0FBQyxDQUFDO1FBQ04sQ0FBQztRQUVELE9BQU87UUFDUCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNyRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3QyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2RCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNyRCxDQUFDO0NBQ0Y7QUF4SUQsNENBd0lDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcbmltcG9ydCAqIGFzIG9yaWdpbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XG5pbXBvcnQgKiBhcyBzM2RlcGxveSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMtZGVwbG95bWVudCc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBTdG9yYWdlQ29uc3RydWN0UHJvcHMge1xuICBzdGFnZTogc3RyaW5nO1xuICBidWNrZXROYW1lOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBTdG9yYWdlQ29uc3RydWN0IGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IGJ1Y2tldDogczMuQnVja2V0O1xuICBwdWJsaWMgcmVhZG9ubHkgZGlzdHJpYnV0aW9uOiBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbjtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogU3RvcmFnZUNvbnN0cnVjdFByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IHsgc3RhZ2UsIGJ1Y2tldE5hbWUgfSA9IHByb3BzO1xuXG4gICAgLy8gUzMgQnVja2V0IHByaW5jaXBhbFxuICAgIHRoaXMuYnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnU3RvcmFnZUJ1Y2tldCcsIHtcbiAgICAgIGJ1Y2tldE5hbWUsXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgICAgdmVyc2lvbmVkOiBzdGFnZSA9PT0gJ3Byb2QnLFxuICAgICAgcmVtb3ZhbFBvbGljeTogc3RhZ2UgPT09ICdwcm9kJyA/IFxuICAgICAgICBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBcbiAgICAgICAgY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiBzdGFnZSAhPT0gJ3Byb2QnLFxuICAgICAgbGlmZWN5Y2xlUnVsZXM6IFt7XG4gICAgICAgIGlkOiAnZGVsZXRlLWluY29tcGxldGUtbXVsdGlwYXJ0LXVwbG9hZHMnLFxuICAgICAgICBhYm9ydEluY29tcGxldGVNdWx0aXBhcnRVcGxvYWRBZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoMSksXG4gICAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICAgIH0sIHtcbiAgICAgICAgaWQ6ICdhcmNoaXZlLW9sZC12ZXJzaW9ucycsXG4gICAgICAgIGVuYWJsZWQ6IHN0YWdlID09PSAncHJvZCcsXG4gICAgICAgIG5vbmN1cnJlbnRWZXJzaW9uRXhwaXJhdGlvbjogY2RrLkR1cmF0aW9uLmRheXMoOTApXG4gICAgICB9XSxcbiAgICAgIGNvcnM6IFt7XG4gICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbXG4gICAgICAgICAgc3RhZ2UgPT09ICdwcm9kJyA/ICdodHRwczovL2VkdXJldGFpbi5jb20nIDogYGh0dHBzOi8vJHtzdGFnZX0uZWR1cmV0YWluLmNvbWAsXG4gICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsXG4gICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6NDAwMCdcbiAgICAgICAgXSxcbiAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtcbiAgICAgICAgICBzMy5IdHRwTWV0aG9kcy5HRVQsXG4gICAgICAgICAgczMuSHR0cE1ldGhvZHMuUE9TVCxcbiAgICAgICAgICBzMy5IdHRwTWV0aG9kcy5QVVQsXG4gICAgICAgICAgczMuSHR0cE1ldGhvZHMuREVMRVRFLFxuICAgICAgICAgIHMzLkh0dHBNZXRob2RzLkhFQURcbiAgICAgICAgXSxcbiAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnKiddLFxuICAgICAgICBtYXhBZ2U6IDMwMFxuICAgICAgfV1cbiAgICB9KTtcblxuICAgIC8vIE9yaWdpbiBBY2Nlc3MgSWRlbnRpdHkgcGFyYSBDbG91ZEZyb250XG4gICAgY29uc3Qgb3JpZ2luQWNjZXNzSWRlbnRpdHkgPSBuZXcgY2xvdWRmcm9udC5PcmlnaW5BY2Nlc3NJZGVudGl0eSh0aGlzLCAnT0FJJywge1xuICAgICAgY29tbWVudDogYE9BSSBmb3IgRWR1UmV0YWluICR7c3RhZ2V9YFxuICAgIH0pO1xuXG4gICAgLy8gUGVybWl0aXIgYWNjZXNvIGRlc2RlIENsb3VkRnJvbnRcbiAgICB0aGlzLmJ1Y2tldC5ncmFudFJlYWQob3JpZ2luQWNjZXNzSWRlbnRpdHkpO1xuXG4gICAgLy8gQ2xvdWRGcm9udCBEaXN0cmlidXRpb25cbiAgICB0aGlzLmRpc3RyaWJ1dGlvbiA9IG5ldyBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbih0aGlzLCAnRGlzdHJpYnV0aW9uJywge1xuICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4odGhpcy5idWNrZXQsIHtcbiAgICAgICAgICBvcmlnaW5BY2Nlc3NJZGVudGl0eVxuICAgICAgICB9KSxcbiAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0dFVF9IRUFEX09QVElPTlMsXG4gICAgICAgIGNhY2hlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQ2FjaGVkTWV0aG9kcy5DQUNIRV9HRVRfSEVBRF9PUFRJT05TLFxuICAgICAgICBjb21wcmVzczogdHJ1ZSxcbiAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRURcbiAgICAgIH0sXG4gICAgICBhZGRpdGlvbmFsQmVoYXZpb3JzOiB7XG4gICAgICAgIC8vIEFyY2hpdm9zIGVzdMOhdGljb3MgKGltw6FnZW5lcywgZG9jdW1lbnRvcylcbiAgICAgICAgJy91cGxvYWRzLyonOiB7XG4gICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih0aGlzLmJ1Y2tldCwge1xuICAgICAgICAgICAgb3JpZ2luQWNjZXNzSWRlbnRpdHlcbiAgICAgICAgICB9KSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRCxcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRF9PUFRJT05TXG4gICAgICAgIH0sXG4gICAgICAgIC8vIFRlbXBsYXRlcyBkZSBlbWFpbFxuICAgICAgICAnL3RlbXBsYXRlcy8qJzoge1xuICAgICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4odGhpcy5idWNrZXQsIHtcbiAgICAgICAgICAgIG9yaWdpbkFjY2Vzc0lkZW50aXR5XG4gICAgICAgICAgfSksXG4gICAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19ESVNBQkxFRCAvLyBUZW1wbGF0ZXMgcHVlZGVuIGNhbWJpYXJcbiAgICAgICAgfSxcbiAgICAgICAgLy8gTG9nb3MgeSBicmFuZGluZ1xuICAgICAgICAnL2JyYW5kaW5nLyonOiB7XG4gICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih0aGlzLmJ1Y2tldCwge1xuICAgICAgICAgICAgb3JpZ2luQWNjZXNzSWRlbnRpdHlcbiAgICAgICAgICB9KSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRFxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgcHJpY2VDbGFzczogc3RhZ2UgPT09ICdwcm9kJyA/IFxuICAgICAgICBjbG91ZGZyb250LlByaWNlQ2xhc3MuUFJJQ0VfQ0xBU1NfQUxMIDogXG4gICAgICAgIGNsb3VkZnJvbnQuUHJpY2VDbGFzcy5QUklDRV9DTEFTU18xMDAsXG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgY29tbWVudDogYEVkdVJldGFpbiAke3N0YWdlfSBEaXN0cmlidXRpb25gLFxuICAgICAgZGVmYXVsdFJvb3RPYmplY3Q6ICdpbmRleC5odG1sJyxcbiAgICAgIGVycm9yUmVzcG9uc2VzOiBbe1xuICAgICAgICBodHRwU3RhdHVzOiA0MDQsXG4gICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLCAvLyBQYXJhIFNQQVxuICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwMClcbiAgICAgIH1dXG4gICAgfSk7XG5cbiAgICAvLyBCdWNrZXQgcGFyYSBsb2dzIGRlIGFjY2VzbyAoc2kgZXMgcHJvZHVjY2nDs24pXG4gICAgaWYgKHN0YWdlID09PSAncHJvZCcpIHtcbiAgICAgIGNvbnN0IGxvZ3NCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdMb2dzQnVja2V0Jywge1xuICAgICAgICBidWNrZXROYW1lOiBgJHtidWNrZXROYW1lfS1sb2dzYCxcbiAgICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXG4gICAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbe1xuICAgICAgICAgIGlkOiAnZGVsZXRlLW9sZC1sb2dzJyxcbiAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgIGV4cGlyYXRpb246IGNkay5EdXJhdGlvbi5kYXlzKDkwKVxuICAgICAgICB9XVxuICAgICAgfSk7XG5cbiAgICAgIC8vIEhhYmlsaXRhciBsb2dzIGRlIGFjY2Vzb1xuICAgICAgdGhpcy5idWNrZXQuYWRkVG9SZXNvdXJjZVBvbGljeShuZXcgY2RrLmF3c19pYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBjZGsuYXdzX2lhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIHByaW5jaXBhbHM6IFtuZXcgY2RrLmF3c19pYW0uU2VydmljZVByaW5jaXBhbCgnbG9nZ2luZy5zMy5hbWF6b25hd3MuY29tJyldLFxuICAgICAgICBhY3Rpb25zOiBbJ3MzOlB1dE9iamVjdCddLFxuICAgICAgICByZXNvdXJjZXM6IFtgJHtsb2dzQnVja2V0LmJ1Y2tldEFybn0vYWNjZXNzLWxvZ3MvKmBdXG4gICAgICB9KSk7XG4gICAgfVxuXG4gICAgLy8gVGFnc1xuICAgIGNkay5UYWdzLm9mKHRoaXMuYnVja2V0KS5hZGQoJ0NvbXBvbmVudCcsICdTdG9yYWdlJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcy5idWNrZXQpLmFkZCgnU3RhZ2UnLCBzdGFnZSk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcy5kaXN0cmlidXRpb24pLmFkZCgnQ29tcG9uZW50JywgJ0NETicpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMuZGlzdHJpYnV0aW9uKS5hZGQoJ1N0YWdlJywgc3RhZ2UpO1xuICB9XG59Il19