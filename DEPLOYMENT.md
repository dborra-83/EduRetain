# 🚀 EduRetain - Guía de Despliegue en AWS

## 📋 Pre-requisitos

### 1. Software Requerido
```bash
# Node.js 18+
node --version  # Verificar >= v18.0.0

# AWS CLI configurado
aws --version
aws sts get-caller-identity  # Verificar credenciales

# AWS CDK
npm install -g aws-cdk
cdk --version  # Verificar >= 2.110.0
```

### 2. Configuración AWS
```bash
# Configurar AWS CLI (si no está configurado)
aws configure
# AWS Access Key ID: [Tu Access Key]
# AWS Secret Access Key: [Tu Secret Key]
# Default region name: us-east-1
# Default output format: json

# Crear perfil específico para EduRetain (recomendado)
aws configure --profile eduretain-dev
aws configure --profile eduretain-prod
```

## 🔧 Setup del Proyecto

### 1. Clonar el Repositorio
```bash
git clone https://github.com/dborra-83/EduRetain.git
cd EduRetain
```

### 2. Instalar Dependencias
```bash
npm run bootstrap
```

### 3. Configurar Variables de Entorno
```bash
# Copiar archivo de ejemplo
cp .env.example .env.local

# Editar con tus valores específicos
nano .env.local
```

Variables requeridas en `.env.local`:
```bash
# Tu Account ID de AWS
AWS_ACCOUNT_ID_DEV=123456789012
AWS_ACCOUNT_ID_PROD=123456789012

# Región preferida
AWS_REGION=us-east-1

# Variables del frontend (se generarán automáticamente después del deploy)
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_USER_POOL_ID=
NEXT_PUBLIC_USER_POOL_CLIENT_ID=
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_STAGE=dev
```

## 🚀 Despliegue por Etapas

### Opción 1: Despliegue Completo (Recomendado)
```bash
# Desarrollo
./deploy.sh --stage dev --profile eduretain-dev

# Producción
./deploy.sh --stage prod --profile eduretain-prod
```

### Opción 2: Despliegue por Componentes

#### Backend (Infrastructure + APIs)
```bash
./deploy.sh --stage dev --backend-only --profile eduretain-dev
```

#### Frontend (después del backend)
```bash
./deploy.sh --stage dev --frontend-only --profile eduretain-dev
```

## 📊 Recursos AWS que se Crearán

### DynamoDB
- `eduretain-dev` - Tabla principal con GSIs
- Encriptación habilitada
- Backup automático (prod)

### Lambda Functions
- `eduretain-auth-dev`
- `eduretain-universidad-dev`
- `eduretain-alumno-dev`
- `eduretain-campana-dev`
- `eduretain-dashboard-dev`
- `eduretain-prediction-dev`
- `eduretain-upload-dev`

### API Gateway
- `eduretain-api-dev`
- CORS habilitado
- Cognito Authorizer configurado

### Cognito
- User Pool: `eduretain-users-dev`
- User Pool Client
- Domain: `eduretain-dev-{account-id}`

### S3 + CloudFront
- Bucket: `eduretain-storage-dev`
- CloudFront Distribution
- Origin Access Identity

### SES
- Configuration Set: `eduretain-dev`
- Email Templates preconfigurados
- Tracking habilitado

### CloudWatch
- Dashboard: `EduRetain-dev`
- 4 alarmas automáticas
- Logs groups para cada Lambda

## ⚙️ Configuración Post-Despliegue

### 1. Verificar SES (Email)
```bash
# Verificar dominio en SES Console
aws ses verify-domain-identity --domain tu-dominio.com

# O verificar email específico para testing
aws ses verify-email-identity --email-address admin@tu-dominio.com
```

### 2. Crear Usuario Administrador Inicial
```bash
# Via AWS CLI
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username admin@tu-dominio.com \
  --user-attributes Name=email,Value=admin@tu-dominio.com \
                    Name=given_name,Value=Admin \
                    Name=family_name,Value=Sistema \
                    Name=custom:rol,Value=SUPER_ADMIN \
                    Name=custom:activo,Value=true \
  --temporary-password TempPassword123! \
  --message-action SUPPRESS
```

### 3. URLs de Acceso

Después del despliegue exitoso, tendrás:
- **API**: `https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev`
- **Frontend**: `https://xxxxxxxxxxxxxx.cloudfront.net`
- **Dashboard CloudWatch**: Link en los outputs del CDK

## 🧪 Testing del Despliegue

### 1. Verificar API
```bash
# Health check de la API
curl https://tu-api-endpoint/v1/universidades

# Debe retornar 401 (esperado sin auth)
```

### 2. Verificar Frontend
```bash
# Acceder al frontend
open https://tu-cloudfront-domain

# Intentar login con el usuario creado
```

### 3. Verificar Dashboard CloudWatch
```bash
# Ir a AWS Console > CloudWatch > Dashboards > EduRetain-dev
# Verificar que las métricas se están mostrando
```

## 🔍 Troubleshooting

### Error: CDK Bootstrap Required
```bash
cdk bootstrap aws://ACCOUNT-ID/REGION --profile eduretain-dev
```

### Error: Insufficient IAM Permissions
```bash
# Tu usuario AWS necesita permisos de AdministratorAccess o similar
# Para crear todos los recursos requeridos
```

### Error: Domain Already Exists (SES)
```bash
# Si ya tienes un dominio verificado en SES, usar uno diferente
# o eliminar el existente si no lo necesitas
```

### Error: Lambda Function Already Exists
```bash
# Destruir stack anterior y recrear
cdk destroy EduRetainDev --profile eduretain-dev
./deploy.sh --stage dev --profile eduretain-dev
```

## 💰 Estimación de Costos AWS (Mensual)

### Desarrollo (tráfico muy bajo)
- DynamoDB: $5-10
- Lambda: $5-15  
- API Gateway: $2-5
- Cognito: $0-5
- S3/CloudFront: $2-5
- SES: $1-3
- **Total: ~$15-45/mes**

### Producción (1000 usuarios activos)
- DynamoDB: $50-100
- Lambda: $100-200
- API Gateway: $50-100
- Cognito: $20-50
- S3/CloudFront: $50-100
- SES: $20-50
- Monitoring: $20-30
- **Total: ~$300-650/mes**

## 🛡️ Configuración de Seguridad

### 1. Habilitar MFA (Recomendado)
En Cognito User Pool, configurar:
- MFA: Required
- SMS/TOTP: Ambos habilitados

### 2. Configurar WAF (Producción)
```bash
# Proteger API Gateway con WAF
# Crear reglas para rate limiting, geo-blocking, etc.
```

### 3. Logs y Auditoría
- CloudTrail habilitado
- Logs de Lambda en CloudWatch
- Acceso de auditoría en DynamoDB

## 📞 Soporte

### Logs de Despliegue
```bash
# Ver logs del deployment script
./deploy.sh --stage dev 2>&1 | tee deploy.log
```

### Logs de Aplicación
```bash
# Ver logs de Lambda functions
aws logs tail /aws/lambda/eduretain-universidad-dev --follow
```

### Estado de los Recursos
```bash
# Ver estado del stack CDK
cdk list
cdk diff EduRetainDev
```

---

## ✅ Checklist de Despliegue

- [ ] Pre-requisitos instalados (Node, AWS CLI, CDK)
- [ ] Credenciales AWS configuradas
- [ ] Variables de entorno configuradas
- [ ] Bootstrap CDK ejecutado
- [ ] Despliegue backend exitoso
- [ ] Despliegue frontend exitoso
- [ ] SES dominio/email verificado  
- [ ] Usuario administrador creado
- [ ] Testing básico completado
- [ ] Acceso al dashboard CloudWatch
- [ ] URLs de producción documentadas

---

**🎉 ¡EduRetain desplegado exitosamente!**

Para cualquier problema, revisar:
1. AWS Console para errores específicos
2. CloudWatch Logs para logs de aplicación  
3. CDK outputs para URLs y recursos
4. Este archivo DEPLOYMENT.md para troubleshooting