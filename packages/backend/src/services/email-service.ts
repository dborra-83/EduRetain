import { SESClient, SendBulkTemplatedEmailCommand, SendTemplatedEmailCommand } from '@aws-sdk/client-ses';
import { createLogger } from '../utils/logger';
import { Alumno, Campana } from '@eduretain/shared';

export interface EmailTemplate {
  templateName: string;
  templateData: Record<string, any>;
}

export interface BulkEmailRequest {
  campana: Campana;
  alumnos: Alumno[];
  templateName: string;
  universidadConfig: {
    nombre: string;
    logo?: string;
    colorPrimario: string;
    email: string;
  };
}

export class EmailService {
  private sesClient: SESClient;
  private logger = createLogger({ service: 'EmailService' });

  constructor() {
    this.sesClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  async sendBulkEmail(request: BulkEmailRequest): Promise<{
    messageId: string;
    enviados: number;
    errores: any[];
  }> {
    const { campana, alumnos, templateName, universidadConfig } = request;
    
    this.logger.info('Sending bulk email', {
      campanaId: campana.id,
      recipients: alumnos.length,
      template: templateName
    });

    try {
      // Preparar destinatarios (máximo 50 por llamada SES)
      const chunks = this.chunkArray(alumnos, 50);
      let totalEnviados = 0;
      const errores: any[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        try {
          const destinations = chunk.map(alumno => ({
            Destination: {
              ToAddresses: [alumno.email]
            },
            ReplacementTemplateData: JSON.stringify({
              nombre: alumno.nombre,
              apellido: alumno.apellido,
              universidad: universidadConfig.nombre,
              colorPrimario: universidadConfig.colorPrimario,
              logoUrl: universidadConfig.logo || '',
              unsubscribeUrl: this.generateUnsubscribeUrl(campana.id, alumno.cedula),
              // Datos específicos del alumno
              carreraId: alumno.carreraId,
              promedio: alumno.promedioNotas,
              semestre: alumno.semestreActual,
              factoresRiesgo: alumno.factoresRiesgo || []
            })
          }));

          const command = new SendBulkTemplatedEmailCommand({
            Source: universidadConfig.email,
            Template: templateName,
            DefaultTemplateData: JSON.stringify({
              universidad: universidadConfig.nombre,
              colorPrimario: universidadConfig.colorPrimario,
              logoUrl: universidadConfig.logo || '',
              fechaEnvio: new Date().toLocaleDateString('es-ES')
            }),
            Destinations: destinations,
            ConfigurationSetName: `eduretain-${process.env.STAGE || 'dev'}`,
            // Tags are not supported in SendBulkTemplatedEmailCommand
            // Using ConfigurationSetName for tracking instead
          });

          const response = await this.sesClient.send(command);
          totalEnviados += destinations.length;

          this.logger.info('Bulk email chunk sent successfully', {
            campanaId: campana.id,
            chunk: i + 1,
            totalChunks: chunks.length,
            // messageId: response.MessageId, // MessageId not available in bulk response
            sent: destinations.length
          });

          // Pequeña pausa entre chunks para evitar rate limiting
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

        } catch (chunkError) {
          this.logger.error('Error sending email chunk', {
            campanaId: campana.id,
            chunk: i + 1,
            error: chunkError
          });
          
          errores.push({
            chunk: i + 1,
            alumnos: chunk.map(a => a.cedula),
            error: chunkError
          });
        }
      }

      return {
        messageId: `bulk-${campana.id}-${Date.now()}`,
        enviados: totalEnviados,
        errores
      };

    } catch (error) {
      this.logger.error('Error in bulk email sending', error);
      throw error;
    }
  }

  async sendSingleEmail(
    to: string,
    templateName: string,
    templateData: Record<string, any>,
    source: string,
    campanaId?: string
  ): Promise<string> {
    try {
      const command = new SendTemplatedEmailCommand({
        Source: source,
        Destination: {
          ToAddresses: [to]
        },
        Template: templateName,
        TemplateData: JSON.stringify(templateData),
        ConfigurationSetName: `eduretain-${process.env.STAGE || 'dev'}`,
        Tags: campanaId ? [
          {
            Name: 'CampanaId',
            Value: campanaId
          }
        ] : []
      });

      const response = await this.sesClient.send(command);
      
      this.logger.info('Single email sent successfully', {
        to,
        template: templateName,
        messageId: response.MessageId
      });

      return response.MessageId || '';

    } catch (error) {
      this.logger.error('Error sending single email', { to, template: templateName, error });
      throw error;
    }
  }

  async sendWelcomeEmail(
    alumno: Alumno,
    universidadConfig: any
  ): Promise<string> {
    const templateData = {
      nombre: alumno.nombre,
      universidad: universidadConfig.nombre,
      colorPrimario: universidadConfig.colorPrimario,
      logoUrl: universidadConfig.logo || '',
      unsubscribeUrl: this.generateUnsubscribeUrl('welcome', alumno.cedula)
    };

    return this.sendSingleEmail(
      alumno.email,
      `eduretain-welcome-${process.env.STAGE || 'dev'}`,
      templateData,
      universidadConfig.email
    );
  }

  async sendRiskAlertEmail(
    alumno: Alumno,
    universidadConfig: any,
    campanaId: string
  ): Promise<string> {
    const templateData = {
      nombre: alumno.nombre,
      universidad: universidadConfig.nombre,
      colorPrimario: universidadConfig.colorPrimario,
      logoUrl: universidadConfig.logo || '',
      factoresRiesgo: alumno.factoresRiesgo || [],
      unsubscribeUrl: this.generateUnsubscribeUrl(campanaId, alumno.cedula)
    };

    return this.sendSingleEmail(
      alumno.email,
      `eduretain-risk-alert-${process.env.STAGE || 'dev'}`,
      templateData,
      universidadConfig.email,
      campanaId
    );
  }

  async sendCustomEmail(
    alumno: Alumno,
    universidadConfig: any,
    campana: Campana
  ): Promise<string> {
    const templateData = {
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      universidad: universidadConfig.nombre,
      colorPrimario: universidadConfig.colorPrimario,
      logoUrl: universidadConfig.logo || '',
      asunto: campana.asunto,
      contenido: this.processTemplate(campana.template, {
        nombre: alumno.nombre,
        apellido: alumno.apellido,
        carrera: alumno.carreraId,
        promedio: alumno.promedioNotas,
        semestre: alumno.semestreActual
      }),
      contenidoTexto: this.stripHtml(campana.template),
      fechaEnvio: new Date().toLocaleDateString('es-ES'),
      unsubscribeUrl: this.generateUnsubscribeUrl(campana.id, alumno.cedula)
    };

    return this.sendSingleEmail(
      alumno.email,
      `eduretain-custom-${process.env.STAGE || 'dev'}`,
      templateData,
      universidadConfig.email,
      campana.id
    );
  }

  private generateUnsubscribeUrl(campanaId: string, alumnoCedula: string): string {
    const baseUrl = process.env.STAGE === 'prod' ? 
      'https://eduretain.com' : 
      `https://${process.env.STAGE}.eduretain.com`;
    
    return `${baseUrl}/unsubscribe/${campanaId}/${alumnoCedula}`;
  }

  private processTemplate(template: string, data: Record<string, any>): string {
    let processed = template;
    
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, String(value));
    });
    
    return processed;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}