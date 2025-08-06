import { BaseRepository } from './base-repository';
import { Universidad } from '@eduretain/shared';
import { DDB_KEYS, createPK, createSK, generateId, getCurrentTimestamp } from '@eduretain/shared';

export class UniversidadRepository extends BaseRepository {
  
  async create(universidad: Omit<Universidad, 'id' | 'fechaCreacion' | 'fechaActualizacion'>): Promise<Universidad> {
    const id = generateId();
    const now = getCurrentTimestamp();
    
    const item: Universidad = {
      ...universidad,
      id,
      fechaCreacion: now,
      fechaActualizacion: now
    };

    const ddbItem = {
      PK: createPK(DDB_KEYS.UNIVERSIDAD, id),
      SK: DDB_KEYS.METADATA,
      GSI1PK: DDB_KEYS.UNIVERSIDAD,
      GSI1SK: universidad.codigo,
      ...item
    };

    await this.putItem(ddbItem);
    return item;
  }

  async findById(id: string): Promise<Universidad | null> {
    const pk = createPK(DDB_KEYS.UNIVERSIDAD, id);
    const sk = DDB_KEYS.METADATA;
    
    const item = await this.getItem(pk, sk);
    return item ? this.mapFromDynamoDB(item) : null;
  }

  async findByCodigo(codigo: string): Promise<Universidad | null> {
    const result = await this.query(
      DDB_KEYS.UNIVERSIDAD,
      undefined,
      {
        indexName: 'GSI1',
        filterExpression: 'GSI1SK = :codigo',
        expressionAttributeValues: { ':codigo': codigo },
        limit: 1
      }
    );

    return result.items.length > 0 ? this.mapFromDynamoDB(result.items[0]) : null;
  }

  async findAll(): Promise<Universidad[]> {
    const result = await this.query(
      DDB_KEYS.UNIVERSIDAD,
      undefined,
      {
        indexName: 'GSI1'
      }
    );

    return result.items.map(item => this.mapFromDynamoDB(item));
  }

  async update(id: string, updates: Partial<Universidad>): Promise<Universidad> {
    const pk = createPK(DDB_KEYS.UNIVERSIDAD, id);
    const sk = DDB_KEYS.METADATA;
    
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Construir expresión de actualización dinámicamente
    Object.entries(updates).forEach(([key, value], index) => {
      if (key !== 'id' && key !== 'fechaCreacion') {
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

  async delete(id: string): Promise<void> {
    const pk = createPK(DDB_KEYS.UNIVERSIDAD, id);
    const sk = DDB_KEYS.METADATA;
    
    await this.deleteItem(pk, sk);
  }

  async exists(id: string): Promise<boolean> {
    const universidad = await this.findById(id);
    return universidad !== null;
  }

  private mapFromDynamoDB(item: any): Universidad {
    // Remover propiedades específicas de DynamoDB
    const { PK, SK, GSI1PK, GSI1SK, ...universidad } = item;
    return universidad as Universidad;
  }
}