import { BaseRepository } from './base-repository';
import { Alumno, EstadoMatricula, RiesgoDesercion } from '@eduretain/shared';
import { DDB_KEYS, createPK, createSK, getCurrentTimestamp, calcularRiesgoDesercion } from '@eduretain/shared';

export interface AlumnoFilter {
  universidadId?: string;
  facultadId?: string;
  carreraId?: string;
  estadoMatricula?: EstadoMatricula;
  riesgoDesercion?: RiesgoDesercion;
  busqueda?: string;
}

export class AlumnoRepository extends BaseRepository {

  async create(alumno: Omit<Alumno, 'fechaCreacion' | 'fechaActualizacion'>): Promise<Alumno> {
    const now = getCurrentTimestamp();
    
    // Calcular riesgo de deserción
    const { riesgo, factores } = calcularRiesgoDesercion({
      promedioNotas: alumno.promedioNotas,
      creditosAprobados: alumno.creditosAprobados,
      creditosTotales: alumno.creditosTotales,
      semestreActual: alumno.semestreActual,
      ultimaActividad: alumno.ultimaActividad
    });

    const item: Alumno = {
      ...alumno,
      riesgoDesercion: riesgo,
      factoresRiesgo: factores,
      fechaCreacion: now,
      fechaActualizacion: now
    };

    const ddbItem = {
      PK: createPK(DDB_KEYS.UNIVERSIDAD, alumno.universidadId),
      SK: createSK(DDB_KEYS.ALUMNO, alumno.cedula),
      GSI1PK: createPK(DDB_KEYS.FACULTAD, alumno.facultadId),
      GSI1SK: createSK(DDB_KEYS.ALUMNO, alumno.cedula),
      GSI2PK: alumno.email,
      GSI2SK: createSK(DDB_KEYS.ALUMNO, alumno.cedula),
      GSI3PK: `${alumno.universidadId}#${alumno.estadoMatricula}`,
      GSI3SK: `${riesgo}#${alumno.cedula}`,
      ...item
    };

    await this.putItem(ddbItem);
    return item;
  }

  async findByCedula(universidadId: string, cedula: string): Promise<Alumno | null> {
    const pk = createPK(DDB_KEYS.UNIVERSIDAD, universidadId);
    const sk = createSK(DDB_KEYS.ALUMNO, cedula);
    
    const item = await this.getItem(pk, sk);
    return item ? this.mapFromDynamoDB(item) : null;
  }

  async findByEmail(email: string): Promise<Alumno | null> {
    const result = await this.query(
      email,
      undefined,
      {
        indexName: 'GSI2',
        limit: 1
      }
    );

    return result.items.length > 0 ? this.mapFromDynamoDB(result.items[0]) : null;
  }

  async findByUniversidad(
    universidadId: string,
    filters: AlumnoFilter = {},
    limit?: number,
    exclusiveStartKey?: Record<string, any>
  ): Promise<{ items: Alumno[]; lastEvaluatedKey?: Record<string, any> }> {
    
    let pk = createPK(DDB_KEYS.UNIVERSIDAD, universidadId);
    let sk = DDB_KEYS.ALUMNO;
    let indexName: string | undefined;

    // Optimizar consulta según filtros
    if (filters.facultadId) {
      pk = createPK(DDB_KEYS.FACULTAD, filters.facultadId);
      indexName = 'GSI1';
    } else if (filters.estadoMatricula) {
      pk = `${universidadId}#${filters.estadoMatricula}`;
      indexName = 'GSI3';
      sk = '';
    }

    const queryOptions: any = {
      indexName,
      limit,
      exclusiveStartKey
    };

    // Aplicar filtros adicionales
    const filterExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (filters.carreraId) {
      filterExpressions.push('#carreraId = :carreraId');
      expressionAttributeNames['#carreraId'] = 'carreraId';
      expressionAttributeValues[':carreraId'] = filters.carreraId;
    }

    if (filters.riesgoDesercion) {
      filterExpressions.push('#riesgoDesercion = :riesgoDesercion');
      expressionAttributeNames['#riesgoDesercion'] = 'riesgoDesercion';
      expressionAttributeValues[':riesgoDesercion'] = filters.riesgoDesercion;
    }

    if (filters.busqueda) {
      filterExpressions.push('(contains(#nombre, :busqueda) OR contains(#apellido, :busqueda) OR contains(#cedula, :busqueda))');
      expressionAttributeNames['#nombre'] = 'nombre';
      expressionAttributeNames['#apellido'] = 'apellido';
      expressionAttributeNames['#cedula'] = 'cedula';
      expressionAttributeValues[':busqueda'] = filters.busqueda;
    }

    if (filterExpressions.length > 0) {
      queryOptions.filterExpression = filterExpressions.join(' AND ');
      queryOptions.expressionAttributeNames = expressionAttributeNames;
      queryOptions.expressionAttributeValues = expressionAttributeValues;
    }

    const result = await this.query(pk, sk, queryOptions);
    
    return {
      items: result.items.map(item => this.mapFromDynamoDB(item)),
      lastEvaluatedKey: result.lastEvaluatedKey
    };
  }

  async update(universidadId: string, cedula: string, updates: Partial<Alumno>): Promise<Alumno> {
    const pk = createPK(DDB_KEYS.UNIVERSIDAD, universidadId);
    const sk = createSK(DDB_KEYS.ALUMNO, cedula);
    
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Si se actualizan datos que afectan el riesgo, recalcular
    const needsRiskRecalculation = [
      'promedioNotas', 'creditosAprobados', 'creditosTotales', 
      'semestreActual', 'ultimaActividad'
    ].some(field => field in updates);

    if (needsRiskRecalculation) {
      // Obtener datos actuales para recalcular riesgo
      const current = await this.findByCedula(universidadId, cedula);
      if (current) {
        const updatedData = { ...current, ...updates };
        const { riesgo, factores } = calcularRiesgoDesercion({
          promedioNotas: updatedData.promedioNotas,
          creditosAprobados: updatedData.creditosAprobados,
          creditosTotales: updatedData.creditosTotales,
          semestreActual: updatedData.semestreActual,
          ultimaActividad: updatedData.ultimaActividad
        });
        
        updates.riesgoDesercion = riesgo;
        updates.factoresRiesgo = factores;
      }
    }

    // Construir expresión de actualización
    Object.entries(updates).forEach(([key, value], index) => {
      if (key !== 'cedula' && key !== 'universidadId' && key !== 'fechaCreacion') {
        const nameKey = `#attr${index}`;
        const valueKey = `:val${index}`;
        
        updateExpressions.push(`${nameKey} = ${valueKey}`);
        expressionAttributeNames[nameKey] = key;
        expressionAttributeValues[valueKey] = value;
      }
    });

    // Actualizar fechaActualizacion
    updateExpressions.push('#fechaActualizacion = :fechaActualizacion');
    expressionAttributeNames['#fechaActualizacion'] = 'fechaActualizacion';
    expressionAttributeValues[':fechaActualizacion'] = getCurrentTimestamp();

    const updateExpression = `SET ${updateExpressions.join(', ')}`;

    const updated = await this.updateItem(pk, sk, {
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    });

    return this.mapFromDynamoDB(updated);
  }

  async delete(universidadId: string, cedula: string): Promise<void> {
    const pk = createPK(DDB_KEYS.UNIVERSIDAD, universidadId);
    const sk = createSK(DDB_KEYS.ALUMNO, cedula);
    
    await this.deleteItem(pk, sk);
  }

  async batchCreate(alumnos: Omit<Alumno, 'fechaCreacion' | 'fechaActualizacion'>[]): Promise<Alumno[]> {
    const now = getCurrentTimestamp();
    const processedAlumnos: Alumno[] = [];
    const ddbItems: any[] = [];

    for (const alumno of alumnos) {
      // Calcular riesgo para cada alumno
      const { riesgo, factores } = calcularRiesgoDesercion({
        promedioNotas: alumno.promedioNotas,
        creditosAprobados: alumno.creditosAprobados,
        creditosTotales: alumno.creditosTotales,
        semestreActual: alumno.semestreActual,
        ultimaActividad: alumno.ultimaActividad
      });

      const processedAlumno: Alumno = {
        ...alumno,
        riesgoDesercion: riesgo,
        factoresRiesgo: factores,
        fechaCreacion: now,
        fechaActualizacion: now
      };

      processedAlumnos.push(processedAlumno);

      const ddbItem = {
        PK: createPK(DDB_KEYS.UNIVERSIDAD, alumno.universidadId),
        SK: createSK(DDB_KEYS.ALUMNO, alumno.cedula),
        GSI1PK: createPK(DDB_KEYS.FACULTAD, alumno.facultadId),
        GSI1SK: createSK(DDB_KEYS.ALUMNO, alumno.cedula),
        GSI2PK: alumno.email,
        GSI2SK: createSK(DDB_KEYS.ALUMNO, alumno.cedula),
        GSI3PK: `${alumno.universidadId}#${alumno.estadoMatricula}`,
        GSI3SK: `${riesgo}#${alumno.cedula}`,
        ...processedAlumno
      };

      ddbItems.push(ddbItem);
    }

    await this.batchWrite(ddbItems);
    return processedAlumnos;
  }

  async exists(universidadId: string, cedula: string): Promise<boolean> {
    const alumno = await this.findByCedula(universidadId, cedula);
    return alumno !== null;
  }

  async getMetricas(universidadId: string): Promise<{
    total: number;
    activos: number;
    enRiesgo: number;
    porRiesgo: Record<RiesgoDesercion, number>;
    porEstado: Record<EstadoMatricula, number>;
  }> {
    const result = await this.findByUniversidad(universidadId);
    const alumnos = result.items;

    const metricas = {
      total: alumnos.length,
      activos: alumnos.filter(a => a.estadoMatricula === EstadoMatricula.ACTIVO).length,
      enRiesgo: alumnos.filter(a => [RiesgoDesercion.ALTO, RiesgoDesercion.CRITICO].includes(a.riesgoDesercion)).length,
      porRiesgo: {} as Record<RiesgoDesercion, number>,
      porEstado: {} as Record<EstadoMatricula, number>
    };

    // Contar por riesgo
    Object.values(RiesgoDesercion).forEach(riesgo => {
      metricas.porRiesgo[riesgo] = alumnos.filter(a => a.riesgoDesercion === riesgo).length;
    });

    // Contar por estado
    Object.values(EstadoMatricula).forEach(estado => {
      metricas.porEstado[estado] = alumnos.filter(a => a.estadoMatricula === estado).length;
    });

    return metricas;
  }

  private mapFromDynamoDB(item: any): Alumno {
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, ...alumno } = item;
    return alumno as Alumno;
  }
}