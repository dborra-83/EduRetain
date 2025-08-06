import { RiesgoDesercion, EstadoMatricula } from '../types';

// Utilidades para DynamoDB
export const createPK = (prefix: string, id: string): string => `${prefix}#${id}`;
export const createSK = (prefix: string, id: string): string => `${prefix}#${id}`;

// Claves de DynamoDB
export const DDB_KEYS = {
  UNIVERSIDAD: 'UNI',
  FACULTAD: 'FAC',
  CARRERA: 'CAR',
  ALUMNO: 'ALU',
  CAMPANA: 'CAM',
  TRACKING: 'TRK',
  METADATA: 'METADATA'
} as const;

// Generar ID único
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Generar timestamp ISO
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

// Calcular riesgo de deserción basado en factores
export const calcularRiesgoDesercion = (alumno: {
  promedioNotas: number;
  creditosAprobados: number;
  creditosTotales: number;
  semestreActual: number;
  ultimaActividad?: string;
  porcentajeAsistencia?: number;
  materiasPendientes?: number;
  actividadSistema1?: string;
  actividadSistema2?: string;
  actividadSistema3?: string;
  ultimoIngresoCampus?: string;
  estadoSocioEconomico?: string;
}): { riesgo: RiesgoDesercion; factores: string[]; probabilidad: number } => {
  const factores: string[] = [];
  let puntajeRiesgo = 0;

  // Factor: Promedio de notas (0-30 puntos)
  if (alumno.promedioNotas < 2.0) {
    puntajeRiesgo += 30;
    factores.push('Promedio académico muy bajo');
  } else if (alumno.promedioNotas < 3.0) {
    puntajeRiesgo += 20;
    factores.push('Promedio académico bajo');
  } else if (alumno.promedioNotas < 3.5) {
    puntajeRiesgo += 10;
  }

  // Factor: Asistencia (0-25 puntos)
  if (alumno.porcentajeAsistencia !== undefined) {
    if (alumno.porcentajeAsistencia < 50) {
      puntajeRiesgo += 25;
      factores.push('Asistencia muy baja (<50%)');
    } else if (alumno.porcentajeAsistencia < 70) {
      puntajeRiesgo += 15;
      factores.push('Asistencia baja (<70%)');
    } else if (alumno.porcentajeAsistencia < 80) {
      puntajeRiesgo += 8;
    }
  }

  // Factor: Materias pendientes (0-20 puntos)
  if (alumno.materiasPendientes !== undefined) {
    if (alumno.materiasPendientes >= 4) {
      puntajeRiesgo += 20;
      factores.push('Más de 4 materias pendientes');
    } else if (alumno.materiasPendientes >= 2) {
      puntajeRiesgo += 12;
      factores.push('2-3 materias pendientes');
    } else if (alumno.materiasPendientes >= 1) {
      puntajeRiesgo += 5;
    }
  }

  // Factor: Progreso académico (0-25 puntos)
  const progreso = alumno.creditosAprobados / alumno.creditosTotales;
  const progresoEsperado = (alumno.semestreActual / 10) * alumno.creditosTotales;
  
  if (progreso < 0.3) {
    puntajeRiesgo += 25;
    factores.push('Progreso académico muy lento');
  } else if (progreso < 0.5) {
    puntajeRiesgo += 15;
    factores.push('Progreso académico lento');
  } else if (progreso < 0.7) {
    puntajeRiesgo += 8;
  }

  // Factor: Actividad en sistemas (0-20 puntos)
  const calcularDiasSinActividad = (fecha?: string) => {
    if (!fecha) return 999;
    return Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
  };

  const diasSistema1 = calcularDiasSinActividad(alumno.actividadSistema1);
  const diasSistema2 = calcularDiasSinActividad(alumno.actividadSistema2);
  const diasSistema3 = calcularDiasSinActividad(alumno.actividadSistema3);
  const minDias = Math.min(diasSistema1, diasSistema2, diasSistema3);

  if (minDias > 30) {
    puntajeRiesgo += 20;
    factores.push('Más de 30 días sin actividad en sistemas');
  } else if (minDias > 14) {
    puntajeRiesgo += 12;
    factores.push('Más de 2 semanas sin actividad en sistemas');
  } else if (minDias > 7) {
    puntajeRiesgo += 5;
  }

  // Factor: Ingreso al campus (0-15 puntos)
  const diasSinCampus = calcularDiasSinActividad(alumno.ultimoIngresoCampus);
  if (diasSinCampus > 30) {
    puntajeRiesgo += 15;
    factores.push('Más de 30 días sin ingresar al campus');
  } else if (diasSinCampus > 14) {
    puntajeRiesgo += 8;
  } else if (diasSinCampus > 7) {
    puntajeRiesgo += 3;
  }

  // Factor: Estado socioeconómico (0-15 puntos)
  if (alumno.estadoSocioEconomico === 'BAJO') {
    puntajeRiesgo += 15;
    factores.push('Situación socioeconómica vulnerable');
  } else if (alumno.estadoSocioEconomico === 'MEDIO_BAJO') {
    puntajeRiesgo += 8;
  }

  // Factor: Semestre avanzado con bajo progreso (0-10 puntos)
  if (alumno.semestreActual > 6 && progreso < 0.6) {
    puntajeRiesgo += 10;
    factores.push('Semestre avanzado con bajo progreso');
  }

  // Calcular probabilidad de deserción (0-100%)
  // Máximo puntaje posible: 150 puntos
  const probabilidad = Math.min(100, Math.round((puntajeRiesgo / 150) * 100));

  // Determinar nivel de riesgo basado en probabilidad
  let riesgo: RiesgoDesercion;
  if (probabilidad >= 70) {
    riesgo = RiesgoDesercion.CRITICO;
  } else if (probabilidad >= 50) {
    riesgo = RiesgoDesercion.ALTO;
  } else if (probabilidad >= 30) {
    riesgo = RiesgoDesercion.MEDIO;
  } else {
    riesgo = RiesgoDesercion.BAJO;
  }

  return { riesgo, factores, probabilidad };
};

// Validar email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Sanitizar string para DynamoDB
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/[^a-zA-Z0-9\s\-_.]/g, '');
};

// Formatear fecha para mostrar
export const formatearFecha = (isoString: string, incluirHora = false): string => {
  const fecha = new Date(isoString);
  const opciones: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  
  if (incluirHora) {
    opciones.hour = '2-digit';
    opciones.minute = '2-digit';
  }
  
  return fecha.toLocaleDateString('es-ES', opciones);
};

// Calcular días desde fecha
export const diasDesde = (isoString: string): number => {
  const fecha = new Date(isoString);
  const ahora = new Date();
  return Math.floor((ahora.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24));
};

// Validar cédula (formato básico)
export const validarCedula = (cedula: string): boolean => {
  // Remover espacios y guiones
  const cedulaLimpia = cedula.replace(/[\s-]/g, '');
  
  // Verificar que tenga entre 7 y 12 dígitos
  if (!/^\d{7,12}$/.test(cedulaLimpia)) {
    return false;
  }
  
  return true;
};

// Generar color basado en riesgo
export const getColorRiesgo = (riesgo: RiesgoDesercion): string => {
  switch (riesgo) {
    case RiesgoDesercion.BAJO:
      return '#4CAF50'; // Verde
    case RiesgoDesercion.MEDIO:
      return '#FF9800'; // Naranja
    case RiesgoDesercion.ALTO:
      return '#F44336'; // Rojo
    case RiesgoDesercion.CRITICO:
      return '#9C27B0'; // Púrpura
    default:
      return '#757575'; // Gris
  }
};

// Generar color basado en estado de matrícula
export const getColorEstado = (estado: EstadoMatricula): string => {
  switch (estado) {
    case EstadoMatricula.ACTIVO:
      return '#4CAF50'; // Verde
    case EstadoMatricula.EN_RIESGO:
      return '#FF9800'; // Naranja
    case EstadoMatricula.INACTIVO:
      return '#757575'; // Gris
    case EstadoMatricula.EGRESADO:
      return '#2196F3'; // Azul
    case EstadoMatricula.DESERTOR:
      return '#F44336'; // Rojo
    default:
      return '#757575'; // Gris
  }
};

// Parsear CSV
export const parseCSV = (csvContent: string): string[][] => {
  const lines = csvContent.split('\n');
  const result: string[][] = [];
  
  lines.forEach(line => {
    if (line.trim()) {
      // Split básico por comas (mejorar para manejar comillas)
      const fields = line.split(',').map(field => field.trim().replace(/^"|"$/g, ''));
      result.push(fields);
    }
  });
  
  return result;
};

// Formatear número con separadores de miles
export const formatearNumero = (num: number): string => {
  return num.toLocaleString('es-ES');
};

// Calcular porcentaje
export const calcularPorcentaje = (parte: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((parte / total) * 100);
};

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};