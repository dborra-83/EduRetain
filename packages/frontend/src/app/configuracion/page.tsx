'use client';

import React from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Divider,
  Switch,
  FormControlLabel,
  Grid,
} from '@mui/material';
import {
  Save as SaveIcon,
  Business as BusinessIcon,
  Palette as PaletteIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import AppLayout from '@/components/Layout/AppLayout';

export default function ConfiguracionPage() {
  return (
    <AppLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Configuración
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Administra la configuración de tu institución
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <BusinessIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">Información de la Universidad</Typography>
              </Box>
              
              <TextField
                fullWidth
                label="Nombre de la Universidad"
                defaultValue="Universidad Demo"
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Código"
                defaultValue="UNI001"
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Email de Contacto"
                type="email"
                defaultValue="admin@eduretain.com"
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Teléfono"
                defaultValue="+1234567890"
                sx={{ mb: 2 }}
              />
              
              <Button variant="contained" startIcon={<SaveIcon />}>
                Guardar Cambios
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PaletteIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">Personalización</Typography>
              </Box>
              
              <TextField
                fullWidth
                label="Color Primario"
                type="color"
                defaultValue="#1976d2"
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="URL del Logo"
                placeholder="https://ejemplo.com/logo.png"
                sx={{ mb: 2 }}
              />
              
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Tema Oscuro Disponible"
                sx={{ mb: 2 }}
              />
              
              <Button variant="contained" startIcon={<SaveIcon />}>
                Guardar Cambios
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">Configuración de Email</Typography>
              </Box>
              
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Emails de Bienvenida"
                sx={{ mb: 1 }}
              />
              
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Alertas de Riesgo"
                sx={{ mb: 1 }}
              />
              
              <FormControlLabel
                control={<Switch />}
                label="Resumen Semanal"
                sx={{ mb: 1 }}
              />
              
              <FormControlLabel
                control={<Switch />}
                label="Resumen Mensual"
                sx={{ mb: 2 }}
              />
              
              <Button variant="contained" startIcon={<SaveIcon />}>
                Guardar Preferencias
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SecurityIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">Seguridad</Typography>
              </Box>
              
              <FormControlLabel
                control={<Switch />}
                label="Autenticación de Dos Factores"
                sx={{ mb: 1 }}
              />
              
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Expiración de Sesión (30 min)"
                sx={{ mb: 1 }}
              />
              
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Logs de Auditoría"
                sx={{ mb: 2 }}
              />
              
              <Button variant="contained" startIcon={<SaveIcon />}>
                Actualizar Seguridad
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AppLayout>
  );
}