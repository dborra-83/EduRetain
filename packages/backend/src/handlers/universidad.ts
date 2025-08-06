import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UniversidadRepository } from '../repositories/universidad-repository';
import { 
  successResponse, 
  createdResponse, 
  notFoundResponse, 
  badRequestResponse, 
  internalErrorResponse,
  conflictResponse
} from '../utils/response';
import { validateRequest, extractUserFromToken, hasPermission, parseJSON } from '../utils/validation';
import { universidadSchema } from '@eduretain/shared';
import { createLogger } from '../utils/logger';

const repository = new UniversidadRepository();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const logger = createLogger({ 
    requestId: event.requestContext.requestId,
    operation: `${event.httpMethod} ${event.resource}`
  });

  logger.info('Universidad handler invoked', { 
    method: event.httpMethod, 
    path: event.path 
  });

  try {
    // Extraer información del usuario
    const user = extractUserFromToken(event);
    if (!user) {
      return badRequestResponse('Token de usuario inválido');
    }

    const { httpMethod, pathParameters } = event;
    const universidadId = pathParameters?.id;

    switch (httpMethod) {
      case 'GET':
        if (universidadId) {
          return await getUniversidad(universidadId, user, logger);
        } else {
          return await getUniversidades(user, logger);
        }

      case 'POST':
        return await createUniversidad(event, user, logger);

      case 'PUT':
        if (!universidadId) {
          return badRequestResponse('ID de universidad requerido para actualizar');
        }
        return await updateUniversidad(universidadId, event, user, logger);

      case 'DELETE':
        if (!universidadId) {
          return badRequestResponse('ID de universidad requerido para eliminar');
        }
        return await deleteUniversidad(universidadId, user, logger);

      default:
        return badRequestResponse(`Método ${httpMethod} no soportado`);
    }
  } catch (error) {
    logger.error('Error in universidad handler', error);
    return internalErrorResponse('Error interno del servidor');
  }
};

async function getUniversidad(
  id: string, 
  user: any, 
  logger: any
): Promise<APIGatewayProxyResult> {
  try {
    logger.info('Getting universidad', { universidadId: id });

    const universidad = await repository.findById(id);
    if (!universidad) {
      return notFoundResponse('Universidad no encontrada');
    }

    // Verificar permisos
    if (!hasPermission(user.rol, ['SUPER_ADMIN']) && user.universidadId !== id) {
      return badRequestResponse('No tienes permisos para acceder a esta universidad');
    }

    return successResponse(universidad);
  } catch (error) {
    logger.error('Error getting universidad', error);
    return internalErrorResponse();
  }
}

async function getUniversidades(
  user: any, 
  logger: any
): Promise<APIGatewayProxyResult> {
  try {
    logger.info('Getting universidades');

    if (hasPermission(user.rol, ['SUPER_ADMIN'])) {
      // Super admin puede ver todas las universidades
      const universidades = await repository.findAll();
      return successResponse(universidades);
    } else if (user.universidadId) {
      // Otros usuarios solo pueden ver su universidad
      const universidad = await repository.findById(user.universidadId);
      return successResponse(universidad ? [universidad] : []);
    } else {
      return successResponse([]);
    }
  } catch (error) {
    logger.error('Error getting universidades', error);
    return internalErrorResponse();
  }
}

async function createUniversidad(
  event: APIGatewayProxyEvent,
  user: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  try {
    // Solo super admin puede crear universidades
    if (!hasPermission(user.rol, ['SUPER_ADMIN'])) {
      return badRequestResponse('No tienes permisos para crear universidades');
    }

    const body = parseJSON(event.body);
    if (!body) {
      return badRequestResponse('Cuerpo de la petición requerido');
    }

    const validation = validateRequest(universidadSchema, body);
    if (!validation.success) {
      return (validation as any).response;
    }

    logger.info('Creating universidad', { data: validation.data });

    // Verificar que no exista una universidad con el mismo código
    const existingByCodigo = await repository.findByCodigo(validation.data.codigo);
    if (existingByCodigo) {
      return conflictResponse('Ya existe una universidad con este código');
    }

    const universidad = await repository.create(validation.data as any);
    logger.info('Universidad created successfully', { universidadId: universidad.id });

    return createdResponse(universidad, 'Universidad creada exitosamente');
  } catch (error) {
    logger.error('Error creating universidad', error);
    return internalErrorResponse();
  }
}

async function updateUniversidad(
  id: string,
  event: APIGatewayProxyEvent,
  user: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  try {
    // Verificar permisos
    if (!hasPermission(user.rol, ['SUPER_ADMIN', 'ADMIN_UNIVERSIDAD'])) {
      return badRequestResponse('No tienes permisos para actualizar universidades');
    }

    if (user.rol === 'ADMIN_UNIVERSIDAD' && user.universidadId !== id) {
      return badRequestResponse('Solo puedes actualizar tu propia universidad');
    }

    const body = parseJSON(event.body);
    if (!body) {
      return badRequestResponse('Cuerpo de la petición requerido');
    }

    logger.info('Updating universidad', { universidadId: id, data: body });

    // Verificar que la universidad existe
    const existing = await repository.findById(id);
    if (!existing) {
      return notFoundResponse('Universidad no encontrada');
    }

    // Validar datos parciales
    const validation = validateRequest(universidadSchema.partial(), body);
    if (!validation.success) {
      return (validation as any).response;
    }

    // Si se está actualizando el código, verificar que no esté en uso
    if (validation.data.codigo && validation.data.codigo !== existing.codigo) {
      const existingByCodigo = await repository.findByCodigo(validation.data.codigo);
      if (existingByCodigo) {
        return conflictResponse('Ya existe una universidad con este código');
      }
    }

    const updated = await repository.update(id, validation.data);
    logger.info('Universidad updated successfully', { universidadId: id });

    return successResponse(updated, 'Universidad actualizada exitosamente');
  } catch (error) {
    logger.error('Error updating universidad', error);
    return internalErrorResponse();
  }
}

async function deleteUniversidad(
  id: string,
  user: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  try {
    // Solo super admin puede eliminar universidades
    if (!hasPermission(user.rol, ['SUPER_ADMIN'])) {
      return badRequestResponse('No tienes permisos para eliminar universidades');
    }

    logger.info('Deleting universidad', { universidadId: id });

    // Verificar que la universidad existe
    const existing = await repository.findById(id);
    if (!existing) {
      return notFoundResponse('Universidad no encontrada');
    }

    // TODO: Verificar que no tenga facultades, carreras o alumnos asociados
    // antes de eliminar (implementar en siguiente iteración)

    await repository.delete(id);
    logger.info('Universidad deleted successfully', { universidadId: id });

    return successResponse(null, 'Universidad eliminada exitosamente');
  } catch (error) {
    logger.error('Error deleting universidad', error);
    return internalErrorResponse();
  }
}