# 🔧 Guía para Obtener Credenciales del Backend o Desplegarlo

## 🎯 Opciones

### Opción A: Si el Backend YA está desplegado
### Opción B: Desplegar el Backend desde cero

---

## 📋 Opción A: Obtener Credenciales de Backend Existente

### 1. API Gateway URL

```bash
# En AWS Console:
1. Ve a "API Gateway"
2. Busca "EduRetainAPI" o similar
3. Click en la API
4. En el panel izquierdo, click en "Stages"
5. Selecciona "prod" o "dev"
6. Copia la "Invoke URL"
7. Tu NEXT_PUBLIC_API_URL será: [Invoke URL]/prod
```

### 2. Cognito User Pool ID

```bash
# En AWS Console:
1. Ve a "Cognito"
2. Click en "User pools"
3. Busca "EduRetainUserPool" o similar
4. Click en el pool
5. En "General settings", copia el "Pool Id"
6. Ejemplo: us-east-1_ABC123XYZ
```

### 3. Cognito Client ID

```bash
# En el mismo User Pool:
1. En el menú lateral, click en "App clients"
2. Busca "EduRetainWebClient" o similar
3. Copia el "App client ID"
4. Ejemplo: 1234567890abcdefghijklmnop
```

---

## 🚀 Opción B: Desplegar el Backend desde Cero

### Prerrequisitos

```bash
# Instalar AWS CLI
# Windows:
winget install Amazon.AWSCLI

# Mac:
brew install awscli

# Verificar instalación:
aws --version
```

```bash
# Instalar AWS CDK
npm install -g aws-cdk

# Verificar instalación:
cdk --version
```

### Paso 1: Configurar AWS CLI

```bash
aws configure
# Ingresa:
# - AWS Access Key ID: [tu-access-key]
# - AWS Secret Access Key: [tu-secret-key]
# - Default region: us-east-1
# - Default output format: json
```

### Paso 2: Preparar el Backend

```bash
cd EduRetain/packages/infrastructure

# Instalar dependencias
npm install

# Bootstrap CDK (solo primera vez)
cdk bootstrap aws://ACCOUNT-ID/us-east-1
```

### Paso 3: Configurar Variables de Entorno

Crear archivo `.env` en `packages/infrastructure/`:

```env
# Cognito
USER_POOL_NAME=EduRetainUserPool
USER_POOL_CLIENT_NAME=EduRetainWebClient

# DynamoDB
TABLE_NAME=EduRetainTable

# S3
BUCKET_NAME=eduretain-uploads-[tu-id-unico]

# SES (Email)
SES_FROM_EMAIL=noreply@tudominio.com
SES_REGION=us-east-1

# Bedrock (IA)
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
BEDROCK_REGION=us-east-1

# Environment
STAGE=prod
```

### Paso 4: Desplegar con CDK

```bash
# Ver qué se va a crear (dry run)
cdk diff

# Desplegar todo
cdk deploy --all

# O desplegar stacks individuales:
cdk deploy EduRetainCognitoStack
cdk deploy EduRetainDynamoDBStack
cdk deploy EduRetainLambdaStack
cdk deploy EduRetainAPIGatewayStack
```

### Paso 5: Obtener Outputs

Después del deploy, CDK mostrará los outputs:

```
Outputs:
EduRetainAPIGatewayStack.ApiUrl = https://xxxxx.execute-api.us-east-1.amazonaws.com/prod
EduRetainCognitoStack.UserPoolId = us-east-1_XXXXXXXXX
EduRetainCognitoStack.UserPoolClientId = XXXXXXXXXXXXXXXXXXXXXXXXXX
EduRetainDynamoDBStack.TableName = EduRetainTable
```

**GUARDA ESTOS VALORES** - Los necesitas para el frontend.

---

## 🔨 Opción B Alternativa: Deploy Manual Simplificado

Si no quieres usar CDK, puedes crear los recursos manualmente:

### 1. Crear Cognito User Pool

```bash
# En AWS Console → Cognito → Create User Pool
# Configuración básica:
- Pool name: EduRetainUserPool
- Sign-in options: Email
- Password policy: Default
- MFA: Optional
- Email: Cognito default
```

### 2. Crear DynamoDB Table

```bash
# En AWS Console → DynamoDB → Create Table
- Table name: EduRetainTable
- Partition key: PK (String)
- Sort key: SK (String)
- Settings: On-demand
```

### 3. Crear Lambda Functions

Para cada función en `packages/backend/src/handlers/`:

```bash
# En AWS Console → Lambda → Create Function
- Runtime: Node.js 20.x
- Architecture: arm64
- Memory: 512 MB
- Timeout: 30 seconds
```

### 4. Crear API Gateway

```bash
# En AWS Console → API Gateway → Create API
- REST API
- Name: EduRetainAPI
- Endpoint Type: Regional
```

Configurar rutas:
- `/v1/alumnos` → Lambda AlumnosHandler
- `/v1/campanas` → Lambda CampanasHandler
- `/v1/dashboard` → Lambda DashboardHandler
- `/v1/predictions` → Lambda PredictionsHandler

---

## 📝 Script Automático de Deploy

Crear `deploy-backend.sh`:

```bash
#!/bin/bash

echo "🚀 Desplegando Backend de EduRetain..."

# Verificar prerrequisitos
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI no instalado"
    exit 1
fi

if ! command -v cdk &> /dev/null; then
    echo "❌ AWS CDK no instalado"
    exit 1
fi

# Deploy
cd packages/infrastructure
npm install
cdk deploy --all --require-approval never

# Guardar outputs
aws cloudformation describe-stacks \
  --stack-name EduRetainAPIGatewayStack \
  --query 'Stacks[0].Outputs' \
  > ../../backend-outputs.json

echo "✅ Backend desplegado!"
echo "📄 Outputs guardados en backend-outputs.json"
```

---

## 🔍 Verificar el Deploy del Backend

### 1. Test API Gateway

```bash
# Obtener URL de API
API_URL=$(aws apigateway get-rest-apis \
  --query "items[?name=='EduRetainAPI'].id" \
  --output text)

echo "https://${API_URL}.execute-api.us-east-1.amazonaws.com/prod"

# Test endpoint
curl https://${API_URL}.execute-api.us-east-1.amazonaws.com/prod/v1/health
```

### 2. Test Cognito

```bash
# Listar User Pools
aws cognito-idp list-user-pools --max-results 10

# Obtener detalles
aws cognito-idp describe-user-pool \
  --user-pool-id us-east-1_XXXXXXXXX
```

### 3. Test DynamoDB

```bash
# Verificar tabla
aws dynamodb describe-table --table-name EduRetainTable
```

---

## 💰 Costos Estimados del Backend

### AWS Free Tier (12 meses):
- Cognito: 50,000 usuarios gratis
- DynamoDB: 25 GB storage gratis
- Lambda: 1M requests/mes gratis
- API Gateway: 1M calls/mes gratis

### Después del Free Tier:
- Cognito: $0.0055 por MAU
- DynamoDB On-Demand: $0.25 por millón de lecturas
- Lambda: $0.20 por 1M requests
- API Gateway: $3.50 por millón de calls

### Estimado mensual para EduRetain:
- 1000 usuarios activos
- 100K API calls
- **Total: ~$10-15/mes**

---

## 🆘 Troubleshooting

### Error: "Access Denied"
```bash
# Verificar credenciales AWS
aws sts get-caller-identity

# Verificar permisos IAM necesarios:
- AWSCloudFormationFullAccess
- IAMFullAccess
- AmazonS3FullAccess
- AmazonDynamoDBFullAccess
- AWSLambdaFullAccess
- AmazonAPIGatewayAdministrator
- AmazonCognitoPowerUser
```

### Error: "Stack already exists"
```bash
# Eliminar stack existente
cdk destroy EduRetainStack

# O actualizar
cdk deploy --force
```

### Error: "Bootstrap required"
```bash
# Bootstrap CDK
cdk bootstrap aws://ACCOUNT-ID/us-east-1
```

---

## 📋 Checklist Final

Antes de desplegar el frontend, asegúrate de tener:

- [ ] API Gateway URL
- [ ] Cognito User Pool ID
- [ ] Cognito Client ID
- [ ] Backend respondiendo a `/v1/health`
- [ ] CORS configurado en API Gateway
- [ ] Tabla DynamoDB creada
- [ ] Lambda functions desplegadas

---

## 🎯 Siguiente Paso

Una vez tengas las credenciales del backend:

1. Vuelve a la guía de Amplify
2. Configura las variables de entorno con los valores obtenidos
3. Despliega el frontend

---

**NOTA**: Si no tienes acceso a AWS o prefieres ayuda profesional, considera contratar un DevOps o usar servicios como AWS IQ para el deploy inicial.