import { APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse } from '@eduretain/shared';

export const createResponse = (
  statusCode: number,
  body: ApiResponse | any,
  headers: Record<string, string> = {}
): APIGatewayProxyResult => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    ...headers
  };

  // Si no es un ApiResponse, lo envolvemos
  const responseBody: ApiResponse = body.success !== undefined ? body : {
    success: statusCode >= 200 && statusCode < 300,
    data: body,
    timestamp: new Date().toISOString()
  };

  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(responseBody)
  };
};

export const successResponse = (data?: any, message?: string): APIGatewayProxyResult => {
  return createResponse(200, {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  });
};

export const createdResponse = (data?: any, message?: string): APIGatewayProxyResult => {
  return createResponse(201, {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  });
};

export const errorResponse = (
  statusCode: number,
  error: string,
  details?: any
): APIGatewayProxyResult => {
  return createResponse(statusCode, {
    success: false,
    error,
    data: details,
    timestamp: new Date().toISOString()
  });
};

export const badRequestResponse = (error: string, details?: any): APIGatewayProxyResult => {
  return errorResponse(400, error, details);
};

export const unauthorizedResponse = (error: string = 'No autorizado'): APIGatewayProxyResult => {
  return errorResponse(401, error);
};

export const forbiddenResponse = (error: string = 'Acceso denegado'): APIGatewayProxyResult => {
  return errorResponse(403, error);
};

export const notFoundResponse = (error: string = 'No encontrado'): APIGatewayProxyResult => {
  return errorResponse(404, error);
};

export const conflictResponse = (error: string, details?: any): APIGatewayProxyResult => {
  return errorResponse(409, error, details);
};

export const internalErrorResponse = (error: string = 'Error interno del servidor'): APIGatewayProxyResult => {
  return errorResponse(500, error);
};