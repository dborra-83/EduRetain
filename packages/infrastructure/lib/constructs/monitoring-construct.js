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
exports.MonitoringConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const sns = __importStar(require("aws-cdk-lib/aws-sns"));
const constructs_1 = require("constructs");
class MonitoringConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
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
    createApiMetrics(api) {
        // Widget de métricas de API Gateway
        this.dashboard.addWidgets(new cloudwatch.GraphWidget({
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
        }));
        // Widget de latencia
        this.dashboard.addWidgets(new cloudwatch.GraphWidget({
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
        }));
    }
    createDatabaseMetrics(table) {
        // Widget de métricas de DynamoDB
        this.dashboard.addWidgets(new cloudwatch.GraphWidget({
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
        }));
        // Widget de errores de DynamoDB
        this.dashboard.addWidgets(new cloudwatch.GraphWidget({
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
        }));
    }
    createAuthMetrics(userPool) {
        // Widget de métricas de Cognito
        this.dashboard.addWidgets(new cloudwatch.GraphWidget({
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
        }));
    }
    createBusinessMetrics() {
        // Métricas custom del negocio
        this.dashboard.addWidgets(new cloudwatch.GraphWidget({
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
        }));
        this.dashboard.addWidgets(new cloudwatch.GraphWidget({
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
        }));
    }
    createAlarms(api, table) {
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
exports.MonitoringConstruct = MonitoringConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uaXRvcmluZy1jb25zdHJ1Y3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtb25pdG9yaW5nLWNvbnN0cnVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsdUVBQXlEO0FBSXpELDJEQUE2QztBQUM3Qyx5REFBMkM7QUFFM0MsMkNBQXVDO0FBU3ZDLE1BQWEsbUJBQW9CLFNBQVEsc0JBQVM7SUFJaEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUErQjtRQUN2RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFOUMseUJBQXlCO1FBQ3pCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDbEQsU0FBUyxFQUFFLG9CQUFvQixLQUFLLEVBQUU7WUFDdEMsV0FBVyxFQUFFLHNCQUFzQixLQUFLLENBQUMsV0FBVyxFQUFFLEVBQUU7U0FDekQsQ0FBQyxDQUFDO1FBRUgsa0VBQWtFO1FBQ2xFLElBQUksS0FBSyxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ3JCLGlFQUFpRTtZQUNqRSwrRkFBK0Y7UUFDakcsQ0FBQztRQUVELHVCQUF1QjtRQUN2QixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFO1lBQzNELGFBQWEsRUFBRSxhQUFhLEtBQUssRUFBRTtZQUNuQyxlQUFlLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQ3ZDLENBQUMsQ0FBQztRQUVILHFCQUFxQjtRQUNyQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxD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Q0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzthQUNoQyxDQUFDO1lBQ0YsU0FBUyxFQUFFLENBQUM7WUFDWixpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxrQ0FBa0M7U0FDckYsQ0FBQyxDQUFDO1FBRUgsYUFBYSxDQUFDLGNBQWMsQ0FBQztZQUMzQixJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO1NBQzNELENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXhXRCxrREF3V0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgY2xvdWR3YXRjaCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWR3YXRjaCc7XG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5JztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xuaW1wb3J0ICogYXMgc25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zbnMnO1xuaW1wb3J0ICogYXMgc3Vic2NyaXB0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc25zLXN1YnNjcmlwdGlvbnMnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTW9uaXRvcmluZ0NvbnN0cnVjdFByb3BzIHtcbiAgc3RhZ2U6IHN0cmluZztcbiAgYXBpOiBhcGlnYXRld2F5LlJlc3RBcGk7XG4gIHRhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2w7XG59XG5cbmV4cG9ydCBjbGFzcyBNb25pdG9yaW5nQ29uc3RydWN0IGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IGRhc2hib2FyZDogY2xvdWR3YXRjaC5EYXNoYm9hcmQ7XG4gIHB1YmxpYyByZWFkb25seSBhbGFybVRvcGljOiBzbnMuVG9waWM7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IE1vbml0b3JpbmdDb25zdHJ1Y3RQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCB7IHN0YWdlLCBhcGksIHRhYmxlLCB1c2VyUG9vbCB9ID0gcHJvcHM7XG5cbiAgICAvLyBTTlMgVG9waWMgcGFyYSBhbGFybWFzXG4gICAgdGhpcy5hbGFybVRvcGljID0gbmV3IHNucy5Ub3BpYyh0aGlzLCAnQWxhcm1Ub3BpYycsIHtcbiAgICAgIHRvcGljTmFtZTogYGVkdXJldGFpbi1hbGFybXMtJHtzdGFnZX1gLFxuICAgICAgZGlzcGxheU5hbWU6IGBFZHVSZXRhaW4gQWxlcnRzIC0gJHtzdGFnZS50b1VwcGVyQ2FzZSgpfWBcbiAgICB9KTtcblxuICAgIC8vIFN1c2NyaXBjacOzbiBkZSBlbWFpbCBwYXJhIGFsYXJtYXMgKGNvbmZpZ3VyYXIgZW1haWwgZW4gcnVudGltZSlcbiAgICBpZiAoc3RhZ2UgPT09ICdwcm9kJykge1xuICAgICAgLy8gRW4gcHJvZHVjY2nDs24sIHNlIGRlYmUgY29uZmlndXJhciBtYW51YWxtZW50ZSBvIHbDrWEgcGFyw6FtZXRyb3NcbiAgICAgIC8vIHRoaXMuYWxhcm1Ub3BpYy5hZGRTdWJzY3JpcHRpb24obmV3IHN1YnNjcmlwdGlvbnMuRW1haWxTdWJzY3JpcHRpb24oJ2FkbWluQGVkdXJldGFpbi5jb20nKSk7XG4gICAgfVxuXG4gICAgLy8gQ2xvdWRXYXRjaCBEYXNoYm9hcmRcbiAgICB0aGlzLmRhc2hib2FyZCA9IG5ldyBjbG91ZHdhdGNoLkRhc2hib2FyZCh0aGlzLCAnRGFzaGJvYXJkJywge1xuICAgICAgZGFzaGJvYXJkTmFtZTogYEVkdVJldGFpbi0ke3N0YWdlfWAsXG4gICAgICBkZWZhdWx0SW50ZXJ2YWw6IGNkay5EdXJhdGlvbi5ob3VycygxKVxuICAgIH0pO1xuXG4gICAgLy8gTcOpdHJpY2FzIHkgd2lkZ2V0c1xuICAgIHRoaXMuY3JlYXRlQXBpTWV0cmljcyhhcGkpO1xuICAgIHRoaXMuY3JlYXRlRGF0YWJhc2VNZXRyaWNzKHRhYmxlKTtcbiAgICB0aGlzLmNyZWF0ZUF1dGhNZXRyaWNzKHVzZXJQb29sKTtcbiAgICB0aGlzLmNyZWF0ZUJ1c2luZXNzTWV0cmljcygpO1xuICAgIHRoaXMuY3JlYXRlQWxhcm1zKGFwaSwgdGFibGUpO1xuXG4gICAgLy8gTG9nIEdyb3VwcyBjb24gcmV0ZW5jacOzblxuICAgIG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdBcGlMb2dHcm91cCcsIHtcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC9hd3MvYXBpZ2F0ZXdheS9lZHVyZXRhaW4tJHtzdGFnZX1gLFxuICAgICAgcmV0ZW50aW9uOiBzdGFnZSA9PT0gJ3Byb2QnID8gbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9NT05USCA6IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IHN0YWdlID09PSAncHJvZCcgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZXG4gICAgfSk7XG5cbiAgICAvLyBUYWdzXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5kYXNoYm9hcmQpLmFkZCgnQ29tcG9uZW50JywgJ01vbml0b3JpbmcnKTtcbiAgICBjZGsuVGFncy5vZih0aGlzLmRhc2hib2FyZCkuYWRkKCdTdGFnZScsIHN0YWdlKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQXBpTWV0cmljcyhhcGk6IGFwaWdhdGV3YXkuUmVzdEFwaSkge1xuICAgIC8vIFdpZGdldCBkZSBtw6l0cmljYXMgZGUgQVBJIEdhdGV3YXlcbiAgICB0aGlzLmRhc2hib2FyZC5hZGRXaWRnZXRzKFxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xuICAgICAgICB0aXRsZTogJ0FQSSBHYXRld2F5IC0gUmVxdWVzdHMnLFxuICAgICAgICBsZWZ0OiBbXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdDb3VudCcsXG4gICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgICAgICAgIEFwaU5hbWU6IGFwaS5yZXN0QXBpTmFtZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bSdcbiAgICAgICAgICB9KVxuICAgICAgICBdLFxuICAgICAgICByaWdodDogW1xuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQXBpR2F0ZXdheScsXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnNFhYRXJyb3InLFxuICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgICAgICBBcGlOYW1lOiBhcGkucmVzdEFwaU5hbWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICc1WFhFcnJvcicsXG4gICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgICAgICAgIEFwaU5hbWU6IGFwaS5yZXN0QXBpTmFtZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bSdcbiAgICAgICAgICB9KVxuICAgICAgICBdLFxuICAgICAgICB3aWR0aDogMTIsXG4gICAgICAgIGhlaWdodDogNlxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gV2lkZ2V0IGRlIGxhdGVuY2lhXG4gICAgdGhpcy5kYXNoYm9hcmQuYWRkV2lkZ2V0cyhcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcbiAgICAgICAgdGl0bGU6ICdBUEkgR2F0ZXdheSAtIExhdGVuY3knLFxuICAgICAgICBsZWZ0OiBbXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdMYXRlbmN5JyxcbiAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcbiAgICAgICAgICAgICAgQXBpTmFtZTogYXBpLnJlc3RBcGlOYW1lXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZSdcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwaUdhdGV3YXknLFxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0ludGVncmF0aW9uTGF0ZW5jeScsXG4gICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgICAgICAgIEFwaU5hbWU6IGFwaS5yZXN0QXBpTmFtZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnXG4gICAgICAgICAgfSlcbiAgICAgICAgXSxcbiAgICAgICAgd2lkdGg6IDEyLFxuICAgICAgICBoZWlnaHQ6IDZcbiAgICAgIH0pXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlRGF0YWJhc2VNZXRyaWNzKHRhYmxlOiBkeW5hbW9kYi5UYWJsZSkge1xuICAgIC8vIFdpZGdldCBkZSBtw6l0cmljYXMgZGUgRHluYW1vREJcbiAgICB0aGlzLmRhc2hib2FyZC5hZGRXaWRnZXRzKFxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xuICAgICAgICB0aXRsZTogJ0R5bmFtb0RCIC0gUmVhZC9Xcml0ZSBDYXBhY2l0eScsXG4gICAgICAgIGxlZnQ6IFtcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0R5bmFtb0RCJyxcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdDb25zdW1lZFJlYWRDYXBhY2l0eVVuaXRzJyxcbiAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcbiAgICAgICAgICAgICAgVGFibGVOYW1lOiB0YWJsZS50YWJsZU5hbWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9EeW5hbW9EQicsXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQ29uc3VtZWRXcml0ZUNhcGFjaXR5VW5pdHMnLFxuICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgICAgICBUYWJsZU5hbWU6IHRhYmxlLnRhYmxlTmFtZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bSdcbiAgICAgICAgICB9KVxuICAgICAgICBdLFxuICAgICAgICB3aWR0aDogMTIsXG4gICAgICAgIGhlaWdodDogNlxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gV2lkZ2V0IGRlIGVycm9yZXMgZGUgRHluYW1vREJcbiAgICB0aGlzLmRhc2hib2FyZC5hZGRXaWRnZXRzKFxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xuICAgICAgICB0aXRsZTogJ0R5bmFtb0RCIC0gRXJyb3JzICYgVGhyb3R0bGVzJyxcbiAgICAgICAgbGVmdDogW1xuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvRHluYW1vREInLFxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ1Rocm90dGxlZFJlcXVlc3RzJyxcbiAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcbiAgICAgICAgICAgICAgVGFibGVOYW1lOiB0YWJsZS50YWJsZU5hbWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9EeW5hbW9EQicsXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnVXNlckVycm9ycycsXG4gICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgICAgICAgIFRhYmxlTmFtZTogdGFibGUudGFibGVOYW1lXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJ1xuICAgICAgICAgIH0pLFxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvRHluYW1vREInLFxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ1N5c3RlbUVycm9ycycsXG4gICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgICAgICAgIFRhYmxlTmFtZTogdGFibGUudGFibGVOYW1lXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJ1xuICAgICAgICAgIH0pXG4gICAgICAgIF0sXG4gICAgICAgIHdpZHRoOiAxMixcbiAgICAgICAgaGVpZ2h0OiA2XG4gICAgICB9KVxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUF1dGhNZXRyaWNzKHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sKSB7XG4gICAgLy8gV2lkZ2V0IGRlIG3DqXRyaWNhcyBkZSBDb2duaXRvXG4gICAgdGhpcy5kYXNoYm9hcmQuYWRkV2lkZ2V0cyhcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcbiAgICAgICAgdGl0bGU6ICdDb2duaXRvIC0gQXV0aGVudGljYXRpb24nLFxuICAgICAgICBsZWZ0OiBbXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9Db2duaXRvJyxcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdTaWduSW5TdWNjZXNzZXMnLFxuICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgICAgICBVc2VyUG9vbDogdXNlclBvb2wudXNlclBvb2xJZFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bSdcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0NvZ25pdG8nLFxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ1NpZ25VcFN1Y2Nlc3NlcycsXG4gICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgICAgICAgIFVzZXJQb29sOiB1c2VyUG9vbC51c2VyUG9vbElkXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJ1xuICAgICAgICAgIH0pXG4gICAgICAgIF0sXG4gICAgICAgIHJpZ2h0OiBbXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9Db2duaXRvJyxcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdTaWduSW5UaHJvdHRsZXMnLFxuICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgICAgICBVc2VyUG9vbDogdXNlclBvb2wudXNlclBvb2xJZFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bSdcbiAgICAgICAgICB9KVxuICAgICAgICBdLFxuICAgICAgICB3aWR0aDogMTIsXG4gICAgICAgIGhlaWdodDogNlxuICAgICAgfSlcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVCdXNpbmVzc01ldHJpY3MoKSB7XG4gICAgLy8gTcOpdHJpY2FzIGN1c3RvbSBkZWwgbmVnb2Npb1xuICAgIHRoaXMuZGFzaGJvYXJkLmFkZFdpZGdldHMoXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XG4gICAgICAgIHRpdGxlOiAnQnVzaW5lc3MgTWV0cmljcyAtIFN0dWRlbnRzJyxcbiAgICAgICAgbGVmdDogW1xuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdFZHVSZXRhaW4nLFxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ1RvdGFsU3R1ZGVudHMnLFxuICAgICAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZSdcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xuICAgICAgICAgICAgbmFtZXNwYWNlOiAnRWR1UmV0YWluJyxcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdTdHVkZW50c0F0UmlzaycsXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJ1xuICAgICAgICAgIH0pXG4gICAgICAgIF0sXG4gICAgICAgIHdpZHRoOiAxMixcbiAgICAgICAgaGVpZ2h0OiA2XG4gICAgICB9KVxuICAgICk7XG5cbiAgICB0aGlzLmRhc2hib2FyZC5hZGRXaWRnZXRzKFxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xuICAgICAgICB0aXRsZTogJ0J1c2luZXNzIE1ldHJpY3MgLSBDYW1wYWlnbnMnLFxuICAgICAgICBsZWZ0OiBbXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0VkdVJldGFpbicsXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQ2FtcGFpZ25zU2VudCcsXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0VkdVJldGFpbicsXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnRW1haWxzRGVsaXZlcmVkJyxcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bSdcbiAgICAgICAgICB9KVxuICAgICAgICBdLFxuICAgICAgICByaWdodDogW1xuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdFZHVSZXRhaW4nLFxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0VtYWlsT3BlblJhdGUnLFxuICAgICAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZSdcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xuICAgICAgICAgICAgbmFtZXNwYWNlOiAnRWR1UmV0YWluJyxcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdFbWFpbENsaWNrUmF0ZScsXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJ1xuICAgICAgICAgIH0pXG4gICAgICAgIF0sXG4gICAgICAgIHdpZHRoOiAxMixcbiAgICAgICAgaGVpZ2h0OiA2XG4gICAgICB9KVxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUFsYXJtcyhhcGk6IGFwaWdhdGV3YXkuUmVzdEFwaSwgdGFibGU6IGR5bmFtb2RiLlRhYmxlKSB7XG4gICAgLy8gQWxhcm1hIHBhcmEgZXJyb3JlcyA1WFggZW4gQVBJIEdhdGV3YXlcbiAgICBjb25zdCBhcGlFcnJvckFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0FwaUVycm9yQWxhcm0nLCB7XG4gICAgICBhbGFybU5hbWU6IGBFZHVSZXRhaW4tQVBJLTVYWC1FcnJvcnMtJHthcGkucmVzdEFwaU5hbWV9YCxcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdIaWdoIG51bWJlciBvZiA1WFggZXJyb3JzIGluIEFQSSBHYXRld2F5JyxcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwaUdhdGV3YXknLFxuICAgICAgICBtZXRyaWNOYW1lOiAnNVhYRXJyb3InLFxuICAgICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgICAgQXBpTmFtZTogYXBpLnJlc3RBcGlOYW1lXG4gICAgICAgIH0sXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSlcbiAgICAgIH0pLFxuICAgICAgdGhyZXNob2xkOiAxMCxcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkdcbiAgICB9KTtcblxuICAgIGFwaUVycm9yQWxhcm0uYWRkQWxhcm1BY3Rpb24oe1xuICAgICAgYmluZDogKCkgPT4gKHsgYWxhcm1BY3Rpb25Bcm46IHRoaXMuYWxhcm1Ub3BpYy50b3BpY0FybiB9KVxuICAgIH0pO1xuXG4gICAgLy8gQWxhcm1hIHBhcmEgYWx0YSBsYXRlbmNpYSBlbiBBUEkgR2F0ZXdheVxuICAgIGNvbnN0IGFwaUxhdGVuY3lBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdBcGlMYXRlbmN5QWxhcm0nLCB7XG4gICAgICBhbGFybU5hbWU6IGBFZHVSZXRhaW4tQVBJLUhpZ2gtTGF0ZW5jeS0ke2FwaS5yZXN0QXBpTmFtZX1gLFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0hpZ2ggbGF0ZW5jeSBpbiBBUEkgR2F0ZXdheScsXG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcbiAgICAgICAgbWV0cmljTmFtZTogJ0xhdGVuY3knLFxuICAgICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgICAgQXBpTmFtZTogYXBpLnJlc3RBcGlOYW1lXG4gICAgICAgIH0sXG4gICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpXG4gICAgICB9KSxcbiAgICAgIHRocmVzaG9sZDogNTAwMCwgLy8gNSBzZWd1bmRvc1xuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDMsXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTERcbiAgICB9KTtcblxuICAgIGFwaUxhdGVuY3lBbGFybS5hZGRBbGFybUFjdGlvbih7XG4gICAgICBiaW5kOiAoKSA9PiAoeyBhbGFybUFjdGlvbkFybjogdGhpcy5hbGFybVRvcGljLnRvcGljQXJuIH0pXG4gICAgfSk7XG5cbiAgICAvLyBBbGFybWEgcGFyYSB0aHJvdHRsaW5nIGVuIER5bmFtb0RCXG4gICAgY29uc3QgZGRiVGhyb3R0bGVBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdEZGJUaHJvdHRsZUFsYXJtJywge1xuICAgICAgYWxhcm1OYW1lOiBgRWR1UmV0YWluLUREQi1UaHJvdHRsaW5nLSR7dGFibGUudGFibGVOYW1lfWAsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnRHluYW1vREIgdGhyb3R0bGluZyBkZXRlY3RlZCcsXG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgIG5hbWVzcGFjZTogJ0FXUy9EeW5hbW9EQicsXG4gICAgICAgIG1ldHJpY05hbWU6ICdUaHJvdHRsZWRSZXF1ZXN0cycsXG4gICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcbiAgICAgICAgICBUYWJsZU5hbWU6IHRhYmxlLnRhYmxlTmFtZVxuICAgICAgICB9LFxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDEpXG4gICAgICB9KSxcbiAgICAgIHRocmVzaG9sZDogMSxcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fT1JfRVFVQUxfVE9fVEhSRVNIT0xEXG4gICAgfSk7XG5cbiAgICBkZGJUaHJvdHRsZUFsYXJtLmFkZEFsYXJtQWN0aW9uKHtcbiAgICAgIGJpbmQ6ICgpID0+ICh7IGFsYXJtQWN0aW9uQXJuOiB0aGlzLmFsYXJtVG9waWMudG9waWNBcm4gfSlcbiAgICB9KTtcblxuICAgIC8vIEFsYXJtYSBwYXJhIGVycm9yZXMgZGUgc2lzdGVtYSBlbiBEeW5hbW9EQlxuICAgIGNvbnN0IGRkYkVycm9yQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnRGRiRXJyb3JBbGFybScsIHtcbiAgICAgIGFsYXJtTmFtZTogYEVkdVJldGFpbi1EREItU3lzdGVtLUVycm9ycy0ke3RhYmxlLnRhYmxlTmFtZX1gLFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0R5bmFtb0RCIHN5c3RlbSBlcnJvcnMgZGV0ZWN0ZWQnLFxuICAgICAgbWV0cmljOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xuICAgICAgICBuYW1lc3BhY2U6ICdBV1MvRHluYW1vREInLFxuICAgICAgICBtZXRyaWNOYW1lOiAnU3lzdGVtRXJyb3JzJyxcbiAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgIFRhYmxlTmFtZTogdGFibGUudGFibGVOYW1lXG4gICAgICAgIH0sXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSlcbiAgICAgIH0pLFxuICAgICAgdGhyZXNob2xkOiAxLFxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9PUl9FUVVBTF9UT19USFJFU0hPTERcbiAgICB9KTtcblxuICAgIGRkYkVycm9yQWxhcm0uYWRkQWxhcm1BY3Rpb24oe1xuICAgICAgYmluZDogKCkgPT4gKHsgYWxhcm1BY3Rpb25Bcm46IHRoaXMuYWxhcm1Ub3BpYy50b3BpY0FybiB9KVxuICAgIH0pO1xuICB9XG59Il19