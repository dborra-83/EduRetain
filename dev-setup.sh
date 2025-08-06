#!/bin/bash

# EduRetain - Development Setup Script
# Configura el entorno de desarrollo local en puerto 4000

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}   EduRetain Development Setup        ${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || ! grep -q "eduretain" package.json; then
  echo -e "${RED}Error: Please run this script from the EduRetain root directory${NC}"
  exit 1
fi

# Check Node.js version
echo -e "${BLUE}Checking Node.js version...${NC}"
NODE_VERSION=$(node --version | sed 's/v//')
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1)

if [[ $MAJOR_VERSION -lt 18 ]]; then
  echo -e "${RED}Error: Node.js 18+ required. Current version: $NODE_VERSION${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js version: $NODE_VERSION${NC}"

# Check if dependencies are installed
echo -e "${BLUE}Checking dependencies...${NC}"
if [[ ! -d "node_modules" ]]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm run bootstrap
else
  echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# Check if .env.local exists
echo -e "${BLUE}Checking environment configuration...${NC}"
if [[ ! -f ".env.local" ]]; then
  if [[ -f ".env.local.example" ]]; then
    echo -e "${YELLOW}Creating .env.local from example...${NC}"
    cp .env.local.example .env.local
    echo -e "${YELLOW}⚠️  Please edit .env.local with your AWS configuration before running the app${NC}"
  else
    echo -e "${YELLOW}Creating .env.local from .env.example...${NC}"
    cp .env.example .env.local
    echo -e "${YELLOW}⚠️  Please edit .env.local with your AWS configuration before running the app${NC}"
  fi
else
  echo -e "${GREEN}✓ .env.local exists${NC}"
fi

# Show current configuration
echo -e "${BLUE}Current development configuration:${NC}"
echo -e "${YELLOW}Frontend Port: 4000 (default)${NC}"
echo -e "${YELLOW}Alternative Port: 3000 (use npm run dev:3000)${NC}"

# Check if port 4000 is available
echo -e "${BLUE}Checking port availability...${NC}"
if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Port 4000 is already in use${NC}"
  echo -e "${YELLOW}You can use port 3000 instead with: npm run dev:3000${NC}"
else
  echo -e "${GREEN}✓ Port 4000 is available${NC}"
fi

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}       Development Commands           ${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "${YELLOW}Frontend Development:${NC}"
echo -e "  npm run dev          # Start on port 4000"
echo -e "  npm run dev:3000     # Start on port 3000"
echo ""
echo -e "${YELLOW}Backend Deployment (required first):${NC}"
echo -e "  ./deploy.sh --stage dev --backend-only --profile your-aws-profile"
echo ""
echo -e "${YELLOW}Full Deployment:${NC}"
echo -e "  ./deploy.sh --stage dev --profile your-aws-profile"
echo ""
echo -e "${YELLOW}Other Commands:${NC}"
echo -e "  npm run build        # Build all packages"
echo -e "  npm run lint         # Lint all packages"
echo -e "  npm run clean        # Clean build artifacts"
echo ""

# Check if AWS CLI is configured
echo -e "${BLUE}Checking AWS CLI configuration...${NC}"
if command -v aws &> /dev/null; then
  if aws sts get-caller-identity >/dev/null 2>&1; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    REGION=$(aws configure get region || echo "not-configured")
    echo -e "${GREEN}✓ AWS CLI configured${NC}"
    echo -e "${YELLOW}  Account: $ACCOUNT_ID${NC}"
    echo -e "${YELLOW}  Region: $REGION${NC}"
  else
    echo -e "${YELLOW}⚠️  AWS CLI installed but not configured${NC}"
    echo -e "${YELLOW}Run: aws configure${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  AWS CLI not installed${NC}"
fi

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}         Next Steps                   ${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "${YELLOW}1. Configure AWS CLI (if not done):${NC}"
echo -e "   aws configure --profile eduretain-dev"
echo ""
echo -e "${YELLOW}2. Edit .env.local with your AWS Account ID${NC}"
echo ""
echo -e "${YELLOW}3. Deploy backend infrastructure:${NC}"
echo -e "   ./deploy.sh --stage dev --backend-only --profile eduretain-dev"
echo ""
echo -e "${YELLOW}4. Start development server:${NC}"
echo -e "   npm run dev"
echo ""
echo -e "${YELLOW}5. Open browser:${NC}"
echo -e "   http://localhost:4000"
echo ""
echo -e "${GREEN}🚀 Happy coding with EduRetain!${NC}"