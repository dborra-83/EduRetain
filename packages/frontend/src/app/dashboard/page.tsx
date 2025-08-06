'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Skeleton,
  Button,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Warning,
  School,
  Campaign,
  Analytics,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from 'react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import AppLayout from '@/components/Layout/AppLayout';
import { riskColors, statusColors } from '@/lib/theme';
import { useSnackbar } from 'notistack';

interface DashboardData {
  resumen: {
    totalAlumnos: number;
    alumnosActivos: number;
    alumnosEnRiesgo: number;
    tasaRetencion: number;
    porcentajeRiesgoAlto: number;
  };
  distribucionPorRiesgo: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  distribucionPorEstado: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  alertas: {
    alumnosRiesgoCritico: Array<{
      cedula: string;
      nombre: string;
      carreraId: string;
      factoresRiesgo: string[];
      ultimaActividad?: string;
    }>;
  };
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color = 'primary',
  trend 
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  trend?: 'up' | 'down';
}) {
  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h4" component="div" fontWeight="bold">
                {value}
              </Typography>
              {trend && (
                <Box color={trend === 'up' ? 'success.main' : 'error.main'}>
                  {trend === 'up' ? <TrendingUp /> : <TrendingDown />}
                </Box>
              )}
            </Box>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box color={`${color}.main`}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const { data: dashboardData, isLoading, error } = useQuery<DashboardData>(
    ['dashboard', user?.universidadId],
    async () => {
      if (!user?.universidadId) return null;
      
      const response = await apiClient.dashboard.get({
        universidadId: user.universidadId
      });
      
      return response.data.data;
    },
    {
      enabled: !!user?.universidadId,
      onError: (error: any) => {
        console.error('Dashboard error:', error);
        enqueueSnackbar('Error cargando dashboard', { variant: 'error' });
      }
    }
  );

  if (!user) {
    return null; // Will redirect
  }

  if (error) {
    return (
      <AppLayout>
        <Alert severity="error" sx={{ mb: 3 }}>
          Error cargando los datos del dashboard. Por favor, recarga la página.
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Resumen de métricas y estado actual de la universidad
        </Typography>
      </Box>

      {isLoading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" height={40} />
                  <Skeleton variant="text" width="80%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : dashboardData ? (
        <>
          {/* Métricas principales */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Total Alumnos"
                value={dashboardData.resumen.totalAlumnos.toLocaleString()}
                subtitle="Estudiantes registrados"
                icon={<People sx={{ fontSize: 40 }} />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Alumnos Activos"
                value={dashboardData.resumen.alumnosActivos.toLocaleString()}
                subtitle="Estudiantes matriculados"
                icon={<School sx={{ fontSize: 40 }} />}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="En Riesgo"
                value={dashboardData.resumen.alumnosEnRiesgo.toLocaleString()}
                subtitle={`${dashboardData.resumen.porcentajeRiesgoAlto}% del total`}
                icon={<Warning sx={{ fontSize: 40 }} />}
                color="warning"
                trend="down"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Tasa de Retención"
                value={`${dashboardData.resumen.tasaRetencion}%`}
                subtitle="Estudiantes activos"
                icon={<Analytics sx={{ fontSize: 40 }} />}
                color="success"
                trend="up"
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* Distribución por Riesgo */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Distribución por Nivel de Riesgo
                  </Typography>
                  <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dashboardData.distribucionPorRiesgo}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ label, value }) => `${label}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {dashboardData.distribucionPorRiesgo.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Distribución por Estado */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Distribución por Estado de Matrícula
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.distribucionPorEstado}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#1976d2" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Alertas de Riesgo Crítico */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h6">
                      Alertas - Estudiantes en Riesgo Crítico
                    </Typography>
                    <Chip
                      label={`${dashboardData.alertas.alumnosRiesgoCritico.length} casos`}
                      color="error"
                      size="small"
                    />
                  </Box>
                  
                  {dashboardData.alertas.alumnosRiesgoCritico.length > 0 ? (
                    <List>
                      {dashboardData.alertas.alumnosRiesgoCritico.slice(0, 5).map((alumno, index) => (
                        <ListItem key={alumno.cedula} divider={index < 4}>
                          <ListItemIcon>
                            <Warning color="error" />
                          </ListItemIcon>
                          <ListItemText
                            primary={alumno.nombre}
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Cédula: {alumno.cedula} • Carrera: {alumno.carreraId}
                                </Typography>
                                <Box sx={{ mt: 1 }}>
                                  {alumno.factoresRiesgo.slice(0, 3).map((factor, idx) => (
                                    <Chip
                                      key={idx}
                                      label={factor}
                                      size="small"
                                      variant="outlined"
                                      color="warning"
                                      sx={{ mr: 0.5, mb: 0.5 }}
                                    />
                                  ))}
                                </Box>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Alert severity="success">
                      ¡Excelente! No hay estudiantes en riesgo crítico actualmente.
                    </Alert>
                  )}
                  
                  {dashboardData.alertas.alumnosRiesgoCritico.length > 5 && (
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => router.push('/alumnos?riesgo=CRITICO')}
                      >
                        Ver todos los casos críticos
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Acciones Rápidas */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Acciones Rápidas
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<Campaign />}
                      onClick={() => router.push('/campanas/nueva')}
                      fullWidth
                    >
                      Nueva Campaña
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<People />}
                      onClick={() => router.push('/alumnos')}
                      fullWidth
                    >
                      Gestionar Alumnos
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Analytics />}
                      onClick={() => router.push('/analitica')}
                      fullWidth
                    >
                      Ver Analítica
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      ) : null}
    </AppLayout>
  );
}

export default DashboardPage;