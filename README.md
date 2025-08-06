# EduRetain - Plataforma de Retención Estudiantil

![EduRetain Logo](https://via.placeholder.com/400x100/1976d2/ffffff?text=EduRetain)

**EduRetain** es una plataforma web multi-institucional, serverless y escalable, diseñada para universidades y entidades educativas que permite detectar tempranamente la deserción estudiantil y gestionar campañas de comunicación efectivas.

## ✨ Características Principales

### 🤖 Inteligencia Artificial
- **Predicción de deserción** con Amazon Bedrock (Claude 3.5 Sonnet)
- **Algoritmo de riesgo** explicable con factores identificables
- **Recomendaciones automáticas** de intervención personalizada

### 📊 Dashboard y Analítica
- **Métricas en tiempo real** de estudiantes y retención
- **Visualizaciones interactivas** con gráficos y alertas
- **Reportes exportables** en PDF y CSV
- **Segmentación avanzada** por facultad, carrera y riesgo

### 📧 Campañas de Comunicación
- **Envío masivo de emails** con AWS SES
- **Templates personalizables** con branding institucional
- **Tracking completo** de entregas, aperturas y clicks
- **Segmentación automática** por nivel de riesgo

### 📥 Gestión de Datos
- **Importación masiva CSV** con validación en tiempo real
- **Gestión jerárquica** universidad → facultad → carrera → alumno
- **Validación automática** de datos con feedback detallado

### 🎨 Multi-tenant y White-label
- **Branding personalizable** por institución
- **Múltiples universidades** en una sola plataforma
- **Roles granulares** con permisos específicos

## 🏗️ Arquitectura Técnica

### Stack Tecnológico
- **Frontend**: Next.js 14 + TypeScript + Material-UI
- **Backend**: AWS Lambda + API Gateway + DynamoDB
- **IA**: Amazon Bedrock (Claude 3.5 Sonnet)
- **Auth**: Amazon Cognito + MFA
- **Storage**: S3 + CloudFront
- **Email**: AWS SES + Configuration Set
- **IaC**: AWS CDK (TypeScript)
- **Monitoring**: CloudWatch + X-Ray

### Arquitectura Serverless
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CloudFront    │    │   API Gateway   │    │   Lambda        │
│   (Frontend)    │───▶│   (REST API)    │───▶│   (Handlers)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌─────────────────┐           │
│   Cognito       │    │   DynamoDB      │◀──────────┘
│   (Auth/Users)  │    │   (Database)    │
└─────────────────┘    └─────────────────┘
                                                        
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SES           │    │   Bedrock       │    │   CloudWatch    │
│   (Email)       │    │   (AI/ML)       │    │   (Monitoring)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Inicio Rápido

### Pre-requisitos
- Node.js 18+ y npm
- AWS CLI configurado
- AWS CDK instalado (`npm install -g aws-cdk`)
- Cuenta AWS con permisos administrativos

### 1. Instalación
```bash
# Clonar repositorio
git clone <repository-url>
cd EduRetain

# Instalar dependencias y construir packages
npm run bootstrap
```

### 2. Configuración de Variables
```bash
# Copiar archivo de ejemplo
cp .env.example .env.local

# Editar variables según tu entorno AWS
nano .env.local
```

### 3. Despliegue Rápido
```bash
# Despliegue completo en desarrollo
./deploy.sh --stage dev --profile your-aws-profile

# Solo backend (para desarrollo frontend local)
./deploy.sh --stage dev --backend-only
```

### 4. Desarrollo Local
```bash
# Frontend en desarrollo (requiere backend desplegado)
npm run dev

# Acceder a http://localhost:3000
```

## 📊 Funcionalidades Detalladas

### Dashboard Principal
- **Métricas de estudiantes**: Total, activos, en riesgo
- **Tasa de retención** con tendencias
- **Distribución por riesgo** (gráficos de torta y barras)
- **Alertas de riesgo crítico** con lista de estudiantes
- **Acciones rápidas** para campañas y gestión

### Importación de Datos
- **Drag & drop CSV** con validación en tiempo real
- **Vista previa** antes de importar
- **Plantilla descargable** con formato correcto
- **Resultados detallados** con errores específicos
- **Procesamiento en lotes** para archivos grandes

### Sistema de Predicción
- **Algoritmo básico** basado en:
  - Promedio de notas
  - Progreso académico (créditos aprobados/totales)
  - Última actividad
  - Semestre actual
- **IA avanzada** con Amazon Bedrock para análisis profundo
- **Niveles de riesgo**: BAJO, MEDIO, ALTO, CRÍTICO
- **Factores explicables** para cada predicción

### Campañas de Email
- **Templates pre-diseñados**:
  - Bienvenida para nuevos estudiantes
  - Alertas de riesgo personalizadas  
  - Campañas personalizadas
- **Segmentación avanzada** por múltiples criterios
- **Tracking completo**:
  - Envíos y entregas
  - Aperturas y clicks
  - Rebotes y bajas
- **Estadísticas en tiempo real** por campaña

## 🔒 Seguridad

### Autenticación y Autorización
- **Amazon Cognito** para gestión de usuarios
- **MFA obligatorio** en producción
- **Roles granulares**:
  - Super Admin: Todas las universidades
  - Admin Universidad: Su universidad completa
  - Operador Facultad: Su facultad
  - Docente: Sus estudiantes
  - Solo Lectura: Reportes únicamente

### Protección de Datos
- **Encriptación en tránsito** (HTTPS/TLS)
- **Encriptación en reposo** (DynamoDB + S3)
- **Aislamiento multi-tenant** por universidad
- **Logs de auditoría** completos
- **Cumplimiento GDPR** con opt-out automático

## 📈 Monitoreo y Escalabilidad

### CloudWatch Dashboards
- **Métricas de aplicación**: Estudiantes, campañas, predicciones
- **Métricas de infraestructura**: API Gateway, Lambda, DynamoDB
- **Alarmas automáticas** para errores y latencia
- **Logs estructurados** para debugging

### Escalabilidad Automática
- **Serverless**: Escala automáticamente con demanda
- **DynamoDB On-Demand**: Sin límites de capacidad
- **CloudFront CDN**: Distribución global
- **Lambda concurrency**: Manejo automático de picos

## 💰 Costos Estimados

| Entorno | Usuarios Activos | Costo Mensual Aproximado |
|---------|------------------|--------------------------|
| Desarrollo | < 10 | $20 - $50 |
| Pequeña Universidad | 100 - 500 | $100 - $300 |
| Universidad Media | 1,000 - 5,000 | $300 - $800 |
| Universidad Grande | 5,000+ | $800 - $2,000 |

*Costos basados en uso típico. Incluye todos los servicios AWS.*

## 🛠️ Desarrollo

### Estructura del Proyecto
```
EduRetain/
├── packages/
│   ├── frontend/          # Next.js application
│   │   ├── src/app/       # App Router pages
│   │   ├── src/components/ # React components
│   │   └── src/lib/       # Utilities and configs
│   ├── backend/           # Lambda functions
│   │   ├── src/handlers/  # API handlers
│   │   ├── src/services/  # Business logic
│   │   └── src/repositories/ # Data access
│   ├── infrastructure/    # AWS CDK stacks
│   │   ├── lib/constructs/ # Reusable constructs
│   │   └── bin/app.ts     # CDK app entry
│   └── shared/           # Shared types and utilities
│       ├── src/types/     # TypeScript interfaces
│       ├── src/schemas/   # Zod validation schemas
│       └── src/utils/     # Shared utilities
├── deploy.sh             # Deployment script
├── CLAUDE.md            # Development guide
└── README.md            # This file
```

### Comandos de Desarrollo
```bash
# Desarrollo
npm run dev                    # Start frontend dev server
npm run build                  # Build all packages
npm run lint                   # Lint all packages
npm run test                   # Run tests

# Despliegue
./deploy.sh --stage dev        # Deploy development
./deploy.sh --stage prod       # Deploy production
./deploy.sh --backend-only     # Deploy only backend
./deploy.sh --frontend-only    # Deploy only frontend

# CDK específico
cd packages/infrastructure
cdk diff                       # See changes
cdk deploy EduRetainDev        # Deploy dev stack
cdk destroy EduRetainDev       # Destroy stack
```

### Patrones de Código

#### Backend (Lambda Handler)
```typescript
export const handler = async (event: APIGatewayProxyEvent) => {
  const logger = createLogger({ requestId: event.requestContext.requestId });
  const user = extractUserFromToken(event);
  
  const validation = validateRequest(schema, data);
  if (!validation.success) return validation.response;
  
  const result = await repository.create(validation.data);
  return successResponse(result);
};
```

#### Frontend (React Component)
```typescript
export default function MyPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery(['key'], fetcher);
  
  return (
    <AppLayout>
      <Typography variant="h4">My Page</Typography>
      {/* Content */}
    </AppLayout>
  );
}
```

## 🤝 Contribución

### Configuración del Entorno de Desarrollo
1. Fork del repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Instalar dependencias: `npm run bootstrap`
4. Configurar variables de entorno
5. Realizar cambios y tests
6. Commit y push: `git push origin feature/nueva-funcionalidad`
7. Crear Pull Request

### Estándares de Código
- **TypeScript strict mode** habilitado
- **ESLint + Prettier** para formateo
- **Conventional Commits** para mensajes
- **Zod schemas** para validación
- **React Query** para estado del servidor
- **Material-UI** para componentes

## 📞 Soporte

### Documentación Adicional
- **CLAUDE.md**: Guía completa de desarrollo y arquitectura
- **API Documentation**: Documentación de endpoints
- **Deployment Guide**: Guía detallada de despliegue

### Contacto
- **Issues**: Reportar bugs en GitHub Issues
- **Discussions**: Preguntas y discusiones
- **Email**: soporte@eduretain.com

---

## 📄 Licencia

Copyright © 2025 CloudHesive. Todos los derechos reservados.

## 🏆 Agradecimientos

Desarrollado con ❤️ por el equipo de CloudHesive utilizando Claude Code.

- **AWS**: Por la infraestructura serverless
- **Anthropic**: Por Claude 3.5 Sonnet IA
- **Next.js & React**: Por el framework frontend
- **Material-UI**: Por los componentes de UI
- **TypeScript**: Por la seguridad de tipos

---

*🤖 Generated with [Claude Code](https://claude.ai/code) - Actualizado Enero 2025*