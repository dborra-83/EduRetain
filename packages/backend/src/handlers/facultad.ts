import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { successResponse, badRequestResponse, internalErrorResponse } from '../utils/response';
import { createLogger } from '../utils/logger';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const logger = createLogger({ 
    requestId: event.requestContext.requestId,
    operation: `${event.httpMethod} ${event.resource}`
  });

  logger.info('Facultad handler invoked', { 
    method: event.httpMethod, 
    path: event.path 
  });

  try {
    const { httpMethod } = event;

    // TODO: Implementar CRUD de facultades
    logger.info('Facultad endpoint accessed', { httpMethod });

    return successResponse({ 
      message: 'Endpoint de facultades - pendiente de implementación',
      method: httpMethod 
    });
  } catch (error) {
    logger.error('Error in facultad handler', error);
    return internalErrorResponse('Error interno del servidor');
  }
};