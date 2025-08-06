import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { successResponse, badRequestResponse, internalErrorResponse } from '../utils/response';
import { createLogger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const logger = createLogger({ 
    requestId: event.requestContext.requestId,
    operation: `${event.httpMethod} ${event.resource}`
  });

  logger.info('Carrera handler invoked', { 
    method: event.httpMethod, 
    path: event.path 
  });

  try {
    const { httpMethod } = event;

    // TODO: Implementar CRUD de carreras
    logger.info('Carrera endpoint accessed', { httpMethod });

    return successResponse({ 
      message: 'Endpoint de carreras - pendiente de implementación',
      method: httpMethod 
    });
  } catch (error) {
    logger.error('Error in carrera handler', error);
    return internalErrorResponse('Error interno del servidor');
  }
};