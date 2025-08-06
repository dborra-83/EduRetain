import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  UpdateCommand, 
  DeleteCommand, 
  QueryCommand, 
  ScanCommand,
  BatchGetCommand,
  BatchWriteCommand
} from '@aws-sdk/lib-dynamodb';
import { createLogger, Logger } from '../utils/logger';

export interface QueryOptions {
  indexName?: string;
  limit?: number;
  exclusiveStartKey?: Record<string, any>;
  scanIndexForward?: boolean;
  filterExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, any>;
}

export interface UpdateOptions {
  updateExpression: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, any>;
  conditionExpression?: string;
}

export abstract class BaseRepository {
  protected client: DynamoDBDocumentClient;
  protected tableName: string;
  protected logger: Logger;

  constructor() {
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = process.env.TABLE_NAME || '';
    this.logger = createLogger({ repository: this.constructor.name });
  }

  protected async getItem(pk: string, sk: string): Promise<any> {
    try {
      this.logger.debug('Getting item', { pk, sk });
      
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk }
      });

      const result = await this.client.send(command);
      return result.Item || null;
    } catch (error) {
      this.logger.error('Error getting item', error);
      throw error;
    }
  }

  protected async putItem(item: Record<string, any>): Promise<void> {
    try {
      this.logger.debug('Putting item', { pk: item.PK, sk: item.SK });
      
      const command = new PutCommand({
        TableName: this.tableName,
        Item: item
      });

      await this.client.send(command);
    } catch (error) {
      this.logger.error('Error putting item', error);
      throw error;
    }
  }

  protected async updateItem(
    pk: string, 
    sk: string, 
    options: UpdateOptions
  ): Promise<any> {
    try {
      this.logger.debug('Updating item', { pk, sk });
      
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
        UpdateExpression: options.updateExpression,
        ExpressionAttributeNames: options.expressionAttributeNames,
        ExpressionAttributeValues: options.expressionAttributeValues,
        ConditionExpression: options.conditionExpression,
        ReturnValues: 'ALL_NEW'
      });

      const result = await this.client.send(command);
      return result.Attributes;
    } catch (error) {
      this.logger.error('Error updating item', error);
      throw error;
    }
  }

  protected async deleteItem(pk: string, sk: string): Promise<void> {
    try {
      this.logger.debug('Deleting item', { pk, sk });
      
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk }
      });

      await this.client.send(command);
    } catch (error) {
      this.logger.error('Error deleting item', error);
      throw error;
    }
  }

  protected async query(
    pk: string, 
    sk?: string, 
    options: QueryOptions = {}
  ): Promise<{ items: any[]; lastEvaluatedKey?: Record<string, any> }> {
    try {
      this.logger.debug('Querying items', { pk, sk, options });
      
      let keyConditionExpression = 'PK = :pk';
      const expressionAttributeValues: Record<string, any> = { ':pk': pk };

      if (sk) {
        keyConditionExpression += ' AND begins_with(SK, :sk)';
        expressionAttributeValues[':sk'] = sk;
      }

      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: options.indexName,
        KeyConditionExpression: keyConditionExpression,
        FilterExpression: options.filterExpression,
        ExpressionAttributeNames: options.expressionAttributeNames,
        ExpressionAttributeValues: {
          ...expressionAttributeValues,
          ...options.expressionAttributeValues
        },
        Limit: options.limit,
        ExclusiveStartKey: options.exclusiveStartKey,
        ScanIndexForward: options.scanIndexForward
      });

      const result = await this.client.send(command);
      
      return {
        items: result.Items || [],
        lastEvaluatedKey: result.LastEvaluatedKey
      };
    } catch (error) {
      this.logger.error('Error querying items', error);
      throw error;
    }
  }

  protected async scan(options: QueryOptions = {}): Promise<{ items: any[]; lastEvaluatedKey?: Record<string, any> }> {
    try {
      this.logger.debug('Scanning items', { options });
      
      const command = new ScanCommand({
        TableName: this.tableName,
        IndexName: options.indexName,
        FilterExpression: options.filterExpression,
        ExpressionAttributeNames: options.expressionAttributeNames,
        ExpressionAttributeValues: options.expressionAttributeValues,
        Limit: options.limit,
        ExclusiveStartKey: options.exclusiveStartKey
      });

      const result = await this.client.send(command);
      
      return {
        items: result.Items || [],
        lastEvaluatedKey: result.LastEvaluatedKey
      };
    } catch (error) {
      this.logger.error('Error scanning items', error);
      throw error;
    }
  }

  protected async batchGet(keys: { PK: string; SK: string }[]): Promise<any[]> {
    try {
      this.logger.debug('Batch getting items', { count: keys.length });
      
      const command = new BatchGetCommand({
        RequestItems: {
          [this.tableName]: {
            Keys: keys
          }
        }
      });

      const result = await this.client.send(command);
      return result.Responses?.[this.tableName] || [];
    } catch (error) {
      this.logger.error('Error batch getting items', error);
      throw error;
    }
  }

  protected async batchWrite(items: any[]): Promise<void> {
    try {
      this.logger.debug('Batch writing items', { count: items.length });
      
      // DynamoDB límite de 25 items por batch
      const batches = this.chunkArray(items, 25);
      
      for (const batch of batches) {
        const command = new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: batch.map(item => ({
              PutRequest: { Item: item }
            }))
          }
        });

        await this.client.send(command);
      }
    } catch (error) {
      this.logger.error('Error batch writing items', error);
      throw error;
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}