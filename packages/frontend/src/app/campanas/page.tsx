'use client';

import React from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Email as EmailIcon,
  Campaign as CampaignIcon,
} from '@mui/icons-material';
import AppLayout from '@/components/Layout/AppLayout';

export default function CampanasPage() {
  return (
    <AppLayout>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Campañas de Comunicación
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          href="/campanas/nueva"
        >
          Nueva Campaña
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">Emails Enviados</Typography>
              </Box>
              <Typography variant="h3">0</Typography>
              <Typography variant="body2" color="text.secondary">
                Este mes
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CampaignIcon sx={{ mr: 2, color: 'success.main' }} />
                <Typography variant="h6">Campañas Activas</Typography>
              </Box>
              <Typography variant="h3">0</Typography>
              <Typography variant="body2" color="text.secondary">
                En progreso
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EmailIcon sx={{ mr: 2, color: 'warning.main' }} />
                <Typography variant="h6">Tasa de Apertura</Typography>
              </Box>
              <Typography variant="h3">0%</Typography>
              <Typography variant="body2" color="text.secondary">
                Promedio
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Campañas Recientes
              </Typography>
              
              <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 8 }}>
                No hay campañas creadas aún.
                <br />
                Esta funcionalidad estará disponible próximamente.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AppLayout>
  );
}