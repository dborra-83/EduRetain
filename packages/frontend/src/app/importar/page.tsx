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

const EXAMPLE_CSV = `cedula,nombre,apellido,email,telefono,carreraId,promedioNotas,creditosAprobados,creditosTotales,semestreActual,fechaIngreso
12345678,Juan,Pérez,juan.perez@email.com,3001234567,ING001,3.5,45,60,5,2022-01-15
87654321,María,González,maria.gonzalez@email.com,3007654321,MED002,4.2,80,120,7,2021-08-20
11111111,Carlos,Rodríguez,carlos.rodriguez@email.com,3001111111,DER003,2.8,30,45,3,2023-01-10`;

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
      const response = await apiClient.alumnos.import(data);
      return response.data.data;
    },
    {
      onSuccess: (result: ImportResult) => {
        setImportResult(result);
        enqueueSnackbar(result.summary, { 
          variant: result.errors.length > 0 ? 'warning' : 'success' 
        });
        queryClient.invalidateQueries(['alumnos']);
        queryClient.invalidateQueries(['dashboard']);
      },
      onError: (error: any) => {
        console.error('Import error:', error);
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
        error: (error) => {
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
              {importResult.errors.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Error color="error" sx={{ mr: 1 }} />
                  <Typography>
                    <strong>{importResult.errors.length}</strong> errores encontrados
                  </Typography>
                </Box>
              )}
            </Box>

            {importResult.errors.length > 0 && (
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
                              {error.errors}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {importResult.errors.length > 10 && (
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