import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface AuthConstructProps {
  stage: string;
  userPoolName: string;
}

export class AuthConstruct extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;

  constructor(scope: Construct, id: string, props: AuthConstructProps) {
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
      advancedSecurityMode: stage === 'prod' ? 
        cognito.AdvancedSecurityMode.ENFORCED : 
        cognito.AdvancedSecurityMode.AUDIT,
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
          'http://localhost:4000/auth/callback'  // Para desarrollo puerto 4000
        ],
        logoutUrls: [
          stage === 'prod' ? 
            'https://eduretain.com/auth/logout' : 
            `https://${stage}.eduretain.com/auth/logout`,
          'http://localhost:3000/auth/logout', // Para desarrollo puerto 3000
          'http://localhost:4000/auth/logout'  // Para desarrollo puerto 4000
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