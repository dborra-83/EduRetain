import * as cdk from 'aws-cdk-lib';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface EmailConstructProps {
  stage: string;
  domainName: string;
}

export class EmailConstruct extends Construct {
  public readonly configurationSet: ses.ConfigurationSet;
  public readonly sendingRole: iam.Role;

  constructor(scope: Construct, id: string, props: EmailConstructProps) {
    super(scope, id);

    const { stage, domainName } = props;

    // Configuration Set para tracking
    this.configurationSet = new ses.ConfigurationSet(this, 'ConfigurationSet', {
      configurationSetName: `eduretain-${stage}`,
      sendingEnabled: true
    });

    // Event Destination para tracking (CloudWatch)
    // TODO: Fix CloudWatch dimensions configuration
    // this.configurationSet.addEventDestination('CloudWatchDestination', {
    //   destination: ses.EventDestination.cloudWatchDimensions([]),
    //   events: [
    //     ses.EmailSendingEvent.SEND,
    //     ses.EmailSendingEvent.DELIVERY,
    //     ses.EmailSendingEvent.BOUNCE,
    //     ses.EmailSendingEvent.COMPLAINT,
    //     ses.EmailSendingEvent.OPEN,
    //     ses.EmailSendingEvent.CLICK
    //   ]
    // });

    // IAM Role para envío de emails desde Lambda
    this.sendingRole = new iam.Role(this, 'SendingRole', {
      roleName: `eduretain-ses-role-${stage}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
      inlinePolicies: {
        'SESPolicy': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ses:SendEmail',
                'ses:SendRawEmail',
                'ses:SendBulkTemplatedEmail',
                'ses:GetSendQuota',
                'ses:GetSendStatistics',
                'ses:GetIdentityVerificationAttributes'
              ],
              resources: ['*'],
              conditions: {
                StringEquals: {
                  'ses:ConfigurationSet': this.configurationSet.configurationSetName
                }
              }
            })
          ]
        })
      }
    });

    // Email Templates
    this.createEmailTemplates(stage);

    // Tags
    cdk.Tags.of(this.configurationSet).add('Component', 'Email');
    cdk.Tags.of(this.configurationSet).add('Stage', stage);
  }

  private createEmailTemplates(stage: string) {
    // Template para bienvenida
    new ses.CfnTemplate(this, 'WelcomeTemplate', {
      template: {
        templateName: `eduretain-welcome-${stage}`,
        subjectPart: 'Bienvenido a {{universidad}}',
        htmlPart: `
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                .header { background-color: {{colorPrimario}}; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .footer { background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>{{universidad}}</h1>
              </div>
              <div class="content">
                <h2>¡Hola {{nombre}}!</h2>
                <p>Te damos la bienvenida a nuestra plataforma educativa.</p>
                <p>Estamos aquí para apoyarte en tu proceso académico.</p>
              </div>
              <div class="footer">
                <p>Si no deseas recibir estos emails, <a href="{{unsubscribeUrl}}">darse de baja</a></p>
              </div>
            </body>
          </html>
        `,
        textPart: 'Hola {{nombre}}, te damos la bienvenida a {{universidad}}!'
      }
    });

    // Template para alertas de riesgo
    new ses.CfnTemplate(this, 'RiskAlertTemplate', {
      template: {
        templateName: `eduretain-risk-alert-${stage}`,
        subjectPart: 'Importante: Te queremos ayudar con tu carrera',
        htmlPart: `
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                .header { background-color: {{colorPrimario}}; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .alert { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 10px 0; border-radius: 5px; }
                .footer { background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>{{universidad}}</h1>
              </div>
              <div class="content">
                <h2>Hola {{nombre}},</h2>
                <div class="alert">
                  <p><strong>Queremos apoyarte en tu proceso académico.</strong></p>
                  <p>Hemos identificado algunas áreas donde podemos ayudarte:</p>
                  <ul>
                    {{#factoresRiesgo}}
                    <li>{{.}}</li>
                    {{/factoresRiesgo}}
                  </ul>
                </div>
                <p>Te invitamos a contactar a tu asesor académico o visitar nuestro centro de apoyo estudiantil.</p>
                <p><strong>Estamos aquí para ayudarte a alcanzar tus metas académicas.</strong></p>
              </div>
              <div class="footer">
                <p>Si no deseas recibir estos emails, <a href="{{unsubscribeUrl}}">darse de baja</a></p>
              </div>
            </body>
          </html>
        `,
        textPart: 'Hola {{nombre}}, queremos apoyarte en tu proceso académico. Contacta a tu asesor para más información.'
      }
    });

    // Template genérico para campañas personalizadas
    new ses.CfnTemplate(this, 'CustomTemplate', {
      template: {
        templateName: `eduretain-custom-${stage}`,
        subjectPart: '{{asunto}}',
        htmlPart: `
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                .header { background-color: {{colorPrimario}}; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .footer { background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="header">
                <img src="{{logoUrl}}" alt="{{universidad}}" style="max-height: 50px;">
                <h1>{{universidad}}</h1>
              </div>
              <div class="content">
                {{{contenido}}}
              </div>
              <div class="footer">
                <p>{{universidad}} - {{fechaEnvio}}</p>
                <p>Si no deseas recibir estos emails, <a href="{{unsubscribeUrl}}">darse de baja</a></p>
              </div>
            </body>
          </html>
        `,
        textPart: '{{contenidoTexto}}'
      }
    });
  }
}