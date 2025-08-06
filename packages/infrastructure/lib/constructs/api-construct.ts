import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export interface ApiConstructProps {
  stage: string;
  table: dynamodb.Table;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  storageBucket: s3.Bucket;
}

export class ApiConstruct extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly lambdaRole: iam.Role;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    const { stage, table, userPool, userPoolClient, storageBucket } = props;

    // IAM Role para las Lambdas
    this.lambdaRole = new iam.Role(this, 'LambdaRole', {
      roleName: `eduretain-lambda-role-${stage}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess')
      ],
      inlinePolicies: {
        'EduRetainPolicy': new iam.PolicyDocument({
          statements: [
            // DynamoDB permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
                'dynamodb:BatchGetItem',
                'dynamodb:BatchWriteItem'
              ],
              resources: [
                table.tableArn,
                `${table.tableArn}/index/*`
              ]
            }),
            // S3 permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket'
              ],
              resources: [
                storageBucket.bucketArn,
                `${storageBucket.bucketArn}/*`
              ]
            }),
            // Cognito permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'cognito-idp:AdminGetUser',
                'cognito-idp:AdminCreateUser',
                'cognito-idp:AdminUpdateUserAttributes',
                'cognito-idp:AdminDeleteUser',
                'cognito-idp:AdminListGroupsForUser',
                'cognito-idp:AdminAddUserToGroup',
                'cognito-idp:AdminRemoveUserFromGroup'
              ],
              resources: [userPool.userPoolArn]
            }),
            // Bedrock permissions (para IA)
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel'
              ],
              resources: [
                `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`
              ]
            }),
            // SES permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ses:SendEmail',
                'ses:SendRawEmail',
                'ses:SendBulkTemplatedEmail'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    // Variables de entorno comunes
    const commonEnvironment = {
      TABLE_NAME: table.tableName,
      USER_POOL_ID: userPool.userPoolId,
      USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      STORAGE_BUCKET: storageBucket.bucketName,
      STAGE: stage,
      REGION: cdk.Stack.of(this).region
    };

    // API Gateway
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: `eduretain-api-${stage}`,
      description: `EduRetain API - Stage: ${stage}`,
      defaultCorsPreflightOptions: {
        allowOrigins: [
          stage === 'prod' ? 'https://eduretain.com' : `https://${stage}.eduretain.com`,
          'http://localhost:3000',
          'http://localhost:4000'
        ],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token'
        ]
      },
      deployOptions: {
        stageName: stage,
        tracingEnabled: true,
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: stage !== 'prod',
        throttlingRateLimit: stage === 'prod' ? 1000 : 100,
        throttlingBurstLimit: stage === 'prod' ? 2000 : 200
      }
    });

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [userPool],
      authorizerName: `eduretain-authorizer-${stage}`,
      identitySource: 'method.request.header.Authorization'
    });

    // Lambda Functions
    const functions = this.createLambdaFunctions(commonEnvironment);

    // API Routes
    this.createApiRoutes(authorizer, functions);

    // Tags
    cdk.Tags.of(this.api).add('Component', 'API');
    cdk.Tags.of(this.api).add('Stage', stage);
  }

  private createLambdaFunctions(environment: Record<string, string>) {
    const lambdaProps: Partial<nodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment,
      role: this.lambdaRole,
      tracing: lambda.Tracing.ACTIVE,
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2020',
        externalModules: ['aws-sdk', '@aws-sdk/*'],
        forceDockerBundling: false
      }
    };

    return {
      // Auth functions
      authHandler: new nodejs.NodejsFunction(this, 'AuthHandler', {
        ...lambdaProps,
        entry: path.join(__dirname, '../../../backend/src/handlers/auth.ts'),
        functionName: `eduretain-auth-${environment.STAGE}`
      }),

      // Universidad functions
      universidadHandler: new nodejs.NodejsFunction(this, 'UniversidadHandler', {
        ...lambdaProps,
        entry: path.join(__dirname, '../../../backend/src/handlers/universidad.ts'),
        functionName: `eduretain-universidad-${environment.STAGE}`
      }),

      // Facultad functions
      facultadHandler: new nodejs.NodejsFunction(this, 'FacultadHandler', {
        ...lambdaProps,
        entry: path.join(__dirname, '../../../backend/src/handlers/facultad.ts'),
        functionName: `eduretain-facultad-${environment.STAGE}`
      }),

      // Carrera functions
      carreraHandler: new nodejs.NodejsFunction(this, 'CarreraHandler', {
        ...lambdaProps,
        entry: path.join(__dirname, '../../../backend/src/handlers/carrera.ts'),
        functionName: `eduretain-carrera-${environment.STAGE}`
      }),

      // Alumno functions
      alumnoHandler: new nodejs.NodejsFunction(this, 'AlumnoHandler', {
        ...lambdaProps,
        entry: path.join(__dirname, '../../../backend/src/handlers/alumno.ts'),
        functionName: `eduretain-alumno-${environment.STAGE}`,
        timeout: cdk.Duration.seconds(60), // Más tiempo para importaciones
        memorySize: 512
      }),

      // Campaña functions
      campanaHandler: new nodejs.NodejsFunction(this, 'CampanaHandler', {
        ...lambdaProps,
        entry: path.join(__dirname, '../../../backend/src/handlers/campana.ts'),
        functionName: `eduretain-campana-${environment.STAGE}`,
        timeout: cdk.Duration.seconds(60),
        memorySize: 512
      }),

      // IA Prediction functions
      predictionHandler: new nodejs.NodejsFunction(this, 'PredictionHandler', {
        ...lambdaProps,
        entry: path.join(__dirname, '../../../backend/src/handlers/prediction.ts'),
        functionName: `eduretain-prediction-${environment.STAGE}`,
        timeout: cdk.Duration.seconds(60),
        memorySize: 1024
      }),

      // Dashboard functions
      dashboardHandler: new nodejs.NodejsFunction(this, 'DashboardHandler', {
        ...lambdaProps,
        entry: path.join(__dirname, '../../../backend/src/handlers/dashboard.ts'),
        functionName: `eduretain-dashboard-${environment.STAGE}`
      }),

      // Upload functions
      uploadHandler: new nodejs.NodejsFunction(this, 'UploadHandler', {
        ...lambdaProps,
        entry: path.join(__dirname, '../../../backend/src/handlers/upload.ts'),
        functionName: `eduretain-upload-${environment.STAGE}`,
        timeout: cdk.Duration.seconds(60),
        memorySize: 512
      })
    };
  }

  private createApiRoutes(
    authorizer: apigateway.CognitoUserPoolsAuthorizer,
    functions: Record<string, nodejs.NodejsFunction>
  ) {
    // API versioning
    const v1 = this.api.root.addResource('v1');

    // Auth routes (no auth required)
    const auth = v1.addResource('auth');
    auth.addMethod('POST', new apigateway.LambdaIntegration(functions.authHandler));

    // Universidad routes
    const universidades = v1.addResource('universidades');
    universidades.addMethod('GET', new apigateway.LambdaIntegration(functions.universidadHandler), {
      authorizer
    });
    universidades.addMethod('POST', new apigateway.LambdaIntegration(functions.universidadHandler), {
      authorizer
    });
    
    const universidad = universidades.addResource('{id}');
    universidad.addMethod('GET', new apigateway.LambdaIntegration(functions.universidadHandler), {
      authorizer
    });
    universidad.addMethod('PUT', new apigateway.LambdaIntegration(functions.universidadHandler), {
      authorizer
    });
    universidad.addMethod('DELETE', new apigateway.LambdaIntegration(functions.universidadHandler), {
      authorizer
    });

    // Facultad routes
    const facultades = v1.addResource('facultades');
    facultades.addMethod('GET', new apigateway.LambdaIntegration(functions.facultadHandler), {
      authorizer
    });
    facultades.addMethod('POST', new apigateway.LambdaIntegration(functions.facultadHandler), {
      authorizer
    });
    
    const facultad = facultades.addResource('{id}');
    facultad.addMethod('GET', new apigateway.LambdaIntegration(functions.facultadHandler), {
      authorizer
    });
    facultad.addMethod('PUT', new apigateway.LambdaIntegration(functions.facultadHandler), {
      authorizer
    });
    facultad.addMethod('DELETE', new apigateway.LambdaIntegration(functions.facultadHandler), {
      authorizer
    });

    // Carrera routes
    const carreras = v1.addResource('carreras');
    carreras.addMethod('GET', new apigateway.LambdaIntegration(functions.carreraHandler), {
      authorizer
    });
    carreras.addMethod('POST', new apigateway.LambdaIntegration(functions.carreraHandler), {
      authorizer
    });
    
    const carrera = carreras.addResource('{id}');
    carrera.addMethod('GET', new apigateway.LambdaIntegration(functions.carreraHandler), {
      authorizer
    });
    carrera.addMethod('PUT', new apigateway.LambdaIntegration(functions.carreraHandler), {
      authorizer
    });
    carrera.addMethod('DELETE', new apigateway.LambdaIntegration(functions.carreraHandler), {
      authorizer
    });

    // Alumno routes
    const alumnos = v1.addResource('alumnos');
    alumnos.addMethod('GET', new apigateway.LambdaIntegration(functions.alumnoHandler), {
      authorizer
    });
    alumnos.addMethod('POST', new apigateway.LambdaIntegration(functions.alumnoHandler), {
      authorizer
    });
    
    const alumno = alumnos.addResource('{cedula}');
    alumno.addMethod('GET', new apigateway.LambdaIntegration(functions.alumnoHandler), {
      authorizer
    });
    alumno.addMethod('PUT', new apigateway.LambdaIntegration(functions.alumnoHandler), {
      authorizer
    });
    alumno.addMethod('DELETE', new apigateway.LambdaIntegration(functions.alumnoHandler), {
      authorizer
    });

    // Importación masiva
    const importar = alumnos.addResource('importar');
    importar.addMethod('POST', new apigateway.LambdaIntegration(functions.alumnoHandler), {
      authorizer
    });

    // Campaña routes
    const campanas = v1.addResource('campanas');
    campanas.addMethod('GET', new apigateway.LambdaIntegration(functions.campanaHandler), {
      authorizer
    });
    campanas.addMethod('POST', new apigateway.LambdaIntegration(functions.campanaHandler), {
      authorizer
    });
    
    const campana = campanas.addResource('{id}');
    campana.addMethod('GET', new apigateway.LambdaIntegration(functions.campanaHandler), {
      authorizer
    });
    campana.addMethod('PUT', new apigateway.LambdaIntegration(functions.campanaHandler), {
      authorizer
    });
    campana.addMethod('DELETE', new apigateway.LambdaIntegration(functions.campanaHandler), {
      authorizer
    });

    // Enviar campaña
    const enviar = campana.addResource('enviar');
    enviar.addMethod('POST', new apigateway.LambdaIntegration(functions.campanaHandler), {
      authorizer
    });

    // Tracking de campaña
    const tracking = campana.addResource('tracking');
    tracking.addMethod('GET', new apigateway.LambdaIntegration(functions.campanaHandler), {
      authorizer
    });

    // Prediction routes
    const predictions = v1.addResource('predictions');
    const predict = predictions.addResource('predict');
    predict.addMethod('POST', new apigateway.LambdaIntegration(functions.predictionHandler), {
      authorizer
    });

    const batch = predictions.addResource('batch');
    batch.addMethod('POST', new apigateway.LambdaIntegration(functions.predictionHandler), {
      authorizer
    });

    // Dashboard routes
    const dashboard = v1.addResource('dashboard');
    dashboard.addMethod('GET', new apigateway.LambdaIntegration(functions.dashboardHandler), {
      authorizer
    });

    const metricas = dashboard.addResource('metricas');
    metricas.addMethod('GET', new apigateway.LambdaIntegration(functions.dashboardHandler), {
      authorizer
    });

    // Upload routes
    const uploads = v1.addResource('uploads');
    const presignedUrl = uploads.addResource('presigned-url');
    presignedUrl.addMethod('POST', new apigateway.LambdaIntegration(functions.uploadHandler), {
      authorizer
    });
  }
}