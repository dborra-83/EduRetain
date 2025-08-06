import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AlumnoRepository } from '../repositories/alumno-repository';
import { 
  successResponse, 
  badRequestResponse, 
  internalErrorResponse
} from '../utils/response';
import { extractUserFromToken, canAccessUniversidad } from '../utils/validation';
import { createLogger } from '../utils/logger';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const alumnoRepository = new AlumnoRepository();
const cloudWatch = new CloudWatchClient({ region: process.env.AWS_REGION });

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const logger = createLogger({ 
    requestId: event.requestContext.requestId,
    operation: `${event.httpMethod} ${event.resource}`
  });

  logger.info('Dashboard handler invoked', { 
    method: event.httpMethod, 
    path: event.path 
  });

  try {
    const user = extractUserFromToken(event);
    if (!user) {
      return badRequestResponse('Token de usuario inválido');
    }

    const { httpMethod, resource } = event;

    if (resource.includes('/metricas')) {
      return await getMetricas(event, user, logger);
    }

    switch (httpMethod) {
      case 'GET':
        return await getDashboard(event, user, logger);

      default:
        return badRequestResponse(`Método ${httpMethod} no soportado`);
    }
  } catch (error) {
    logger.error('Error in dashboard handler', error);
    return internalErrorResponse('Error interno del servidor');
  }
};

async function getDashboard(
  event: APIGatewayProxyEvent,
  user: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    let universidadId = queryParams.universidadId;

    // Determinar universidad
    if (!universidadId) {
      if (user.rol === 'SUPER_ADMIN') {
        return badRequestResponse('Super admin debe especificar universidadId');
      }
      universidadId = user.universidadId;
    }

    if (!universidadId) {
      return badRequestResponse('Universidad ID requerido');
    }

    // Verificar permisos
    if (!canAccessUniversidad(user.universidadId, universidadId, user.rol)) {
      return badRequestResponse('No tienes permisos para acceder a esta universidad');
    }

    logger.info('Getting dashboard data', { universidadId });

    // Obtener métricas de alumnos
    const metricas = await alumnoRepository.getMetricas(universidadId);

    // Calcular métricas adicionales
    const tasaRetencion = metricas.total > 0 ? 
      ((metricas.activos / metricas.total) * 100).toFixed(1) : '0';

    const alumnosEnRiesgoAlto = metricas.porRiesgo.ALTO + metricas.porRiesgo.CRITICO;
    const porcentajeRiesgoAlto = metricas.total > 0 ? 
      ((alumnosEnRiesgoAlto / metricas.total) * 100).toFixed(1) : '0';

    // Obtener alumnos recientes en riesgo (para alertas)
    const alumnosRiesgo = await alumnoRepository.findByUniversidad(
      universidadId,
      { 
        riesgoDesercion: 'CRITICO' as any
      },
      5 // Top 5 en riesgo crítico
    );

    const dashboard = {
      resumen: {
        totalAlumnos: metricas.total,
        alumnosActivos: metricas.activos,
        alumnosEnRiesgo: alumnosEnRiesgoAlto,
        tasaRetencion: parseFloat(tasaRetencion),
        porcentajeRiesgoAlto: parseFloat(porcentajeRiesgoAlto)
      },
      distribucionPorRiesgo: [
        { label: 'Bajo', value: metricas.porRiesgo.BAJO, color: '#4CAF50' },
        { label: 'Medio', value: metricas.porRiesgo.MEDIO, color: '#FF9800' },
        { label: 'Alto', value: metricas.porRiesgo.ALTO, color: '#F44336' },
        { label: 'Crítico', value: metricas.porRiesgo.CRITICO, color: '#9C27B0' }
      ],
      distribucionPorEstado: [
        { label: 'Activo', value: metricas.porEstado.ACTIVO, color: '#4CAF50' },
        { label: 'En Riesgo', value: metricas.porEstado.EN_RIESGO, color: '#FF9800' },
        { label: 'Inactivo', value: metricas.porEstado.INACTIVO, color: '#757575' },
        { label: 'Egresado', value: metricas.porEstado.EGRESADO, color: '#2196F3' },
        { label: 'Desertor', value: metricas.porEstado.DESERTOR, color: '#F44336' }
      ],
      alertas: {
        alumnosRiesgoCritico: alumnosRiesgo.items.map(alumno => ({
          cedula: alumno.cedula,
          nombre: `${alumno.nombre} ${alumno.apellido}`,
          carreraId: alumno.carreraId,
          factoresRiesgo: alumno.factoresRiesgo,
          ultimaActividad: alumno.ultimaActividad
        }))
      },
      tendencias: {
        // TODO: Implementar tendencias históricas en siguiente iteración
        retencionUltimos30Dias: tasaRetencion,
        nuevosCasosRiesgo: alumnosEnRiesgoAlto
      }
    };

    // Enviar métricas a CloudWatch para monitoreo
    await enviarMetricasCloudWatch(universidadId, metricas, logger);

    return successResponse(dashboard);
  } catch (error) {
    logger.error('Error getting dashboard', error);
    return internalErrorResponse();
  }
}

async function getMetricas(
  event: APIGatewayProxyEvent,
  user: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    let universidadId = queryParams.universidadId;

    // Determinar universidad
    if (!universidadId) {
      if (user.rol === 'SUPER_ADMIN') {
        return badRequestResponse('Super admin debe especificar universidadId');
      }
      universidadId = user.universidadId;
    }

    if (!canAccessUniversidad(user.universidadId, universidadId, user.rol)) {
      return badRequestResponse('No tienes permisos para acceder a esta universidad');
    }

    logger.info('Getting detailed metrics', { universidadId });

    const metricas = await alumnoRepository.getMetricas(universidadId);

    // Métricas detalladas por facultad/carrera
    const alumnos = await alumnoRepository.findByUniversidad(universidadId);
    
    const metricasPorFacultad: Record<string, any> = {};
    const metricasPorCarrera: Record<string, any> = {};

    alumnos.items.forEach(alumno => {
      // Por facultad
      if (!metricasPorFacultad[alumno.facultadId]) {
        metricasPorFacultad[alumno.facultadId] = {
          total: 0,
          activos: 0,
          enRiesgo: 0,
          porRiesgo: { BAJO: 0, MEDIO: 0, ALTO: 0, CRITICO: 0 }
        };
      }
      
      const facMetricas = metricasPorFacultad[alumno.facultadId];
      facMetricas.total++;
      if (alumno.estadoMatricula === 'ACTIVO') facMetricas.activos++;
      if (['ALTO', 'CRITICO'].includes(alumno.riesgoDesercion)) facMetricas.enRiesgo++;
      facMetricas.porRiesgo[alumno.riesgoDesercion]++;

      // Por carrera
      if (!metricasPorCarrera[alumno.carreraId]) {
        metricasPorCarrera[alumno.carreraId] = {
          total: 0,
          activos: 0,
          enRiesgo: 0,
          porRiesgo: { BAJO: 0, MEDIO: 0, ALTO: 0, CRITICO: 0 },
          promedioNotas: 0,
          promedioCreditos: 0
        };
      }
      
      const carMetricas = metricasPorCarrera[alumno.carreraId];
      carMetricas.total++;
      if (alumno.estadoMatricula === 'ACTIVO') carMetricas.activos++;
      if (['ALTO', 'CRITICO'].includes(alumno.riesgoDesercion)) carMetricas.enRiesgo++;
      carMetricas.porRiesgo[alumno.riesgoDesercion]++;
      carMetricas.promedioNotas += alumno.promedioNotas;
      carMetricas.promedioCreditos += (alumno.creditosAprobados / alumno.creditosTotales);
    });

    // Calcular promedios
    Object.values(metricasPorCarrera).forEach((carrera: any) => {
      if (carrera.total > 0) {
        carrera.promedioNotas = (carrera.promedioNotas / carrera.total).toFixed(2);
        carrera.promedioCreditos = ((carrera.promedioCreditos / carrera.total) * 100).toFixed(1);
      }
    });

    const response = {
      general: metricas,
      porFacultad: metricasPorFacultad,
      porCarrera: metricasPorCarrera,
      timestamp: new Date().toISOString()
    };

    return successResponse(response);
  } catch (error) {
    logger.error('Error getting metrics', error);
    return internalErrorResponse();
  }
}

async function enviarMetricasCloudWatch(
  universidadId: string, 
  metricas: any, 
  logger: any
): Promise<void> {
  try {
    const metricData = [
      {
        MetricName: 'TotalStudents',
        Value: metricas.total,
        Unit: 'Count',
        Dimensions: [
          { Name: 'UniversidadId', Value: universidadId }
        ]
      },
      {
        MetricName: 'StudentsAtRisk',
        Value: metricas.porRiesgo.ALTO + metricas.porRiesgo.CRITICO,
        Unit: 'Count',
        Dimensions: [
          { Name: 'UniversidadId', Value: universidadId }
        ]
      },
      {
        MetricName: 'ActiveStudents',
        Value: metricas.activos,
        Unit: 'Count',
        Dimensions: [
          { Name: 'UniversidadId', Value: universidadId }
        ]
      },
      {
        MetricName: 'RetentionRate',
        Value: metricas.total > 0 ? (metricas.activos / metricas.total) * 100 : 0,
        Unit: 'Percent',
        Dimensions: [
          { Name: 'UniversidadId', Value: universidadId }
        ]
      }
    ];

    const command = new PutMetricDataCommand({
      Namespace: 'EduRetain',
      MetricData: metricData
    });

    await cloudWatch.send(command);
    logger.debug('Metrics sent to CloudWatch', { universidadId, metricsCount: metricData.length });
  } catch (error) {
    logger.warn('Error sending metrics to CloudWatch', error);
    // No fallar la operación principal por este error
  }
}