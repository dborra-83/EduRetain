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
exports.EduRetainStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const database_construct_1 = require("./constructs/database-construct");
const api_construct_1 = require("./constructs/api-construct");
const auth_construct_1 = require("./constructs/auth-construct");
const storage_construct_1 = require("./constructs/storage-construct");
const email_construct_1 = require("./constructs/email-construct");
const monitoring_construct_1 = require("./constructs/monitoring-construct");
class EduRetainStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { stage } = props;
        // Database (DynamoDB)
        const database = new database_construct_1.DatabaseConstruct(this, 'Database', {
            stage,
            tableName: `eduretain-${stage}`
        });
        // Authentication (Cognito)
        const auth = new auth_construct_1.AuthConstruct(this, 'Auth', {
            stage,
            userPoolName: `eduretain-users-${stage}`
        });
        // Storage (S3 + CloudFront)
        const storage = new storage_construct_1.StorageConstruct(this, 'Storage', {
            stage,
            bucketName: `eduretain-storage-${stage}`
        });
        // Email Service (SES)
        const email = new email_construct_1.EmailConstruct(this, 'Email', {
            stage,
            domainName: stage === 'prod' ? 'eduretain.com' : `${stage}.eduretain.com`
        });
        // API Gateway + Lambda Functions
        const api = new api_construct_1.ApiConstruct(this, 'Api', {
            stage,
            table: database.table,
            userPool: auth.userPool,
            userPoolClient: auth.userPoolClient,
            storageBucket: storage.bucket
        });
        // Monitoring (CloudWatch + X-Ray)
        const monitoring = new monitoring_construct_1.MonitoringConstruct(this, 'Monitoring', {
            stage,
            api: api.api,
            table: database.table,
            userPool: auth.userPool
        });
        // Outputs
        new cdk.CfnOutput(this, 'ApiEndpoint', {
            value: api.api.url,
            description: 'API Gateway endpoint URL'
        });
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: auth.userPool.userPoolId,
            description: 'Cognito User Pool ID'
        });
        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: auth.userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID'
        });
        new cdk.CfnOutput(this, 'CloudFrontDomain', {
            value: storage.distribution.distributionDomainName,
            description: 'CloudFront distribution domain'
        });
        new cdk.CfnOutput(this, 'DashboardUrl', {
            value: monitoring.dashboard.dashboardArn,
            description: 'CloudWatch Dashboard URL'
        });
    }
}
exports.EduRetainStack = EduRetainStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWR1cmV0YWluLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWR1cmV0YWluLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUVuQyx3RUFBb0U7QUFDcEUsOERBQTBEO0FBQzFELGdFQUE0RDtBQUM1RCxzRUFBa0U7QUFDbEUsa0VBQThEO0FBQzlELDRFQUF3RTtBQU14RSxNQUFhLGNBQWUsU0FBUSxHQUFHLENBQUMsS0FBSztJQUMzQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTBCO1FBQ2xFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFeEIsc0JBQXNCO1FBQ3RCLE1BQU0sUUFBUSxHQUFHLElBQUksc0NBQWlCLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUN2RCxLQUFLO1lBQ0wsU0FBUyxFQUFFLGFBQWEsS0FBSyxFQUFFO1NBQ2hDLENBQUMsQ0FBQztRQUVILDJCQUEyQjtRQUMzQixNQUFNLElBQUksR0FBRyxJQUFJLDhCQUFhLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRTtZQUMzQyxLQUFLO1lBQ0wsWUFBWSxFQUFFLG1CQUFtQixLQUFLLEVBQUU7U0FDekMsQ0FBQyxDQUFDO1FBRUgsNEJBQTRCO1FBQzVCLE1BQU0sT0FBTyxHQUFHLElBQUksb0NBQWdCLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRTtZQUNwRCxLQUFLO1lBQ0wsVUFBVSxFQUFFLHFCQUFxQixLQUFLLEVBQUU7U0FDekMsQ0FBQyxDQUFDO1FBRUgsc0JBQXNCO1FBQ3RCLE1BQU0sS0FBSyxHQUFHLElBQUksZ0NBQWMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFO1lBQzlDLEtBQUs7WUFDTCxVQUFVLEVBQUUsS0FBSyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssZ0JBQWdCO1NBQzFFLENBQUMsQ0FBQztRQUVILGlDQUFpQztRQUNqQyxNQUFNLEdBQUcsR0FBRyxJQUFJLDRCQUFZLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRTtZQUN4QyxLQUFLO1lBQ0wsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLO1lBQ3JCLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWM7WUFDbkMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1NBQzlCLENBQUMsQ0FBQztRQUVILGtDQUFrQztRQUNsQyxNQUFNLFVBQVUsR0FBRyxJQUFJLDBDQUFtQixDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDN0QsS0FBSztZQUNMLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRztZQUNaLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSztZQUNyQixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7U0FDeEIsQ0FBQyxDQUFDO1FBRUgsVUFBVTtRQUNWLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3JDLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUc7WUFDbEIsV0FBVyxFQUFFLDBCQUEwQjtTQUN4QyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNwQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVO1lBQy9CLFdBQVcsRUFBRSxzQkFBc0I7U0FDcEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0I7WUFDM0MsV0FBVyxFQUFFLDZCQUE2QjtTQUMzQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQzFDLEtBQUssRUFBRSxPQUFPLENBQUMsWUFBWSxDQUFDLHNCQUFzQjtZQUNsRCxXQUFXLEVBQUUsZ0NBQWdDO1NBQzlDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ3RDLEtBQUssRUFBRSxVQUFVLENBQUMsU0FBUyxDQUFDLFlBQVk7WUFDeEMsV0FBVyxFQUFFLDBCQUEwQjtTQUN4QyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUF6RUQsd0NBeUVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgRGF0YWJhc2VDb25zdHJ1Y3QgfSBmcm9tICcuL2NvbnN0cnVjdHMvZGF0YWJhc2UtY29uc3RydWN0JztcbmltcG9ydCB7IEFwaUNvbnN0cnVjdCB9IGZyb20gJy4vY29uc3RydWN0cy9hcGktY29uc3RydWN0JztcbmltcG9ydCB7IEF1dGhDb25zdHJ1Y3QgfSBmcm9tICcuL2NvbnN0cnVjdHMvYXV0aC1jb25zdHJ1Y3QnO1xuaW1wb3J0IHsgU3RvcmFnZUNvbnN0cnVjdCB9IGZyb20gJy4vY29uc3RydWN0cy9zdG9yYWdlLWNvbnN0cnVjdCc7XG5pbXBvcnQgeyBFbWFpbENvbnN0cnVjdCB9IGZyb20gJy4vY29uc3RydWN0cy9lbWFpbC1jb25zdHJ1Y3QnO1xuaW1wb3J0IHsgTW9uaXRvcmluZ0NvbnN0cnVjdCB9IGZyb20gJy4vY29uc3RydWN0cy9tb25pdG9yaW5nLWNvbnN0cnVjdCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRWR1UmV0YWluU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgc3RhZ2U6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIEVkdVJldGFpblN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEVkdVJldGFpblN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHsgc3RhZ2UgfSA9IHByb3BzO1xuXG4gICAgLy8gRGF0YWJhc2UgKER5bmFtb0RCKVxuICAgIGNvbnN0IGRhdGFiYXNlID0gbmV3IERhdGFiYXNlQ29uc3RydWN0KHRoaXMsICdEYXRhYmFzZScsIHtcbiAgICAgIHN0YWdlLFxuICAgICAgdGFibGVOYW1lOiBgZWR1cmV0YWluLSR7c3RhZ2V9YFxuICAgIH0pO1xuXG4gICAgLy8gQXV0aGVudGljYXRpb24gKENvZ25pdG8pXG4gICAgY29uc3QgYXV0aCA9IG5ldyBBdXRoQ29uc3RydWN0KHRoaXMsICdBdXRoJywge1xuICAgICAgc3RhZ2UsXG4gICAgICB1c2VyUG9vbE5hbWU6IGBlZHVyZXRhaW4tdXNlcnMtJHtzdGFnZX1gXG4gICAgfSk7XG5cbiAgICAvLyBTdG9yYWdlIChTMyArIENsb3VkRnJvbnQpXG4gICAgY29uc3Qgc3RvcmFnZSA9IG5ldyBTdG9yYWdlQ29uc3RydWN0KHRoaXMsICdTdG9yYWdlJywge1xuICAgICAgc3RhZ2UsXG4gICAgICBidWNrZXROYW1lOiBgZWR1cmV0YWluLXN0b3JhZ2UtJHtzdGFnZX1gXG4gICAgfSk7XG5cbiAgICAvLyBFbWFpbCBTZXJ2aWNlIChTRVMpXG4gICAgY29uc3QgZW1haWwgPSBuZXcgRW1haWxDb25zdHJ1Y3QodGhpcywgJ0VtYWlsJywge1xuICAgICAgc3RhZ2UsXG4gICAgICBkb21haW5OYW1lOiBzdGFnZSA9PT0gJ3Byb2QnID8gJ2VkdXJldGFpbi5jb20nIDogYCR7c3RhZ2V9LmVkdXJldGFpbi5jb21gXG4gICAgfSk7XG5cbiAgICAvLyBBUEkgR2F0ZXdheSArIExhbWJkYSBGdW5jdGlvbnNcbiAgICBjb25zdCBhcGkgPSBuZXcgQXBpQ29uc3RydWN0KHRoaXMsICdBcGknLCB7XG4gICAgICBzdGFnZSxcbiAgICAgIHRhYmxlOiBkYXRhYmFzZS50YWJsZSxcbiAgICAgIHVzZXJQb29sOiBhdXRoLnVzZXJQb29sLFxuICAgICAgdXNlclBvb2xDbGllbnQ6IGF1dGgudXNlclBvb2xDbGllbnQsXG4gICAgICBzdG9yYWdlQnVja2V0OiBzdG9yYWdlLmJ1Y2tldFxuICAgIH0pO1xuXG4gICAgLy8gTW9uaXRvcmluZyAoQ2xvdWRXYXRjaCArIFgtUmF5KVxuICAgIGNvbnN0IG1vbml0b3JpbmcgPSBuZXcgTW9uaXRvcmluZ0NvbnN0cnVjdCh0aGlzLCAnTW9uaXRvcmluZycsIHtcbiAgICAgIHN0YWdlLFxuICAgICAgYXBpOiBhcGkuYXBpLFxuICAgICAgdGFibGU6IGRhdGFiYXNlLnRhYmxlLFxuICAgICAgdXNlclBvb2w6IGF1dGgudXNlclBvb2xcbiAgICB9KTtcblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpRW5kcG9pbnQnLCB7XG4gICAgICB2YWx1ZTogYXBpLmFwaS51cmwsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IGVuZHBvaW50IFVSTCdcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbElkJywge1xuICAgICAgdmFsdWU6IGF1dGgudXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgSUQnXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xDbGllbnRJZCcsIHtcbiAgICAgIHZhbHVlOiBhdXRoLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIENsaWVudCBJRCdcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbG91ZEZyb250RG9tYWluJywge1xuICAgICAgdmFsdWU6IHN0b3JhZ2UuZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIGRvbWFpbidcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEYXNoYm9hcmRVcmwnLCB7XG4gICAgICB2YWx1ZTogbW9uaXRvcmluZy5kYXNoYm9hcmQuZGFzaGJvYXJkQXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZFdhdGNoIERhc2hib2FyZCBVUkwnXG4gICAgfSk7XG4gIH1cbn0iXX0=