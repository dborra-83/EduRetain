import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CampanaRepository } from '../repositories/campana-repository';
import { AlumnoRepository } from '../repositories/alumno-repository';
import { UniversidadRepository } from '../repositories/universidad-repository';
import { EmailService } from '../services/email-service';
import { 
  successResponse, 
  createdResponse, 
  notFoundResponse, 
  badRequestResponse, 
  internalErrorResponse,
  conflictResponse
} from '../utils/response';
import { validateRequest, extractUserFromToken, canAccessUniversidad, parseJSON } from '../utils/validation';
import { campanaSchema, EstadoCampana } from '@eduretain/shared';
import { createLogger } from '../utils/logger';

const campanaRepository = new CampanaRepository();
const alumnoRepository = new AlumnoRepository();
const universidadRepository = new UniversidadRepository();
const emailService = new EmailService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const logger = createLogger({ 
    requestId: event.requestContext.requestId,
    operation: `${event.httpMethod} ${event.resource}`
  });

  logger.info('Campana handler invoked', { 
    method: event.httpMethod, 
    path: event.path 
  });

  try {
    const user = extractUserFromToken(event);
    if (!user) {
      return badRequestResponse('Token de usuario inválido');
    }

    const { httpMethod, pathParameters, resource } = event;
    const campanaId = pathParameters?.id;

    // Rutas especiales
    if (resource.includes('/enviar')) {
      if (!campanaId) {
        return badRequestResponse('ID de campaña requerido');
      }
      return await enviarCampana(campanaId, event, user, logger);
    }

    if (resource.includes('/tracking')) {
      if (!campanaId) {
        return badRequestResponse('ID de campaña requerido');
      }
      return await getTracking(campanaId, event, user, logger);
    }

    switch (httpMethod) {
      case 'GET':
        if (campanaId) {
          return await getCampana(campanaId, event, user, logger);
        } else {
          return await getCampanas(event, user, logger);
        }

      case 'POST':
        return await createCampana(event, user, logger);

      case 'PUT':
        if (!campanaId) {
          return badRequestResponse('ID de campaña requerido para actualizar');
        }
        return await updateCampana(campanaId, event, user, logger);

      case 'DELETE':
        if (!campanaId) {
          return badRequestResponse('ID de campaña requerido para eliminar');
        }
        return await deleteCampana(campanaId, event, user, logger);

      default:
        return badRequestResponse(`Método ${httpMethod} no soportado`);
    }
  } catch (error) {
    logger.error('Error in campana handler', error);
    return internalErrorResponse('Error interno del servidor');
  }
};

async function getCampanas(
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

    // Verificar permisos
    if (!canAccessUniversidad(user.universidadId, universidadId, user.rol)) {
      return badRequestResponse('No tienes permisos para acceder a esta universidad');
    }

    const estado = queryParams.estado as EstadoCampana;
    const limit = queryParams.limit ? parseInt(queryParams.limit) : 20;
    const cursor = queryParams.cursor ? JSON.parse(queryParams.cursor) : undefined;

    logger.info('Getting campanas', { universidadId, estado, limit });

    const result = await campanaRepository.findByUniversidad(
      universidadId,
      estado,
      limit,
      cursor
    );

    const response = {
      items: result.items,
      pagination: {
        limit,
        hasMore: !!result.lastEvaluatedKey,
        nextCursor: result.lastEvaluatedKey ? JSON.stringify(result.lastEvaluatedKey) : null
      }
    };

    return successResponse(response);
  } catch (error) {
    logger.error('Error getting campanas', error);
    return internalErrorResponse();
  }
}

async function getCampana(
  id: string,
  event: APIGatewayProxyEvent,
  user: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    let universidadId = queryParams.universidadId;

    if (!universidadId) {
      if (user.rol === 'SUPER_ADMIN') {
        return badRequestResponse('Super admin debe especificar universidadId');
      }
      universidadId = user.universidadId;
    }

    // Verificar permisos
    if (!canAccessUniversidad(user.universidadId, universidadId, user.rol)) {
      return badRequestResponse('No tienes permisos para acceder a esta universidad');
    }

    logger.info('Getting campana', { campanaId: id, universidadId });

    const campana = await campanaRepository.findById(universidadId, id);
    if (!campana) {
      return notFoundResponse('Campaña no encontrada');
    }

    return successResponse(campana);
  } catch (error) {
    logger.error('Error getting campana', error);
    return internalErrorResponse();
  }
}

async function createCampana(
  event: APIGatewayProxyEvent,
  user: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  try {
    const body = parseJSON(event.body);
    if (!body) {
      return badRequestResponse('Cuerpo de la petición requerido');
    }

    // Agregar creadoPor del token
    body.creadoPor = user.userId;

    const validation = validateRequest(campanaSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const { universidadId } = validation.data;

    // Verificar permisos
    if (!canAccessUniversidad(user.universidadId, universidadId, user.rol)) {
      return badRequestResponse('No tienes permisos para crear campañas en esta universidad');
    }

    logger.info('Creating campana', { universidadId, nombre: validation.data.nombre });

    const campana = await campanaRepository.create(validation.data);
    logger.info('Campana created successfully', { campanaId: campana.id });

    return createdResponse(campana, 'Campaña creada exitosamente');
  } catch (error) {
    logger.error('Error creating campana', error);
    return internalErrorResponse();
  }
}

async function updateCampana(
  id: string,
  event: APIGatewayProxyEvent,
  user: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  try {
    const body = parseJSON(event.body);
    if (!body) {
      return badRequestResponse('Cuerpo de la petición requerido');
    }

    const queryParams = event.queryStringParameters || {};
    let universidadId = body.universidadId || queryParams.universidadId;

    if (!universidadId) {
      if (user.rol === 'SUPER_ADMIN') {
        return badRequestResponse('Super admin debe especificar universidadId');
      }
      universidadId = user.universidadId;
    }

    // Verificar permisos
    if (!canAccessUniversidad(user.universidadId, universidadId, user.rol)) {
      return badRequestResponse('No tienes permisos para actualizar campañas en esta universidad');
    }

    // Verificar que existe
    const existing = await campanaRepository.findById(universidadId, id);
    if (!existing) {
      return notFoundResponse('Campaña no encontrada');
    }

    // No permitir actualizar campaña ya enviada
    if (existing.estado === EstadoCampana.ENVIADA) {
      return conflictResponse('No se puede actualizar una campaña ya enviada');
    }

    // Validar datos parciales
    const validation = validateRequest(campanaSchema.partial(), body);
    if (!validation.success) {
      return validation.response;
    }

    logger.info('Updating campana', { campanaId: id, universidadId });

    const updated = await campanaRepository.update(universidadId, id, validation.data);
    logger.info('Campana updated successfully', { campanaId: id });

    return successResponse(updated, 'Campaña actualizada exitosamente');
  } catch (error) {
    logger.error('Error updating campana', error);
    return internalErrorResponse();
  }
}

async function deleteCampana(
  id: string,
  event: APIGatewayProxyEvent,
  user: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    let universidadId = queryParams.universidadId;

    if (!universidadId) {
      if (user.rol === 'SUPER_ADMIN') {
        return badRequestResponse('Super admin debe especificar universidadId');
      }
      universidadId = user.universidadId;
    }

    // Verificar permisos
    if (!canAccessUniversidad(user.universidadId, universidadId, user.rol)) {
      return badRequestResponse('No tienes permisos para eliminar campañas en esta universidad');
    }

    // Verificar que existe
    const existing = await campanaRepository.findById(universidadId, id);
    if (!existing) {
      return notFoundResponse('Campaña no encontrada');
    }

    // No permitir eliminar campaña ya enviada
    if (existing.estado === EstadoCampana.ENVIADA) {
      return conflictResponse('No se puede eliminar una campaña ya enviada');
    }

    logger.info('Deleting campana', { campanaId: id, universidadId });

    await campanaRepository.delete(universidadId, id);
    logger.info('Campana deleted successfully', { campanaId: id });

    return successResponse(null, 'Campaña eliminada exitosamente');
  } catch (error) {
    logger.error('Error deleting campana', error);
    return internalErrorResponse();
  }
}

async function enviarCampana(
  id: string,
  event: APIGatewayProxyEvent,
  user: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    let universidadId = queryParams.universidadId;

    if (!universidadId) {
      if (user.rol === 'SUPER_ADMIN') {
        return badRequestResponse('Super admin debe especificar universidadId');
      }
      universidadId = user.universidadId;
    }

    // Verificar permisos
    if (!canAccessUniversidad(user.universidadId, universidadId, user.rol)) {
      return badRequestResponse('No tienes permisos para enviar campañas en esta universidad');
    }

    logger.info('Sending campana', { campanaId: id, universidadId });

    // Obtener campaña
    const campana = await campanaRepository.findById(universidadId, id);
    if (!campana) {
      return notFoundResponse('Campaña no encontrada');
    }

    // Verificar estado
    if (campana.estado !== EstadoCampana.BORRADOR && campana.estado !== EstadoCampana.PROGRAMADA) {
      return conflictResponse('Solo se pueden enviar campañas en estado borrador o programada');
    }

    // Obtener configuración de la universidad
    const universidad = await universidadRepository.findById(universidadId);
    if (!universidad) {
      return badRequestResponse('Universidad no encontrada');
    }

    // Actualizar estado a enviando
    await campanaRepository.update(universidadId, id, {
      estado: EstadoCampana.ENVIANDO
    });

    // Obtener alumnos destinatarios según filtros
    const alumnos = await obtenerDestinatarios(universidadId, campana, logger);

    if (alumnos.length === 0) {
      await campanaRepository.update(universidadId, id, {
        estado: EstadoCampana.BORRADOR
      });
      return badRequestResponse('No se encontraron destinatarios que coincidan con los filtros');
    }

    // Actualizar total de destinatarios
    await campanaRepository.updateEstadisticas(universidadId, id, {
      totalDestinatarios: alumnos.length
    });

    // Crear registros de tracking iniciales
    const trackingRecords = alumnos.map(alumno => ({
      campanaId: id,
      alumnoCedula: alumno.cedula,
      universidadId,
      enviado: false,
      entregado: false,
      rebotado: false,
      abierto: false,
      clickeado: false,
      darseBaja: false
    }));

    await campanaRepository.batchCreateTracking(trackingRecords);

    try {
      // Enviar emails
      const universidadConfig = {
        nombre: universidad.nombre,
        logo: universidad.logo,
        colorPrimario: universidad.configuracion?.colores?.primario || '#1976d2',
        email: universidad.email
      };

      let templateName: string;
      let resultadoEnvio: any;

      // Determinar tipo de template y enviar
      if (campana.template.includes('{{factoresRiesgo}}')) {
        // Template de riesgo
        templateName = `eduretain-risk-alert-${process.env.STAGE || 'dev'}`;
        resultadoEnvio = await enviarEmailsIndividuales(alumnos, campana, universidadConfig, templateName, logger);
      } else {
        // Template personalizado
        templateName = `eduretain-custom-${process.env.STAGE || 'dev'}`;
        resultadoEnvio = await enviarEmailsIndividuales(alumnos, campana, universidadConfig, templateName, logger);
      }

      // Actualizar estadísticas finales
      await campanaRepository.updateEstadisticas(universidadId, id, {
        enviados: resultadoEnvio.enviados,
        estado: EstadoCampana.ENVIADA
      });

      logger.info('Campana sent successfully', {
        campanaId: id,
        totalDestinatarios: alumnos.length,
        enviados: resultadoEnvio.enviados,
        errores: resultadoEnvio.errores?.length || 0
      });

      const response = {
        campanaId: id,
        estado: EstadoCampana.ENVIADA,
        totalDestinatarios: alumnos.length,
        enviados: resultadoEnvio.enviados,
        errores: resultadoEnvio.errores || []
      };

      return successResponse(response, 'Campaña enviada exitosamente');

    } catch (envioError) {
      logger.error('Error sending campaign emails', envioError);
      
      // Revertir estado en caso de error
      await campanaRepository.update(universidadId, id, {
        estado: EstadoCampana.BORRADOR
      });
      
      return internalErrorResponse('Error enviando la campaña');
    }

  } catch (error) {
    logger.error('Error in enviar campana', error);
    return internalErrorResponse();
  }
}

async function getTracking(
  id: string,
  event: APIGatewayProxyEvent,
  user: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    let universidadId = queryParams.universidadId;

    if (!universidadId) {
      if (user.rol === 'SUPER_ADMIN') {
        return badRequestResponse('Super admin debe especificar universidadId');
      }
      universidadId = user.universidadId;
    }

    // Verificar permisos
    if (!canAccessUniversidad(user.universidadId, universidadId, user.rol)) {
      return badRequestResponse('No tienes permisos para acceder a esta universidad');
    }

    logger.info('Getting campana tracking', { campanaId: id });

    // Obtener estadísticas de tracking
    const stats = await campanaRepository.getTrackingStats(id);
    
    // Obtener detalles de tracking
    const limit = queryParams.limit ? parseInt(queryParams.limit) : 50;
    const cursor = queryParams.cursor ? JSON.parse(queryParams.cursor) : undefined;
    
    const trackingDetails = await campanaRepository.findTrackingByCampana(id, limit, cursor);

    const response = {
      estadisticas: stats,
      detalles: trackingDetails.items,
      pagination: {
        limit,
        hasMore: !!trackingDetails.lastEvaluatedKey,
        nextCursor: trackingDetails.lastEvaluatedKey ? JSON.stringify(trackingDetails.lastEvaluatedKey) : null
      }
    };

    return successResponse(response);
  } catch (error) {
    logger.error('Error getting tracking', error);
    return internalErrorResponse();
  }
}

async function obtenerDestinatarios(
  universidadId: string,
  campana: any,
  logger: any
): Promise<any[]> {
  const { filtros } = campana;
  
  logger.info('Getting campaign recipients', { universidadId, filtros });

  const result = await alumnoRepository.findByUniversidad(
    universidadId,
    {
      facultadId: filtros.facultades?.[0], // Simplificado para MVP
      carreraId: filtros.carreras?.[0],
      estadoMatricula: filtros.estadosMatricula?.[0],
      riesgoDesercion: filtros.riesgosDesercion?.[0]
    },
    1000 // Límite para evitar memoria excesiva
  );

  let alumnos = result.items;

  // Filtros adicionales
  if (filtros.promedioMinimo !== undefined) {
    alumnos = alumnos.filter(a => a.promedioNotas >= filtros.promedioMinimo);
  }

  if (filtros.promedioMaximo !== undefined) {
    alumnos = alumnos.filter(a => a.promedioNotas <= filtros.promedioMaximo);
  }

  if (filtros.ultimaActividadDias !== undefined) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - filtros.ultimaActividadDias);
    
    alumnos = alumnos.filter(a => {
      if (!a.ultimaActividad) return true; // Incluir si no hay fecha
      return new Date(a.ultimaActividad) <= cutoffDate;
    });
  }

  return alumnos;
}

async function enviarEmailsIndividuales(
  alumnos: any[],
  campana: any,
  universidadConfig: any,
  templateName: string,
  logger: any
): Promise<{ enviados: number; errores: any[] }> {
  let enviados = 0;
  const errores: any[] = [];

  // Enviar en lotes para evitar rate limiting
  const batchSize = 10;
  const batches = [];
  
  for (let i = 0; i < alumnos.length; i += batchSize) {
    batches.push(alumnos.slice(i, i + batchSize));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    const batchPromises = batch.map(async (alumno) => {
      try {
        await emailService.sendCustomEmail(alumno, universidadConfig, campana);
        enviados++;
      } catch (error) {
        logger.warn('Error sending email to alumno', { cedula: alumno.cedula, error });
        errores.push({
          cedula: alumno.cedula,
          email: alumno.email,
          error: error.message
        });
      }
    });

    await Promise.all(batchPromises);

    // Pausa entre lotes
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return { enviados, errores };
}