import { z } from 'zod';
import { EstadoMatricula, RiesgoDesercion, TipoCampana, EstadoCampana, RolUsuario } from '../types';

// Universidad Schema
export const universidadSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  codigo: z.string().min(1, 'Código es requerido'),
  direccion: z.string().min(1, 'Dirección es requerida'),
  telefono: z.string().min(1, 'Teléfono es requerido'),
  email: z.string().email('Email inválido'),
  logo: z.string().url().optional(),
  activo: z.boolean().default(true)
});

// Facultad Schema
export const facultadSchema = z.object({
  universidadId: z.string().min(1, 'Universidad ID es requerido'),
  nombre: z.string().min(1, 'Nombre es requerido'),
  codigo: z.string().min(1, 'Código es requerido'),
  descripcion: z.string().optional(),
  activo: z.boolean().default(true)
});

// Carrera Schema
export const carreraSchema = z.object({
  universidadId: z.string().min(1, 'Universidad ID es requerido'),
  facultadId: z.string().min(1, 'Facultad ID es requerido'),
  nombre: z.string().min(1, 'Nombre es requerido'),
  codigo: z.string().min(1, 'Código es requerido'),
  duracionSemestres: z.number().min(1, 'Duración debe ser mayor a 0'),
  descripcion: z.string().optional(),
  activo: z.boolean().default(true)
});

// Alumno Schema
export const alumnoSchema = z.object({
  cedula: z.string().min(1, 'Cédula es requerida'),
  universidadId: z.string().min(1, 'Universidad ID es requerido'),
  facultadId: z.string().min(1, 'Facultad ID es requerido'),
  carreraId: z.string().min(1, 'Carrera ID es requerido'),
  nombre: z.string().min(1, 'Nombre es requerido'),
  apellido: z.string().min(1, 'Apellido es requerido'),
  email: z.string().email('Email inválido'),
  telefono: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  direccion: z.string().optional(),
  promedioNotas: z.number().min(0).max(5, 'Promedio debe estar entre 0 y 5'),
  creditosAprobados: z.number().min(0, 'Créditos aprobados debe ser >= 0'),
  creditosTotales: z.number().min(1, 'Créditos totales debe ser > 0'),
  semestreActual: z.number().min(1, 'Semestre actual debe ser > 0'),
  estadoMatricula: z.nativeEnum(EstadoMatricula),
  fechaIngreso: z.string(),
  ultimaActividad: z.string().optional(),
  riesgoDesercion: z.nativeEnum(RiesgoDesercion).default(RiesgoDesercion.BAJO),
  factoresRiesgo: z.array(z.string()).default([]),
  activo: z.boolean().default(true)
});

// Campaña Schema
export const campanaSchema = z.object({
  universidadId: z.string().min(1, 'Universidad ID es requerido'),
  nombre: z.string().min(1, 'Nombre es requerido'),
  descripcion: z.string().optional(),
  tipo: z.nativeEnum(TipoCampana).default(TipoCampana.EMAIL),
  asunto: z.string().min(1, 'Asunto es requerido'),
  template: z.string().min(1, 'Template es requerido'),
  variables: z.record(z.any()).optional(),
  fechaEnvio: z.string().optional(),
  envioInmediato: z.boolean().default(false),
  filtros: z.object({
    facultades: z.array(z.string()).optional(),
    carreras: z.array(z.string()).optional(),
    semestres: z.array(z.number()).optional(),
    estadosMatricula: z.array(z.nativeEnum(EstadoMatricula)).optional(),
    riesgosDesercion: z.array(z.nativeEnum(RiesgoDesercion)).optional(),
    promedioMinimo: z.number().min(0).max(5).optional(),
    promedioMaximo: z.number().min(0).max(5).optional(),
    ultimaActividadDias: z.number().min(0).optional()
  }).default({})
});

// Usuario Schema
export const usuarioSchema = z.object({
  email: z.string().email('Email inválido'),
  nombre: z.string().min(1, 'Nombre es requerido'),
  apellido: z.string().min(1, 'Apellido es requerido'),
  rol: z.nativeEnum(RolUsuario),
  universidadId: z.string().optional(),
  activo: z.boolean().default(true)
});

// Importación CSV Schema - más flexible para el CSV
export const importacionAlumnoSchema = z.object({
  cedula: z.string().min(1),
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  email: z.string().email(),
  telefono: z.string().optional(),
  carreraId: z.string().min(1),
  facultadId: z.string().optional(),
  universidadId: z.string().min(1),
  promedioNotas: z.number().min(0).max(5),
  creditosAprobados: z.number().min(0),
  creditosTotales: z.number().min(1),
  semestreActual: z.number().min(1),
  fechaIngreso: z.string(),
  estadoMatricula: z.string().optional(),
  activo: z.boolean().default(true)
});

// Query Parameters
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
});

export const filtrosAlumnoSchema = z.object({
  universidadId: z.string().optional(),
  facultadId: z.string().optional(),
  carreraId: z.string().optional(),
  estadoMatricula: z.nativeEnum(EstadoMatricula).optional(),
  riesgoDesercion: z.nativeEnum(RiesgoDesercion).optional(),
  busqueda: z.string().optional()
});

// Response validation
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  timestamp: z.string()
});

export type UniversidadInput = z.infer<typeof universidadSchema>;
export type FacultadInput = z.infer<typeof facultadSchema>;
export type CarreraInput = z.infer<typeof carreraSchema>;
export type AlumnoInput = z.infer<typeof alumnoSchema>;
export type CampanaInput = z.infer<typeof campanaSchema>;
export type UsuarioInput = z.infer<typeof usuarioSchema>;
export type ImportacionAlumnoInput = z.infer<typeof importacionAlumnoSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type FiltrosAlumnoQuery = z.infer<typeof filtrosAlumnoSchema>;