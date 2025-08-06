import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DatabaseConstruct } from './constructs/database-construct';
import { ApiConstruct } from './constructs/api-construct';
import { AuthConstruct } from './constructs/auth-construct';
import { StorageConstruct } from './constructs/storage-construct';
import { EmailConstruct } from './constructs/email-construct';
import { MonitoringConstruct } from './constructs/monitoring-construct';

export interface EduRetainStackProps extends cdk.StackProps {
  stage: string;
}

export class EduRetainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EduRetainStackProps) {
    super(scope, id, props);

    const { stage } = props;

    // Database (DynamoDB)
    const database = new DatabaseConstruct(this, 'Database', {
      stage,
      tableName: `eduretain-${stage}`
    });

    // Authentication (Cognito)
    const auth = new AuthConstruct(this, 'Auth', {
      stage,
      userPoolName: `eduretain-users-${stage}`
    });

    // Storage (S3 + CloudFront)
    const storage = new StorageConstruct(this, 'Storage', {
      stage,
      bucketName: `eduretain-storage-${stage}`
    });

    // Email Service (SES)
    const email = new EmailConstruct(this, 'Email', {
      stage,
      domainName: stage === 'prod' ? 'eduretain.com' : `${stage}.eduretain.com`
    });

    // API Gateway + Lambda Functions
    const api = new ApiConstruct(this, 'Api', {
      stage,
      table: database.table,
      userPool: auth.userPool,
      userPoolClient: auth.userPoolClient,
      storageBucket: storage.bucket
    });

    // Monitoring (CloudWatch + X-Ray)
    const monitoring = new MonitoringConstruct(this, 'Monitoring', {
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