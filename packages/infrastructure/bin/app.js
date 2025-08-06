#!/usr/bin/env node
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
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const eduretain_stack_1 = require("../lib/eduretain-stack");
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
new eduretain_stack_1.EduRetainStack(app, 'EduRetainDev', {
    env: environments.dev,
    stage: 'dev',
    tags: {
        Environment: 'Development',
        Project: 'EduRetain',
        ManagedBy: 'CDK'
    }
});
// Deploy Prod Stack
new eduretain_stack_1.EduRetainStack(app, 'EduRetainProd', {
    env: environments.prod,
    stage: 'prod',
    tags: {
        Environment: 'Production',
        Project: 'EduRetain',
        ManagedBy: 'CDK'
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHVDQUFxQztBQUNyQyxpREFBbUM7QUFDbkMsNERBQXdEO0FBRXhELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLDZCQUE2QjtBQUM3QixNQUFNLFlBQVksR0FBRztJQUNuQixHQUFHLEVBQUU7UUFDSCxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0I7UUFDdkMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVc7S0FDOUM7SUFDRCxJQUFJLEVBQUU7UUFDSixPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7UUFDeEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVc7S0FDOUM7Q0FDRixDQUFDO0FBRUYsbUJBQW1CO0FBQ25CLElBQUksZ0NBQWMsQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFO0lBQ3RDLEdBQUcsRUFBRSxZQUFZLENBQUMsR0FBRztJQUNyQixLQUFLLEVBQUUsS0FBSztJQUNaLElBQUksRUFBRTtRQUNKLFdBQVcsRUFBRSxhQUFhO1FBQzFCLE9BQU8sRUFBRSxXQUFXO1FBQ3BCLFNBQVMsRUFBRSxLQUFLO0tBQ2pCO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsb0JBQW9CO0FBQ3BCLElBQUksZ0NBQWMsQ0FBQyxHQUFHLEVBQUUsZUFBZSxFQUFFO0lBQ3ZDLEdBQUcsRUFBRSxZQUFZLENBQUMsSUFBSTtJQUN0QixLQUFLLEVBQUUsTUFBTTtJQUNiLElBQUksRUFBRTtRQUNKLFdBQVcsRUFBRSxZQUFZO1FBQ3pCLE9BQU8sRUFBRSxXQUFXO1FBQ3BCLFNBQVMsRUFBRSxLQUFLO0tBQ2pCO0NBQ0YsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IEVkdVJldGFpblN0YWNrIH0gZnJvbSAnLi4vbGliL2VkdXJldGFpbi1zdGFjayc7XG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG5cbi8vIENvbmZpZ3VyYWNpw7NuIHBvciBhbWJpZW50ZVxuY29uc3QgZW52aXJvbm1lbnRzID0ge1xuICBkZXY6IHtcbiAgICBhY2NvdW50OiBwcm9jZXNzLmVudi5BV1NfQUNDT1VOVF9JRF9ERVYsXG4gICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnXG4gIH0sXG4gIHByb2Q6IHtcbiAgICBhY2NvdW50OiBwcm9jZXNzLmVudi5BV1NfQUNDT1VOVF9JRF9QUk9ELFxuICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJ1xuICB9XG59O1xuXG4vLyBEZXBsb3kgRGV2IFN0YWNrXG5uZXcgRWR1UmV0YWluU3RhY2soYXBwLCAnRWR1UmV0YWluRGV2Jywge1xuICBlbnY6IGVudmlyb25tZW50cy5kZXYsXG4gIHN0YWdlOiAnZGV2JyxcbiAgdGFnczoge1xuICAgIEVudmlyb25tZW50OiAnRGV2ZWxvcG1lbnQnLFxuICAgIFByb2plY3Q6ICdFZHVSZXRhaW4nLFxuICAgIE1hbmFnZWRCeTogJ0NESydcbiAgfVxufSk7XG5cbi8vIERlcGxveSBQcm9kIFN0YWNrXG5uZXcgRWR1UmV0YWluU3RhY2soYXBwLCAnRWR1UmV0YWluUHJvZCcsIHtcbiAgZW52OiBlbnZpcm9ubWVudHMucHJvZCxcbiAgc3RhZ2U6ICdwcm9kJyxcbiAgdGFnczoge1xuICAgIEVudmlyb25tZW50OiAnUHJvZHVjdGlvbicsXG4gICAgUHJvamVjdDogJ0VkdVJldGFpbicsXG4gICAgTWFuYWdlZEJ5OiAnQ0RLJ1xuICB9XG59KTsiXX0=