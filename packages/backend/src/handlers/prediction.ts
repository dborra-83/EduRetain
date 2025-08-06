import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AlumnoRepository } from '../repositories/alumno-repository';
import { 
  successResponse, 
  badRequestResponse, 
  internalErrorResponse
} from '../utils/response';
import { extractUserFromToken, canAccessUniversidad, parseJSON } from '../utils/validation';
import { createLogger } from '../utils/logger';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { calcularRiesgoDesercion } from '@eduretain/shared';

const alumnoRepository = new AlumnoRepository();
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const logger = createLogger({ 
    requestId: event.requestContext.requestId,
    operation: `${event.httpMethod} ${event.resource}`
  });

  logger.info('Prediction handler invoked', { 
    method: event.httpMethod, 
    path: event.path 
  });

  try {
    const user = extractUserFromToken(event);
    if (!user) {
      return badRequestResponse('Token de usuario inválido');
    }

    const { httpMethod, resource } = event;

    if (resource.includes('/batch')) {
      return await predictBatch(event, user, logger);
    }

    switch (httpMethod) {
      case 'POST':
        return await predictSingle(event, user, logger);

      default:
        return badRequestResponse(`Método ${httpMethod} no soportado`);
    }
  } catch (error) {
    logger.error('Error in prediction handler', error);
    return internalErrorResponse('Error interno del servidor');
  }
};

async function predictSingle(
  event: APIGatewayProxyEvent,
  user: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  try {
    const body = parseJSON(event.body);
    if (!body) {
      return badRequestResponse('Cuerpo de la petición requerido');
    }

    const { universidadId, cedula, alumnoData } = body;

    // Verificar permisos
    if (!canAccessUniversidad(user.universidadId, universidadId, user.rol)) {
      return badRequestResponse('No tienes permisos para acceder a esta universidad');
    }

    logger.info('Single prediction request', { universidadId, cedula });

    let alumno;

    if (cedula) {
      // Predicción para alumno existente
      alumno = await alumnoRepository.findByCedula(universidadId, cedula);
      if (!alumno) {
        return badRequestResponse('Alumno no encontrado');
      }
    } else if (alumnoData) {
      // Predicción para datos simulados
      alumno = alumnoData;
    } else {
      return badRequestResponse('Se requiere cedula o alumnoData');
    }

    // Calcular predicción básica
    const prediccionBasica = calcularRiesgoDesercion({
      promedioNotas: alumno.promedioNotas,
      creditosAprobados: alumno.creditosAprobados,
      creditosTotales: alumno.creditosTotales,
      semestreActual: alumno.semestreActual,
      ultimaActividad: alumno.ultimaActividad
    });

    // Generar predicción avanzada con IA
    const prediccionAvanzada = await generarPrediccionIA(alumno, logger);

    const resultado = {
      alumno: {
        cedula: alumno.cedula,
        nombre: `${alumno.nombre} ${alumno.apellido}`,
        carreraId: alumno.carreraId
      },
      prediccionBasica,
      prediccionAvanzada,
      recomendaciones: generarRecomendaciones(prediccionBasica, prediccionAvanzada),
      timestamp: new Date().toISOString()
    };

    return successResponse(resultado);
  } catch (error) {
    logger.error('Error in single prediction', error);
    return internalErrorResponse();
  }
}

async function predictBatch(
  event: APIGatewayProxyEvent,
  user: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  try {
    const body = parseJSON(event.body);
    if (!body || !body.universidadId) {
      return badRequestResponse('universidadId requerido');
    }

    const { universidadId, filtros = {} } = body;

    // Verificar permisos
    if (!canAccessUniversidad(user.universidadId, universidadId, user.rol)) {
      return badRequestResponse('No tienes permisos para acceder a esta universidad');
    }

    logger.info('Batch prediction request', { universidadId, filtros });

    // Obtener alumnos según filtros
    const result = await alumnoRepository.findByUniversidad(
      universidadId,
      filtros,
      100 // Límite para batch processing
    );

    const predicciones: any[] = [];

    for (const alumno of result.items) {
      try {
        // Calcular predicción básica
        const prediccionBasica = calcularRiesgoDesercion({
          promedioNotas: alumno.promedioNotas,
          creditosAprobados: alumno.creditosAprobados,
          creditosTotales: alumno.creditosTotales,
          semestreActual: alumno.semestreActual,
          ultimaActividad: alumno.ultimaActividad
        });

        // Para batch, usamos solo predicción básica por performance
        // La IA avanzada se puede solicitar individualmente
        predicciones.push({
          cedula: alumno.cedula,
          nombre: `${alumno.nombre} ${alumno.apellido}`,
          riesgoActual: alumno.riesgoDesercion,
          riesgoCalculado: prediccionBasica.riesgo,
          factoresRiesgo: prediccionBasica.factores,
          cambioRiesgo: alumno.riesgoDesercion !== prediccionBasica.riesgo,
          recomendacionesBasicas: generarRecomendacionesBasicas(prediccionBasica)
        });
      } catch (error) {
        logger.warn('Error processing alumno in batch', { cedula: alumno.cedula, error });
      }
    }

    const resumen = {
      totalProcesados: predicciones.length,
      distribucionRiesgo: {
        BAJO: predicciones.filter(p => p.riesgoCalculado === 'BAJO').length,
        MEDIO: predicciones.filter(p => p.riesgoCalculado === 'MEDIO').length,
        ALTO: predicciones.filter(p => p.riesgoCalculado === 'ALTO').length,
        CRITICO: predicciones.filter(p => p.riesgoCalculado === 'CRITICO').length
      },
      cambiosDetectados: predicciones.filter(p => p.cambioRiesgo).length
    };

    const resultado = {
      resumen,
      predicciones,
      timestamp: new Date().toISOString()
    };

    return successResponse(resultado);
  } catch (error) {
    logger.error('Error in batch prediction', error);
    return internalErrorResponse();
  }
}

async function generarPrediccionIA(alumno: any, logger: any): Promise<any> {
  try {
    const prompt = `
    Eres un experto en analítica educativa. Analiza el siguiente perfil de estudiante y proporciona una predicción de riesgo de deserción detallada.

    Datos del estudiante:
    - Promedio de notas: ${alumno.promedioNotas}/5.0
    - Créditos aprobados: ${alumno.creditosAprobados}/${alumno.creditosTotales}
    - Semestre actual: ${alumno.semestreActual}
    - Última actividad: ${alumno.ultimaActividad || 'No registrada'}
    - Estado actual: ${alumno.estadoMatricula}

    Por favor proporciona:
    1. Nivel de riesgo (BAJO, MEDIO, ALTO, CRITICO)
    2. Probabilidad de deserción (0-100%)
    3. 3-5 factores de riesgo específicos identificados
    4. 3-5 factores protectores identificados
    5. Recomendaciones específicas de intervención
    6. Plazo sugerido para seguimiento

    Responde en formato JSON válido.
    `;

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    try {
      const aiAnalysis = JSON.parse(responseBody.content[0].text);
      return {
        nivelRiesgo: aiAnalysis.nivelRiesgo || 'MEDIO',
        probabilidadDesercion: aiAnalysis.probabilidadDesercion || 50,
        factoresRiesgo: aiAnalysis.factoresRiesgo || [],
        factoresProtectores: aiAnalysis.factoresProtectores || [],
        recomendaciones: aiAnalysis.recomendaciones || [],
        plazoSeguimiento: aiAnalysis.plazoSeguimiento || '30 días',
        confianza: 85 // Nivel de confianza de la IA
      };
    } catch (parseError) {
      logger.warn('Error parsing AI response, using fallback', parseError);
      return {
        nivelRiesgo: 'MEDIO',
        probabilidadDesercion: 50,
        factoresRiesgo: ['Análisis IA no disponible'],
        factoresProtectores: [],
        recomendaciones: ['Solicitar análisis individual'],
        plazoSeguimiento: '30 días',
        confianza: 0
      };
    }
  } catch (error) {
    logger.warn('Error calling Bedrock API, using fallback', error);
    
    // Fallback a predicción básica si IA no está disponible
    return {
      nivelRiesgo: 'MEDIO',
      probabilidadDesercion: 50,
      factoresRiesgo: ['Servicio de IA temporalmente no disponible'],
      factoresProtectores: [],
      recomendaciones: ['Usar predicción básica como referencia'],
      plazoSeguimiento: '15 días',
      confianza: 0
    };
  }
}

function generarRecomendaciones(prediccionBasica: any, prediccionAvanzada: any): string[] {
  const recomendaciones: string[] = [];

  // Recomendaciones basadas en riesgo
  if (prediccionBasica.riesgo === 'CRITICO' || prediccionAvanzada.nivelRiesgo === 'CRITICO') {
    recomendaciones.push('Intervención inmediata requerida');
    recomendaciones.push('Contactar al estudiante en menos de 24 horas');
    recomendaciones.push('Asignar tutor académico personalizado');
  } else if (prediccionBasica.riesgo === 'ALTO' || prediccionAvanzada.nivelRiesgo === 'ALTO') {
    recomendaciones.push('Programar reunión con asesor académico');
    recomendaciones.push('Evaluar carga académica actual');
    recomendaciones.push('Ofrecer apoyo académico adicional');
  } else if (prediccionBasica.riesgo === 'MEDIO') {
    recomendaciones.push('Monitoreo quincenal de progreso');
    recomendaciones.push('Incentivar participación en actividades académicas');
  }

  // Combinar recomendaciones de IA si están disponibles
  if (prediccionAvanzada.recomendaciones && prediccionAvanzada.recomendaciones.length > 0) {
    recomendaciones.push(...prediccionAvanzada.recomendaciones);
  }

  return [...new Set(recomendaciones)]; // Remover duplicados
}

function generarRecomendacionesBasicas(prediccion: any): string[] {
  const recomendaciones: string[] = [];

  switch (prediccion.riesgo) {
    case 'CRITICO':
      recomendaciones.push('Intervención inmediata');
      recomendaciones.push('Contacto urgente');
      break;
    case 'ALTO':
      recomendaciones.push('Reunión con asesor');
      recomendaciones.push('Plan de apoyo');
      break;
    case 'MEDIO':
      recomendaciones.push('Monitoreo regular');
      break;
    case 'BAJO':
      recomendaciones.push('Seguimiento rutinario');
      break;
  }

  return recomendaciones;
}