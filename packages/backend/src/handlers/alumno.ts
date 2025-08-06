import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AlumnoRepository } from '../repositories/alumno-repository';
import { 
  successResponse, 
  createdResponse, 
  notFoundResponse, 
  badRequestResponse, 
  internalErrorResponse,
  conflictResponse
} from '../utils/response';
import { validateRequest, extractUserFromToken, canAccessUniversidad, parseJSON } from '../utils/validation';
import { alumnoSchema, importacionAlumnoSchema, paginationSchema, filtrosAlumnoSchema } from '@eduretain/shared';
import { createLogger } from '../utils/logger';
import { parse } from 'csv-parse/sync';

const repository = new AlumnoRepository();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const logger = createLogger({ 
    requestId: event.requestContext.requestId,
    operation: `${event.httpMethod} ${event.resource}`
  });

  logger.info('Alumno handler invoked', { 
    method: event.httpMethod, 
    path: event.path 
  });

  try {
    const user = extractUserFromToken(event);
    if (!user) {
      return badRequestResponse('Token de usuario inválido');
    }

    const { httpMethod, pathParameters, resource } = event;
    const cedula = pathParameters?.cedula;

    // Manejar importación
    if (resource.includes('/importar')) {
      return await importarAlumnos(event, user, logger);
    }

    switch (httpMethod) {
      case 'GET':
        if (cedula) {
          return await getAlumno(cedula, event, user, logger);
        } else {
          return await getAlumnos(event, user, logger);
        }

      case 'POST':
        return await createAlumno(event, user, logger);

      case 'PUT':
        if (!cedula) {
          return badRequestResponse('Cédula de alumno requerida para actualizar');
        }
        return await updateAlumno(cedula, event, user, logger);

      case 'DELETE':
        if (!cedula) {
          return badRequestResponse('Cédula de alumno requerida para eliminar');
        }
        return await deleteAlumno(cedula, event, user, logger);

      default:
        return badRequestResponse(`Método ${httpMethod} no soportado`);
    }
  } catch (error) {
    logger.error('Error in alumno handler', error);
    return internalErrorResponse('Error interno del servidor');
  }
};

async function getAlumnos(
  event: APIGatewayProxyEvent,
  user: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    
    // Validar parámetros de paginación
    const paginationValidation = validateRequest(paginationSchema, {
      page: queryParams.page ? parseInt(queryParams.page) : 1,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 20
    });

    if (!paginationValidation.success) {
      return paginationValidation.response;
    }

    // Validar filtros
    const filtrosValidation = validateRequest(filtrosAlumnoSchema, queryParams);
    if (!filtrosValidation.success) {
      return filtrosValidation.response;
    }

    const { page, limit } = paginationValidation.data;
    const filtros = filtrosValidation.data;

    // Determinar universidad a consultar
    let universidadId = filtros.universidadId;
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

    logger.info('Getting alumnos', { universidadId, filtros, page, limit });

    const result = await repository.findByUniversidad(
      universidadId,
      filtros,
      limit,
      queryParams.cursor ? JSON.parse(queryParams.cursor) : undefined
    );

    const response = {
      items: result.items,
      pagination: {
        page,
        limit,
        hasMore: !!result.lastEvaluatedKey,
        nextCursor: result.lastEvaluatedKey ? JSON.stringify(result.lastEvaluatedKey) : null
      }
    };

    return successResponse(response);
  } catch (error) {
    logger.error('Error getting alumnos', error);
    return internalErrorResponse();
  }
}

async function getAlumno(
  cedula: string,
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

    if (!canAccessUniversidad(user.universidadId, universidadId, user.rol)) {
      return badRequestResponse('No tienes permisos para acceder a esta universidad');
    }

    logger.info('Getting alumno', { cedula, universidadId });

    const alumno = await repository.findByCedula(universidadId, cedula);
    if (!alumno) {
      return notFoundResponse('Alumno no encontrado');
    }

    return successResponse(alumno);
  } catch (error) {
    logger.error('Error getting alumno', error);
    return internalErrorResponse();
  }
}

async function createAlumno(
  event: APIGatewayProxyEvent,
  user: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  try {
    const body = parseJSON(event.body);
    if (!body) {
      return badRequestResponse('Cuerpo de la petición requerido');
    }

    const validation = validateRequest(alumnoSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const { universidadId } = validation.data;

    // Verificar permisos
    if (!canAccessUniversidad(user.universidadId, universidadId, user.rol)) {
      return badRequestResponse('No tienes permisos para crear alumnos en esta universidad');
    }

    logger.info('Creating alumno', { cedula: validation.data.cedula, universidadId });

    // Verificar que no exista
    const existing = await repository.findByCedula(universidadId, validation.data.cedula);
    if (existing) {
      return conflictResponse('Ya existe un alumno con esta cédula en la universidad');
    }

    // Verificar email único
    const existingByEmail = await repository.findByEmail(validation.data.email);
    if (existingByEmail) {
      return conflictResponse('Ya existe un alumno con este email');
    }

    const alumno = await repository.create(validation.data);
    logger.info('Alumno created successfully', { cedula: alumno.cedula });

    return createdResponse(alumno, 'Alumno creado exitosamente');
  } catch (error) {
    logger.error('Error creating alumno', error);
    return internalErrorResponse();
  }
}

async function updateAlumno(
  cedula: string,
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
      return badRequestResponse('No tienes permisos para actualizar alumnos en esta universidad');
    }

    // Verificar que existe
    const existing = await repository.findByCedula(universidadId, cedula);
    if (!existing) {
      return notFoundResponse('Alumno no encontrado');
    }

    // Validar datos parciales
    const validation = validateRequest(alumnoSchema.partial(), body);
    if (!validation.success) {
      return validation.response;
    }

    logger.info('Updating alumno', { cedula, universidadId });

    const updated = await repository.update(universidadId, cedula, validation.data);
    logger.info('Alumno updated successfully', { cedula });

    return successResponse(updated, 'Alumno actualizado exitosamente');
  } catch (error) {
    logger.error('Error updating alumno', error);
    return internalErrorResponse();
  }
}

async function deleteAlumno(
  cedula: string,
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
      return badRequestResponse('No tienes permisos para eliminar alumnos en esta universidad');
    }

    // Verificar que existe
    const existing = await repository.findByCedula(universidadId, cedula);
    if (!existing) {
      return notFoundResponse('Alumno no encontrado');
    }

    logger.info('Deleting alumno', { cedula, universidadId });

    await repository.delete(universidadId, cedula);
    logger.info('Alumno deleted successfully', { cedula });

    return successResponse(null, 'Alumno eliminado exitosamente');
  } catch (error) {
    logger.error('Error deleting alumno', error);
    return internalErrorResponse();
  }
}

async function importarAlumnos(
  event: APIGatewayProxyEvent,
  user: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  try {
    const body = parseJSON(event.body);
    if (!body || !body.csvData || !body.universidadId) {
      return badRequestResponse('csvData y universidadId son requeridos');
    }

    const { csvData, universidadId } = body;

    // Verificar permisos
    if (!canAccessUniversidad(user.universidadId, universidadId, user.rol)) {
      return badRequestResponse('No tienes permisos para importar alumnos en esta universidad');
    }

    logger.info('Starting bulk import', { universidadId });

    try {
      // Parsear CSV
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ','
      });

      logger.info('Parsed CSV records', { count: records.length });

      const results = {
        processed: 0,
        created: 0,
        errors: [] as any[],
        warnings: [] as any[]
      };

      const validAlumnos: any[] = [];

      // Validar cada registro
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        results.processed++;

        try {
          // Mapear campos del CSV a nuestro esquema
          const alumnoData = {
            cedula: record.cedula?.trim(),
            nombre: record.nombre?.trim(),
            apellido: record.apellido?.trim(),
            email: record.email?.trim().toLowerCase(),
            telefono: record.telefono?.trim(),
            carreraId: record.carreraId?.trim() || record.carreraCodigo?.trim(),
            facultadId: record.facultadId?.trim(),
            universidadId,
            promedioNotas: parseFloat(record.promedioNotas || '0'),
            creditosAprobados: parseInt(record.creditosAprobados || '0'),
            creditosTotales: parseInt(record.creditosTotales || '1'),
            semestreActual: parseInt(record.semestreActual || '1'),
            fechaIngreso: record.fechaIngreso?.trim() || new Date().toISOString(),
            estadoMatricula: record.estadoMatricula?.trim() || 'ACTIVO',
            activo: true
          };

          // Validar con esquema
          const validation = validateRequest(importacionAlumnoSchema, alumnoData);
          if (!validation.success) {
            results.errors.push({
              row: i + 2, // +2 porque empezamos en 0 y hay header
              cedula: record.cedula,
              errors: validation.response
            });
            continue;
          }

          validAlumnos.push(validation.data);
        } catch (error) {
          results.errors.push({
            row: i + 2,
            cedula: record.cedula,
            error: 'Error parsing record'
          });
        }
      }

      // Crear alumnos en batch
      if (validAlumnos.length > 0) {
        try {
          await repository.batchCreate(validAlumnos);
          results.created = validAlumnos.length;
          logger.info('Batch import completed successfully', { created: results.created });
        } catch (error) {
          logger.error('Error in batch create', error);
          return internalErrorResponse('Error creando alumnos en batch');
        }
      }

      const message = `Importación completada. ${results.created} alumnos creados, ${results.errors.length} errores.`;
      
      return successResponse({
        ...results,
        summary: message
      }, message);

    } catch (parseError) {
      logger.error('Error parsing CSV', parseError);
      return badRequestResponse('Error parsing CSV data. Verificar formato.');
    }
  } catch (error) {
    logger.error('Error in bulk import', error);
    return internalErrorResponse();
  }
}