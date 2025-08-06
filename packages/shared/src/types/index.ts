// Universidad
export interface Universidad {
  id: string;
  nombre: string;
  codigo: string;
  direccion: string;
  telefono: string;
  email: string;
  logo?: string;
  configuracion?: ConfiguracionBranding;
  fechaCreacion: string;
  fechaActualizacion: string;
  activo: boolean;
}

// Facultad
export interface Facultad {
  id: string;
  universidadId: string;
  nombre: string;
  codigo: string;
  descripcion?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  activo: boolean;
}

// Carrera
export interface Carrera {
  id: string;
  universidadId: string;
  facultadId: string;
  nombre: string;
  codigo: string;
  duracionSemestres: number;
  descripcion?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  activo: boolean;
}

// Alumno
export interface Alumno {
  cedula: string;
  universidadId: string;
  facultadId: string;
  carreraId: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  fechaNacimiento?: string;
  direccion?: string;
  // Datos académicos
  promedioNotas: number;
  creditosAprobados: number;
  creditosTotales: number;
  semestreActual: number;
  estadoMatricula: EstadoMatricula;
  fechaIngreso: string;
  ultimaActividad?: string;
  // Predictivo
  riesgoDesercion: RiesgoDesercion;
  factoresRiesgo: string[];
  // Metadata
  fechaCreacion: string;
  fechaActualizacion: string;
  activo: boolean;
}

// Enums
export enum EstadoMatricula {
  ACTIVO = 'ACTIVO',
  EN_RIESGO = 'EN_RIESGO',
  INACTIVO = 'INACTIVO',
  EGRESADO = 'EGRESADO',
  DESERTOR = 'DESERTOR'
}

export enum RiesgoDesercion {
  BAJO = 'BAJO',
  MEDIO = 'MEDIO',
  ALTO = 'ALTO',
  CRITICO = 'CRITICO'
}

// Campaña
export interface Campana {
  id: string;
  universidadId: string;
  nombre: string;
  descripcion?: string;
  tipo: TipoCampana;
  estado: EstadoCampana;
  // Segmentación
  filtros: FiltrosCampana;
  // Contenido
  asunto: string;
  template: string;
  variables?: Record<string, any>;
  // Programación
  fechaEnvio?: string;
  envioInmediato: boolean;
  // Tracking
  totalDestinatarios: number;
  enviados: number;
  entregados: number;
  abiertos: number;
  clicks: number;
  rebotes: number;
  bajas: number;
  // Metadata
  creadoPor: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export enum TipoCampana {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH'
}

export enum EstadoCampana {
  BORRADOR = 'BORRADOR',
  PROGRAMADA = 'PROGRAMADA',
  ENVIANDO = 'ENVIANDO',
  ENVIADA = 'ENVIADA',
  CANCELADA = 'CANCELADA'
}

export interface FiltrosCampana {
  facultades?: string[];
  carreras?: string[];
  semestres?: number[];
  estadosMatricula?: EstadoMatricula[];
  riesgosDesercion?: RiesgoDesercion[];
  promedioMinimo?: number;
  promedioMaximo?: number;
  ultimaActividadDias?: number;
}

// Tracking de campaña por alumno
export interface CampanaTracking {
  campanaId: string;
  alumnoCedula: string;
  universidadId: string;
  // Estado del envío
  enviado: boolean;
  fechaEnvio?: string;
  entregado: boolean;
  fechaEntrega?: string;
  rebotado: boolean;
  motivoRebote?: string;
  // Interacciones
  abierto: boolean;
  fechaApertura?: string;
  clickeado: boolean;
  fechaClick?: string;
  urlsClickeadas?: string[];
  // Opt-out
  darseBaja: boolean;
  fechaBaja?: string;
  // Metadata
  fechaCreacion: string;
  fechaActualizacion: string;
}

// Configuración de branding
export interface ConfiguracionBranding {
  colores: {
    primario: string;
    secundario: string;
    fondo: string;
    texto: string;
  };
  logo: string;
  nombreInstitucion: string;
  favicon?: string;
  estilosPersonalizados?: string;
}

// Usuario y roles
export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
  universidadId?: string;
  activo: boolean;
  ultimoLogin?: string;
  fechaCreacion: string;
}

export enum RolUsuario {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN_UNIVERSIDAD = 'ADMIN_UNIVERSIDAD',
  OPERADOR_FACULTAD = 'OPERADOR_FACULTAD',
  DOCENTE = 'DOCENTE',
  SOLO_LECTURA = 'SOLO_LECTURA'
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Dashboard metrics
export interface MetricasDashboard {
  universidadId: string;
  totalAlumnos: number;
  alumnosActivos: number;
  alumnosEnRiesgo: number;
  tasaRetencion: number;
  campanasEnviadas: number;
  tasaApertura: number;
  fecha: string;
}