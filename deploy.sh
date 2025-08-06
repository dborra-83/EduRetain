#!/bin/bash

# EduRetain Deployment Script
# Despliega la aplicación completa en AWS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
STAGE="dev"
AWS_PROFILE=""
SKIP_BUILD=false
DEPLOY_FRONTEND=true
DEPLOY_BACKEND=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --stage)
      STAGE="$2"
      shift 2
      ;;
    --profile)
      AWS_PROFILE="$2"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --backend-only)
      DEPLOY_FRONTEND=false
      shift
      ;;
    --frontend-only)
      DEPLOY_BACKEND=false
      shift
      ;;
    --help)
      echo "EduRetain Deployment Script"
      echo ""
      echo "Usage: ./deploy.sh [options]"
      echo ""
      echo "Options:"
      echo "  --stage STAGE        Deployment stage (dev, prod). Default: dev"
      echo "  --profile PROFILE    AWS profile to use"
      echo "  --skip-build        Skip building packages"
      echo "  --backend-only      Deploy only backend infrastructure"
      echo "  --frontend-only     Deploy only frontend"
      echo "  --help              Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./deploy.sh --stage dev --profile eduretain-dev"
      echo "  ./deploy.sh --stage prod --profile eduretain-prod --backend-only"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Validate stage
if [[ "$STAGE" != "dev" && "$STAGE" != "prod" ]]; then
  echo -e "${RED}Error: Stage must be 'dev' or 'prod'${NC}"
  exit 1
fi

# Set AWS profile if provided
if [[ -n "$AWS_PROFILE" ]]; then
  export AWS_PROFILE="$AWS_PROFILE"
fi

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}    EduRetain Deployment Script       ${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "${YELLOW}Stage: $STAGE${NC}"
echo -e "${YELLOW}AWS Profile: ${AWS_PROFILE:-default}${NC}"
echo -e "${YELLOW}Deploy Backend: $DEPLOY_BACKEND${NC}"
echo -e "${YELLOW}Deploy Frontend: $DEPLOY_FRONTEND${NC}"
echo ""

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo -e "${RED}Error: AWS CLI is not installed${NC}"
  exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
  echo -e "${RED}Error: AWS CDK is not installed${NC}"
  echo -e "${YELLOW}Install with: npm install -g aws-cdk${NC}"
  exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed${NC}"
  exit 1
fi

# Verify AWS credentials
echo -e "${BLUE}Verifying AWS credentials...${NC}"
if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo -e "${RED}Error: AWS credentials not configured or invalid${NC}"
  exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region || echo "us-east-1")
echo -e "${GREEN}✓ AWS Account: $ACCOUNT_ID${NC}"
echo -e "${GREEN}✓ Region: $REGION${NC}"

# Install dependencies and build
if [[ "$SKIP_BUILD" == false ]]; then
  echo -e "${BLUE}Installing dependencies...${NC}"
  npm install
  
  echo -e "${BLUE}Building packages...${NC}"
  npm run build --workspace=shared
  npm run build --workspace=backend
  npm run build --workspace=frontend
  
  echo -e "${GREEN}✓ Build completed${NC}"
fi

# Deploy backend infrastructure
if [[ "$DEPLOY_BACKEND" == true ]]; then
  echo -e "${BLUE}Deploying backend infrastructure...${NC}"
  
  cd packages/infrastructure
  
  # Set environment variables
  export AWS_ACCOUNT_ID_DEV="$ACCOUNT_ID"
  export AWS_ACCOUNT_ID_PROD="$ACCOUNT_ID"
  export AWS_REGION="$REGION"
  
  # Bootstrap CDK if needed
  echo -e "${YELLOW}Bootstrapping CDK environment...${NC}"
  cdk bootstrap "aws://$ACCOUNT_ID/$REGION"
  
  # Deploy stack
  echo -e "${YELLOW}Deploying EduRetain${STAGE^} stack...${NC}"
  cdk deploy "EduRetain${STAGE^}" --require-approval never
  
  # Get stack outputs
  STACK_OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name "EduRetain${STAGE^}" \
    --query 'Stacks[0].Outputs' \
    --output json)
  
  API_ENDPOINT=$(echo "$STACK_OUTPUTS" | jq -r '.[] | select(.OutputKey=="ApiEndpoint") | .OutputValue')
  USER_POOL_ID=$(echo "$STACK_OUTPUTS" | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
  USER_POOL_CLIENT_ID=$(echo "$STACK_OUTPUTS" | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')
  CLOUDFRONT_DOMAIN=$(echo "$STACK_OUTPUTS" | jq -r '.[] | select(.OutputKey=="CloudFrontDomain") | .OutputValue')
  
  echo -e "${GREEN}✓ Backend infrastructure deployed${NC}"
  echo -e "${YELLOW}API Endpoint: $API_ENDPOINT${NC}"
  echo -e "${YELLOW}CloudFront Domain: $CLOUDFRONT_DOMAIN${NC}"
  
  # Save environment variables for frontend
  cat > ../../.env.local << EOF
NEXT_PUBLIC_API_URL=$API_ENDPOINT
NEXT_PUBLIC_USER_POOL_ID=$USER_POOL_ID
NEXT_PUBLIC_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
NEXT_PUBLIC_AWS_REGION=$REGION
NEXT_PUBLIC_STAGE=$STAGE
EOF
  
  cd ../..
fi

# Deploy frontend
if [[ "$DEPLOY_FRONTEND" == true ]]; then
  echo -e "${BLUE}Deploying frontend...${NC}"
  
  cd packages/frontend
  
  # Load environment variables
  if [[ -f "../../.env.local" ]]; then
    export $(cat ../../.env.local | xargs)
  else
    echo -e "${YELLOW}Warning: No .env.local found, using existing environment${NC}"
  fi
  
  # Build and export frontend
  echo -e "${YELLOW}Building frontend for production...${NC}"
  npm run build
  npm run export
  
  # Upload to S3
  if [[ -n "$CLOUDFRONT_DOMAIN" ]]; then
    BUCKET_NAME="eduretain-storage-$STAGE"
    
    echo -e "${YELLOW}Uploading to S3 bucket: $BUCKET_NAME${NC}"
    aws s3 sync out/ "s3://$BUCKET_NAME/" --delete
    
    # Invalidate CloudFront cache
    DISTRIBUTION_ID=$(aws cloudfront list-distributions \
      --query "DistributionList.Items[?Comment=='EduRetain $STAGE Distribution'].Id" \
      --output text)
    
    if [[ -n "$DISTRIBUTION_ID" && "$DISTRIBUTION_ID" != "None" ]]; then
      echo -e "${YELLOW}Invalidating CloudFront cache...${NC}"
      aws cloudfront create-invalidation \
        --distribution-id "$DISTRIBUTION_ID" \
        --paths "/*" >/dev/null
      
      echo -e "${GREEN}✓ Frontend deployed to CloudFront${NC}"
      echo -e "${YELLOW}Frontend URL: https://$CLOUDFRONT_DOMAIN${NC}"
    fi
  else
    echo -e "${YELLOW}Warning: CloudFront domain not available, skipping frontend upload${NC}"
  fi
  
  cd ../..
fi

# Deployment summary
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}       Deployment Summary             ${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}✓ Deployment completed successfully${NC}"
echo ""
echo -e "${YELLOW}Environment: $STAGE${NC}"
echo -e "${YELLOW}AWS Account: $ACCOUNT_ID${NC}"
echo -e "${YELLOW}Region: $REGION${NC}"
echo ""

if [[ "$DEPLOY_BACKEND" == true ]]; then
  echo -e "${YELLOW}Backend Services:${NC}"
  echo -e "  API Endpoint: $API_ENDPOINT"
  echo -e "  User Pool ID: $USER_POOL_ID"
  echo ""
fi

if [[ "$DEPLOY_FRONTEND" == true && -n "$CLOUDFRONT_DOMAIN" ]]; then
  echo -e "${YELLOW}Frontend:${NC}"
  echo -e "  URL: https://$CLOUDFRONT_DOMAIN"
  echo ""
fi

echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Create initial users in Cognito User Pool"
echo -e "  2. Configure domain name (if using custom domain)"
echo -e "  3. Set up monitoring alerts"
echo -e "  4. Configure SES for email sending"
echo ""
echo -e "${GREEN}🚀 EduRetain is ready to use!${NC}"