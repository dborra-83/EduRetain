# 🚀 Guía de Despliegue con AWS Amplify - Paso a Paso

## ✅ Preparación Completada

Ya hemos preparado todo lo necesario:
- ✅ Build funciona localmente
- ✅ Archivo `amplify.yml` configurado
- ✅ Variables de entorno documentadas
- ✅ Redirects configurados para SPA

## 📋 Pasos en AWS Amplify Console

### Paso 1: Acceder a AWS Amplify
1. Inicia sesión en AWS Console: https://console.aws.amazon.com
2. Busca "Amplify" en el buscador de servicios
3. Click en "AWS Amplify"

### Paso 2: Crear Nueva App
1. Click en el botón **"New app"**
2. Selecciona **"Host web app"**

### Paso 3: Conectar Repositorio
1. Selecciona **GitHub** como proveedor
2. Click en **"Continue"**
3. Se abrirá una ventana para autorizar AWS Amplify
4. Autoriza el acceso a tu cuenta de GitHub
5. Selecciona:
   - Repositorio: **dborra-83/EduRetain**
   - Branch: **main**
6. Click **"Next"**

### Paso 4: Configurar Build Settings
1. Amplify detectará automáticamente que es una app Next.js
2. **IMPORTANTE**: Amplify debería detectar automáticamente nuestro `amplify.yml`
3. Si no lo detecta, en "Build settings", pega este contenido:

```yaml
version: 1
frontend:
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
```

4. Click en **"Advanced settings"**

### Paso 5: Variables de Entorno
En la sección "Environment variables", agrega TODAS estas variables:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://[tu-api-id].execute-api.us-east-1.amazonaws.com/prod` | URL de tu API Gateway |
| `NEXT_PUBLIC_USER_POOL_ID` | `us-east-1_XXXXXXXXX` | ID del User Pool de Cognito |
| `NEXT_PUBLIC_USER_POOL_CLIENT_ID` | `XXXXXXXXXXXXXXXXXXXXXXXXXX` | Client ID de Cognito |
| `NEXT_PUBLIC_AWS_REGION` | `us-east-1` | Región de AWS |
| `NEXT_PUBLIC_STAGE` | `prod` | Environment stage |
| `NODE_ENV` | `production` | Node environment |

**⚠️ IMPORTANTE**: Necesitas obtener estos valores de tu despliegue del backend en AWS.

### Paso 6: Configurar Nombre de la App
1. En "App name", ingresa: **EduRetain-Frontend**
2. Deja las demás opciones por defecto
3. Click **"Next"**

### Paso 7: Review
1. Revisa toda la configuración
2. Asegúrate que:
   - El branch es `main`
   - Las variables de entorno están configuradas
   - El build command es correcto
3. Click **"Save and deploy"**

## 🔄 Proceso de Deploy

### Durante el Deploy:
1. Amplify mostrará el progreso en tiempo real
2. Etapas del deploy:
   - **Provision**: Configuración del entorno (~2 min)
   - **Build**: Construcción de la aplicación (~5-8 min)
   - **Deploy**: Despliegue de archivos (~2 min)
   - **Verify**: Verificación del despliegue (~1 min)

### Tiempo Total Estimado:
- Primer deploy: 10-15 minutos
- Deploys subsecuentes: 5-8 minutos

## ✅ Verificación Post-Deploy

### 1. URL de la Aplicación
- Amplify te dará una URL como: `https://main.d1234567890abc.amplifyapp.com`
- Abre esta URL en tu navegador

### 2. Verificar Funcionalidad
1. La página de login debe cargar
2. Verifica en DevTools (F12) → Network:
   - Las llamadas a API van a tu API Gateway
   - No hay errores 404
3. Intenta hacer login con credenciales de prueba

### 3. Si hay errores:
- Ve a la pestaña "Monitoring" en Amplify
- Revisa los logs de build
- Verifica las variables de entorno

## 🔧 Troubleshooting Común

### Error: "Build failed"
```bash
# Verifica el log de build en Amplify Console
# Común: falta alguna variable de entorno
```

### Error: "Page not found" en rutas
```bash
# Ya configuramos _redirects, pero si persiste:
# En Amplify Console → Rewrites and redirects
# Agregar: Source: </^[^.]+$/> Target: /index.html Status: 200
```

### Error: "API connection failed"
```bash
# Verificar:
1. NEXT_PUBLIC_API_URL está correcta
2. CORS está configurado en API Gateway
3. La API está desplegada y funcionando
```

## 🎯 Siguientes Pasos

### 1. Configurar Dominio Personalizado (Opcional)
1. En Amplify Console → Domain management
2. Click "Add domain"
3. Seguir las instrucciones para tu dominio

### 2. Configurar CI/CD Automático
- Ya está configurado! Cada push a `main` triggerea un nuevo deploy

### 3. Configurar Ambiente de Staging (Recomendado)
1. En Amplify Console → Branch deployments
2. Click "Connect branch"
3. Selecciona branch `develop` (si existe)
4. Usa diferentes variables de entorno para staging

## 📊 Monitoreo

### Métricas Disponibles en Amplify:
- Build success rate
- Deploy frequency
- Performance metrics
- Error logs
- Access logs

### CloudWatch Integration:
- Automáticamente integrado
- Logs disponibles en CloudWatch
- Puedes configurar alarmas

## 💰 Costos Estimados

### Free Tier (12 meses):
- 1000 build minutes/mes
- 15 GB served/mes
- 5 GB stored/mes

### Después del Free Tier:
- Build: $0.01 por minuto
- Hosting: $0.15 por GB servido
- Storage: $0.023 por GB almacenado

### Estimado mensual para EduRetain:
- ~100 builds × 5 min = 500 min = $5
- ~10 GB transfer = $1.50
- ~1 GB storage = $0.02
- **Total: ~$6.52/mes**

## 🎉 ¡Listo!

Una vez completados estos pasos, tu aplicación estará live en AWS Amplify con:
- ✅ HTTPS automático
- ✅ CI/CD configurado
- ✅ CDN global
- ✅ Auto-scaling
- ✅ Monitoreo incluido

## 📝 Notas Importantes

1. **Guarda las URLs**:
   - URL de Amplify
   - URL de API Gateway
   - IDs de Cognito

2. **Documenta los cambios**:
   - Cualquier variable de entorno adicional
   - Configuraciones especiales

3. **Seguridad**:
   - Nunca commitees las variables de entorno al repo
   - Usa AWS Secrets Manager para keys sensibles

## 🆘 Ayuda

Si encuentras problemas:
1. Revisa los logs en Amplify Console
2. Verifica todas las variables de entorno
3. Asegúrate que el backend está funcionando
4. Revisa la documentación oficial: https://docs.amplify.aws/