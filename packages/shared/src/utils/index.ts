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
}): { riesgo: RiesgoDesercion; factores: string[] } => {
  const factores: string[] = [];
  let puntajeRiesgo = 0;

  // Factor: Promedio de notas
  if (alumno.promedioNotas < 2.0) {
    puntajeRiesgo += 30;
    factores.push('Promedio académico muy bajo');
  } else if (alumno.promedioNotas < 3.0) {
    puntajeRiesgo += 20;
    factores.push('Promedio académico bajo');
  }

  // Factor: Progreso académico
  const progresoEsperado = (alumno.semestreActual / 10) * alumno.creditosTotales;
  const progreso = alumno.creditosAprobados / alumno.creditosTotales;
  
  if (progreso < 0.3) {
    puntajeRiesgo += 25;
    factores.push('Progreso académico muy lento');
  } else if (progreso < 0.5) {
    puntajeRiesgo += 15;
    factores.push('Progreso académico lento');
  }

  // Factor: Última actividad
  if (alumno.ultimaActividad) {
    const diasSinActividad = Math.floor(
      (Date.now() - new Date(alumno.ultimaActividad).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (diasSinActividad > 30) {
      puntajeRiesgo += 20;
      factores.push('Más de 30 días sin actividad');
    } else if (diasSinActividad > 15) {
      puntajeRiesgo += 10;
      factores.push('Más de 15 días sin actividad');
    }
  }

  // Factor: Semestre avanzado con pocos créditos
  if (alumno.semestreActual > 6 && progreso < 0.6) {
    puntajeRiesgo += 15;
    factores.push('Semestre avanzado con bajo progreso');
  }

  // Determinar nivel de riesgo
  let riesgo: RiesgoDesercion;
  if (puntajeRiesgo >= 70) {
    riesgo = RiesgoDesercion.CRITICO;
  } else if (puntajeRiesgo >= 50) {
    riesgo = RiesgoDesercion.ALTO;
  } else if (puntajeRiesgo >= 25) {
    riesgo = RiesgoDesercion.MEDIO;
  } else {
    riesgo = RiesgoDesercion.BAJO;
  }

  return { riesgo, factores };
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