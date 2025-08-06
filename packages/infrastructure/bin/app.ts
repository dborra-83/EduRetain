#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EduRetainStack } from '../lib/eduretain-stack';

const app = new cdk.App();

// Configuración por ambiente
const environments = {
  dev: {
    account: process.env.AWS_ACCOUNT_ID_DEV,
    region: process.env.AWS_REGION || 'us-east-1'
  },
  prod: {
    account: process.env.AWS_ACCOUNT_ID_PROD,
    region: process.env.AWS_REGION || 'us-east-1'
  }
};

// Deploy Dev Stack
new EduRetainStack(app, 'EduRetainDev', {
  env: environments.dev,
  stage: 'dev',
  tags: {
    Environment: 'Development',
    Project: 'EduRetain',
    ManagedBy: 'CDK'
  }
});

// Deploy Prod Stack
new EduRetainStack(app, 'EduRetainProd', {
  env: environments.prod,
  stage: 'prod',
  tags: {
    Environment: 'Production',
    Project: 'EduRetain',
    ManagedBy: 'CDK'
  }
});