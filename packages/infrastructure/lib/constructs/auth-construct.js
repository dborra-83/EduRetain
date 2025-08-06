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
exports.AuthConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const constructs_1 = require("constructs");
class AuthConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { stage, userPoolName } = props;
        // User Pool
        this.userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName,
            signInAliases: {
                email: true,
                username: false
            },
            selfSignUpEnabled: false, // Solo admins pueden crear usuarios
            userVerification: {
                emailSubject: 'EduRetain - Verifica tu cuenta',
                emailBody: 'Tu código de verificación es {####}',
                emailStyle: cognito.VerificationEmailStyle.CODE
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: true
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            mfa: stage === 'prod' ? cognito.Mfa.REQUIRED : cognito.Mfa.OPTIONAL,
            mfaSecondFactor: {
                sms: false,
                otp: true
            },
            // advancedSecurityMode requires Plus feature plan
            // advancedSecurityMode: stage === 'prod' ? 
            //   cognito.AdvancedSecurityMode.ENFORCED : 
            //   cognito.AdvancedSecurityMode.AUDIT,
            removalPolicy: stage === 'prod' ?
                cdk.RemovalPolicy.RETAIN :
                cdk.RemovalPolicy.DESTROY,
            deletionProtection: stage === 'prod',
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true
                },
                givenName: {
                    required: true,
                    mutable: true
                },
                familyName: {
                    required: true,
                    mutable: true
                }
            },
            customAttributes: {
                universidadId: new cognito.StringAttribute({
                    minLen: 1,
                    maxLen: 50,
                    mutable: true
                }),
                rol: new cognito.StringAttribute({
                    minLen: 1,
                    maxLen: 30,
                    mutable: true
                }),
                activo: new cognito.BooleanAttribute({ mutable: true })
            }
        });
        // User Pool Client
        this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
            userPool: this.userPool,
            userPoolClientName: `eduretain-client-${stage}`,
            generateSecret: false, // Para apps web
            authFlows: {
                userSrp: true,
                userPassword: false, // Más seguro usar SRP
                adminUserPassword: true // Para crear usuarios desde admin
            },
            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                    implicitCodeGrant: false
                },
                scopes: [
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.PROFILE
                ],
                callbackUrls: [
                    stage === 'prod' ?
                        'https://eduretain.com/auth/callback' :
                        `https://${stage}.eduretain.com/auth/callback`,
                    'http://localhost:3000/auth/callback', // Para desarrollo puerto 3000
                    'http://localhost:4000/auth/callback' // Para desarrollo puerto 4000
                ],
                logoutUrls: [
                    stage === 'prod' ?
                        'https://eduretain.com/auth/logout' :
                        `https://${stage}.eduretain.com/auth/logout`,
                    'http://localhost:3000/auth/logout', // Para desarrollo puerto 3000
                    'http://localhost:4000/auth/logout' // Para desarrollo puerto 4000
                ]
            },
            preventUserExistenceErrors: true,
            refreshTokenValidity: cdk.Duration.days(30),
            accessTokenValidity: cdk.Duration.hours(1),
            idTokenValidity: cdk.Duration.hours(1)
        });
        // User Pool Domain
        const userPoolDomain = new cognito.UserPoolDomain(this, 'UserPoolDomain', {
            userPool: this.userPool,
            cognitoDomain: {
                domainPrefix: `eduretain-${stage}-${cdk.Stack.of(this).account}`
            }
        });
        // Identity Pool para acceso a AWS resources
        this.identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
            identityPoolName: `eduretain_identity_${stage}`,
            allowUnauthenticatedIdentities: false,
            cognitoIdentityProviders: [{
                    clientId: this.userPoolClient.userPoolClientId,
                    providerName: this.userPool.userPoolProviderName,
                    serverSideTokenCheck: true
                }]
        });
        // Pre-signup Lambda trigger (para validar dominios permitidos si es necesario)
        // Se implementará en el siguiente sprint
        // Tags
        cdk.Tags.of(this.userPool).add('Component', 'Authentication');
        cdk.Tags.of(this.userPool).add('Stage', stage);
    }
}
exports.AuthConstruct = AuthConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1jb25zdHJ1Y3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhdXRoLWNvbnN0cnVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsaUVBQW1EO0FBQ25ELDJDQUF1QztBQU92QyxNQUFhLGFBQWMsU0FBUSxzQkFBUztJQUsxQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXlCO1FBQ2pFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFdEMsWUFBWTtRQUNaLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDckQsWUFBWTtZQUNaLGFBQWEsRUFBRTtnQkFDYixLQUFLLEVBQUUsSUFBSTtnQkFDWCxRQUFRLEVBQUUsS0FBSzthQUNoQjtZQUNELGlCQUFpQixFQUFFLEtBQUssRUFBRSxvQ0FBb0M7WUFDOUQsZ0JBQWdCLEVBQUU7Z0JBQ2hCLFlBQVksRUFBRSxnQ0FBZ0M7Z0JBQzlDLFNBQVMsRUFBRSxxQ0FBcUM7Z0JBQ2hELFVBQVUsRUFBRSxPQUFPLENBQUMsc0JBQXNCLENBQUMsSUFBSTthQUNoRDtZQUNELGNBQWMsRUFBRTtnQkFDZCxTQUFTLEVBQUUsQ0FBQztnQkFDWixnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixhQUFhLEVBQUUsSUFBSTtnQkFDbkIsY0FBYyxFQUFFLElBQUk7YUFDckI7WUFDRCxlQUFlLEVBQUUsT0FBTyxDQUFDLGVBQWUsQ0FBQyxVQUFVO1lBQ25ELEdBQUcsRUFBRSxLQUFLLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFD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cyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBBdXRoQ29uc3RydWN0UHJvcHMge1xuICBzdGFnZTogc3RyaW5nO1xuICB1c2VyUG9vbE5hbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIEF1dGhDb25zdHJ1Y3QgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2w7XG4gIHB1YmxpYyByZWFkb25seSB1c2VyUG9vbENsaWVudDogY29nbml0by5Vc2VyUG9vbENsaWVudDtcbiAgcHVibGljIHJlYWRvbmx5IGlkZW50aXR5UG9vbDogY29nbml0by5DZm5JZGVudGl0eVBvb2w7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEF1dGhDb25zdHJ1Y3RQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCB7IHN0YWdlLCB1c2VyUG9vbE5hbWUgfSA9IHByb3BzO1xuXG4gICAgLy8gVXNlciBQb29sXG4gICAgdGhpcy51c2VyUG9vbCA9IG5ldyBjb2duaXRvLlVzZXJQb29sKHRoaXMsICdVc2VyUG9vbCcsIHtcbiAgICAgIHVzZXJQb29sTmFtZSxcbiAgICAgIHNpZ25JbkFsaWFzZXM6IHtcbiAgICAgICAgZW1haWw6IHRydWUsXG4gICAgICAgIHVzZXJuYW1lOiBmYWxzZVxuICAgICAgfSxcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiBmYWxzZSwgLy8gU29sbyBhZG1pbnMgcHVlZGVuIGNyZWFyIHVzdWFyaW9zXG4gICAgICB1c2VyVmVyaWZpY2F0aW9uOiB7XG4gICAgICAgIGVtYWlsU3ViamVjdDogJ0VkdVJldGFpbiAtIFZlcmlmaWNhIHR1IGN1ZW50YScsXG4gICAgICAgIGVtYWlsQm9keTogJ1R1IGPDs2RpZ28gZGUgdmVyaWZpY2FjacOzbiBlcyB7IyMjI30nLFxuICAgICAgICBlbWFpbFN0eWxlOiBjb2duaXRvLlZlcmlmaWNhdGlvbkVtYWlsU3R5bGUuQ09ERVxuICAgICAgfSxcbiAgICAgIHBhc3N3b3JkUG9saWN5OiB7XG4gICAgICAgIG1pbkxlbmd0aDogOCxcbiAgICAgICAgcmVxdWlyZUxvd2VyY2FzZTogdHJ1ZSxcbiAgICAgICAgcmVxdWlyZVVwcGVyY2FzZTogdHJ1ZSxcbiAgICAgICAgcmVxdWlyZURpZ2l0czogdHJ1ZSxcbiAgICAgICAgcmVxdWlyZVN5bWJvbHM6IHRydWVcbiAgICAgIH0sXG4gICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXG4gICAgICBtZmE6IHN0YWdlID09PSAncHJvZCcgPyBjb2duaXRvLk1mYS5SRVFVSVJFRCA6IGNvZ25pdG8uTWZhLk9QVElPTkFMLFxuICAgICAgbWZhU2Vjb25kRmFjdG9yOiB7XG4gICAgICAgIHNtczogZmFsc2UsXG4gICAgICAgIG90cDogdHJ1ZVxuICAgICAgfSxcbiAgICAgIC8vIGFkdmFuY2VkU2VjdXJpdHlNb2RlIHJlcXVpcmVzIFBsdXMgZmVhdHVyZSBwbGFuXG4gICAgICAvLyBhZHZhbmNlZFNlY3VyaXR5TW9kZTogc3RhZ2UgPT09ICdwcm9kJyA/IFxuICAgICAgLy8gICBjb2duaXRvLkFkdmFuY2VkU2VjdXJpdHlNb2RlLkVORk9SQ0VEIDogXG4gICAgICAvLyAgIGNvZ25pdG8uQWR2YW5jZWRTZWN1cml0eU1vZGUuQVVESVQsXG4gICAgICByZW1vdmFsUG9saWN5OiBzdGFnZSA9PT0gJ3Byb2QnID8gXG4gICAgICAgIGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IFxuICAgICAgICBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgZGVsZXRpb25Qcm90ZWN0aW9uOiBzdGFnZSA9PT0gJ3Byb2QnLFxuICAgICAgc3RhbmRhcmRBdHRyaWJ1dGVzOiB7XG4gICAgICAgIGVtYWlsOiB7XG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBnaXZlbk5hbWU6IHtcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIGZhbWlseU5hbWU6IHtcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBjdXN0b21BdHRyaWJ1dGVzOiB7XG4gICAgICAgIHVuaXZlcnNpZGFkSWQ6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7IFxuICAgICAgICAgIG1pbkxlbjogMSwgXG4gICAgICAgICAgbWF4TGVuOiA1MCwgXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSBcbiAgICAgICAgfSksXG4gICAgICAgIHJvbDogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHsgXG4gICAgICAgICAgbWluTGVuOiAxLCBcbiAgICAgICAgICBtYXhMZW46IDMwLCBcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlIFxuICAgICAgICB9KSxcbiAgICAgICAgYWN0aXZvOiBuZXcgY29nbml0by5Cb29sZWFuQXR0cmlidXRlKHsgbXV0YWJsZTogdHJ1ZSB9KVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gVXNlciBQb29sIENsaWVudFxuICAgIHRoaXMudXNlclBvb2xDbGllbnQgPSBuZXcgY29nbml0by5Vc2VyUG9vbENsaWVudCh0aGlzLCAnVXNlclBvb2xDbGllbnQnLCB7XG4gICAgICB1c2VyUG9vbDogdGhpcy51c2VyUG9vbCxcbiAgICAgIHVzZXJQb29sQ2xpZW50TmFtZTogYGVkdXJldGFpbi1jbGllbnQtJHtzdGFnZX1gLFxuICAgICAgZ2VuZXJhdGVTZWNyZXQ6IGZhbHNlLCAvLyBQYXJhIGFwcHMgd2ViXG4gICAgICBhdXRoRmxvd3M6IHtcbiAgICAgICAgdXNlclNycDogdHJ1ZSxcbiAgICAgICAgdXNlclBhc3N3b3JkOiBmYWxzZSwgLy8gTcOhcyBzZWd1cm8gdXNhciBTUlBcbiAgICAgICAgYWRtaW5Vc2VyUGFzc3dvcmQ6IHRydWUgLy8gUGFyYSBjcmVhciB1c3VhcmlvcyBkZXNkZSBhZG1pblxuICAgICAgfSxcbiAgICAgIG9BdXRoOiB7XG4gICAgICAgIGZsb3dzOiB7XG4gICAgICAgICAgYXV0aG9yaXphdGlvbkNvZGVHcmFudDogdHJ1ZSxcbiAgICAgICAgICBpbXBsaWNpdENvZGVHcmFudDogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgc2NvcGVzOiBbXG4gICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLkVNQUlMLFxuICAgICAgICAgIGNvZ25pdG8uT0F1dGhTY29wZS5PUEVOSUQsXG4gICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLlBST0ZJTEVcbiAgICAgICAgXSxcbiAgICAgICAgY2FsbGJhY2tVcmxzOiBbXG4gICAgICAgICAgc3RhZ2UgPT09ICdwcm9kJyA/IFxuICAgICAgICAgICAgJ2h0dHBzOi8vZWR1cmV0YWluLmNvbS9hdXRoL2NhbGxiYWNrJyA6IFxuICAgICAgICAgICAgYGh0dHBzOi8vJHtzdGFnZX0uZWR1cmV0YWluLmNvbS9hdXRoL2NhbGxiYWNrYCxcbiAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDozMDAwL2F1dGgvY2FsbGJhY2snLCAvLyBQYXJhIGRlc2Fycm9sbG8gcHVlcnRvIDMwMDBcbiAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDo0MDAwL2F1dGgvY2FsbGJhY2snICAvLyBQYXJhIGRlc2Fycm9sbG8gcHVlcnRvIDQwMDBcbiAgICAgICAgXSxcbiAgICAgICAgbG9nb3V0VXJsczogW1xuICAgICAgICAgIHN0YWdlID09PSAncHJvZCcgPyBcbiAgICAgICAgICAgICdodHRwczovL2VkdXJldGFpbi5jb20vYXV0aC9sb2dvdXQnIDogXG4gICAgICAgICAgICBgaHR0cHM6Ly8ke3N0YWdlfS5lZHVyZXRhaW4uY29tL2F1dGgvbG9nb3V0YCxcbiAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDozMDAwL2F1dGgvbG9nb3V0JywgLy8gUGFyYSBkZXNhcnJvbGxvIHB1ZXJ0byAzMDAwXG4gICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6NDAwMC9hdXRoL2xvZ291dCcgIC8vIFBhcmEgZGVzYXJyb2xsbyBwdWVydG8gNDAwMFxuICAgICAgICBdXG4gICAgICB9LFxuICAgICAgcHJldmVudFVzZXJFeGlzdGVuY2VFcnJvcnM6IHRydWUsXG4gICAgICByZWZyZXNoVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxuICAgICAgYWNjZXNzVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxuICAgICAgaWRUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uaG91cnMoMSlcbiAgICB9KTtcblxuICAgIC8vIFVzZXIgUG9vbCBEb21haW5cbiAgICBjb25zdCB1c2VyUG9vbERvbWFpbiA9IG5ldyBjb2duaXRvLlVzZXJQb29sRG9tYWluKHRoaXMsICdVc2VyUG9vbERvbWFpbicsIHtcbiAgICAgIHVzZXJQb29sOiB0aGlzLnVzZXJQb29sLFxuICAgICAgY29nbml0b0RvbWFpbjoge1xuICAgICAgICBkb21haW5QcmVmaXg6IGBlZHVyZXRhaW4tJHtzdGFnZX0tJHtjZGsuU3RhY2sub2YodGhpcykuYWNjb3VudH1gXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBJZGVudGl0eSBQb29sIHBhcmEgYWNjZXNvIGEgQVdTIHJlc291cmNlc1xuICAgIHRoaXMuaWRlbnRpdHlQb29sID0gbmV3IGNvZ25pdG8uQ2ZuSWRlbnRpdHlQb29sKHRoaXMsICdJZGVudGl0eVBvb2wnLCB7XG4gICAgICBpZGVudGl0eVBvb2xOYW1lOiBgZWR1cmV0YWluX2lkZW50aXR5XyR7c3RhZ2V9YCxcbiAgICAgIGFsbG93VW5hdXRoZW50aWNhdGVkSWRlbnRpdGllczogZmFsc2UsXG4gICAgICBjb2duaXRvSWRlbnRpdHlQcm92aWRlcnM6IFt7XG4gICAgICAgIGNsaWVudElkOiB0aGlzLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICAgIHByb3ZpZGVyTmFtZTogdGhpcy51c2VyUG9vbC51c2VyUG9vbFByb3ZpZGVyTmFtZSxcbiAgICAgICAgc2VydmVyU2lkZVRva2VuQ2hlY2s6IHRydWVcbiAgICAgIH1dXG4gICAgfSk7XG5cbiAgICAvLyBQcmUtc2lnbnVwIExhbWJkYSB0cmlnZ2VyIChwYXJhIHZhbGlkYXIgZG9taW5pb3MgcGVybWl0aWRvcyBzaSBlcyBuZWNlc2FyaW8pXG4gICAgLy8gU2UgaW1wbGVtZW50YXLDoSBlbiBlbCBzaWd1aWVudGUgc3ByaW50XG5cbiAgICAvLyBUYWdzXG4gICAgY2RrLlRhZ3Mub2YodGhpcy51c2VyUG9vbCkuYWRkKCdDb21wb25lbnQnLCAnQXV0aGVudGljYXRpb24nKTtcbiAgICBjZGsuVGFncy5vZih0aGlzLnVzZXJQb29sKS5hZGQoJ1N0YWdlJywgc3RhZ2UpO1xuICB9XG59Il19