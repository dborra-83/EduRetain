# 🔐 Variables de Entorno para AWS Amplify

## Variables Requeridas

Estas variables deben configurarse en AWS Amplify Console:

```bash
# API Gateway URL (OBLIGATORIO)
NEXT_PUBLIC_API_URL=https://[tu-api-gateway-id].execute-api.us-east-1.amazonaws.com/prod

# AWS Cognito Configuration (OBLIGATORIO)
NEXT_PUBLIC_USER_POOL_ID=us-east-1_XXXXXXXXX
NEXT_PUBLIC_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_AWS_REGION=us-east-1

# Environment Stage
NEXT_PUBLIC_STAGE=prod

# Build Configuration
NODE_ENV=production
```

## Dónde obtener estos valores:

### 1. NEXT_PUBLIC_API_URL
- Ve a AWS Console → API Gateway
- Selecciona tu API "EduRetainAPI"
- En el dashboard, copia la "Invoke URL"
- Agregar `/prod` al final

### 2. NEXT_PUBLIC_USER_POOL_ID
- Ve a AWS Console → Cognito
- Selecciona tu User Pool
- En "General settings", copia el "Pool Id"

### 3. NEXT_PUBLIC_USER_POOL_CLIENT_ID
- En el mismo User Pool
- Ve a "App clients"
- Copia el "App client id"

## Cómo configurar en Amplify:

1. En AWS Amplify Console
2. Selecciona tu aplicación
3. Ve a "Environment variables"
4. Click "Manage variables"
5. Agrega cada variable con su valor
6. Click "Save"

## Variables Opcionales (para producción):

```bash
# Analytics (opcional)
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# Error Tracking (opcional)
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Feature Flags (opcional)
NEXT_PUBLIC_ENABLE_AI_PREDICTIONS=true
NEXT_PUBLIC_ENABLE_EMAIL_CAMPAIGNS=true
```

## Verificación:

Para verificar que las variables están configuradas correctamente:

1. Después del deploy, abre la consola del navegador (F12)
2. Ve a Network tab
3. Intenta hacer login
4. Verifica que las llamadas van a la URL correcta de API Gateway