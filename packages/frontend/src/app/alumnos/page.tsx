'use client';

import React, { useState } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  School as SchoolIcon,
  Warning as WarningIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import AppLayout from '@/components/Layout/AppLayout';
import { useSnackbar } from 'notistack';

interface Alumno {
  cedula: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  carreraId: string;
  promedioNotas: number;
  creditosAprobados: number;
  creditosTotales: number;
  semestreActual: number;
  estadoMatricula: string;
  riesgoDesercion: string;
  fechaIngreso: string;
  ultimaActividad?: string;
  // Nuevos campos
  porcentajeAsistencia?: number;
  materiasPendientes?: number;
  actividadSistema1?: string;
  actividadSistema2?: string;
  actividadSistema3?: string;
  ultimoIngresoCampus?: string;
  estadoSocioEconomico?: string;
  cantidadCampanasRecibidas?: number;
  probabilidadDesercion?: number;
}

const getRiesgoColor = (riesgo: string) => {
  switch (riesgo) {
    case 'CRITICO': return 'error';
    case 'ALTO': return 'warning';
    case 'MEDIO': return 'info';
    case 'BAJO': return 'success';
    default: return 'default';
  }
};

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case 'ACTIVO': return 'success';
    case 'INACTIVO': return 'warning';
    case 'SUSPENDIDO': return 'error';
    case 'EGRESADO': return 'info';
    default: return 'default';
  }
};

export default function AlumnosPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    universidad: '',
    facultad: '',
    carrera: '',
    riesgo: ''
  });
  
  // Modal states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAlumno, setSelectedAlumno] = useState<Alumno | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Alumno>>({});

  // Fetch filter options
  const { data: filterOptions } = useQuery(
    ['filterOptions', user?.universidadId],
    async () => {
      if (!user?.universidadId) return null;
      // This would fetch from API - for now return mock data
      return {
        universidades: [{ id: user.universidadId, nombre: 'Universidad Principal' }],
        facultades: [
          { id: 'FAC001', nombre: 'Ingeniería' },
          { id: 'FAC002', nombre: 'Medicina' },
          { id: 'FAC003', nombre: 'Administración' }
        ],
        carreras: [
          { id: 'CAR001', nombre: 'Ingeniería de Software' },
          { id: 'CAR002', nombre: 'Medicina General' },
          { id: 'CAR003', nombre: 'Administración de Empresas' }
        ]
      };
    },
    { enabled: !!user?.universidadId }
  );

  // Fetch alumnos
  const { data, isLoading, error, refetch } = useQuery(
    ['alumnos', user?.universidadId, page, rowsPerPage, searchTerm, filters],
    async () => {
      if (!user?.universidadId) throw new Error('No university ID');
      
      const params: any = {
        universidadId: filters.universidad || user.universidadId,
        page: page + 1,
        limit: rowsPerPage,
      };
      
      if (searchTerm) {
        params.busqueda = searchTerm;
      }
      
      if (filters.facultad) {
        params.facultadId = filters.facultad;
      }
      
      if (filters.carrera) {
        params.carreraId = filters.carrera;
      }
      
      if (filters.riesgo) {
        params.riesgoDesercion = filters.riesgo;
      }
      
      const response = await apiClient.alumnos.getAll(params);
      console.log('Alumnos response:', response.data);
      return response.data;
    },
    {
      enabled: !!user?.universidadId,
      keepPreviousData: true,
    }
  );

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleRefresh = () => {
    refetch();
    enqueueSnackbar('Datos actualizados', { variant: 'info' });
  };

  // Mutations
  const updateMutation = useMutation(
    async (data: { cedula: string; updates: Partial<Alumno> }) => {
      const response = await apiClient.alumnos.update(data.cedula, {
        ...data.updates,
        universidadId: user?.universidadId,
      });
      return response.data;
    },
    {
      onSuccess: () => {
        enqueueSnackbar('Alumno actualizado exitosamente', { variant: 'success' });
        queryClient.invalidateQueries(['alumnos']);
        setEditDialogOpen(false);
        setSelectedAlumno(null);
      },
      onError: (error: any) => {
        enqueueSnackbar('Error al actualizar el alumno', { variant: 'error' });
        console.error('Update error:', error);
      },
    }
  );

  const deleteMutation = useMutation(
    async (cedula: string) => {
      const response = await apiClient.alumnos.delete(cedula, {
        universidadId: user?.universidadId,
      });
      return response.data;
    },
    {
      onSuccess: () => {
        enqueueSnackbar('Alumno eliminado exitosamente', { variant: 'success' });
        queryClient.invalidateQueries(['alumnos']);
        setDeleteDialogOpen(false);
        setSelectedAlumno(null);
      },
      onError: (error: any) => {
        enqueueSnackbar('Error al eliminar el alumno', { variant: 'error' });
        console.error('Delete error:', error);
      },
    }
  );

  // Handlers
  const handleEditClick = (alumno: Alumno) => {
    setSelectedAlumno(alumno);
    setEditFormData({
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      email: alumno.email,
      telefono: alumno.telefono,
      promedioNotas: alumno.promedioNotas,
      semestreActual: alumno.semestreActual,
      estadoMatricula: alumno.estadoMatricula,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (alumno: Alumno) => {
    setSelectedAlumno(alumno);
    setDeleteDialogOpen(true);
  };

  const handleEditSave = () => {
    if (selectedAlumno) {
      updateMutation.mutate({
        cedula: selectedAlumno.cedula,
        updates: editFormData,
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedAlumno) {
      deleteMutation.mutate(selectedAlumno.cedula);
    }
  };

  const alumnos = data?.data?.items || data?.items || [];
  const totalCount = data?.data?.pagination?.total || alumnos.length;

  return (
    <AppLayout>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Gestión de Alumnos
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Administra los estudiantes de tu institución
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            Actualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            href="/importar"
          >
            Importar Alumnos
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <SchoolIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Total</Typography>
            </Box>
            <Typography variant="h4">{totalCount}</Typography>
            <Typography variant="body2" color="text.secondary">
              Estudiantes
            </Typography>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <WarningIcon sx={{ mr: 1, color: 'error.main' }} />
              <Typography variant="h6">En Riesgo</Typography>
            </Box>
            <Typography variant="h4">
              {alumnos.filter((a: Alumno) => ['ALTO', 'CRITICO'].includes(a.riesgoDesercion)).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Requieren atención
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <SchoolIcon sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h6">Activos</Typography>
            </Box>
            <Typography variant="h4">
              {alumnos.filter((a: Alumno) => a.estadoMatricula === 'ACTIVO').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Matriculados
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                placeholder="Buscar por nombre, apellido o cédula..."
                value={searchTerm}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            {/* Filter Row */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Universidad</InputLabel>
                <Select
                  value={filters.universidad}
                  onChange={(e) => {
                    setFilters({ ...filters, universidad: e.target.value });
                    setPage(0);
                  }}
                  label="Universidad"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {filterOptions?.universidades?.map((uni: any) => (
                    <MenuItem key={uni.id} value={uni.id}>{uni.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Facultad</InputLabel>
                <Select
                  value={filters.facultad}
                  onChange={(e) => {
                    setFilters({ ...filters, facultad: e.target.value });
                    setPage(0);
                  }}
                  label="Facultad"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {filterOptions?.facultades?.map((fac: any) => (
                    <MenuItem key={fac.id} value={fac.id}>{fac.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Carrera</InputLabel>
                <Select
                  value={filters.carrera}
                  onChange={(e) => {
                    setFilters({ ...filters, carrera: e.target.value });
                    setPage(0);
                  }}
                  label="Carrera"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {filterOptions?.carreras?.map((car: any) => (
                    <MenuItem key={car.id} value={car.id}>{car.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Nivel de Riesgo</InputLabel>
                <Select
                  value={filters.riesgo}
                  onChange={(e) => {
                    setFilters({ ...filters, riesgo: e.target.value });
                    setPage(0);
                  }}
                  label="Nivel de Riesgo"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="CRITICO">Crítico</MenuItem>
                  <MenuItem value="ALTO">Alto</MenuItem>
                  <MenuItem value="MEDIO">Medio</MenuItem>
                  <MenuItem value="BAJO">Bajo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {(filters.universidad || filters.facultad || filters.carrera || filters.riesgo) && (
              <Grid item xs={12}>
                <Button
                  size="small"
                  onClick={() => {
                    setFilters({ universidad: '', facultad: '', carrera: '', riesgo: '' });
                    setPage(0);
                  }}
                >
                  Limpiar filtros
                </Button>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ m: 2 }}>
              Error al cargar los datos: {(error as any).message}
            </Alert>
          ) : alumnos.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>
              No se encontraron alumnos. {searchTerm ? 'Intenta con otro término de búsqueda.' : 'Importa alumnos para comenzar.'}
            </Alert>
          ) : (
            <>
              <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 600 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>Cédula</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 180 }}>Estudiante</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 100 }}>Asistencia</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 90 }}>Promedio</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 100 }}>Mat. Pend.</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 110 }}>Sistema 1</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 110 }}>Sistema 2</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 110 }}>Sistema 3</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 120 }}>Ing. Campus</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 120 }}>Socioecon.</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 120 }}>Prob. Des.</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 100 }}>Riesgo</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 100 }}>Campañas</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 120, position: 'sticky', right: 0, backgroundColor: 'background.paper', zIndex: 1 }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {alumnos.map((alumno: Alumno) => {
                      // Calcular días desde última actividad
                      const getDaysSince = (dateString?: string) => {
                        if (!dateString) return null;
                        const date = new Date(dateString);
                        const now = new Date();
                        const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
                        return diff;
                      };

                      const formatActivityDays = (dateString?: string) => {
                        const days = getDaysSince(dateString);
                        if (days === null) return '-';
                        if (days === 0) return 'Hoy';
                        if (days === 1) return 'Ayer';
                        return `${days}d`;
                      };

                      const getActivityColor = (dateString?: string) => {
                        const days = getDaysSince(dateString);
                        if (days === null) return 'text.secondary';
                        if (days <= 1) return 'success.main';
                        if (days <= 7) return 'info.main';
                        if (days <= 30) return 'warning.main';
                        return 'error.main';
                      };

                      const getAsistenciaColor = (porcentaje?: number) => {
                        if (!porcentaje) return 'text.secondary';
                        if (porcentaje >= 80) return 'success.main';
                        if (porcentaje >= 60) return 'warning.main';
                        return 'error.main';
                      };

                      return (
                        <TableRow key={alumno.cedula} hover>
                          <TableCell>{alumno.cedula}</TableCell>
                          
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {alumno.nombre} {alumno.apellido}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {alumno.email}
                              </Typography>
                            </Box>
                          </TableCell>
                          
                          <TableCell align="center">
                            <Typography 
                              variant="body2" 
                              fontWeight="medium"
                              color={getAsistenciaColor(alumno.porcentajeAsistencia)}
                            >
                              {alumno.porcentajeAsistencia ? `${alumno.porcentajeAsistencia}%` : '-'}
                            </Typography>
                          </TableCell>
                          
                          <TableCell align="center">
                            <Typography 
                              variant="body2" 
                              fontWeight="medium"
                              color={alumno.promedioNotas >= 3.5 ? 'success.main' : alumno.promedioNotas < 2.5 ? 'error.main' : 'text.primary'}
                            >
                              {alumno.promedioNotas.toFixed(1)}
                            </Typography>
                          </TableCell>
                          
                          <TableCell align="center">
                            <Typography 
                              variant="body2"
                              color={!alumno.materiasPendientes ? 'success.main' : alumno.materiasPendientes > 2 ? 'error.main' : 'warning.main'}
                              fontWeight={alumno.materiasPendientes ? 'medium' : 'normal'}
                            >
                              {alumno.materiasPendientes || 0}
                            </Typography>
                          </TableCell>
                          
                          <TableCell align="center">
                            <Typography 
                              variant="caption" 
                              color={getActivityColor(alumno.actividadSistema1)}
                            >
                              {formatActivityDays(alumno.actividadSistema1)}
                            </Typography>
                          </TableCell>
                          
                          <TableCell align="center">
                            <Typography 
                              variant="caption" 
                              color={getActivityColor(alumno.actividadSistema2)}
                            >
                              {formatActivityDays(alumno.actividadSistema2)}
                            </Typography>
                          </TableCell>
                          
                          <TableCell align="center">
                            <Typography 
                              variant="caption" 
                              color={getActivityColor(alumno.actividadSistema3)}
                            >
                              {formatActivityDays(alumno.actividadSistema3)}
                            </Typography>
                          </TableCell>
                          
                          <TableCell align="center">
                            <Typography 
                              variant="caption" 
                              color={getActivityColor(alumno.ultimoIngresoCampus)}
                            >
                              {formatActivityDays(alumno.ultimoIngresoCampus)}
                            </Typography>
                          </TableCell>
                          
                          <TableCell align="center">
                            <Chip
                              label={alumno.estadoSocioEconomico?.replace('_', ' ') || 'N/D'}
                              size="small"
                              variant="outlined"
                              color={
                                alumno.estadoSocioEconomico === 'BAJO' ? 'error' :
                                alumno.estadoSocioEconomico === 'MEDIO_BAJO' ? 'warning' :
                                'default'
                              }
                            />
                          </TableCell>
                          
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <Typography 
                                variant="body2" 
                                fontWeight="bold"
                                color={
                                  !alumno.probabilidadDesercion ? 'text.secondary' :
                                  alumno.probabilidadDesercion >= 70 ? 'error.main' :
                                  alumno.probabilidadDesercion >= 40 ? 'warning.main' :
                                  'success.main'
                                }
                              >
                                {alumno.probabilidadDesercion ? `${alumno.probabilidadDesercion}%` : '-'}
                              </Typography>
                              {alumno.probabilidadDesercion && (
                                <LinearProgress 
                                  variant="determinate" 
                                  value={alumno.probabilidadDesercion} 
                                  sx={{ 
                                    width: 60, 
                                    height: 4, 
                                    borderRadius: 2,
                                    backgroundColor: 'grey.300',
                                    '& .MuiLinearProgress-bar': {
                                      backgroundColor: 
                                        alumno.probabilidadDesercion >= 70 ? 'error.main' :
                                        alumno.probabilidadDesercion >= 40 ? 'warning.main' :
                                        'success.main'
                                    }
                                  }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          
                          <TableCell align="center">
                            <Chip
                              label={alumno.riesgoDesercion}
                              size="small"
                              color={getRiesgoColor(alumno.riesgoDesercion) as any}
                              variant={alumno.riesgoDesercion === 'CRITICO' ? 'filled' : 'outlined'}
                            />
                          </TableCell>
                          
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                              <EmailIcon sx={{ fontSize: 16, color: 'action.disabled' }} />
                              <Typography variant="body2">
                                {alumno.cantidadCampanasRecibidas || 0}
                              </Typography>
                            </Box>
                          </TableCell>
                          
                          <TableCell align="center" sx={{ position: 'sticky', right: 0, backgroundColor: 'background.paper' }}>
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleEditClick(alumno)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDeleteClick(alumno)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Filas por página:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Editar Alumno
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre"
                value={editFormData.nombre || ''}
                onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Apellido"
                value={editFormData.apellido || ''}
                onChange={(e) => setEditFormData({ ...editFormData, apellido: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={editFormData.email || ''}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={editFormData.telefono || ''}
                onChange={(e) => setEditFormData({ ...editFormData, telefono: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Semestre Actual"
                type="number"
                value={editFormData.semestreActual || ''}
                onChange={(e) => setEditFormData({ ...editFormData, semestreActual: parseInt(e.target.value) })}
                InputProps={{ inputProps: { min: 1, max: 12 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Promedio de Notas"
                type="number"
                value={editFormData.promedioNotas || ''}
                onChange={(e) => setEditFormData({ ...editFormData, promedioNotas: parseFloat(e.target.value) })}
                InputProps={{ inputProps: { min: 0, max: 5, step: 0.1 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Estado de Matrícula</InputLabel>
                <Select
                  value={editFormData.estadoMatricula || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, estadoMatricula: e.target.value })}
                  label="Estado de Matrícula"
                >
                  <MenuItem value="ACTIVO">Activo</MenuItem>
                  <MenuItem value="INACTIVO">Inactivo</MenuItem>
                  <MenuItem value="SUSPENDIDO">Suspendido</MenuItem>
                  <MenuItem value="EGRESADO">Egresado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setEditDialogOpen(false)}
            startIcon={<CancelIcon />}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleEditSave}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={updateMutation.isLoading}
          >
            {updateMutation.isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>
          Confirmar Eliminación
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta acción no se puede deshacer.
          </Alert>
          <Typography>
            ¿Estás seguro de que deseas eliminar al alumno{' '}
            <strong>
              {selectedAlumno?.nombre} {selectedAlumno?.apellido}
            </strong>{' '}
            con cédula <strong>{selectedAlumno?.cedula}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            startIcon={<CancelIcon />}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            disabled={deleteMutation.isLoading}
          >
            {deleteMutation.isLoading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}