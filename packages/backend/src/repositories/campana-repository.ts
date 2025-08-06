import { BaseRepository } from './base-repository';
import { Campana, CampanaTracking, EstadoCampana, TipoCampana } from '@eduretain/shared';
import { DDB_KEYS, createPK, createSK, generateId, getCurrentTimestamp } from '@eduretain/shared';

export class CampanaRepository extends BaseRepository {

  async create(campana: Omit<Campana, 'id' | 'fechaCreacion' | 'fechaActualizacion' | 'totalDestinatarios' | 'enviados' | 'entregados' | 'abiertos' | 'clicks' | 'rebotes' | 'bajas'>): Promise<Campana> {
    const id = generateId();
    const now = getCurrentTimestamp();
    
    const item: Campana = {
      ...campana,
      id,
      totalDestinatarios: 0,
      enviados: 0,
      entregados: 0,
      abiertos: 0,
      clicks: 0,
      rebotes: 0,
      bajas: 0,
      fechaCreacion: now,
      fechaActualizacion: now
    };

    const ddbItem = {
      PK: createPK(DDB_KEYS.UNIVERSIDAD, campana.universidadId),
      SK: createSK(DDB_KEYS.CAMPANA, id),
      GSI1PK: createPK(DDB_KEYS.CAMPANA, campana.universidadId),
      GSI1SK: `${campana.estado}#${now}`,
      GSI2PK: campana.creadoPor,
      GSI2SK: createSK(DDB_KEYS.CAMPANA, id),
      ...item
    };

    await this.putItem(ddbItem);
    return item;
  }

  async findById(universidadId: string, id: string): Promise<Campana | null> {
    const pk = createPK(DDB_KEYS.UNIVERSIDAD, universidadId);
    const sk = createSK(DDB_KEYS.CAMPANA, id);
    
    const item = await this.getItem(pk, sk);
    return item ? this.mapFromDynamoDB(item) : null;
  }

  async findByUniversidad(
    universidadId: string,
    estado?: EstadoCampana,
    limit?: number,
    exclusiveStartKey?: Record<string, any>
  ): Promise<{ items: Campana[]; lastEvaluatedKey?: Record<string, any> }> {
    
    let pk = createPK(DDB_KEYS.CAMPANA, universidadId);
    let sk = '';

    const queryOptions: any = {
      indexName: 'GSI1',
      limit,
      exclusiveStartKey,
      scanIndexForward: false // Más recientes primero
    };

    if (estado) {
      sk = estado;
    }

    const result = await this.query(pk, sk, queryOptions);
    
    return {
      items: result.items.map(item => this.mapFromDynamoDB(item)),
      lastEvaluatedKey: result.lastEvaluatedKey
    };
  }

  async findByCreador(
    creadoPor: string,
    limit?: number,
    exclusiveStartKey?: Record<string, any>
  ): Promise<{ items: Campana[]; lastEvaluatedKey?: Record<string, any> }> {
    
    const result = await this.query(
      creadoPor,
      undefined,
      {
        indexName: 'GSI2',
        limit,
        exclusiveStartKey,
        scanIndexForward: false
      }
    );
    
    return {
      items: result.items.map(item => this.mapFromDynamoDB(item)),
      lastEvaluatedKey: result.lastEvaluatedKey
    };
  }

  async update(universidadId: string, id: string, updates: Partial<Campana>): Promise<Campana> {
    const pk = createPK(DDB_KEYS.UNIVERSIDAD, universidadId);
    const sk = createSK(DDB_KEYS.CAMPANA, id);
    
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (key !== 'id' && key !== 'universidadId' && key !== 'fechaCreacion') {
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

  async updateEstadisticas(
    universidadId: string, 
    id: string, 
    stats: {
      totalDestinatarios?: number;
      enviados?: number;
      entregados?: number;
      abiertos?: number;
      clicks?: number;
      rebotes?: number;
      bajas?: number;
    }
  ): Promise<void> {
    const pk = createPK(DDB_KEYS.UNIVERSIDAD, universidadId);
    const sk = createSK(DDB_KEYS.CAMPANA, id);
    
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(stats).forEach(([key, value], index) => {
      if (value !== undefined) {
        const nameKey = `#stat${index}`;
        const valueKey = `:val${index}`;
        
        updateExpressions.push(`${nameKey} = ${valueKey}`);
        expressionAttributeNames[nameKey] = key;
        expressionAttributeValues[valueKey] = value;
      }
    });

    if (updateExpressions.length === 0) return;

    // Actualizar fechaActualizacion
    updateExpressions.push('#fechaActualizacion = :fechaActualizacion');
    expressionAttributeNames['#fechaActualizacion'] = 'fechaActualizacion';
    expressionAttributeValues[':fechaActualizacion'] = getCurrentTimestamp();

    const updateExpression = `SET ${updateExpressions.join(', ')}`;

    await this.updateItem(pk, sk, {
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues
    });
  }

  async delete(universidadId: string, id: string): Promise<void> {
    const pk = createPK(DDB_KEYS.UNIVERSIDAD, universidadId);
    const sk = createSK(DDB_KEYS.CAMPANA, id);
    
    await this.deleteItem(pk, sk);
  }

  // Tracking methods
  async createTracking(tracking: Omit<CampanaTracking, 'fechaCreacion' | 'fechaActualizacion'>): Promise<CampanaTracking> {
    const now = getCurrentTimestamp();
    
    const item: CampanaTracking = {
      ...tracking,
      fechaCreacion: now,
      fechaActualizacion: now
    };

    const ddbItem = {
      PK: createPK(DDB_KEYS.CAMPANA, tracking.campanaId),
      SK: createSK(DDB_KEYS.TRACKING, tracking.alumnoCedula),
      GSI1PK: createPK(DDB_KEYS.UNIVERSIDAD, tracking.universidadId),
      GSI1SK: createSK(DDB_KEYS.TRACKING, `${tracking.campanaId}#${tracking.alumnoCedula}`),
      ...item
    };

    await this.putItem(ddbItem);
    return item;
  }

  async findTrackingByCampana(
    campanaId: string,
    limit?: number,
    exclusiveStartKey?: Record<string, any>
  ): Promise<{ items: CampanaTracking[]; lastEvaluatedKey?: Record<string, any> }> {
    
    const result = await this.query(
      createPK(DDB_KEYS.CAMPANA, campanaId),
      DDB_KEYS.TRACKING,
      {
        limit,
        exclusiveStartKey
      }
    );
    
    return {
      items: result.items.map(item => this.mapTrackingFromDynamoDB(item)),
      lastEvaluatedKey: result.lastEvaluatedKey
    };
  }

  async findTrackingByAlumno(
    universidadId: string,
    alumnoCedula: string,
    limit?: number
  ): Promise<CampanaTracking[]> {
    
    const result = await this.query(
      createPK(DDB_KEYS.UNIVERSIDAD, universidadId),
      createSK(DDB_KEYS.TRACKING, `${alumnoCedula}`),
      {
        indexName: 'GSI1',
        limit,
        scanIndexForward: false // Más recientes primero
      }
    );
    
    return result.items.map(item => this.mapTrackingFromDynamoDB(item));
  }

  async updateTracking(
    campanaId: string,
    alumnoCedula: string,
    updates: Partial<CampanaTracking>
  ): Promise<CampanaTracking> {
    const pk = createPK(DDB_KEYS.CAMPANA, campanaId);
    const sk = createSK(DDB_KEYS.TRACKING, alumnoCedula);
    
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (key !== 'campanaId' && key !== 'alumnoCedula' && key !== 'fechaCreacion') {
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

    return this.mapTrackingFromDynamoDB(updated);
  }

  async batchCreateTracking(trackings: Omit<CampanaTracking, 'fechaCreacion' | 'fechaActualizacion'>[]): Promise<void> {
    const now = getCurrentTimestamp();
    const ddbItems: any[] = [];

    for (const tracking of trackings) {
      const item: CampanaTracking = {
        ...tracking,
        fechaCreacion: now,
        fechaActualizacion: now
      };

      const ddbItem = {
        PK: createPK(DDB_KEYS.CAMPANA, tracking.campanaId),
        SK: createSK(DDB_KEYS.TRACKING, tracking.alumnoCedula),
        GSI1PK: createPK(DDB_KEYS.UNIVERSIDAD, tracking.universidadId),
        GSI1SK: createSK(DDB_KEYS.TRACKING, `${tracking.campanaId}#${tracking.alumnoCedula}`),
        ...item
      };

      ddbItems.push(ddbItem);
    }

    await this.batchWrite(ddbItems);
  }

  async getTrackingStats(campanaId: string): Promise<{
    total: number;
    enviados: number;
    entregados: number;
    abiertos: number;
    clicks: number;
    rebotes: number;
    bajas: number;
  }> {
    const result = await this.findTrackingByCampana(campanaId, 1000); // Límite alto para stats
    const trackings = result.items;

    return {
      total: trackings.length,
      enviados: trackings.filter(t => t.enviado).length,
      entregados: trackings.filter(t => t.entregado).length,
      abiertos: trackings.filter(t => t.abierto).length,
      clicks: trackings.filter(t => t.clickeado).length,
      rebotes: trackings.filter(t => t.rebotado).length,
      bajas: trackings.filter(t => t.darseBaja).length
    };
  }

  private mapFromDynamoDB(item: any): Campana {
    const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...campana } = item;
    return campana as Campana;
  }

  private mapTrackingFromDynamoDB(item: any): CampanaTracking {
    const { PK, SK, GSI1PK, GSI1SK, ...tracking } = item;
    return tracking as CampanaTracking;
  }
}