# EduRetain - Plataforma Inteligente de Retención Estudiantil

![EduRetain Logo](https://via.placeholder.com/400x100/1976d2/ffffff?text=EduRetain)

**EduRetain** es una plataforma web multi-institucional, serverless y escalable, diseñada para universidades y entidades educativas que permite detectar tempranamente la deserción estudiantil mediante inteligencia artificial y gestionar campañas de comunicación efectivas para mejorar la retención.

## ✨ Características Principales

### 🤖 Inteligencia Artificial Avanzada
- **Predicción de deserción** con Amazon Bedrock (Claude 3.5 Sonnet)
- **Algoritmo de riesgo multi-factorial** con 12+ parámetros de análisis
- **Probabilidad de deserción** calculada en tiempo real (0-100%)
- **Recomendaciones automáticas** de intervención personalizada
- **Factores de riesgo explicables** para cada predicción

### 📊 Dashboard y Analítica en Tiempo Real
- **Métricas institucionales** con KPIs de retención
- **Visualizaciones interactivas** con Recharts
- **Análisis predictivo** con tendencias y proyecciones
- **Segmentación avanzada** por múltiples criterios
- **Exportación de reportes** en PDF y CSV

### 📧 Sistema de Campañas Inteligentes
- **Envío masivo segmentado** con AWS SES
- **Templates personalizables** con variables dinámicas
- **Tracking completo** de métricas de engagement
- **Segmentación automática** por nivel de riesgo
- **Programación de envíos** con calendario integrado

### 📥 Gestión de Datos Completa
- **Importación masiva CSV** con validación inteligente
- **Gestión jerárquica** universidad → facultad → carrera → alumno
- **Validación en tiempo real** con feedback detallado
- **Sincronización con sistemas externos** (LMS, ERP)

### 🎨 Multi-tenant y White-label
- **Branding personalizable** por institución
- **Múltiples universidades** en una sola instancia
- **Roles y permisos granulares** con 5 niveles
- **Configuración independiente** por tenant

## 🧮 Sistema de Cálculo de Riesgo de Deserción

### Algoritmo Multi-factorial
El sistema utiliza un algoritmo avanzado que analiza múltiples factores para calcular la probabilidad de deserción:

#### Factores Académicos (0-75 puntos)
1. **Promedio de Notas** (0-30 puntos)
   - < 2.0: 30 puntos (Crítico)
   - 2.0-3.0: 20 puntos (Alto)
   - 3.0-3.5: 10 puntos (Medio)
   - > 3.5: 0 puntos (Bajo)

2. **Asistencia a Clases** (0-25 puntos)
   - < 50%: 25 puntos (Muy baja)
   - 50-70%: 15 puntos (Baja)
   - 70-80%: 8 puntos (Regular)
   - > 80%: 0 puntos (Buena)

3. **Materias Pendientes** (0-20 puntos)
   - ≥ 4 materias: 20 puntos
   - 2-3 materias: 12 puntos
   - 1 materia: 5 puntos
   - 0 materias: 0 puntos

#### Factores de Progreso (0-35 puntos)
4. **Progreso Académico** (0-25 puntos)
   - Relación créditos aprobados/totales
   - < 30%: 25 puntos
   - 30-50%: 15 puntos
   - 50-70%: 8 puntos
   - > 70%: 0 puntos

5. **Semestre vs Progreso** (0-10 puntos)
   - Semestre > 6 con progreso < 60%: 10 puntos adicionales

#### Factores de Engagement (0-35 puntos)
6. **Actividad en Sistemas** (0-20 puntos)
   - Análisis de último login en 3 sistemas
   - > 30 días: 20 puntos
   - 14-30 días: 12 puntos
   - 7-14 días: 5 puntos
   - < 7 días: 0 puntos

7. **Ingreso al Campus** (0-15 puntos)
   - Días desde último ingreso físico
   - > 30 días: 15 puntos
   - 14-30 días: 8 puntos
   - 7-14 días: 3 puntos
   - < 7 días: 0 puntos

#### Factor Socioeconómico (0-15 puntos)
8. **Estado Socioeconómico**
   - Bajo: 15 puntos
   - Medio-Bajo: 8 puntos
   - Medio o superior: 0 puntos

### Cálculo de Probabilidad y Nivel de Riesgo

```
Probabilidad de Deserción = (Puntaje Total / 150) × 100%

Niveles de Riesgo:
- CRÍTICO: ≥ 70% probabilidad (Rojo)
- ALTO: 50-69% probabilidad (Naranja)
- MEDIO: 30-49% probabilidad (Amarillo)
- BAJO: < 30% probabilidad (Verde)
```

### Indicadores Visuales en la Plataforma
- **Códigos de color** para identificación rápida
- **Barra de progreso** con porcentaje de probabilidad
- **Lista de factores** contribuyentes al riesgo
- **Recomendaciones automáticas** basadas en factores identificados

## 🏗️ Arquitectura Técnica

### Stack Tecnológico Completo
- **Frontend**: Next.js 14 + TypeScript + Material-UI + React Query
- **Backend**: AWS Lambda (Node.js 18) + API Gateway REST
- **Base de Datos**: DynamoDB (Single Table Design) + GSIs
- **IA/ML**: Amazon Bedrock (Claude 3.5 Sonnet)
- **Autenticación**: Amazon Cognito + JWT + MFA
- **Storage**: S3 + CloudFront CDN
- **Email**: AWS SES + Configuration Sets
- **IaC**: AWS CDK v2 (TypeScript)
- **Monitoring**: CloudWatch + X-Ray + Custom Metrics

### Arquitectura Serverless
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CloudFront    │    │   API Gateway   │    │   Lambda        │
│   (Frontend)    │───▶│   (REST API)    │───▶│   (Handlers)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                              │
         │              ┌─────────────────┐           │
         └─────────────▶│   S3 Bucket     │           │
                        │   (Static Files) │           │
                        └─────────────────┘           │
                                                        │
┌─────────────────┐    ┌─────────────────┐           │
│   Cognito       │    │   DynamoDB      │◀──────────┘
│   (Auth/Users)  │    │   (Database)    │
└─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SES           │    │   Bedrock       │    │   CloudWatch    │
│   (Email)       │    │   (AI/ML)       │    │   (Monitoring)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### DynamoDB Single Table Design
```
PK (Partition Key)      | SK (Sort Key)           | Entity Type
------------------------|-------------------------|-------------
UNI#<id>                | METADATA                | Universidad
UNI#<id>                | FAC#<id>                | Facultad
UNI#<id>                | CAR#<id>                | Carrera
UNI#<id>                | ALU#<cedula>            | Alumno
UNI#<id>                | CAM#<id>                | Campaña
CAM#<id>                | TRK#<cedula>            | Tracking

GSI1: Queries por Facultad
GSI2: Queries por Email
GSI3: Queries por Estado/Riesgo
```

## 🚀 Inicio Rápido

### Pre-requisitos
- Node.js 18+ y npm 9+
- AWS CLI v2 configurado
- AWS CDK v2 (`npm install -g aws-cdk`)
- Cuenta AWS con permisos administrativos
- Git y Git Bash (Windows) o Terminal (Mac/Linux)

### 1. Instalación
```bash
# Clonar repositorio
git clone <repository-url>
cd EduRetain

# Instalar dependencias y construir packages
npm run bootstrap
```

### 2. Configuración de Variables de Entorno
```bash
# Crear archivo de configuración para frontend
cat > packages/frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=https://your-api-gateway-url/dev
NEXT_PUBLIC_USER_POOL_ID=your-cognito-pool-id
NEXT_PUBLIC_USER_POOL_CLIENT_ID=your-cognito-client-id
EOF
```

### 3. Despliegue en AWS
```bash
# Bootstrap CDK (solo primera vez)
cd packages/infrastructure
cdk bootstrap

# Despliegue completo en desarrollo
./deploy.sh --stage dev --profile your-aws-profile

# Solo backend (más rápido para desarrollo)
./deploy.sh --stage dev --backend-only --profile your-aws-profile
```

### 4. Desarrollo Local
```bash
# Frontend en desarrollo (requiere backend desplegado)
cd packages/frontend
npm run dev

# Acceder a http://localhost:4000
```

### 5. Usuarios de Prueba
```
Admin:
- Email: admin@eduretain.com
- Password: Admin123!
- Rol: ADMIN_UNIVERSIDAD

Demo:
- Email: demo@eduretain.com
- Password: Demo123!
- Rol: OPERADOR_FACULTAD
```

## 📊 Funcionalidades Detalladas

### Dashboard Principal
- **Cards de métricas clave**:
  - Total de estudiantes
  - Estudiantes en riesgo
  - Tasa de retención
  - Campañas activas
- **Gráficos interactivos**:
  - Distribución por nivel de riesgo (pie chart)
  - Tendencia de retención (line chart)
  - Distribución por facultad (bar chart)
- **Lista de alertas críticas** con acciones rápidas
- **Accesos directos** a funciones principales

### Gestión de Alumnos
- **Tabla avanzada** con 15+ columnas de información:
  - Datos personales y académicos
  - Indicadores de asistencia y promedio
  - Actividad en sistemas (3 sistemas monitoreados)
  - Ingreso al campus
  - Estado socioeconómico
  - Probabilidad de deserción con barra visual
  - Nivel de riesgo con código de color
  - Cantidad de campañas recibidas
- **Búsqueda en tiempo real** por nombre, cédula o email
- **Filtros avanzados** por múltiples criterios
- **Paginación** configurable (5, 10, 25, 50 registros)
- **Edición inline** de datos del estudiante
- **Eliminación** con confirmación

### Importación de Datos
- **Drag & drop** para archivos CSV
- **Validación en tiempo real** con mensajes específicos
- **Vista previa** de datos antes de importar
- **Plantilla descargable** con formato correcto
- **Procesamiento en lotes** para grandes volúmenes
- **Reporte detallado** de importación:
  - Registros procesados
  - Registros creados
  - Errores específicos por fila
- **Auto-limpieza** después de importación exitosa

### Sistema de Campañas
- **Wizard de 4 pasos**:
  1. Información básica y template
  2. Filtros de destinatarios
  3. Contenido del mensaje
  4. Revisión y envío
- **Templates predefinidos**:
  - Bienvenida institucional
  - Alerta de riesgo académico
  - Mensaje personalizado
- **Segmentación avanzada**:
  - Por estado de matrícula
  - Por nivel de riesgo
  - Por rango de promedio
  - Por facultad/carrera
- **Variables dinámicas** en contenido
- **Programación de envíos** o envío inmediato
- **Vista previa** antes de enviar

### Analítica y Predicciones
- **Métricas de retención** por período
- **Análisis de tendencias** con proyecciones
- **Comparativas** entre facultades/carreras
- **Heatmaps** de riesgo por segmento
- **Exportación de datos** para análisis externo

## 🔒 Seguridad y Compliance

### Autenticación y Autorización
- **Amazon Cognito** con políticas de contraseña fuertes
- **MFA obligatorio** en producción
- **Tokens JWT** con expiración configurable
- **Refresh tokens** seguros
- **Roles y permisos**:
  - **SUPER_ADMIN**: Acceso total multi-universidad
  - **ADMIN_UNIVERSIDAD**: Gestión completa de su universidad
  - **OPERADOR_FACULTAD**: Gestión de su facultad
  - **DOCENTE**: Vista de sus estudiantes
  - **SOLO_LECTURA**: Solo reportes y dashboards

### Protección de Datos
- **Encriptación TLS 1.3** en tránsito
- **Encriptación AES-256** en reposo
- **Aislamiento multi-tenant** estricto
- **Logs de auditoría** inmutables
- **Backup automático** con point-in-time recovery
- **GDPR compliant** con derecho al olvido

### Mejores Prácticas de Seguridad
- **Principle of least privilege** en IAM
- **Secrets Manager** para credenciales
- **VPC endpoints** para servicios AWS
- **WAF** para protección de API
- **Rate limiting** en API Gateway
- **Input validation** con Zod schemas

## 📈 Monitoreo y Observabilidad

### CloudWatch Dashboards
- **Dashboard de Aplicación**:
  - Estudiantes totales y en riesgo
  - Campañas enviadas y tasa de apertura
  - Predicciones realizadas
  - Importaciones procesadas
- **Dashboard de Infraestructura**:
  - Latencia de API Gateway
  - Errores de Lambda
  - Throttling de DynamoDB
  - Uso de Bedrock
- **Dashboard de Costos**:
  - Costo por servicio
  - Tendencia mensual
  - Proyección de gastos

### Alarmas y Alertas
- **API Gateway**:
  - 5XX errors > 10 en 5 minutos
  - Latencia P99 > 5 segundos
- **Lambda**:
  - Error rate > 1%
  - Concurrent executions > 80%
- **DynamoDB**:
  - Throttled requests > 0
  - System errors > 0
- **Cognito**:
  - Failed sign-ins > 10 en 5 minutos

### X-Ray Tracing
- **Tracing end-to-end** de requests
- **Service map** visual
- **Análisis de latencia** por servicio
- **Identificación de bottlenecks**

## 💰 Modelo de Costos AWS

### Estimación Mensual por Tamaño

| Componente | Pequeña (100 usuarios) | Mediana (1,000 usuarios) | Grande (10,000 usuarios) |
|------------|------------------------|--------------------------|--------------------------|
| Lambda | $5 | $50 | $500 |
| API Gateway | $3 | $30 | $300 |
| DynamoDB | $10 | $25 | $100 |
| Cognito | $5 | $50 | $500 |
| S3 + CloudFront | $5 | $15 | $50 |
| SES (10k emails) | $1 | $10 | $100 |
| Bedrock (1k predictions) | $20 | $200 | $2,000 |
| CloudWatch | $10 | $30 | $100 |
| **Total Estimado** | **$59** | **$410** | **$3,650** |

*Precios en USD. Pueden variar según región y uso real.*

### Optimización de Costos
- **DynamoDB On-Demand** para desarrollo
- **Lambda Reserved Concurrency** para producción
- **CloudFront caching** agresivo
- **S3 Intelligent-Tiering** para archivos
- **Scheduled scaling** para horarios pico

## 🛠️ Guía de Desarrollo

### Estructura del Proyecto
```
EduRetain/
├── packages/
│   ├── frontend/                 # Aplicación Next.js
│   │   ├── src/
│   │   │   ├── app/             # App Router pages
│   │   │   ├── components/      # Componentes React
│   │   │   ├── hooks/           # Custom React hooks
│   │   │   ├── lib/             # Utilidades y configuración
│   │   │   └── styles/          # Estilos globales
│   │   └── public/              # Assets estáticos
│   │
│   ├── backend/                  # Funciones Lambda
│   │   ├── src/
│   │   │   ├── handlers/        # Lambda handlers
│   │   │   ├── services/        # Lógica de negocio
│   │   │   ├── repositories/    # Acceso a datos
│   │   │   └── utils/           # Utilidades
│   │   └── tests/               # Tests unitarios
│   │
│   ├── infrastructure/           # AWS CDK
│   │   ├── lib/
│   │   │   ├── constructs/      # Constructos reutilizables
│   │   │   └── stacks/          # Stacks CDK
│   │   └── bin/                 # Entry point CDK
│   │
│   └── shared/                   # Código compartido
│       ├── src/
│       │   ├── types/           # TypeScript interfaces
│       │   ├── schemas/         # Zod schemas
│       │   └── utils/           # Utilidades compartidas
│       └── tests/               # Tests compartidos
│
├── scripts/                      # Scripts de utilidad
├── docs/                         # Documentación adicional
├── .github/                      # GitHub Actions CI/CD
├── deploy.sh                     # Script de despliegue
├── package.json                  # Workspace root
├── tsconfig.json                # TypeScript config base
├── CLAUDE.md                    # Master prompt para IA
└── README.md                    # Este archivo
```

### Comandos de Desarrollo

#### Workspace Root
```bash
# Instalación y setup
npm run bootstrap              # Instalar todo y build inicial
npm run clean                  # Limpiar node_modules y dist
npm run reinstall             # Clean + bootstrap

# Desarrollo
npm run dev                   # Iniciar frontend en puerto 4000
npm run dev:3000             # Iniciar frontend en puerto 3000
npm run build                # Build todos los packages
npm run lint                 # Lint todos los packages
npm run test                 # Tests todos los packages
npm run typecheck           # Type checking

# Despliegue
npm run deploy:dev          # Deploy desarrollo
npm run deploy:prod        # Deploy producción
```

#### Frontend Específico
```bash
cd packages/frontend
npm run dev                  # Desarrollo local
npm run build               # Build producción
npm run lint                # Linting
npm run type-check         # TypeScript check
```

#### Backend Específico
```bash
cd packages/backend
npm run build               # Compilar TypeScript
npm run test                # Tests unitarios
npm run test:watch         # Tests en modo watch
```

#### Infrastructure (CDK)
```bash
cd packages/infrastructure
npm run build               # Compilar CDK
cdk synth                  # Sintetizar CloudFormation
cdk diff                   # Ver cambios
cdk deploy                 # Desplegar stack
cdk destroy               # Eliminar stack
```

### Patrones de Código

#### Backend - Lambda Handler Pattern
```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createLogger } from '../utils/logger';
import { validateRequest, extractUserFromToken } from '../utils/validation';
import { successResponse, errorResponse } from '../utils/response';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const logger = createLogger({ 
    requestId: event.requestContext.requestId 
  });
  
  try {
    // 1. Extraer y validar usuario
    const user = extractUserFromToken(event);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    
    // 2. Validar request body
    const validation = validateRequest(schema, JSON.parse(event.body));
    if (!validation.success) {
      return validation.response;
    }
    
    // 3. Lógica de negocio
    const result = await service.process(validation.data);
    
    // 4. Respuesta exitosa
    return successResponse(result);
    
  } catch (error) {
    logger.error('Handler error', error);
    return errorResponse('Internal server error', 500);
  }
};
```

#### Frontend - Page Component Pattern
```typescript
'use client';

import React from 'react';
import { useQuery, useMutation } from 'react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import AppLayout from '@/components/Layout/AppLayout';
import { useSnackbar } from 'notistack';

export default function MyPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  // Fetch data
  const { data, isLoading, error } = useQuery(
    ['myData', user?.id],
    () => apiClient.myEndpoint.get(),
    { enabled: !!user }
  );
  
  // Mutations
  const mutation = useMutation(
    (data: any) => apiClient.myEndpoint.create(data),
    {
      onSuccess: () => {
        enqueueSnackbar('Success!', { variant: 'success' });
        queryClient.invalidateQueries(['myData']);
      },
      onError: () => {
        enqueueSnackbar('Error!', { variant: 'error' });
      }
    }
  );
  
  return (
    <AppLayout>
      {/* Page content */}
    </AppLayout>
  );
}
```

#### Repository Pattern
```typescript
export class MyRepository extends BaseRepository {
  async create(item: MyItem): Promise<MyItem> {
    const ddbItem = {
      PK: createPK('PREFIX', item.id),
      SK: createSK('TYPE', item.subId),
      ...item,
      createdAt: getCurrentTimestamp()
    };
    
    await this.putItem(ddbItem);
    return item;
  }
  
  async findById(id: string): Promise<MyItem | null> {
    const result = await this.getItem(
      createPK('PREFIX', id),
      createSK('TYPE', 'METADATA')
    );
    
    return result ? this.mapFromDynamoDB(result) : null;
  }
}
```

### Testing

#### Unit Tests (Jest)
```typescript
describe('AlumnoService', () => {
  let service: AlumnoService;
  let repository: jest.Mocked<AlumnoRepository>;
  
  beforeEach(() => {
    repository = createMockRepository();
    service = new AlumnoService(repository);
  });
  
  it('should calculate risk correctly', async () => {
    const alumno = createTestAlumno({ promedioNotas: 2.5 });
    const result = await service.calculateRisk(alumno);
    
    expect(result.riesgo).toBe('ALTO');
    expect(result.probabilidad).toBeGreaterThan(50);
  });
});
```

#### Integration Tests
```typescript
describe('API Integration', () => {
  it('should create and retrieve alumno', async () => {
    const alumno = await apiClient.alumnos.create(testData);
    expect(alumno.id).toBeDefined();
    
    const retrieved = await apiClient.alumnos.get(alumno.id);
    expect(retrieved).toEqual(alumno);
  });
});
```

### Buenas Prácticas

#### TypeScript
- ✅ Usar `strict: true` en tsconfig
- ✅ Definir interfaces para todos los datos
- ✅ Evitar `any`, usar `unknown` cuando sea necesario
- ✅ Usar enums para valores constantes
- ✅ Documentar funciones complejas con JSDoc

#### React
- ✅ Componentes funcionales con hooks
- ✅ Custom hooks para lógica reutilizable
- ✅ React Query para estado del servidor
- ✅ Memoización cuando sea necesario
- ✅ Error boundaries para manejo de errores

#### AWS
- ✅ Principio de menor privilegio en IAM
- ✅ Usar AWS SDK v3 (modular)
- ✅ Implementar retry logic
- ✅ Logs estructurados con contexto
- ✅ Métricas custom en CloudWatch

#### Seguridad
- ✅ Validar toda entrada con Zod
- ✅ Sanitizar datos antes de almacenar
- ✅ No exponer información sensible en logs
- ✅ Usar HTTPS siempre
- ✅ Rotar credenciales regularmente

## 🚀 CI/CD y DevOps

### GitHub Actions Pipeline
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run lint
      - run: npm run typecheck
  
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: aws-actions/configure-aws-credentials@v2
      - run: npm ci
      - run: npm run build
      - run: npm run deploy:prod
```

### Ambientes
- **Development**: Rama `develop`, despliegue automático
- **Staging**: Rama `staging`, requiere aprobación
- **Production**: Rama `main`, requiere 2 aprobaciones

## 🤝 Contribución

### Proceso de Contribución
1. Fork el repositorio
2. Crear feature branch: `git checkout -b feature/amazing-feature`
3. Commit cambios: `git commit -m 'feat: add amazing feature'`
4. Push al branch: `git push origin feature/amazing-feature`
5. Abrir Pull Request

### Conventional Commits
```
feat: nueva funcionalidad
fix: corrección de bug
docs: cambios en documentación
style: formato, sin cambios de código
refactor: refactorización de código
perf: mejoras de performance
test: agregar tests
chore: cambios de build o auxiliares
```

### Code Review Checklist
- [ ] Código sigue los estándares del proyecto
- [ ] Tests agregados/actualizados
- [ ] Documentación actualizada
- [ ] Sin secretos en el código
- [ ] Performance considerada
- [ ] Seguridad validada

## 📞 Soporte y Recursos

### Documentación
- **[API Docs](./docs/api.md)**: Documentación de endpoints
- **[Architecture](./docs/architecture.md)**: Decisiones arquitectónicas
- **[Deployment](./docs/deployment.md)**: Guía detallada de despliegue
- **[Troubleshooting](./docs/troubleshooting.md)**: Solución de problemas comunes
- **[Master Prompt](./CLAUDE.md)**: Guía técnica completa de desarrollo

### Comunidad
- **GitHub Issues**: Reportar bugs y solicitar features
- **Discussions**: Preguntas y discusiones técnicas
- **Wiki**: Guías y tutoriales de la comunidad

### Contacto Profesional
- **Email Soporte**: soporte@eduretain.com
- **Email Ventas**: ventas@eduretain.com
- **Website**: https://eduretain.com
- **Lead Developer**: diego.borra@cloudhesive.com

## 📄 Licencia

Copyright © 2025 CloudHesive. Todos los derechos reservados.

Este software es propietario y confidencial. Prohibida su distribución sin autorización.

## 🏆 Agradecimientos

Desarrollado con ❤️ por el equipo de CloudHesive utilizando:

- **[AWS](https://aws.amazon.com)**: Infraestructura cloud serverless
- **[Anthropic](https://anthropic.com)**: Claude 3.5 Sonnet para IA
- **[Vercel](https://vercel.com)**: Next.js framework
- **[MUI](https://mui.com)**: Material-UI components
- **[TypeScript](https://typescriptlang.org)**: Type safety

### Contributors
- Diego Borra (diego.borra@cloudhesive.com) - Lead Developer & Architect
- CloudHesive Team - Design & Strategy

---

*📅 Last Updated: January 2025*

*⭐ If you find this project useful, please consider giving it a star on GitHub!*