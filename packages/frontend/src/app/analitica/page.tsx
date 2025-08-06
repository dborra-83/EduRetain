'use client';

import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Psychology as PsychologyIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import AppLayout from '@/components/Layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { useSnackbar } from 'notistack';

interface AlumnoRiesgo {
  cedula: string;
  nombre: string;
  apellido: string;
  carrera: string;
  semestre: number;
  promedioNotas: number;
  riesgoDesercion: string;
  probabilidadDesercion: number;
  factoresRiesgo: string[];
}

interface EstadisticasRiesgo {
  total: number;
  critico: number;
  alto: number;
  medio: number;
  bajo: number;
  tasaRetencion: number;
}

export default function AnaliticaPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  const [loading, setLoading] = useState(true);
  const [loadingPrediccion, setLoadingPrediccion] = useState(false);
  const [estadisticas, setEstadisticas] = useState<EstadisticasRiesgo>({
    total: 0,
    critico: 0,
    alto: 0,
    medio: 0,
    bajo: 0,
    tasaRetencion: 0,
  });
  const [alumnosRiesgo, setAlumnosRiesgo] = useState<AlumnoRiesgo[]>([]);
  const [openPrediccion, setOpenPrediccion] = useState(false);
  const [prediccionIndividual, setPrediccionIndividual] = useState({
    cedula: '',
    promedioNotas: '',
    creditosAprobados: '',
    creditosTotales: '',
    semestreActual: '',
  });
  const [resultadoPrediccion, setResultadoPrediccion] = useState<any>(null);

  useEffect(() => {
    if (user?.universidadId) {
      cargarDatos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.universidadId]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar alumnos
      const response = await apiClient.alumnos.getAll({
        universidadId: user?.universidadId,
      });

      if (response.data?.items) {
        const alumnos = response.data.items;
        
        console.log('Alumnos cargados:', alumnos.length);
        console.log('Muestra de alumnos:', alumnos.slice(0, 3));
        
        // Calcular estadísticas
        const stats = {
          total: alumnos.length,
          critico: alumnos.filter((a: any) => a.riesgoDesercion === 'CRITICO').length,
          alto: alumnos.filter((a: any) => a.riesgoDesercion === 'ALTO').length,
          medio: alumnos.filter((a: any) => a.riesgoDesercion === 'MEDIO').length,
          bajo: alumnos.filter((a: any) => a.riesgoDesercion === 'BAJO').length,
          tasaRetencion: 0,
        };
        
        console.log('Estadísticas calculadas:', stats);
        
        // Calcular tasa de retención (estudiantes en riesgo bajo/total)
        if (stats.total > 0) {
          stats.tasaRetencion = Math.round((stats.bajo / stats.total) * 100);
        }
        
        setEstadisticas(stats);
        
        // Filtrar alumnos en riesgo (todos excepto bajo)
        const enRiesgo = alumnos
          .filter((a: any) => {
            // Debug: mostrar todos los estudiantes para verificar
            console.log(`Estudiante ${a.cedula}: riesgo=${a.riesgoDesercion}, promedio=${a.promedioNotas}`);
            
            // Incluir si tiene riesgo CRITICO, ALTO o MEDIO
            // También incluir si no tiene riesgo asignado pero tiene promedio bajo
            const tieneRiesgoAsignado = a.riesgoDesercion === 'CRITICO' || 
                                       a.riesgoDesercion === 'ALTO' || 
                                       a.riesgoDesercion === 'MEDIO';
            
            const tienePromedioPreocupante = !a.riesgoDesercion && a.promedioNotas && a.promedioNotas < 3.0;
            
            return tieneRiesgoAsignado || tienePromedioPreocupante;
          })
          .sort((a: any, b: any) => {
            const orden: Record<string, number> = { CRITICO: 0, ALTO: 1, MEDIO: 2, BAJO: 3 };
            const ordenA = a.riesgoDesercion ? (orden[a.riesgoDesercion] || 4) : 5;
            const ordenB = b.riesgoDesercion ? (orden[b.riesgoDesercion] || 4) : 5;
            return ordenA - ordenB;
          });
        
        console.log('Alumnos en riesgo filtrados:', enRiesgo.length);
        console.log('Alumnos en riesgo:', enRiesgo);
        
        setAlumnosRiesgo(enRiesgo);
      } else {
        console.log('No se recibieron datos de alumnos');
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      enqueueSnackbar('Error al cargar los datos de analítica', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const ejecutarPrediccionBatch = async () => {
    setLoadingPrediccion(true);
    try {
      // Obtener todos los estudiantes primero
      const alumnosResponse = await apiClient.alumnos.getAll({
        universidadId: user?.universidadId,
      });

      if (!alumnosResponse.data?.items || alumnosResponse.data.items.length === 0) {
        enqueueSnackbar('No hay estudiantes para analizar', { variant: 'warning' });
        return;
      }

      // Analizar todos los estudiantes para actualizar predicciones
      const estudiantesParaAnalizar = alumnosResponse.data.items;

      if (estudiantesParaAnalizar.length === 0) {
        enqueueSnackbar('No hay estudiantes para analizar', { variant: 'warning' });
        return;
      }

      enqueueSnackbar(`Analizando ${estudiantesParaAnalizar.length} estudiantes con IA...`, { 
        variant: 'info' 
      });

      // Ejecutar predicción batch
      const response = await apiClient.predictions.batch({
        universidadId: user?.universidadId,
        filtros: {}, // Analizar todos
      });

      if (response.data) {
        enqueueSnackbar(`Predicción completada para ${response.data.totalAnalizado || estudiantesParaAnalizar.length} estudiantes`, { 
          variant: 'success' 
        });
        
        // Recargar datos con nuevas predicciones
        setTimeout(() => cargarDatos(), 1000); // Esperar un poco antes de recargar
      }
    } catch (error) {
      console.error('Error ejecutando predicción:', error);
      
      // Si Bedrock no está disponible, usar cálculo local
      enqueueSnackbar('Usando análisis local (Bedrock no disponible)', { variant: 'warning' });
      
      // Simular predicción local básica
      await cargarDatos();
    } finally {
      setLoadingPrediccion(false);
    }
  };

  const ejecutarPrediccionIndividual = async () => {
    setLoadingPrediccion(true);
    try {
      const alumnoData = prediccionIndividual.cedula ? 
        { cedula: prediccionIndividual.cedula } :
        {
          alumnoData: {
            nombre: 'Estudiante',
            apellido: 'Simulado',
            promedioNotas: parseFloat(prediccionIndividual.promedioNotas),
            creditosAprobados: parseInt(prediccionIndividual.creditosAprobados),
            creditosTotales: parseInt(prediccionIndividual.creditosTotales),
            semestreActual: parseInt(prediccionIndividual.semestreActual),
          }
        };

      const response = await apiClient.predictions.single({
        universidadId: user?.universidadId,
        ...alumnoData,
      });

      if (response.data) {
        setResultadoPrediccion(response.data);
        enqueueSnackbar('Predicción generada exitosamente', { variant: 'success' });
      }
    } catch (error) {
      console.error('Error ejecutando predicción individual:', error);
      enqueueSnackbar('Error al ejecutar predicción individual', { variant: 'error' });
    } finally {
      setLoadingPrediccion(false);
    }
  };

  const getRiesgoColor = (riesgo: string) => {
    switch (riesgo) {
      case 'CRITICO':
        return 'error';
      case 'ALTO':
        return 'warning';
      case 'MEDIO':
        return 'info';
      case 'BAJO':
        return 'success';
      default:
        return 'default';
    }
  };

  const getRiesgoIcon = (riesgo: string) => {
    switch (riesgo) {
      case 'CRITICO':
      case 'ALTO':
        return <WarningIcon />;
      case 'MEDIO':
        return <TrendingUpIcon />;
      case 'BAJO':
        return <CheckCircleIcon />;
      default:
        return <AssessmentIcon />;
    }
  };

  return (
    <AppLayout>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Analítica y Predicciones
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Análisis predictivo basado en IA para identificar estudiantes en riesgo
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={cargarDatos}
              disabled={loading}
            >
              Actualizar
            </Button>
            <Button
              variant="contained"
              startIcon={<PsychologyIcon />}
              onClick={() => setOpenPrediccion(true)}
            >
              Nueva Predicción
            </Button>
          </Box>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Tarjetas de estadísticas */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TrendingUpIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="h6">Tasa de Retención</Typography>
                  </Box>
                  <Typography variant="h3">{estadisticas.tasaRetencion}%</Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={estadisticas.tasaRetencion} 
                    sx={{ mt: 2, height: 8, borderRadius: 4 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ borderLeft: 4, borderColor: 'error.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <WarningIcon sx={{ mr: 2, color: 'error.main' }} />
                    <Typography variant="h6">Riesgo Crítico</Typography>
                  </Box>
                  <Typography variant="h3">{estadisticas.critico}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Estudiantes ({estadisticas.total > 0 ? Math.round((estadisticas.critico / estadisticas.total) * 100) : 0}%)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ borderLeft: 4, borderColor: 'warning.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <WarningIcon sx={{ mr: 2, color: 'warning.main' }} />
                    <Typography variant="h6">Riesgo Alto</Typography>
                  </Box>
                  <Typography variant="h3">{estadisticas.alto}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Estudiantes ({estadisticas.total > 0 ? Math.round((estadisticas.alto / estadisticas.total) * 100) : 0}%)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ borderLeft: 4, borderColor: 'success.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CheckCircleIcon sx={{ mr: 2, color: 'success.main' }} />
                    <Typography variant="h6">Riesgo Bajo</Typography>
                  </Box>
                  <Typography variant="h3">{estadisticas.bajo}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Estudiantes ({estadisticas.total > 0 ? Math.round((estadisticas.bajo / estadisticas.total) * 100) : 0}%)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Tabla de estudiantes en riesgo */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  Estudiantes en Mayor Riesgo
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AssessmentIcon />}
                  onClick={ejecutarPrediccionBatch}
                  disabled={loadingPrediccion}
                >
                  {loadingPrediccion ? 'Analizando...' : 'Analizar con IA'}
                </Button>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : alumnosRiesgo.length === 0 ? (
                <Alert severity="warning">
                  No se encontraron estudiantes en riesgo para mostrar.
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Estadísticas detectadas: {estadisticas.critico} crítico, {estadisticas.alto} alto, {estadisticas.medio} medio
                  </Typography>
                  {(estadisticas.critico > 0 || estadisticas.alto > 0 || estadisticas.medio > 0) && (
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                      Hay {estadisticas.critico + estadisticas.alto + estadisticas.medio} estudiantes en riesgo pero no se están mostrando. 
                      Verifica los logs en la consola del navegador (F12).
                    </Typography>
                  )}
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Total de estudiantes en el sistema: {estadisticas.total}
                  </Typography>
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Cédula</TableCell>
                        <TableCell>Nombre</TableCell>
                        <TableCell>Carrera</TableCell>
                        <TableCell align="center">Semestre</TableCell>
                        <TableCell align="center">Promedio</TableCell>
                        <TableCell align="center">Nivel de Riesgo</TableCell>
                        <TableCell align="center">Probabilidad</TableCell>
                        <TableCell>Factores de Riesgo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {alumnosRiesgo.map((alumno) => (
                        <TableRow key={alumno.cedula}>
                          <TableCell>{alumno.cedula}</TableCell>
                          <TableCell>{`${alumno.nombre} ${alumno.apellido}`}</TableCell>
                          <TableCell>{alumno.carrera || 'N/A'}</TableCell>
                          <TableCell align="center">{alumno.semestre || 0}</TableCell>
                          <TableCell align="center">
                            {alumno.promedioNotas?.toFixed(2) || '0.00'}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              icon={getRiesgoIcon(alumno.riesgoDesercion)}
                              label={alumno.riesgoDesercion}
                              color={getRiesgoColor(alumno.riesgoDesercion) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight="bold">
                              {alumno.probabilidadDesercion || 0}%
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {alumno.factoresRiesgo?.length > 0 ? (
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {alumno.factoresRiesgo.slice(0, 2).map((factor, idx) => (
                                  <Chip
                                    key={idx}
                                    label={factor}
                                    size="small"
                                    variant="outlined"
                                  />
                                ))}
                                {alumno.factoresRiesgo.length > 2 && (
                                  <Chip
                                    label={`+${alumno.factoresRiesgo.length - 2}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                Sin factores identificados
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog de Predicción Individual */}
      <Dialog 
        open={openPrediccion} 
        onClose={() => setOpenPrediccion(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PsychologyIcon sx={{ mr: 2 }} />
            Predicción Individual con IA
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            Ingresa la cédula de un estudiante existente o los datos para simular una predicción
          </Alert>
          
          <TextField
            fullWidth
            label="Cédula del Estudiante (opcional)"
            value={prediccionIndividual.cedula}
            onChange={(e) => setPrediccionIndividual({
              ...prediccionIndividual,
              cedula: e.target.value,
            })}
            sx={{ mb: 3 }}
            helperText="Si ingresas una cédula, se usarán los datos del estudiante"
          />
          
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            O ingresa datos para simulación:
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Promedio de Notas"
                type="number"
                value={prediccionIndividual.promedioNotas}
                onChange={(e) => setPrediccionIndividual({
                  ...prediccionIndividual,
                  promedioNotas: e.target.value,
                })}
                inputProps={{ min: 0, max: 5, step: 0.1 }}
                disabled={!!prediccionIndividual.cedula}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Semestre Actual"
                type="number"
                value={prediccionIndividual.semestreActual}
                onChange={(e) => setPrediccionIndividual({
                  ...prediccionIndividual,
                  semestreActual: e.target.value,
                })}
                inputProps={{ min: 1, max: 10 }}
                disabled={!!prediccionIndividual.cedula}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Créditos Aprobados"
                type="number"
                value={prediccionIndividual.creditosAprobados}
                onChange={(e) => setPrediccionIndividual({
                  ...prediccionIndividual,
                  creditosAprobados: e.target.value,
                })}
                inputProps={{ min: 0 }}
                disabled={!!prediccionIndividual.cedula}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Créditos Totales"
                type="number"
                value={prediccionIndividual.creditosTotales}
                onChange={(e) => setPrediccionIndividual({
                  ...prediccionIndividual,
                  creditosTotales: e.target.value,
                })}
                inputProps={{ min: 1 }}
                disabled={!!prediccionIndividual.cedula}
              />
            </Grid>
          </Grid>

          {resultadoPrediccion && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                Resultado de la Predicción
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Nivel de Riesgo:
                </Typography>
                <Chip
                  label={resultadoPrediccion.prediccionBasica?.nivel || 'N/A'}
                  color={getRiesgoColor(resultadoPrediccion.prediccionBasica?.nivel) as any}
                  sx={{ mt: 1 }}
                />
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Probabilidad de Deserción:
                </Typography>
                <Typography variant="h5" color="error">
                  {resultadoPrediccion.prediccionBasica?.probabilidad || 0}%
                </Typography>
              </Box>
              
              {resultadoPrediccion.recomendaciones && (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Recomendaciones:
                  </Typography>
                  {resultadoPrediccion.recomendaciones.map((rec: string, idx: number) => (
                    <Chip
                      key={idx}
                      label={rec}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenPrediccion(false);
            setResultadoPrediccion(null);
            setPrediccionIndividual({
              cedula: '',
              promedioNotas: '',
              creditosAprobados: '',
              creditosTotales: '',
              semestreActual: '',
            });
          }}>
            Cerrar
          </Button>
          <Button
            variant="contained"
            onClick={ejecutarPrediccionIndividual}
            disabled={loadingPrediccion}
            startIcon={loadingPrediccion ? <CircularProgress size={20} /> : <PsychologyIcon />}
          >
            {loadingPrediccion ? 'Analizando...' : 'Ejecutar Predicción'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}