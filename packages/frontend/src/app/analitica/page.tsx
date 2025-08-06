'use client';

import React from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import AppLayout from '@/components/Layout/AppLayout';

export default function AnaliticaPage() {
  return (
    <AppLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Analítica y Predicciones
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Análisis predictivo basado en IA para identificar estudiantes en riesgo
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">Tasa de Retención</Typography>
              </Box>
              <Typography variant="h3">0%</Typography>
              <LinearProgress 
                variant="determinate" 
                value={0} 
                sx={{ mt: 2, height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon sx={{ mr: 2, color: 'error.main' }} />
                <Typography variant="h6">Riesgo Crítico</Typography>
              </Box>
              <Typography variant="h3">0</Typography>
              <Typography variant="body2" color="text.secondary">
                Estudiantes
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon sx={{ mr: 2, color: 'warning.main' }} />
                <Typography variant="h6">Riesgo Alto</Typography>
              </Box>
              <Typography variant="h3">0</Typography>
              <Typography variant="body2" color="text.secondary">
                Estudiantes
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircleIcon sx={{ mr: 2, color: 'success.main' }} />
                <Typography variant="h6">Riesgo Bajo</Typography>
              </Box>
              <Typography variant="h3">0</Typography>
              <Typography variant="body2" color="text.secondary">
                Estudiantes
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Predicciones con IA
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                <Chip label="Amazon Bedrock" color="primary" variant="outlined" />
                <Chip label="Claude 3.5 Sonnet" color="secondary" variant="outlined" />
                <Chip label="Machine Learning" variant="outlined" />
              </Box>

              <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 8 }}>
                El sistema de predicción con IA está siendo entrenado.
                <br />
                Esta funcionalidad estará disponible próximamente.
                <br /><br />
                Importa datos de estudiantes para comenzar a generar predicciones.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AppLayout>
  );
}