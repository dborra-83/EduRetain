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
} from '@mui/material';
import { Upload, CheckCircle, Error, Warning } from '@mui/icons-material';
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
  promedioNotas: number;
  creditosAprobados: number;
  creditosTotales: number;
  semestreActual: number;
  fechaIngreso: string;
  estadoMatricula?: string;
}

const EXAMPLE_CSV = `cedula,nombre,apellido,email,telefono,carreraId,facultadId,promedioNotas,creditosAprobados,creditosTotales,semestreActual,fechaIngreso,estadoMatricula,asistenciaClases,materiasReprobadas,ultimaActividadSistema1,ultimaActividadSistema2,ultimaActividadSistema3,ultimoIngresoCampus,estadoSocioeconomico
12345678,Juan,Pérez,juan.perez@email.com,3001234567,CAR001,FAC001,3.5,45,60,5,2022-01-15,ACTIVO,85,0,2024-01-20,2024-01-19,2024-01-18,2024-01-20,MEDIO
87654321,María,González,maria.gonzalez@email.com,3007654321,CAR002,FAC002,4.2,80,120,7,2021-08-20,ACTIVO,95,0,2024-01-20,2024-01-20,2024-01-19,2024-01-19,ALTO
11111111,Carlos,Rodríguez,carlos.rodriguez@email.com,3001111111,CAR003,FAC003,2.8,30,60,3,2023-01-10,ACTIVO,60,2,2024-01-15,2024-01-10,2024-01-05,2024-01-10,BAJO
22222222,Ana,Martínez,ana.martinez@email.com,3002222222,CAR001,FAC001,1.8,20,60,4,2022-08-15,ACTIVO,45,4,2023-12-15,2023-12-10,2023-12-05,2023-12-01,BAJO
33333333,Luis,García,luis.garcia@email.com,3003333333,CAR004,FAC001,3.2,55,80,6,2021-01-20,ACTIVO,75,1,2024-01-18,2024-01-17,2024-01-16,2024-01-18,MEDIO
44444444,Sofia,López,sofia.lopez@email.com,3004444444,CAR002,FAC002,3.8,90,120,8,2020-08-15,ACTIVO,88,0,2024-01-20,2024-01-19,2024-01-20,2024-01-20,MEDIO
55555555,Diego,Torres,diego.torres@email.com,3005555555,CAR005,FAC003,2.5,35,70,5,2022-01-10,INACTIVO,55,3,2023-11-20,2023-11-15,2023-11-10,2023-11-05,MEDIO_BAJO
66666666,Camila,Ramírez,camila.ramirez@email.com,3006666666,CAR003,FAC003,4.5,60,60,4,2021-08-20,ACTIVO,98,0,2024-01-20,2024-01-20,2024-01-20,2024-01-20,ALTO
77777777,Andrés,Flores,andres.flores@email.com,3007777777,CAR001,FAC001,2.2,25,60,3,2023-01-15,ACTIVO,50,2,2024-01-10,2024-01-05,2023-12-28,2024-01-08,BAJO
88888888,Valentina,Herrera,valentina.herrera@email.com,3008888888,CAR006,FAC004,3.9,110,140,9,2020-01-20,ACTIVO,92,0,2024-01-19,2024-01-18,2024-01-19,2024-01-19,MEDIO
99999999,Miguel,Castillo,miguel.castillo@email.com,3009999999,CAR007,FAC005,1.5,15,60,6,2021-08-15,SUSPENDIDO,30,5,2023-10-20,2023-10-15,2023-10-10,2023-10-01,BAJO
10101010,Isabella,Moreno,isabella.moreno@email.com,3001010101,CAR002,FAC002,3.7,75,100,7,2021-01-10,ACTIVO,82,1,2024-01-20,2024-01-19,2024-01-18,2024-01-20,MEDIO
20202020,Santiago,Jiménez,santiago.jimenez@email.com,3002020202,CAR003,FAC003,2.9,40,80,5,2022-08-20,ACTIVO,68,2,2024-01-15,2024-01-14,2024-01-13,2024-01-15,MEDIO_BAJO
30303030,Lucía,Díaz,lucia.diaz@email.com,3003030303,CAR001,FAC001,4.8,58,60,4,2021-08-15,ACTIVO,100,0,2024-01-20,2024-01-20,2024-01-20,2024-01-20,ALTO
40404040,Gabriel,Ortiz,gabriel.ortiz@email.com,3004040404,CAR008,FAC006,2.3,30,90,7,2020-08-10,ACTIVO,48,3,2024-01-01,2023-12-28,2023-12-25,2023-12-20,BAJO`;

function ImportarPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  
  // Debug user info
  React.useEffect(() => {
    console.log('Current user in ImportarPage:', user);
  }, [user]);

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
        
        // El resultado viene en result.data cuando es exitoso
        const importData = result?.data || result || {};
        
        // Asegurar que el resultado tenga la estructura esperada
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
        
        // Limpiar el CSV data y parsed data después de importación exitosa
        setCsvData('');
        setParsedData([]);
        
        // Auto-ocultar el resultado después de 10 segundos si no hay errores
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
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvData(content);
      
      // Parse CSV for preview
      parse(content, {
        header: true,
        complete: (results) => {
          const parsed = results.data as ParsedRow[];
          setParsedData(parsed.filter(row => row.cedula)); // Filter empty rows
          setShowPreview(true);
        },
        error: (error: any) => {
          console.error('CSV Parse error:', error);
          enqueueSnackbar('Error parseando el archivo CSV', { variant: 'error' });
        }
      });
    };
    
    reader.readAsText(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    multiple: false,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const handleImport = () => {
    if (!user?.universidadId) {
      enqueueSnackbar('Universidad ID no disponible', { variant: 'error' });
      return;
    }

    console.log('Importing CSV:', {
      csvLength: csvData.length,
      universidadId: user.universidadId,
      csvPreview: csvData.substring(0, 200)
    });

    importMutation.mutate({
      csvData,
      universidadId: user.universidadId
    });
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([EXAMPLE_CSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_alumnos.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <AppLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Importar Alumnos
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Importa datos de alumnos desde un archivo CSV
        </Typography>
      </Box>

      {/* Instrucciones */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Instrucciones de Importación
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="1. Descarga la plantilla CSV"
                secondary="Utiliza nuestra plantilla para asegurar el formato correcto"
              />
              <Button
                variant="outlined"
                size="small"
                onClick={handleDownloadTemplate}
              >
                Descargar Plantilla
              </Button>
            </ListItem>
            <ListItem>
              <ListItemText
                primary="2. Completa los datos"
                secondary="Llena la plantilla con la información de los alumnos"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="3. Sube el archivo"
                secondary="Arrastra el archivo CSV o haz clic para seleccionarlo"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Campo requeridos */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Campos Requeridos
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {[
              'cedula', 'nombre', 'apellido', 'email', 'carreraId', 
              'promedioNotas', 'creditosAprobados', 'creditosTotales', 
              'semestreActual', 'fechaIngreso'
            ].map((field) => (
              <Chip key={field} label={field} size="small" color="primary" />
            ))}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Campos opcionales: telefono, facultadId, estadoMatricula
          </Typography>
        </CardContent>
      </Card>

      {/* Upload Area */}
      {!importResult && (
        <Card sx={{ mb: 3 }}>
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
                backgroundColor: isDragActive ? 'action.hover' : 'transparent',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover',
                }
              }}
            >
              <input {...getInputProps()} />
              <Upload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive
                  ? 'Suelta el archivo aquí'
                  : 'Arrastra un archivo CSV aquí o haz clic para seleccionar'
                }
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tamaño máximo: 5MB • Formato: CSV
              </Typography>
            </Box>

            {parsedData.length > 0 && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Se encontraron {parsedData.length} registros para importar
                </Alert>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setShowPreview(true)}
                  >
                    Vista Previa
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleImport}
                    disabled={importMutation.isLoading}
                  >
                    {importMutation.isLoading ? 'Importando...' : 'Importar Datos'}
                  </Button>
                </Box>
                {importMutation.isLoading && (
                  <LinearProgress sx={{ mt: 2 }} />
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResult && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Resultado de la Importación
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle color="success" sx={{ mr: 1 }} />
                <Typography>
                  <strong>{importResult.created}</strong> alumnos creados exitosamente
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Warning color="info" sx={{ mr: 1 }} />
                <Typography>
                  <strong>{importResult.processed}</strong> registros procesados
                </Typography>
              </Box>
              {importResult.errors && importResult.errors.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Error color="error" sx={{ mr: 1 }} />
                  <Typography>
                    <strong>{importResult.errors.length}</strong> errores encontrados
                  </Typography>
                </Box>
              )}
            </Box>

            {importResult.errors && importResult.errors.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom color="error">
                  Errores de Importación
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Fila</TableCell>
                        <TableCell>Cédula</TableCell>
                        <TableCell>Error</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importResult.errors.slice(0, 10).map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell>{error.cedula}</TableCell>
                          <TableCell>
                            <Typography variant="body2" color="error">
                              {typeof error.errors === 'object' 
                                ? JSON.stringify(error.errors) 
                                : error.errors}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {importResult.errors && importResult.errors.length > 10 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    ... y {importResult.errors.length - 10} errores más
                  </Typography>
                )}
              </>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={() => {
                  setImportResult(null);
                  setCsvData('');
                  setParsedData([]);
                }}
              >
                Nueva Importación
              </Button>
              <Button
                variant="outlined"
                onClick={() => window.location.href = '/alumnos'}
              >
                Ver Alumnos
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Vista Previa - {parsedData.length} registros
        </DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Cédula</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Carrera</TableCell>
                  <TableCell>Promedio</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parsedData.slice(0, 10).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.cedula}</TableCell>
                    <TableCell>{row.nombre} {row.apellido}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.carreraId}</TableCell>
                    <TableCell>{row.promedioNotas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {parsedData.length > 10 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              ... y {parsedData.length - 10} registros más
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>
            Cerrar
          </Button>
          <Button variant="contained" onClick={handleImport}>
            Confirmar Importación
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}

export default ImportarPage;