import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

export interface MonitoringConstructProps {
  stage: string;
  api: apigateway.RestApi;
  table: dynamodb.Table;
  userPool: cognito.UserPool;
}

export class MonitoringConstruct extends Construct {
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: MonitoringConstructProps) {
    super(scope, id);

    const { stage, api, table, userPool } = props;

    // SNS Topic para alarmas
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `eduretain-alarms-${stage}`,
      displayName: `EduRetain Alerts - ${stage.toUpperCase()}`
    });

    // Suscripción de email para alarmas (configurar email en runtime)
    if (stage === 'prod') {
      // En producción, se debe configurar manualmente o vía parámetros
      // this.alarmTopic.addSubscription(new subscriptions.EmailSubscription('admin@eduretain.com'));
    }

    // CloudWatch Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `EduRetain-${stage}`,
      defaultInterval: cdk.Duration.hours(1)
    });

    // Métricas y widgets
    this.createApiMetrics(api);
    this.createDatabaseMetrics(table);
    this.createAuthMetrics(userPool);
    this.createBusinessMetrics();
    this.createAlarms(api, table);

    // Log Groups con retención
    new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName: `/aws/apigateway/eduretain-${stage}`,
      retention: stage === 'prod' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Tags
    cdk.Tags.of(this.dashboard).add('Component', 'Monitoring');
    cdk.Tags.of(this.dashboard).add('Stage', stage);
  }

  private createApiMetrics(api: apigateway.RestApi) {
    // Widget de métricas de API Gateway
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Requests',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Count',
            dimensionsMap: {
              ApiName: api.restApiName
            },
            statistic: 'Sum'
          })
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: '4XXError',
            dimensionsMap: {
              ApiName: api.restApiName
            },
            statistic: 'Sum'
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: '5XXError',
            dimensionsMap: {
              ApiName: api.restApiName
            },
            statistic: 'Sum'
          })
        ],
        width: 12,
        height: 6
      })
    );

    // Widget de latencia
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Latency',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Latency',
            dimensionsMap: {
              ApiName: api.restApiName
            },
            statistic: 'Average'
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'IntegrationLatency',
            dimensionsMap: {
              ApiName: api.restApiName
            },
            statistic: 'Average'
          })
        ],
        width: 12,
        height: 6
      })
    );
  }

  private createDatabaseMetrics(table: dynamodb.Table) {
    // Widget de métricas de DynamoDB
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - Read/Write Capacity',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ConsumedReadCapacityUnits',
            dimensionsMap: {
              TableName: table.tableName
            },
            statistic: 'Sum'
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ConsumedWriteCapacityUnits',
            dimensionsMap: {
              TableName: table.tableName
            },
            statistic: 'Sum'
          })
        ],
        width: 12,
        height: 6
      })
    );

    // Widget de errores de DynamoDB
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - Errors & Throttles',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ThrottledRequests',
            dimensionsMap: {
              TableName: table.tableName
            },
            statistic: 'Sum'
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'UserErrors',
            dimensionsMap: {
              TableName: table.tableName
            },
            statistic: 'Sum'
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'SystemErrors',
            dimensionsMap: {
              TableName: table.tableName
            },
            statistic: 'Sum'
          })
        ],
        width: 12,
        height: 6
      })
    );
  }

  private createAuthMetrics(userPool: cognito.UserPool) {
    // Widget de métricas de Cognito
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Cognito - Authentication',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Cognito',
            metricName: 'SignInSuccesses',
            dimensionsMap: {
              UserPool: userPool.userPoolId
            },
            statistic: 'Sum'
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/Cognito',
            metricName: 'SignUpSuccesses',
            dimensionsMap: {
              UserPool: userPool.userPoolId
            },
            statistic: 'Sum'
          })
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/Cognito',
            metricName: 'SignInThrottles',
            dimensionsMap: {
              UserPool: userPool.userPoolId
            },
            statistic: 'Sum'
          })
        ],
        width: 12,
        height: 6
      })
    );
  }

  private createBusinessMetrics() {
    // Métricas custom del negocio
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Business Metrics - Students',
        left: [
          new cloudwatch.Metric({
            namespace: 'EduRetain',
            metricName: 'TotalStudents',
            statistic: 'Average'
          }),
          new cloudwatch.Metric({
            namespace: 'EduRetain',
            metricName: 'StudentsAtRisk',
            statistic: 'Average'
          })
        ],
        width: 12,
        height: 6
      })
    );

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Business Metrics - Campaigns',
        left: [
          new cloudwatch.Metric({
            namespace: 'EduRetain',
            metricName: 'CampaignsSent',
            statistic: 'Sum'
          }),
          new cloudwatch.Metric({
            namespace: 'EduRetain',
            metricName: 'EmailsDelivered',
            statistic: 'Sum'
          })
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'EduRetain',
            metricName: 'EmailOpenRate',
            statistic: 'Average'
          }),
          new cloudwatch.Metric({
            namespace: 'EduRetain',
            metricName: 'EmailClickRate',
            statistic: 'Average'
          })
        ],
        width: 12,
        height: 6
      })
    );
  }

  private createAlarms(api: apigateway.RestApi, table: dynamodb.Table) {
    // Alarma para errores 5XX en API Gateway
    const apiErrorAlarm = new cloudwatch.Alarm(this, 'ApiErrorAlarm', {
      alarmName: `EduRetain-API-5XX-Errors-${api.restApiName}`,
      alarmDescription: 'High number of 5XX errors in API Gateway',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        dimensionsMap: {
          ApiName: api.restApiName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    apiErrorAlarm.addAlarmAction({
      bind: () => ({ alarmActionArn: this.alarmTopic.topicArn })
    });

    // Alarma para alta latencia en API Gateway
    const apiLatencyAlarm = new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
      alarmName: `EduRetain-API-High-Latency-${api.restApiName}`,
      alarmDescription: 'High latency in API Gateway',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: 'Latency',
        dimensionsMap: {
          ApiName: api.restApiName
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 5000, // 5 segundos
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    apiLatencyAlarm.addAlarmAction({
      bind: () => ({ alarmActionArn: this.alarmTopic.topicArn })
    });

    // Alarma para throttling en DynamoDB
    const ddbThrottleAlarm = new cloudwatch.Alarm(this, 'DdbThrottleAlarm', {
      alarmName: `EduRetain-DDB-Throttling-${table.tableName}`,
      alarmDescription: 'DynamoDB throttling detected',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'ThrottledRequests',
        dimensionsMap: {
          TableName: table.tableName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(1)
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD
    });

    ddbThrottleAlarm.addAlarmAction({
      bind: () => ({ alarmActionArn: this.alarmTopic.topicArn })
    });

    // Alarma para errores de sistema en DynamoDB
    const ddbErrorAlarm = new cloudwatch.Alarm(this, 'DdbErrorAlarm', {
      alarmName: `EduRetain-DDB-System-Errors-${table.tableName}`,
      alarmDescription: 'DynamoDB system errors detected',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'SystemErrors',
        dimensionsMap: {
          TableName: table.tableName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD
    });

    ddbErrorAlarm.addAlarmAction({
      bind: () => ({ alarmActionArn: this.alarmTopic.topicArn })
    });
  }
}