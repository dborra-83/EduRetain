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
exports.ApiConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const nodejs = __importStar(require("aws-cdk-lib/aws-lambda-nodejs"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const constructs_1 = require("constructs");
const path = __importStar(require("path"));
class ApiConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
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
    createLambdaFunctions(environment) {
        const lambdaProps = {
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
    createApiRoutes(authorizer, functions) {
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
exports.ApiConstruct = ApiConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLWNvbnN0cnVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFwaS1jb25zdHJ1Y3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHVFQUF5RDtBQUN6RCwrREFBaUQ7QUFDakQsc0VBQXdEO0FBSXhELHlEQUEyQztBQUMzQywyQ0FBdUM7QUFDdkMsMkNBQTZCO0FBVTdCLE1BQWEsWUFBYSxTQUFRLHNCQUFTO0lBSXpDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBd0I7UUFDaEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUV4RSw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNqRCxRQUFRLEVBQUUseUJBQXlCLEtBQUssRUFBRTtZQUMxQyxTQUFTLEVBQUUsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsc0JBQXNCLENBQUM7WUFDM0QsZUFBZSxFQUFFO2dCQUNmLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsMENBQTBDLENBQUM7Z0JBQ3RGLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsMEJBQTBCLENBQUM7YUFDdkU7WUFDRCxjQUFjLEVBQUU7Z0JBQ2QsaUJBQWlCLEVBQUUsSUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDO29CQUN4QyxVQUFVLEVBQUU7d0JBQ1YsdUJBQXVCO3dCQUN2QixJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7NEJBQ3RCLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7NEJBQ3hCLE9BQU8sRUFBRTtnQ0FD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SyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLEVBQUU7WUFDckYsVUFBVTtTQUNYLENBQUMsQ0FBQztRQUVILG1CQUFtQjtRQUNuQixNQUFNLFNBQVMsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzlDLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1lBQ3ZGLFVBQVU7U0FDWCxDQUFDLENBQUM7UUFFSCxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ25ELFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1lBQ3RGLFVBQVU7U0FDWCxDQUFDLENBQUM7UUFFSCxnQkFBZ0I7UUFDaEIsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMxQyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQzFELFlBQVksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsRUFBRTtZQUN4RixVQUFVO1NBQ1gsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBL1lELG9DQStZQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5JztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIG5vZGVqcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcyc7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFwaUNvbnN0cnVjdFByb3BzIHtcbiAgc3RhZ2U6IHN0cmluZztcbiAgdGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICB1c2VyUG9vbDogY29nbml0by5Vc2VyUG9vbDtcbiAgdXNlclBvb2xDbGllbnQ6IGNvZ25pdG8uVXNlclBvb2xDbGllbnQ7XG4gIHN0b3JhZ2VCdWNrZXQ6IHMzLkJ1Y2tldDtcbn1cblxuZXhwb3J0IGNsYXNzIEFwaUNvbnN0cnVjdCBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSBhcGk6IGFwaWdhdGV3YXkuUmVzdEFwaTtcbiAgcHVibGljIHJlYWRvbmx5IGxhbWJkYVJvbGU6IGlhbS5Sb2xlO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBBcGlDb25zdHJ1Y3RQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCB7IHN0YWdlLCB0YWJsZSwgdXNlclBvb2wsIHVzZXJQb29sQ2xpZW50LCBzdG9yYWdlQnVja2V0IH0gPSBwcm9wcztcblxuICAgIC8vIElBTSBSb2xlIHBhcmEgbGFzIExhbWJkYXNcbiAgICB0aGlzLmxhbWJkYVJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0xhbWJkYVJvbGUnLCB7XG4gICAgICByb2xlTmFtZTogYGVkdXJldGFpbi1sYW1iZGEtcm9sZS0ke3N0YWdlfWAsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnKSxcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBV1NYUmF5RGFlbW9uV3JpdGVBY2Nlc3MnKVxuICAgICAgXSxcbiAgICAgIGlubGluZVBvbGljaWVzOiB7XG4gICAgICAgICdFZHVSZXRhaW5Qb2xpY3knOiBuZXcgaWFtLlBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgICAgICAvLyBEeW5hbW9EQiBwZXJtaXNzaW9uc1xuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6R2V0SXRlbScsXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOlB1dEl0ZW0nLFxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpVcGRhdGVJdGVtJyxcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6RGVsZXRlSXRlbScsXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOlF1ZXJ5JyxcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6U2NhbicsXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOkJhdGNoR2V0SXRlbScsXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOkJhdGNoV3JpdGVJdGVtJ1xuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgICB0YWJsZS50YWJsZUFybixcbiAgICAgICAgICAgICAgICBgJHt0YWJsZS50YWJsZUFybn0vaW5kZXgvKmBcbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAvLyBTMyBwZXJtaXNzaW9uc1xuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAnczM6R2V0T2JqZWN0JyxcbiAgICAgICAgICAgICAgICAnczM6UHV0T2JqZWN0JyxcbiAgICAgICAgICAgICAgICAnczM6RGVsZXRlT2JqZWN0JyxcbiAgICAgICAgICAgICAgICAnczM6TGlzdEJ1Y2tldCdcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgICAgICAgc3RvcmFnZUJ1Y2tldC5idWNrZXRBcm4sXG4gICAgICAgICAgICAgICAgYCR7c3RvcmFnZUJ1Y2tldC5idWNrZXRBcm59LypgXG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgLy8gQ29nbml0byBwZXJtaXNzaW9uc1xuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAnY29nbml0by1pZHA6QWRtaW5HZXRVc2VyJyxcbiAgICAgICAgICAgICAgICAnY29nbml0by1pZHA6QWRtaW5DcmVhdGVVc2VyJyxcbiAgICAgICAgICAgICAgICAnY29nbml0by1pZHA6QWRtaW5VcGRhdGVVc2VyQXR0cmlidXRlcycsXG4gICAgICAgICAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluRGVsZXRlVXNlcicsXG4gICAgICAgICAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluTGlzdEdyb3Vwc0ZvclVzZXInLFxuICAgICAgICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkFkZFVzZXJUb0dyb3VwJyxcbiAgICAgICAgICAgICAgICAnY29nbml0by1pZHA6QWRtaW5SZW1vdmVVc2VyRnJvbUdyb3VwJ1xuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICByZXNvdXJjZXM6IFt1c2VyUG9vbC51c2VyUG9vbEFybl1cbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgLy8gQmVkcm9jayBwZXJtaXNzaW9ucyAocGFyYSBJQSlcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWwnXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgICAgIGBhcm46YXdzOmJlZHJvY2s6JHtjZGsuU3RhY2sub2YodGhpcykucmVnaW9ufTo6Zm91bmRhdGlvbi1tb2RlbC9hbnRocm9waWMuY2xhdWRlLTMtNS1zb25uZXQtMjAyNDEwMjItdjI6MGBcbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAvLyBTRVMgcGVybWlzc2lvbnNcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgJ3NlczpTZW5kRW1haWwnLFxuICAgICAgICAgICAgICAgICdzZXM6U2VuZFJhd0VtYWlsJyxcbiAgICAgICAgICAgICAgICAnc2VzOlNlbmRCdWxrVGVtcGxhdGVkRW1haWwnXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIHJlc291cmNlczogWycqJ11cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgXVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gVmFyaWFibGVzIGRlIGVudG9ybm8gY29tdW5lc1xuICAgIGNvbnN0IGNvbW1vbkVudmlyb25tZW50ID0ge1xuICAgICAgVEFCTEVfTkFNRTogdGFibGUudGFibGVOYW1lLFxuICAgICAgVVNFUl9QT09MX0lEOiB1c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgVVNFUl9QT09MX0NMSUVOVF9JRDogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcbiAgICAgIFNUT1JBR0VfQlVDS0VUOiBzdG9yYWdlQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBTVEFHRTogc3RhZ2UsXG4gICAgICBSRUdJT046IGNkay5TdGFjay5vZih0aGlzKS5yZWdpb25cbiAgICB9O1xuXG4gICAgLy8gQVBJIEdhdGV3YXlcbiAgICB0aGlzLmFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ0FwaScsIHtcbiAgICAgIHJlc3RBcGlOYW1lOiBgZWR1cmV0YWluLWFwaS0ke3N0YWdlfWAsXG4gICAgICBkZXNjcmlwdGlvbjogYEVkdVJldGFpbiBBUEkgLSBTdGFnZTogJHtzdGFnZX1gLFxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogW1xuICAgICAgICAgIHN0YWdlID09PSAncHJvZCcgPyAnaHR0cHM6Ly9lZHVyZXRhaW4uY29tJyA6IGBodHRwczovLyR7c3RhZ2V9LmVkdXJldGFpbi5jb21gLFxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLFxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjQwMDAnXG4gICAgICAgIF0sXG4gICAgICAgIGFsbG93TWV0aG9kczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9NRVRIT0RTLFxuICAgICAgICBhbGxvd0hlYWRlcnM6IFtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJyxcbiAgICAgICAgICAnWC1BbXotRGF0ZScsXG4gICAgICAgICAgJ0F1dGhvcml6YXRpb24nLFxuICAgICAgICAgICdYLUFwaS1LZXknLFxuICAgICAgICAgICdYLUFtei1TZWN1cml0eS1Ub2tlbidcbiAgICAgICAgXVxuICAgICAgfSxcbiAgICAgIGRlcGxveU9wdGlvbnM6IHtcbiAgICAgICAgc3RhZ2VOYW1lOiBzdGFnZSxcbiAgICAgICAgdHJhY2luZ0VuYWJsZWQ6IHRydWUsXG4gICAgICAgIG1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICBsb2dnaW5nTGV2ZWw6IGFwaWdhdGV3YXkuTWV0aG9kTG9nZ2luZ0xldmVsLklORk8sXG4gICAgICAgIGRhdGFUcmFjZUVuYWJsZWQ6IHN0YWdlICE9PSAncHJvZCcsXG4gICAgICAgIHRocm90dGxpbmdSYXRlTGltaXQ6IHN0YWdlID09PSAncHJvZCcgPyAxMDAwIDogMTAwLFxuICAgICAgICB0aHJvdHRsaW5nQnVyc3RMaW1pdDogc3RhZ2UgPT09ICdwcm9kJyA/IDIwMDAgOiAyMDBcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIENvZ25pdG8gQXV0aG9yaXplclxuICAgIGNvbnN0IGF1dGhvcml6ZXIgPSBuZXcgYXBpZ2F0ZXdheS5Db2duaXRvVXNlclBvb2xzQXV0aG9yaXplcih0aGlzLCAnQXV0aG9yaXplcicsIHtcbiAgICAgIGNvZ25pdG9Vc2VyUG9vbHM6IFt1c2VyUG9vbF0sXG4gICAgICBhdXRob3JpemVyTmFtZTogYGVkdXJldGFpbi1hdXRob3JpemVyLSR7c3RhZ2V9YCxcbiAgICAgIGlkZW50aXR5U291cmNlOiAnbWV0aG9kLnJlcXVlc3QuaGVhZGVyLkF1dGhvcml6YXRpb24nXG4gICAgfSk7XG5cbiAgICAvLyBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgZnVuY3Rpb25zID0gdGhpcy5jcmVhdGVMYW1iZGFGdW5jdGlvbnMoY29tbW9uRW52aXJvbm1lbnQpO1xuXG4gICAgLy8gQVBJIFJvdXRlc1xuICAgIHRoaXMuY3JlYXRlQXBpUm91dGVzKGF1dGhvcml6ZXIsIGZ1bmN0aW9ucyk7XG5cbiAgICAvLyBUYWdzXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hcGkpLmFkZCgnQ29tcG9uZW50JywgJ0FQSScpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMuYXBpKS5hZGQoJ1N0YWdlJywgc3RhZ2UpO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVMYW1iZGFGdW5jdGlvbnMoZW52aXJvbm1lbnQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pIHtcbiAgICBjb25zdCBsYW1iZGFQcm9wczogUGFydGlhbDxub2RlanMuTm9kZWpzRnVuY3Rpb25Qcm9wcz4gPSB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgIGVudmlyb25tZW50LFxuICAgICAgcm9sZTogdGhpcy5sYW1iZGFSb2xlLFxuICAgICAgdHJhY2luZzogbGFtYmRhLlRyYWNpbmcuQUNUSVZFLFxuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxuICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgIHRhcmdldDogJ2VzMjAyMCcsXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydhd3Mtc2RrJywgJ0Bhd3Mtc2RrLyonXSxcbiAgICAgICAgZm9yY2VEb2NrZXJCdW5kbGluZzogZmFsc2VcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIC8vIEF1dGggZnVuY3Rpb25zXG4gICAgICBhdXRoSGFuZGxlcjogbmV3IG5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnQXV0aEhhbmRsZXInLCB7XG4gICAgICAgIC4uLmxhbWJkYVByb3BzLFxuICAgICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL2JhY2tlbmQvc3JjL2hhbmRsZXJzL2F1dGgudHMnKSxcbiAgICAgICAgZnVuY3Rpb25OYW1lOiBgZWR1cmV0YWluLWF1dGgtJHtlbnZpcm9ubWVudC5TVEFHRX1gXG4gICAgICB9KSxcblxuICAgICAgLy8gVW5pdmVyc2lkYWQgZnVuY3Rpb25zXG4gICAgICB1bml2ZXJzaWRhZEhhbmRsZXI6IG5ldyBub2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ1VuaXZlcnNpZGFkSGFuZGxlcicsIHtcbiAgICAgICAgLi4ubGFtYmRhUHJvcHMsXG4gICAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vYmFja2VuZC9zcmMvaGFuZGxlcnMvdW5pdmVyc2lkYWQudHMnKSxcbiAgICAgICAgZnVuY3Rpb25OYW1lOiBgZWR1cmV0YWluLXVuaXZlcnNpZGFkLSR7ZW52aXJvbm1lbnQuU1RBR0V9YFxuICAgICAgfSksXG5cbiAgICAgIC8vIEZhY3VsdGFkIGZ1bmN0aW9uc1xuICAgICAgZmFjdWx0YWRIYW5kbGVyOiBuZXcgbm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdGYWN1bHRhZEhhbmRsZXInLCB7XG4gICAgICAgIC4uLmxhbWJkYVByb3BzLFxuICAgICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL2JhY2tlbmQvc3JjL2hhbmRsZXJzL2ZhY3VsdGFkLnRzJyksXG4gICAgICAgIGZ1bmN0aW9uTmFtZTogYGVkdXJldGFpbi1mYWN1bHRhZC0ke2Vudmlyb25tZW50LlNUQUdFfWBcbiAgICAgIH0pLFxuXG4gICAgICAvLyBDYXJyZXJhIGZ1bmN0aW9uc1xuICAgICAgY2FycmVyYUhhbmRsZXI6IG5ldyBub2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0NhcnJlcmFIYW5kbGVyJywge1xuICAgICAgICAuLi5sYW1iZGFQcm9wcyxcbiAgICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9iYWNrZW5kL3NyYy9oYW5kbGVycy9jYXJyZXJhLnRzJyksXG4gICAgICAgIGZ1bmN0aW9uTmFtZTogYGVkdXJldGFpbi1jYXJyZXJhLSR7ZW52aXJvbm1lbnQuU1RBR0V9YFxuICAgICAgfSksXG5cbiAgICAgIC8vIEFsdW1ubyBmdW5jdGlvbnNcbiAgICAgIGFsdW1ub0hhbmRsZXI6IG5ldyBub2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0FsdW1ub0hhbmRsZXInLCB7XG4gICAgICAgIC4uLmxhbWJkYVByb3BzLFxuICAgICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL2JhY2tlbmQvc3JjL2hhbmRsZXJzL2FsdW1uby50cycpLFxuICAgICAgICBmdW5jdGlvbk5hbWU6IGBlZHVyZXRhaW4tYWx1bW5vLSR7ZW52aXJvbm1lbnQuU1RBR0V9YCxcbiAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLCAvLyBNw6FzIHRpZW1wbyBwYXJhIGltcG9ydGFjaW9uZXNcbiAgICAgICAgbWVtb3J5U2l6ZTogNTEyXG4gICAgICB9KSxcblxuICAgICAgLy8gQ2FtcGHDsWEgZnVuY3Rpb25zXG4gICAgICBjYW1wYW5hSGFuZGxlcjogbmV3IG5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnQ2FtcGFuYUhhbmRsZXInLCB7XG4gICAgICAgIC4uLmxhbWJkYVByb3BzLFxuICAgICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL2JhY2tlbmQvc3JjL2hhbmRsZXJzL2NhbXBhbmEudHMnKSxcbiAgICAgICAgZnVuY3Rpb25OYW1lOiBgZWR1cmV0YWluLWNhbXBhbmEtJHtlbnZpcm9ubWVudC5TVEFHRX1gLFxuICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXG4gICAgICAgIG1lbW9yeVNpemU6IDUxMlxuICAgICAgfSksXG5cbiAgICAgIC8vIElBIFByZWRpY3Rpb24gZnVuY3Rpb25zXG4gICAgICBwcmVkaWN0aW9uSGFuZGxlcjogbmV3IG5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnUHJlZGljdGlvbkhhbmRsZXInLCB7XG4gICAgICAgIC4uLmxhbWJkYVByb3BzLFxuICAgICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL2JhY2tlbmQvc3JjL2hhbmRsZXJzL3ByZWRpY3Rpb24udHMnKSxcbiAgICAgICAgZnVuY3Rpb25OYW1lOiBgZWR1cmV0YWluLXByZWRpY3Rpb24tJHtlbnZpcm9ubWVudC5TVEFHRX1gLFxuICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXG4gICAgICAgIG1lbW9yeVNpemU6IDEwMjRcbiAgICAgIH0pLFxuXG4gICAgICAvLyBEYXNoYm9hcmQgZnVuY3Rpb25zXG4gICAgICBkYXNoYm9hcmRIYW5kbGVyOiBuZXcgbm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdEYXNoYm9hcmRIYW5kbGVyJywge1xuICAgICAgICAuLi5sYW1iZGFQcm9wcyxcbiAgICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9iYWNrZW5kL3NyYy9oYW5kbGVycy9kYXNoYm9hcmQudHMnKSxcbiAgICAgICAgZnVuY3Rpb25OYW1lOiBgZWR1cmV0YWluLWRhc2hib2FyZC0ke2Vudmlyb25tZW50LlNUQUdFfWBcbiAgICAgIH0pLFxuXG4gICAgICAvLyBVcGxvYWQgZnVuY3Rpb25zXG4gICAgICB1cGxvYWRIYW5kbGVyOiBuZXcgbm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdVcGxvYWRIYW5kbGVyJywge1xuICAgICAgICAuLi5sYW1iZGFQcm9wcyxcbiAgICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9iYWNrZW5kL3NyYy9oYW5kbGVycy91cGxvYWQudHMnKSxcbiAgICAgICAgZnVuY3Rpb25OYW1lOiBgZWR1cmV0YWluLXVwbG9hZC0ke2Vudmlyb25tZW50LlNUQUdFfWAsXG4gICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKSxcbiAgICAgICAgbWVtb3J5U2l6ZTogNTEyXG4gICAgICB9KVxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUFwaVJvdXRlcyhcbiAgICBhdXRob3JpemVyOiBhcGlnYXRld2F5LkNvZ25pdG9Vc2VyUG9vbHNBdXRob3JpemVyLFxuICAgIGZ1bmN0aW9uczogUmVjb3JkPHN0cmluZywgbm9kZWpzLk5vZGVqc0Z1bmN0aW9uPlxuICApIHtcbiAgICAvLyBBUEkgdmVyc2lvbmluZ1xuICAgIGNvbnN0IHYxID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgndjEnKTtcblxuICAgIC8vIEF1dGggcm91dGVzIChubyBhdXRoIHJlcXVpcmVkKVxuICAgIGNvbnN0IGF1dGggPSB2MS5hZGRSZXNvdXJjZSgnYXV0aCcpO1xuICAgIGF1dGguYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZnVuY3Rpb25zLmF1dGhIYW5kbGVyKSk7XG5cbiAgICAvLyBVbml2ZXJzaWRhZCByb3V0ZXNcbiAgICBjb25zdCB1bml2ZXJzaWRhZGVzID0gdjEuYWRkUmVzb3VyY2UoJ3VuaXZlcnNpZGFkZXMnKTtcbiAgICB1bml2ZXJzaWRhZGVzLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZnVuY3Rpb25zLnVuaXZlcnNpZGFkSGFuZGxlciksIHtcbiAgICAgIGF1dGhvcml6ZXJcbiAgICB9KTtcbiAgICB1bml2ZXJzaWRhZGVzLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGZ1bmN0aW9ucy51bml2ZXJzaWRhZEhhbmRsZXIpLCB7XG4gICAgICBhdXRob3JpemVyXG4gICAgfSk7XG4gICAgXG4gICAgY29uc3QgdW5pdmVyc2lkYWQgPSB1bml2ZXJzaWRhZGVzLmFkZFJlc291cmNlKCd7aWR9Jyk7XG4gICAgdW5pdmVyc2lkYWQuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihmdW5jdGlvbnMudW5pdmVyc2lkYWRIYW5kbGVyKSwge1xuICAgICAgYXV0aG9yaXplclxuICAgIH0pO1xuICAgIHVuaXZlcnNpZGFkLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZnVuY3Rpb25zLnVuaXZlcnNpZGFkSGFuZGxlciksIHtcbiAgICAgIGF1dGhvcml6ZXJcbiAgICB9KTtcbiAgICB1bml2ZXJzaWRhZC5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGZ1bmN0aW9ucy51bml2ZXJzaWRhZEhhbmRsZXIpLCB7XG4gICAgICBhdXRob3JpemVyXG4gICAgfSk7XG5cbiAgICAvLyBGYWN1bHRhZCByb3V0ZXNcbiAgICBjb25zdCBmYWN1bHRhZGVzID0gdjEuYWRkUmVzb3VyY2UoJ2ZhY3VsdGFkZXMnKTtcbiAgICBmYWN1bHRhZGVzLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZnVuY3Rpb25zLmZhY3VsdGFkSGFuZGxlciksIHtcbiAgICAgIGF1dGhvcml6ZXJcbiAgICB9KTtcbiAgICBmYWN1bHRhZGVzLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGZ1bmN0aW9ucy5mYWN1bHRhZEhhbmRsZXIpLCB7XG4gICAgICBhdXRob3JpemVyXG4gICAgfSk7XG4gICAgXG4gICAgY29uc3QgZmFjdWx0YWQgPSBmYWN1bHRhZGVzLmFkZFJlc291cmNlKCd7aWR9Jyk7XG4gICAgZmFjdWx0YWQuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihmdW5jdGlvbnMuZmFjdWx0YWRIYW5kbGVyKSwge1xuICAgICAgYXV0aG9yaXplclxuICAgIH0pO1xuICAgIGZhY3VsdGFkLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZnVuY3Rpb25zLmZhY3VsdGFkSGFuZGxlciksIHtcbiAgICAgIGF1dGhvcml6ZXJcbiAgICB9KTtcbiAgICBmYWN1bHRhZC5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGZ1bmN0aW9ucy5mYWN1bHRhZEhhbmRsZXIpLCB7XG4gICAgICBhdXRob3JpemVyXG4gICAgfSk7XG5cbiAgICAvLyBDYXJyZXJhIHJvdXRlc1xuICAgIGNvbnN0IGNhcnJlcmFzID0gdjEuYWRkUmVzb3VyY2UoJ2NhcnJlcmFzJyk7XG4gICAgY2FycmVyYXMuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihmdW5jdGlvbnMuY2FycmVyYUhhbmRsZXIpLCB7XG4gICAgICBhdXRob3JpemVyXG4gICAgfSk7XG4gICAgY2FycmVyYXMuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZnVuY3Rpb25zLmNhcnJlcmFIYW5kbGVyKSwge1xuICAgICAgYXV0aG9yaXplclxuICAgIH0pO1xuICAgIFxuICAgIGNvbnN0IGNhcnJlcmEgPSBjYXJyZXJhcy5hZGRSZXNvdXJjZSgne2lkfScpO1xuICAgIGNhcnJlcmEuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihmdW5jdGlvbnMuY2FycmVyYUhhbmRsZXIpLCB7XG4gICAgICBhdXRob3JpemVyXG4gICAgfSk7XG4gICAgY2FycmVyYS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGZ1bmN0aW9ucy5jYXJyZXJhSGFuZGxlciksIHtcbiAgICAgIGF1dGhvcml6ZXJcbiAgICB9KTtcbiAgICBjYXJyZXJhLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZnVuY3Rpb25zLmNhcnJlcmFIYW5kbGVyKSwge1xuICAgICAgYXV0aG9yaXplclxuICAgIH0pO1xuXG4gICAgLy8gQWx1bW5vIHJvdXRlc1xuICAgIGNvbnN0IGFsdW1ub3MgPSB2MS5hZGRSZXNvdXJjZSgnYWx1bW5vcycpO1xuICAgIGFsdW1ub3MuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihmdW5jdGlvbnMuYWx1bW5vSGFuZGxlciksIHtcbiAgICAgIGF1dGhvcml6ZXJcbiAgICB9KTtcbiAgICBhbHVtbm9zLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGZ1bmN0aW9ucy5hbHVtbm9IYW5kbGVyKSwge1xuICAgICAgYXV0aG9yaXplclxuICAgIH0pO1xuICAgIFxuICAgIGNvbnN0IGFsdW1ubyA9IGFsdW1ub3MuYWRkUmVzb3VyY2UoJ3tjZWR1bGF9Jyk7XG4gICAgYWx1bW5vLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZnVuY3Rpb25zLmFsdW1ub0hhbmRsZXIpLCB7XG4gICAgICBhdXRob3JpemVyXG4gICAgfSk7XG4gICAgYWx1bW5vLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZnVuY3Rpb25zLmFsdW1ub0hhbmRsZXIpLCB7XG4gICAgICBhdXRob3JpemVyXG4gICAgfSk7XG4gICAgYWx1bW5vLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZnVuY3Rpb25zLmFsdW1ub0hhbmRsZXIpLCB7XG4gICAgICBhdXRob3JpemVyXG4gICAgfSk7XG5cbiAgICAvLyBJbXBvcnRhY2nDs24gbWFzaXZhXG4gICAgY29uc3QgaW1wb3J0YXIgPSBhbHVtbm9zLmFkZFJlc291cmNlKCdpbXBvcnRhcicpO1xuICAgIGltcG9ydGFyLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGZ1bmN0aW9ucy5hbHVtbm9IYW5kbGVyKSwge1xuICAgICAgYXV0aG9yaXplclxuICAgIH0pO1xuXG4gICAgLy8gQ2FtcGHDsWEgcm91dGVzXG4gICAgY29uc3QgY2FtcGFuYXMgPSB2MS5hZGRSZXNvdXJjZSgnY2FtcGFuYXMnKTtcbiAgICBjYW1wYW5hcy5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGZ1bmN0aW9ucy5jYW1wYW5hSGFuZGxlciksIHtcbiAgICAgIGF1dGhvcml6ZXJcbiAgICB9KTtcbiAgICBjYW1wYW5hcy5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihmdW5jdGlvbnMuY2FtcGFuYUhhbmRsZXIpLCB7XG4gICAgICBhdXRob3JpemVyXG4gICAgfSk7XG4gICAgXG4gICAgY29uc3QgY2FtcGFuYSA9IGNhbXBhbmFzLmFkZFJlc291cmNlKCd7aWR9Jyk7XG4gICAgY2FtcGFuYS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGZ1bmN0aW9ucy5jYW1wYW5hSGFuZGxlciksIHtcbiAgICAgIGF1dGhvcml6ZXJcbiAgICB9KTtcbiAgICBjYW1wYW5hLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZnVuY3Rpb25zLmNhbXBhbmFIYW5kbGVyKSwge1xuICAgICAgYXV0aG9yaXplclxuICAgIH0pO1xuICAgIGNhbXBhbmEuYWRkTWV0aG9kKCdERUxFVEUnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihmdW5jdGlvbnMuY2FtcGFuYUhhbmRsZXIpLCB7XG4gICAgICBhdXRob3JpemVyXG4gICAgfSk7XG5cbiAgICAvLyBFbnZpYXIgY2FtcGHDsWFcbiAgICBjb25zdCBlbnZpYXIgPSBjYW1wYW5hLmFkZFJlc291cmNlKCdlbnZpYXInKTtcbiAgICBlbnZpYXIuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZnVuY3Rpb25zLmNhbXBhbmFIYW5kbGVyKSwge1xuICAgICAgYXV0aG9yaXplclxuICAgIH0pO1xuXG4gICAgLy8gVHJhY2tpbmcgZGUgY2FtcGHDsWFcbiAgICBjb25zdCB0cmFja2luZyA9IGNhbXBhbmEuYWRkUmVzb3VyY2UoJ3RyYWNraW5nJyk7XG4gICAgdHJhY2tpbmcuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihmdW5jdGlvbnMuY2FtcGFuYUhhbmRsZXIpLCB7XG4gICAgICBhdXRob3JpemVyXG4gICAgfSk7XG5cbiAgICAvLyBQcmVkaWN0aW9uIHJvdXRlc1xuICAgIGNvbnN0IHByZWRpY3Rpb25zID0gdjEuYWRkUmVzb3VyY2UoJ3ByZWRpY3Rpb25zJyk7XG4gICAgY29uc3QgcHJlZGljdCA9IHByZWRpY3Rpb25zLmFkZFJlc291cmNlKCdwcmVkaWN0Jyk7XG4gICAgcHJlZGljdC5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihmdW5jdGlvbnMucHJlZGljdGlvbkhhbmRsZXIpLCB7XG4gICAgICBhdXRob3JpemVyXG4gICAgfSk7XG5cbiAgICBjb25zdCBiYXRjaCA9IHByZWRpY3Rpb25zLmFkZFJlc291cmNlKCdiYXRjaCcpO1xuICAgIGJhdGNoLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGZ1bmN0aW9ucy5wcmVkaWN0aW9uSGFuZGxlciksIHtcbiAgICAgIGF1dGhvcml6ZXJcbiAgICB9KTtcblxuICAgIC8vIERhc2hib2FyZCByb3V0ZXNcbiAgICBjb25zdCBkYXNoYm9hcmQgPSB2MS5hZGRSZXNvdXJjZSgnZGFzaGJvYXJkJyk7XG4gICAgZGFzaGJvYXJkLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZnVuY3Rpb25zLmRhc2hib2FyZEhhbmRsZXIpLCB7XG4gICAgICBhdXRob3JpemVyXG4gICAgfSk7XG5cbiAgICBjb25zdCBtZXRyaWNhcyA9IGRhc2hib2FyZC5hZGRSZXNvdXJjZSgnbWV0cmljYXMnKTtcbiAgICBtZXRyaWNhcy5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGZ1bmN0aW9ucy5kYXNoYm9hcmRIYW5kbGVyKSwge1xuICAgICAgYXV0aG9yaXplclxuICAgIH0pO1xuXG4gICAgLy8gVXBsb2FkIHJvdXRlc1xuICAgIGNvbnN0IHVwbG9hZHMgPSB2MS5hZGRSZXNvdXJjZSgndXBsb2FkcycpO1xuICAgIGNvbnN0IHByZXNpZ25lZFVybCA9IHVwbG9hZHMuYWRkUmVzb3VyY2UoJ3ByZXNpZ25lZC11cmwnKTtcbiAgICBwcmVzaWduZWRVcmwuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZnVuY3Rpb25zLnVwbG9hZEhhbmRsZXIpLCB7XG4gICAgICBhdXRob3JpemVyXG4gICAgfSk7XG4gIH1cbn0iXX0=