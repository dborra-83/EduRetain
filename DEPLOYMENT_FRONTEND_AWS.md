# 📦 Guía de Despliegue del Frontend de EduRetain en AWS

## 🎯 Opciones de Despliegue

### Opción 1: AWS Amplify (RECOMENDADO - Más fácil)
### Opción 2: S3 + CloudFront (Más control)
### Opción 3: EC2 con PM2 (Para SSR)

---

## 🚀 Opción 1: AWS Amplify (RECOMENDADO)

### Prerrequisitos
- Cuenta AWS con permisos de Amplify
- Repositorio en GitHub/GitLab/Bitbucket
- Variables de entorno configuradas

### Paso a Paso

#### 1. Preparar el proyecto
```bash
cd packages/frontend

# Asegurar que el build funciona localmente
npm install
npm run build
```

#### 2. Configurar Amplify en AWS Console

1. **Ir a AWS Amplify Console**
   - https://console.aws.amazon.com/amplify/

2. **Crear nueva aplicación**
   - Click "New app" → "Host web app"
   - Seleccionar "GitHub" como fuente
   - Autorizar acceso a tu repositorio

3. **Configurar el repositorio**
   - Repositorio: `dborra-83/EduRetain`
   - Branch: `main`
   - Click "Next"

4. **Configurar build settings**
   ```yaml
   version: 1
   applications:
     - frontend:
         phases:
           preBuild:
             commands:
               - cd packages/frontend
               - npm ci
           build:
             commands:
               - npm run build
         artifacts:
           baseDirectory: packages/frontend/.next
           files:
             - '**/*'
         cache:
           paths:
             - packages/frontend/node_modules/**/*
       appRoot: packages/frontend
   ```

5. **Configurar variables de entorno**
   - Click "Advanced settings"
   - Agregar todas las variables:
   ```
   NEXT_PUBLIC_API_URL=https://[tu-api-gateway].execute-api.us-east-1.amazonaws.com/prod
   NEXT_PUBLIC_USER_POOL_ID=us-east-1_xxxxxxxxx
   NEXT_PUBLIC_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
   NEXT_PUBLIC_AWS_REGION=us-east-1
   NEXT_PUBLIC_STAGE=prod
   ```

6. **Configurar dominio personalizado (opcional)**
   - En "Domain management" → "Add domain"
   - Configurar tu dominio personalizado

7. **Deploy**
   - Click "Save and deploy"
   - Esperar ~10-15 minutos para el primer deploy

#### 3. Configuración Post-Deploy

1. **Verificar el deploy**
   - URL temporal: `https://main.xxxxxx.amplifyapp.com`

2. **Configurar redirects (si es necesario)**
   Crear archivo `packages/frontend/public/redirects`:
   ```
   /*    /index.html   200
   ```

---

## 🚀 Opción 2: S3 + CloudFront

### Paso a Paso

#### 1. Build local del proyecto
```bash
cd packages/frontend

# Build para producción
npm install
npm run build

# Exportar sitio estático (si usas páginas estáticas)
npm run export
```

#### 2. Crear bucket S3

```bash
# Usando AWS CLI
aws s3 mb s3://eduretain-frontend-prod

# Configurar como sitio web estático
aws s3 website s3://eduretain-frontend-prod \
  --index-document index.html \
  --error-document error.html
```

#### 3. Configurar política del bucket

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::eduretain-frontend-prod/*"
    }
  ]
}
```

#### 4. Subir archivos

```bash
# Subir archivos del build
aws s3 sync packages/frontend/out s3://eduretain-frontend-prod \
  --delete \
  --cache-control max-age=31536000

# Actualizar index.html sin cache
aws s3 cp packages/frontend/out/index.html s3://eduretain-frontend-prod/ \
  --cache-control max-age=0,no-cache,no-store,must-revalidate
```

#### 5. Configurar CloudFront

1. **Crear distribución**
   ```bash
   aws cloudfront create-distribution \
     --origin-domain-name eduretain-frontend-prod.s3.amazonaws.com \
     --default-root-object index.html
   ```

2. **Configurar comportamientos de cache**
   - Para archivos estáticos: Cache largo (1 año)
   - Para index.html: Sin cache

3. **Configurar páginas de error**
   - 404 → /index.html (para SPA routing)

---

## 🚀 Opción 3: EC2 con PM2 (Para SSR)

### Paso a Paso

#### 1. Lanzar instancia EC2

```bash
# Configuración recomendada
- AMI: Amazon Linux 2023
- Tipo: t3.medium (mínimo)
- Storage: 20GB
- Security Group: Abrir puerto 3000 (o 80/443 con nginx)
```

#### 2. Conectar y configurar servidor

```bash
# Conectar a EC2
ssh -i tu-key.pem ec2-user@tu-ip-publica

# Instalar Node.js
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Instalar PM2
sudo npm install -g pm2

# Instalar git
sudo yum install -y git
```

#### 3. Clonar y configurar proyecto

```bash
# Clonar repositorio
git clone https://github.com/dborra-83/EduRetain.git
cd EduRetain/packages/frontend

# Instalar dependencias
npm install

# Crear archivo .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=https://tu-api-gateway.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_USER_POOL_ID=us-east-1_xxxxxxxxx
NEXT_PUBLIC_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_STAGE=prod
EOF

# Build
npm run build
```

#### 4. Configurar PM2

```bash
# Crear ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'eduretain-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/home/ec2-user/EduRetain/packages/frontend',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
EOF

# Iniciar con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 5. Configurar Nginx (opcional, recomendado)

```bash
# Instalar nginx
sudo yum install -y nginx

# Configurar nginx
sudo cat > /etc/nginx/conf.d/eduretain.conf << EOF
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Reiniciar nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 🔧 Scripts de Automatización

### GitHub Actions para CI/CD con Amplify

Crear `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS Amplify

on:
  push:
    branches: [main]
    paths:
      - 'packages/frontend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        working-directory: packages/frontend
        run: npm ci
        
      - name: Run tests
        working-directory: packages/frontend
        run: npm test
        
      - name: Build
        working-directory: packages/frontend
        run: npm run build
        
      # Amplify se encarga del deploy automáticamente
      # al detectar cambios en el branch
```

### Script de deploy manual

Crear `scripts/deploy-frontend.sh`:

```bash
#!/bin/bash

# Variables
ENVIRONMENT=${1:-prod}
AWS_REGION="us-east-1"
S3_BUCKET="eduretain-frontend-${ENVIRONMENT}"
CLOUDFRONT_ID="EXXXXXXXXXX"

echo "🚀 Desplegando frontend a ${ENVIRONMENT}..."

# Build
cd packages/frontend
npm install
npm run build

# Para S3 + CloudFront
if [ "$DEPLOYMENT_TYPE" = "s3" ]; then
    echo "📦 Subiendo a S3..."
    aws s3 sync .next s3://${S3_BUCKET} --delete
    
    echo "🔄 Invalidando CloudFront..."
    aws cloudfront create-invalidation \
        --distribution-id ${CLOUDFRONT_ID} \
        --paths "/*"
fi

echo "✅ Deploy completado!"
```

---

## 📝 Variables de Entorno Requeridas

```env
# Frontend (.env.local o Variables en Amplify)
NEXT_PUBLIC_API_URL=https://[api-gateway-id].execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_USER_POOL_ID=us-east-1_xxxxxxxxx
NEXT_PUBLIC_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_STAGE=prod

# Opcionales
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

---

## 🔍 Verificación Post-Deploy

### 1. Verificar que la aplicación carga
```bash
curl https://tu-dominio.com
```

### 2. Verificar conexión con API
- Abrir DevTools (F12)
- Intentar login
- Verificar llamadas a API en Network tab

### 3. Verificar autenticación Cognito
- Intentar registrarse/login
- Verificar tokens en Application → Local Storage

---

## 🐛 Troubleshooting

### Error: "Cannot find module"
```bash
# Limpiar cache y reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Error: "API connection failed"
- Verificar CORS en API Gateway
- Verificar variables de entorno
- Verificar que la API está desplegada

### Error: "Build failed"
```bash
# Verificar build local primero
npm run build

# Ver logs en Amplify Console o CloudWatch
```

### Error: "Page not found" en rutas
- Configurar redirects para SPA
- En S3: Configurar error document como index.html
- En Amplify: Agregar redirect rules

---

## 📊 Monitoreo

### CloudWatch Metrics
- Configurar alarmas para:
  - Error rate > 1%
  - Response time > 3s
  - 4xx/5xx errors

### Amplify Monitoring
- Analytics integrado
- Performance metrics
- User sessions

---

## 🎯 Recomendaciones

1. **Usar Amplify para simplicidad**
   - Deploy automático
   - SSL gratuito
   - CI/CD integrado

2. **Configurar staging environment**
   - Branch `develop` → staging
   - Branch `main` → production

3. **Implementar health checks**
   - Endpoint `/api/health`
   - Monitoreo con CloudWatch

4. **Optimizaciones**
   - Habilitar compression
   - Configurar cache headers
   - Usar CDN (CloudFront)

5. **Seguridad**
   - WAF para protección DDoS
   - Secrets Manager para API keys
   - VPC endpoints si es necesario

---

## 💰 Costos Estimados (mensual)

### Amplify
- Build: ~$0.01 por minuto
- Hosting: ~$0.15 por GB servido
- **Total estimado:** $5-20/mes

### S3 + CloudFront
- S3: ~$0.023 por GB almacenado
- CloudFront: ~$0.085 por GB transferido
- **Total estimado:** $3-15/mes

### EC2
- t3.medium: ~$30/mes
- EBS: ~$3/mes
- **Total estimado:** $35-50/mes

---

## 📞 Soporte

Para problemas específicos:
1. Revisar CloudWatch Logs
2. Verificar Amplify Console logs
3. Usar AWS Support si tienes plan

---

**NOTA:** Esta guía asume que el backend ya está desplegado y funcionando en AWS.