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
exports.EmailConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ses = __importStar(require("aws-cdk-lib/aws-ses"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const constructs_1 = require("constructs");
class EmailConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
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
    createEmailTemplates(stage) {
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
exports.EmailConstruct = EmailConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1haWwtY29uc3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZW1haWwtY29uc3RydWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLDJDQUF1QztBQU92QyxNQUFhLGNBQWUsU0FBUSxzQkFBUztJQUkzQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTBCO1FBQ2xFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFcEMsa0NBQWtDO1FBQ2xDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDekUsb0JBQW9CLEVBQUUsYUFBYSxLQUFLLEVBQUU7WUFDMUMsY0FBYyxFQUFFLElBQUk7U0FDckIsQ0FBQyxDQUFDO1FBRUgsK0NBQStDO1FBQy9DLGdEQUFnRDtRQUNoRCx1RUFBdUU7UUFDdkUsZ0VBQWdFO1FBQ2hFLGNBQWM7UUFDZCxrQ0FBa0M7UUFDbEMsc0NBQXNDO1FBQ3RDLG9DQUFvQztRQUNwQyx1Q0FBdUM7UUFDdkMsa0NBQWtDO1FBQ2xDLGtDQUFrQztRQUNsQyxNQUFNO1FBQ04sTUFBTTtRQUVOLDZDQUE2QztRQUM3QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ25ELFFBQVEsRUFBRSxzQkFBc0IsS0FBSyxFQUFFO1lBQ3ZDLFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQztZQUMzRCxlQUFlLEVBQUU7Z0JBQ2YsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQywwQ0FBMEMsQ0FBQzthQUN2RjtZQUNELGNBQWMsRUFBRTtnQkFDZCxXQUFXLEVBQUUsSUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDO29CQUNsQyxVQUFVLEVBQUU7d0JBQ1YsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDOzRCQUN0QixNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLOzRCQUN4QixPQUFPLEVBQUU7Z0NBQ1AsZUFBZTtnQ0FDZixrQkFBa0I7Z0NBQ2xCLDRCQUE0QjtnQ0FDNUIsa0JBQWtCO2dDQUNsQix1QkFBdUI7Z0NBQ3ZCLHVDQUF1Qzs2QkFDeEM7NEJBQ0QsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDOzRCQUNoQixVQUFVLEVBQUU7Z0NBQ1YsWUFBWSxFQUFFO29DQUNaLHNCQUFzQixFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0I7aUNBQ25FOzZCQUNGO3lCQUNGLENBQUM7cUJBQ0g7aUJBQ0YsQ0FBQzthQUNIO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsa0JBQWtCO1FBQ2xCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVqQyxPQUFPO1FBQ1AsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM3RCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxLQUFhO1FBQ3hDLDJCQUEyQjtRQUMzQixJQUFJLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQzNDLFFBQVEsRUFBRTtnQkFDUixZQUFZLEVBQUUscUJBQXFCLEtBQUssRUFBRTtnQkFDMUMsV0FBVyxFQUFFLDhCQUE4QjtnQkFDM0MsUUFBUSxFQUFFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7U0F3QlQ7Z0JBQ0QsUUFBUSxFQUFFLDREQUE0RDthQUN2RTtTQUNGLENBQUMsQ0FBQztRQUVILGtDQUFrQztRQUNsQyxJQUFJLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQzdDLFFBQVEsRUFBRTtnQkFDUixZQUFZLEVBQUUsd0JBQXdCLEtBQUssRUFBRTtnQkFDN0MsV0FBVyxFQUFFLCtDQUErQztnQkFDNUQsUUFBUSxFQUFFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O1NBa0NUO2dCQUNELFFBQVEsRUFBRSx3R0FBd0c7YUFDbkg7U0FDRixDQUFDLENBQUM7UUFFSCxpREFBaUQ7UUFDakQsSUFBSSxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUMxQyxRQUFRLEVBQUU7Z0JBQ1IsWUFBWSxFQUFFLG9CQUFvQixLQUFLLEVBQUU7Z0JBQ3pDLFdBQVcsRUFBRSxZQUFZO2dCQUN6QixRQUFRLEVBQUU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztTQXdCVDtnQkFDRCxRQUFRLEVBQUUsb0JBQW9CO2FBQy9CO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBdExELHdDQXNMQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBzZXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlcyc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBFbWFpbENvbnN0cnVjdFByb3BzIHtcbiAgc3RhZ2U6IHN0cmluZztcbiAgZG9tYWluTmFtZTogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgRW1haWxDb25zdHJ1Y3QgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgY29uZmlndXJhdGlvblNldDogc2VzLkNvbmZpZ3VyYXRpb25TZXQ7XG4gIHB1YmxpYyByZWFkb25seSBzZW5kaW5nUm9sZTogaWFtLlJvbGU7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEVtYWlsQ29uc3RydWN0UHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgY29uc3QgeyBzdGFnZSwgZG9tYWluTmFtZSB9ID0gcHJvcHM7XG5cbiAgICAvLyBDb25maWd1cmF0aW9uIFNldCBwYXJhIHRyYWNraW5nXG4gICAgdGhpcy5jb25maWd1cmF0aW9uU2V0ID0gbmV3IHNlcy5Db25maWd1cmF0aW9uU2V0KHRoaXMsICdDb25maWd1cmF0aW9uU2V0Jywge1xuICAgICAgY29uZmlndXJhdGlvblNldE5hbWU6IGBlZHVyZXRhaW4tJHtzdGFnZX1gLFxuICAgICAgc2VuZGluZ0VuYWJsZWQ6IHRydWVcbiAgICB9KTtcblxuICAgIC8vIEV2ZW50IERlc3RpbmF0aW9uIHBhcmEgdHJhY2tpbmcgKENsb3VkV2F0Y2gpXG4gICAgLy8gVE9ETzogRml4IENsb3VkV2F0Y2ggZGltZW5zaW9ucyBjb25maWd1cmF0aW9uXG4gICAgLy8gdGhpcy5jb25maWd1cmF0aW9uU2V0LmFkZEV2ZW50RGVzdGluYXRpb24oJ0Nsb3VkV2F0Y2hEZXN0aW5hdGlvbicsIHtcbiAgICAvLyAgIGRlc3RpbmF0aW9uOiBzZXMuRXZlbnREZXN0aW5hdGlvbi5jbG91ZFdhdGNoRGltZW5zaW9ucyhbXSksXG4gICAgLy8gICBldmVudHM6IFtcbiAgICAvLyAgICAgc2VzLkVtYWlsU2VuZGluZ0V2ZW50LlNFTkQsXG4gICAgLy8gICAgIHNlcy5FbWFpbFNlbmRpbmdFdmVudC5ERUxJVkVSWSxcbiAgICAvLyAgICAgc2VzLkVtYWlsU2VuZGluZ0V2ZW50LkJPVU5DRSxcbiAgICAvLyAgICAgc2VzLkVtYWlsU2VuZGluZ0V2ZW50LkNPTVBMQUlOVCxcbiAgICAvLyAgICAgc2VzLkVtYWlsU2VuZGluZ0V2ZW50Lk9QRU4sXG4gICAgLy8gICAgIHNlcy5FbWFpbFNlbmRpbmdFdmVudC5DTElDS1xuICAgIC8vICAgXVxuICAgIC8vIH0pO1xuXG4gICAgLy8gSUFNIFJvbGUgcGFyYSBlbnbDrW8gZGUgZW1haWxzIGRlc2RlIExhbWJkYVxuICAgIHRoaXMuc2VuZGluZ1JvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ1NlbmRpbmdSb2xlJywge1xuICAgICAgcm9sZU5hbWU6IGBlZHVyZXRhaW4tc2VzLXJvbGUtJHtzdGFnZX1gLFxuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJyksXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlJylcbiAgICAgIF0sXG4gICAgICBpbmxpbmVQb2xpY2llczoge1xuICAgICAgICAnU0VTUG9saWN5JzogbmV3IGlhbS5Qb2xpY3lEb2N1bWVudCh7XG4gICAgICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAnc2VzOlNlbmRFbWFpbCcsXG4gICAgICAgICAgICAgICAgJ3NlczpTZW5kUmF3RW1haWwnLFxuICAgICAgICAgICAgICAgICdzZXM6U2VuZEJ1bGtUZW1wbGF0ZWRFbWFpbCcsXG4gICAgICAgICAgICAgICAgJ3NlczpHZXRTZW5kUXVvdGEnLFxuICAgICAgICAgICAgICAgICdzZXM6R2V0U2VuZFN0YXRpc3RpY3MnLFxuICAgICAgICAgICAgICAgICdzZXM6R2V0SWRlbnRpdHlWZXJpZmljYXRpb25BdHRyaWJ1dGVzJ1xuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgICAgICAgICBjb25kaXRpb25zOiB7XG4gICAgICAgICAgICAgICAgU3RyaW5nRXF1YWxzOiB7XG4gICAgICAgICAgICAgICAgICAnc2VzOkNvbmZpZ3VyYXRpb25TZXQnOiB0aGlzLmNvbmZpZ3VyYXRpb25TZXQuY29uZmlndXJhdGlvblNldE5hbWVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgXVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gRW1haWwgVGVtcGxhdGVzXG4gICAgdGhpcy5jcmVhdGVFbWFpbFRlbXBsYXRlcyhzdGFnZSk7XG5cbiAgICAvLyBUYWdzXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5jb25maWd1cmF0aW9uU2V0KS5hZGQoJ0NvbXBvbmVudCcsICdFbWFpbCcpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMuY29uZmlndXJhdGlvblNldCkuYWRkKCdTdGFnZScsIHN0YWdlKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlRW1haWxUZW1wbGF0ZXMoc3RhZ2U6IHN0cmluZykge1xuICAgIC8vIFRlbXBsYXRlIHBhcmEgYmllbnZlbmlkYVxuICAgIG5ldyBzZXMuQ2ZuVGVtcGxhdGUodGhpcywgJ1dlbGNvbWVUZW1wbGF0ZScsIHtcbiAgICAgIHRlbXBsYXRlOiB7XG4gICAgICAgIHRlbXBsYXRlTmFtZTogYGVkdXJldGFpbi13ZWxjb21lLSR7c3RhZ2V9YCxcbiAgICAgICAgc3ViamVjdFBhcnQ6ICdCaWVudmVuaWRvIGEge3t1bml2ZXJzaWRhZH19JyxcbiAgICAgICAgaHRtbFBhcnQ6IGBcbiAgICAgICAgICA8aHRtbD5cbiAgICAgICAgICAgIDxoZWFkPlxuICAgICAgICAgICAgICA8c3R5bGU+XG4gICAgICAgICAgICAgICAgYm9keSB7IGZvbnQtZmFtaWx5OiBBcmlhbCwgc2Fucy1zZXJpZjsgbWFyZ2luOiAwOyBwYWRkaW5nOiAyMHB4OyB9XG4gICAgICAgICAgICAgICAgLmhlYWRlciB7IGJhY2tncm91bmQtY29sb3I6IHt7Y29sb3JQcmltYXJpb319OyBjb2xvcjogd2hpdGU7IHBhZGRpbmc6IDIwcHg7IHRleHQtYWxpZ246IGNlbnRlcjsgfVxuICAgICAgICAgICAgICAgIC5jb250ZW50IHsgcGFkZGluZzogMjBweDsgfVxuICAgICAgICAgICAgICAgIC5mb290ZXIgeyBiYWNrZ3JvdW5kLWNvbG9yOiAjZjVmNWY1OyBwYWRkaW5nOiAxMHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7IGZvbnQtc2l6ZTogMTJweDsgfVxuICAgICAgICAgICAgICA8L3N0eWxlPlxuICAgICAgICAgICAgPC9oZWFkPlxuICAgICAgICAgICAgPGJvZHk+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICA8aDE+e3t1bml2ZXJzaWRhZH19PC9oMT5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgPGgyPsKhSG9sYSB7e25vbWJyZX19ITwvaDI+XG4gICAgICAgICAgICAgICAgPHA+VGUgZGFtb3MgbGEgYmllbnZlbmlkYSBhIG51ZXN0cmEgcGxhdGFmb3JtYSBlZHVjYXRpdmEuPC9wPlxuICAgICAgICAgICAgICAgIDxwPkVzdGFtb3MgYXF1w60gcGFyYSBhcG95YXJ0ZSBlbiB0dSBwcm9jZXNvIGFjYWTDqW1pY28uPC9wPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZvb3RlclwiPlxuICAgICAgICAgICAgICAgIDxwPlNpIG5vIGRlc2VhcyByZWNpYmlyIGVzdG9zIGVtYWlscywgPGEgaHJlZj1cInt7dW5zdWJzY3JpYmVVcmx9fVwiPmRhcnNlIGRlIGJhamE8L2E+PC9wPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvYm9keT5cbiAgICAgICAgICA8L2h0bWw+XG4gICAgICAgIGAsXG4gICAgICAgIHRleHRQYXJ0OiAnSG9sYSB7e25vbWJyZX19LCB0ZSBkYW1vcyBsYSBiaWVudmVuaWRhIGEge3t1bml2ZXJzaWRhZH19ISdcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFRlbXBsYXRlIHBhcmEgYWxlcnRhcyBkZSByaWVzZ29cbiAgICBuZXcgc2VzLkNmblRlbXBsYXRlKHRoaXMsICdSaXNrQWxlcnRUZW1wbGF0ZScsIHtcbiAgICAgIHRlbXBsYXRlOiB7XG4gICAgICAgIHRlbXBsYXRlTmFtZTogYGVkdXJldGFpbi1yaXNrLWFsZXJ0LSR7c3RhZ2V9YCxcbiAgICAgICAgc3ViamVjdFBhcnQ6ICdJbXBvcnRhbnRlOiBUZSBxdWVyZW1vcyBheXVkYXIgY29uIHR1IGNhcnJlcmEnLFxuICAgICAgICBodG1sUGFydDogYFxuICAgICAgICAgIDxodG1sPlxuICAgICAgICAgICAgPGhlYWQ+XG4gICAgICAgICAgICAgIDxzdHlsZT5cbiAgICAgICAgICAgICAgICBib2R5IHsgZm9udC1mYW1pbHk6IEFyaWFsLCBzYW5zLXNlcmlmOyBtYXJnaW46IDA7IHBhZGRpbmc6IDIwcHg7IH1cbiAgICAgICAgICAgICAgICAuaGVhZGVyIHsgYmFja2dyb3VuZC1jb2xvcjoge3tjb2xvclByaW1hcmlvfX07IGNvbG9yOiB3aGl0ZTsgcGFkZGluZzogMjBweDsgdGV4dC1hbGlnbjogY2VudGVyOyB9XG4gICAgICAgICAgICAgICAgLmNvbnRlbnQgeyBwYWRkaW5nOiAyMHB4OyB9XG4gICAgICAgICAgICAgICAgLmFsZXJ0IHsgYmFja2dyb3VuZC1jb2xvcjogI2ZmZjNjZDsgYm9yZGVyOiAxcHggc29saWQgI2ZmZWFhNzsgcGFkZGluZzogMTVweDsgbWFyZ2luOiAxMHB4IDA7IGJvcmRlci1yYWRpdXM6IDVweDsgfVxuICAgICAgICAgICAgICAgIC5mb290ZXIgeyBiYWNrZ3JvdW5kLWNvbG9yOiAjZjVmNWY1OyBwYWRkaW5nOiAxMHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7IGZvbnQtc2l6ZTogMTJweDsgfVxuICAgICAgICAgICAgICA8L3N0eWxlPlxuICAgICAgICAgICAgPC9oZWFkPlxuICAgICAgICAgICAgPGJvZHk+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICA8aDE+e3t1bml2ZXJzaWRhZH19PC9oMT5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgPGgyPkhvbGEge3tub21icmV9fSw8L2gyPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJhbGVydFwiPlxuICAgICAgICAgICAgICAgICAgPHA+PHN0cm9uZz5RdWVyZW1vcyBhcG95YXJ0ZSBlbiB0dSBwcm9jZXNvIGFjYWTDqW1pY28uPC9zdHJvbmc+PC9wPlxuICAgICAgICAgICAgICAgICAgPHA+SGVtb3MgaWRlbnRpZmljYWRvIGFsZ3VuYXMgw6FyZWFzIGRvbmRlIHBvZGVtb3MgYXl1ZGFydGU6PC9wPlxuICAgICAgICAgICAgICAgICAgPHVsPlxuICAgICAgICAgICAgICAgICAgICB7eyNmYWN0b3Jlc1JpZXNnb319XG4gICAgICAgICAgICAgICAgICAgIDxsaT57ey59fTwvbGk+XG4gICAgICAgICAgICAgICAgICAgIHt7L2ZhY3RvcmVzUmllc2dvfX1cbiAgICAgICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPHA+VGUgaW52aXRhbW9zIGEgY29udGFjdGFyIGEgdHUgYXNlc29yIGFjYWTDqW1pY28gbyB2aXNpdGFyIG51ZXN0cm8gY2VudHJvIGRlIGFwb3lvIGVzdHVkaWFudGlsLjwvcD5cbiAgICAgICAgICAgICAgICA8cD48c3Ryb25nPkVzdGFtb3MgYXF1w60gcGFyYSBheXVkYXJ0ZSBhIGFsY2FuemFyIHR1cyBtZXRhcyBhY2Fkw6ltaWNhcy48L3N0cm9uZz48L3A+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZm9vdGVyXCI+XG4gICAgICAgICAgICAgICAgPHA+U2kgbm8gZGVzZWFzIHJlY2liaXIgZXN0b3MgZW1haWxzLCA8YSBocmVmPVwie3t1bnN1YnNjcmliZVVybH19XCI+ZGFyc2UgZGUgYmFqYTwvYT48L3A+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9ib2R5PlxuICAgICAgICAgIDwvaHRtbD5cbiAgICAgICAgYCxcbiAgICAgICAgdGV4dFBhcnQ6ICdIb2xhIHt7bm9tYnJlfX0sIHF1ZXJlbW9zIGFwb3lhcnRlIGVuIHR1IHByb2Nlc28gYWNhZMOpbWljby4gQ29udGFjdGEgYSB0dSBhc2Vzb3IgcGFyYSBtw6FzIGluZm9ybWFjacOzbi4nXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBUZW1wbGF0ZSBnZW7DqXJpY28gcGFyYSBjYW1wYcOxYXMgcGVyc29uYWxpemFkYXNcbiAgICBuZXcgc2VzLkNmblRlbXBsYXRlKHRoaXMsICdDdXN0b21UZW1wbGF0ZScsIHtcbiAgICAgIHRlbXBsYXRlOiB7XG4gICAgICAgIHRlbXBsYXRlTmFtZTogYGVkdXJldGFpbi1jdXN0b20tJHtzdGFnZX1gLFxuICAgICAgICBzdWJqZWN0UGFydDogJ3t7YXN1bnRvfX0nLFxuICAgICAgICBodG1sUGFydDogYFxuICAgICAgICAgIDxodG1sPlxuICAgICAgICAgICAgPGhlYWQ+XG4gICAgICAgICAgICAgIDxzdHlsZT5cbiAgICAgICAgICAgICAgICBib2R5IHsgZm9udC1mYW1pbHk6IEFyaWFsLCBzYW5zLXNlcmlmOyBtYXJnaW46IDA7IHBhZGRpbmc6IDIwcHg7IH1cbiAgICAgICAgICAgICAgICAuaGVhZGVyIHsgYmFja2dyb3VuZC1jb2xvcjoge3tjb2xvclByaW1hcmlvfX07IGNvbG9yOiB3aGl0ZTsgcGFkZGluZzogMjBweDsgdGV4dC1hbGlnbjogY2VudGVyOyB9XG4gICAgICAgICAgICAgICAgLmNvbnRlbnQgeyBwYWRkaW5nOiAyMHB4OyB9XG4gICAgICAgICAgICAgICAgLmZvb3RlciB7IGJhY2tncm91bmQtY29sb3I6ICNmNWY1ZjU7IHBhZGRpbmc6IDEwcHg7IHRleHQtYWxpZ246IGNlbnRlcjsgZm9udC1zaXplOiAxMnB4OyB9XG4gICAgICAgICAgICAgIDwvc3R5bGU+XG4gICAgICAgICAgICA8L2hlYWQ+XG4gICAgICAgICAgICA8Ym9keT5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPlxuICAgICAgICAgICAgICAgIDxpbWcgc3JjPVwie3tsb2dvVXJsfX1cIiBhbHQ9XCJ7e3VuaXZlcnNpZGFkfX1cIiBzdHlsZT1cIm1heC1oZWlnaHQ6IDUwcHg7XCI+XG4gICAgICAgICAgICAgICAgPGgxPnt7dW5pdmVyc2lkYWR9fTwvaDE+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgIHt7e2NvbnRlbmlkb319fVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZvb3RlclwiPlxuICAgICAgICAgICAgICAgIDxwPnt7dW5pdmVyc2lkYWR9fSAtIHt7ZmVjaGFFbnZpb319PC9wPlxuICAgICAgICAgICAgICAgIDxwPlNpIG5vIGRlc2VhcyByZWNpYmlyIGVzdG9zIGVtYWlscywgPGEgaHJlZj1cInt7dW5zdWJzY3JpYmVVcmx9fVwiPmRhcnNlIGRlIGJhamE8L2E+PC9wPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvYm9keT5cbiAgICAgICAgICA8L2h0bWw+XG4gICAgICAgIGAsXG4gICAgICAgIHRleHRQYXJ0OiAne3tjb250ZW5pZG9UZXh0b319J1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59Il19