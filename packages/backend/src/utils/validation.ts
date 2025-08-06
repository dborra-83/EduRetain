import { ZodSchema, ZodError } from 'zod';
import { badRequestResponse } from './response';
import { APIGatewayProxyResult } from 'aws-lambda';

export const validateRequest = <T>(
  schema: ZodSchema<T>,
  data: any
): { success: true; data: T } | { success: false; response: APIGatewayProxyResult } => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return {
        success: false,
        response: badRequestResponse('Datos de entrada inválidos', { errors })
      };
    }
    
    return {
      success: false,
      response: badRequestResponse('Error de validación')
    };
  }
};

export const parseJSON = (jsonString: string | null): any => {
  if (!jsonString) return null;
  
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
};

export const extractUserFromToken = (event: any): { userId: string; universidadId?: string; rol?: string } | null => {
  const claims = event.requestContext?.authorizer?.claims;
  
  if (!claims || !claims.sub) {
    return null;
  }

  return {
    userId: claims.sub,
    universidadId: claims['custom:universidadId'],
    rol: claims['custom:rol']
  };
};

export const hasPermission = (userRole: string, requiredRoles: string[]): boolean => {
  return requiredRoles.includes(userRole);
};

export const canAccessUniversidad = (userUniversidadId: string | undefined, targetUniversidadId: string, userRole: string): boolean => {
  // Super admin puede acceder a todo
  if (userRole === 'SUPER_ADMIN') {
    return true;
  }
  
  // Otros roles solo pueden acceder a su universidad
  return userUniversidadId === targetUniversidadId;
};