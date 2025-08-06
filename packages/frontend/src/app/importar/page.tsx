'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
} from '@mui/material';
import { 
  Upload, 
  CheckCircle, 
  Error, 
  Warning,
  Download as DownloadIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { parse } from 'papaparse';
import { useMutation, useQueryClient } from 'react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import AppLayout from '@/components/Layout/AppLayout';
import { useSnackbar } from 'notistack';

interface ImportResult {
  processed: number;
  created: number;
  errors: Array<{
    row: number;
    cedula: string;
    errors: any;
  }>;
  warnings: any[];
  summary: string;
}

interface ParsedRow {
  cedula: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  carreraId: string;
  facultadId?: string;
  universidadId?: string;
  promedioNotas: number;
  creditosAprobados: number;
  creditosTotales: number;
  semestreActual: number;
  fechaIngreso: string;
  estadoMatricula?: string;
  asistenciaPromedio?: number;
  materiasReprobadas?: number;
  diasUltimaActividad?: number;
  estadoSocioeconomico?: string;
  fechaNacimiento?: string;
  direccion?: string;
}

function ImportarPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  
  const [csvData, setCsvData] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const importMutation = useMutation(
    async (data: { csvData: string; universidadId: string }) => {
      console.log('Sending import request:', data);
      const response = await apiClient.alumnos.import(data);
      console.log('Import response:', response);
      return response.data;
    },
    {
      onSuccess: (result: any) => {
        console.log('Import success - raw result:', result);
        
        const importData = result?.data || result || {};
        
        const formattedResult: ImportResult = {
          processed: importData.processed || 0,
          created: importData.created || 0,
          errors: importData.errors || [],
          warnings: importData.warnings || [],
          summary: importData.summary || result?.message || 'Importación completada'
        };
        
        console.log('Formatted result:', formattedResult);
        
        setImportResult(formattedResult);
        enqueueSnackbar(result?.message || formattedResult.summary, { 
          variant: formattedResult.errors && formattedResult.errors.length > 0 ? 'warning' : 'success' 
        });
        queryClient.invalidateQueries(['alumnos']);
        queryClient.invalidateQueries(['dashboard']);
        
        setCsvData('');
        setParsedData([]);
        
        if (!formattedResult.errors || formattedResult.errors.length === 0) {
          setTimeout(() => {
            setImportResult(null);
          }, 10000);
        }
      },
      onError: (error: any) => {
        console.error('Import error - full details:', error);
        console.error('Error response:', error.response);
        enqueueSnackbar('Error durante la importación', { variant: 'error' });
      }
    }
  );

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = e.target?.result as string;
        setCsvData(csv);
        
        parse(csv, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsed = results.data as ParsedRow[];
            setParsedData(parsed);
            setShowPreview(true);
          },
          error: (error) => {
            enqueueSnackbar(`Error al parsear el archivo: ${error.message}`, { variant: 'error' });
          }
        });
      };
      reader.readAsText(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1
  });

  const handleImport = async () => {
    if (csvData && user?.universidadId) {
      const importData = {
        csvData,
        universidadId: user.universidadId
      };
      console.log('Starting import with data:', importData);
      importMutation.mutate(importData);
    } else {
      console.error('Missing data:', { csvData: !!csvData, universidadId: user?.universidadId });
      enqueueSnackbar('Datos incompletos para la importación', { variant: 'error' });
    }
  };

  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/plantilla-alumnos-completa.csv';
    link.download = 'plantilla-alumnos-completa.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Plantilla descargada exitosamente', { variant: 'success' });
  };

  return (
    <AppLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Importar Alumnos
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Carga masiva de estudiantes mediante archivo CSV
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Instrucciones y Plantilla */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Instrucciones
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="1. Descarga la plantilla CSV"
                    secondary="Incluye 40 estudiantes de ejemplo con todos los campos"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="2. Completa los datos"
                    secondary="Asegúrate de incluir todos los campos requeridos"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="3. Sube el archivo"
                    secondary="Arrastra o selecciona tu archivo CSV"
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Button
                variant="contained"
                fullWidth
                startIcon={<DownloadIcon />}
                onClick={downloadTemplate}
                sx={{ mb: 2 }}
              >
                Descargar Plantilla (40 ejemplos)
              </Button>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  La plantilla incluye:
                </Typography>
                <Typography variant="body2">
                  • 10 estudiantes riesgo CRÍTICO<br/>
                  • 10 estudiantes riesgo ALTO<br/>
                  • 10 estudiantes riesgo MEDIO<br/>
                  • 10 estudiantes riesgo BAJO
                </Typography>
              </Alert>
            </CardContent>
          </Card>

          {/* Campos del CSV */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Campos del CSV
              </Typography>
              
              <Typography variant="subtitle2" color="primary" sx={{ mt: 2, mb: 1 }}>
                Campos Requeridos:
              </Typography>
              <Typography variant="body2" component="div">
                • cedula<br/>
                • nombre<br/>
                • apellido<br/>
                • email<br/>
                • carreraId<br/>
                • universidadId<br/>
                • promedioNotas (0-5)<br/>
                • creditosAprobados<br/>
                • creditosTotales<br/>
                • semestreActual<br/>
                • fechaIngreso (YYYY-MM-DD)<br/>
              </Typography>

              <Typography variant="subtitle2" color="primary" sx={{ mt: 2, mb: 1 }}>
                Campos Opcionales (mejoran predicción):
              </Typography>
              <Typography variant="body2" component="div">
                • telefono<br/>
                • facultadId<br/>
                • estadoMatricula<br/>
                • asistenciaPromedio (0-100)<br/>
                • materiasReprobadas<br/>
                • diasUltimaActividad<br/>
                • estadoSocioeconomico<br/>
                • fechaNacimiento<br/>
                • direccion
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Área de Carga */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box
                {...getRootProps()}
                sx={{
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'grey.300',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: isDragActive ? 'action.hover' : 'background.default',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'action.hover',
                  }
                }}
              >
                <input {...getInputProps()} />
                <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {isDragActive
                    ? 'Suelta el archivo aquí...'
                    : 'Arrastra un archivo CSV aquí o haz clic para seleccionar'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Solo archivos CSV (.csv)
                </Typography>
              </Box>

              {parsedData.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Se han detectado {parsedData.length} registros en el archivo
                  </Alert>
                  
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<Upload />}
                      onClick={handleImport}
                      disabled={importMutation.isLoading}
                    >
                      {importMutation.isLoading ? 'Importando...' : 'Importar Datos'}
                    </Button>
                    
                    <Button
                      variant="outlined"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      {showPreview ? 'Ocultar' : 'Ver'} Vista Previa
                    </Button>
                    
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        setCsvData('');
                        setParsedData([]);
                        setShowPreview(false);
                      }}
                    >
                      Limpiar
                    </Button>
                  </Box>

                  {importMutation.isLoading && (
                    <LinearProgress sx={{ mb: 2 }} />
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Vista Previa */}
          {showPreview && parsedData.length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Vista Previa (primeros 5 registros)
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Cédula</TableCell>
                        <TableCell>Nombre</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Carrera</TableCell>
                        <TableCell>Promedio</TableCell>
                        <TableCell>Semestre</TableCell>
                        <TableCell>Asistencia</TableCell>
                        <TableCell>Estado SE</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parsedData.slice(0, 5).map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{row.cedula}</TableCell>
                          <TableCell>{`${row.nombre} ${row.apellido}`}</TableCell>
                          <TableCell>{row.email}</TableCell>
                          <TableCell>{row.carreraId}</TableCell>
                          <TableCell>{row.promedioNotas}</TableCell>
                          <TableCell>{row.semestreActual}</TableCell>
                          <TableCell>{row.asistenciaPromedio || 'N/A'}%</TableCell>
                          <TableCell>{row.estadoSocioeconomico || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {parsedData.length > 5 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    ... y {parsedData.length - 5} registros más
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}

          {/* Resultado de Importación */}
          {importResult && (
            <Card sx={{ mt: 2, borderLeft: 4, borderColor: importResult.errors.length > 0 ? 'warning.main' : 'success.main' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {importResult.errors.length > 0 ? (
                    <Warning color="warning" sx={{ mr: 2 }} />
                  ) : (
                    <CheckCircle color="success" sx={{ mr: 2 }} />
                  )}
                  <Typography variant="h6">
                    Resultado de la Importación
                  </Typography>
                </Box>
                
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Procesados
                    </Typography>
                    <Typography variant="h5">
                      {importResult.processed}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Creados
                    </Typography>
                    <Typography variant="h5" color="success.main">
                      {importResult.created}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Errores
                    </Typography>
                    <Typography variant="h5" color="error.main">
                      {importResult.errors.length}
                    </Typography>
                  </Grid>
                </Grid>

                {importResult.errors.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Errores encontrados:
                    </Typography>
                    <List dense>
                      {importResult.errors.slice(0, 5).map((error, index) => (
                        <ListItem key={index}>
                          <Error color="error" sx={{ mr: 1 }} />
                          <ListItemText
                            primary={`Fila ${error.row}: ${error.cedula}`}
                            secondary={JSON.stringify(error.errors)}
                          />
                        </ListItem>
                      ))}
                    </List>
                    {importResult.errors.length > 5 && (
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                        ... y {importResult.errors.length - 5} errores más
                      </Typography>
                    )}
                  </Box>
                )}

                <Alert severity={importResult.errors.length > 0 ? 'warning' : 'success'} sx={{ mt: 2 }}>
                  {importResult.summary}
                </Alert>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </AppLayout>
  );
}

export default ImportarPage;