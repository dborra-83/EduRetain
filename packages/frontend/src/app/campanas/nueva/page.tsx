'use client';

import React, { useState } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  FormLabel,
  Grid,
  Divider,
} from '@mui/material';
import {
  Send as SendIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Email as EmailIcon,
  FilterList as FilterListIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/Layout/AppLayout';
import { useSnackbar } from 'notistack';

const steps = ['Información Básica', 'Filtros de Destinatarios', 'Contenido', 'Revisión y Envío'];

const templateOptions = [
  { value: 'welcome', label: 'Bienvenida', description: 'Email de bienvenida para nuevos estudiantes' },
  { value: 'risk-alert', label: 'Alerta de Riesgo', description: 'Notificación sobre riesgo de deserción' },
  { value: 'custom', label: 'Personalizado', description: 'Crea tu propio mensaje' },
];

export default function NuevaCampanaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  const [activeStep, setActiveStep] = useState(0);
  
  // Form data
  const [formData, setFormData] = useState({
    // Paso 1: Información Básica
    nombre: '',
    descripcion: '',
    tipo: 'EMAIL',
    template: 'custom',
    
    // Paso 2: Filtros
    filtros: {
      carreras: [] as string[],
      semestres: [] as number[],
      estadosMatricula: [] as string[],
      riesgosDesercion: [] as string[],
      promedioMinimo: '',
      promedioMaximo: '',
    },
    
    // Paso 3: Contenido
    asunto: '',
    contenido: '',
    envioInmediato: true,
    fechaEnvio: '',
  });

  const handleNext = () => {
    // Validaciones por paso
    if (activeStep === 0) {
      if (!formData.nombre || !formData.template) {
        enqueueSnackbar('Por favor completa todos los campos requeridos', { variant: 'error' });
        return;
      }
    } else if (activeStep === 2) {
      if (!formData.asunto || !formData.contenido) {
        enqueueSnackbar('Por favor completa el asunto y contenido del mensaje', { variant: 'error' });
        return;
      }
    }
    
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSaveDraft = () => {
    enqueueSnackbar('Campaña guardada como borrador', { variant: 'info' });
    // TODO: Implementar guardado en backend
  };

  const handleSend = () => {
    enqueueSnackbar('Campaña enviada exitosamente', { variant: 'success' });
    router.push('/campanas');
    // TODO: Implementar envío en backend
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateFiltros = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      filtros: {
        ...prev.filtros,
        [field]: value,
      },
    }));
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Información de la Campaña
            </Typography>
            
            <TextField
              fullWidth
              label="Nombre de la Campaña"
              value={formData.nombre}
              onChange={(e) => updateFormData('nombre', e.target.value)}
              required
              sx={{ mb: 3 }}
              placeholder="Ej: Campaña de Retención Semestre 2024-1"
            />
            
            <TextField
              fullWidth
              label="Descripción"
              value={formData.descripcion}
              onChange={(e) => updateFormData('descripcion', e.target.value)}
              multiline
              rows={3}
              sx={{ mb: 3 }}
              placeholder="Describe el objetivo de esta campaña..."
            />
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <FormLabel>Plantilla de Mensaje</FormLabel>
              <RadioGroup
                value={formData.template}
                onChange={(e) => updateFormData('template', e.target.value)}
              >
                {templateOptions.map((option) => (
                  <Card key={option.value} sx={{ mb: 1, p: 1 }}>
                    <FormControlLabel
                      value={option.value}
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="subtitle1">{option.label}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {option.description}
                          </Typography>
                        </Box>
                      }
                    />
                  </Card>
                ))}
              </RadioGroup>
            </FormControl>
          </Box>
        );
        
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Filtros de Destinatarios
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Define los criterios para seleccionar a qué estudiantes enviar la campaña.
              Deja los campos vacíos para incluir a todos.
            </Alert>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Carreras</InputLabel>
                  <Select
                    multiple
                    value={formData.filtros.carreras}
                    onChange={(e) => updateFiltros('carreras', e.target.value)}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="INGENIERIA_SISTEMAS">Ingeniería de Sistemas</MenuItem>
                    <MenuItem value="INGENIERIA_INDUSTRIAL">Ingeniería Industrial</MenuItem>
                    <MenuItem value="ADMINISTRACION">Administración de Empresas</MenuItem>
                    <MenuItem value="PSICOLOGIA">Psicología</MenuItem>
                    <MenuItem value="DERECHO">Derecho</MenuItem>
                    <MenuItem value="MEDICINA">Medicina</MenuItem>
                    <MenuItem value="ARQUITECTURA">Arquitectura</MenuItem>
                    <MenuItem value="CONTADURIA">Contaduría Pública</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Semestres</InputLabel>
                  <Select
                    multiple
                    value={formData.filtros.semestres}
                    onChange={(e) => updateFiltros('semestres', e.target.value)}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as number[]).map((value) => (
                          <Chip key={value} label={`Semestre ${value}`} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((sem) => (
                      <MenuItem key={sem} value={sem}>
                        Semestre {sem}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Estados de Matrícula</InputLabel>
                  <Select
                    multiple
                    value={formData.filtros.estadosMatricula}
                    onChange={(e) => updateFiltros('estadosMatricula', e.target.value)}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="ACTIVO">Activo</MenuItem>
                    <MenuItem value="INACTIVO">Inactivo</MenuItem>
                    <MenuItem value="SUSPENDIDO">Suspendido</MenuItem>
                    <MenuItem value="GRADUADO">Graduado</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Niveles de Riesgo</InputLabel>
                  <Select
                    multiple
                    value={formData.filtros.riesgosDesercion}
                    onChange={(e) => updateFiltros('riesgosDesercion', e.target.value)}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => (
                          <Chip 
                            key={value} 
                            label={value} 
                            size="small"
                            color={
                              value === 'CRITICO' ? 'error' :
                              value === 'ALTO' ? 'warning' :
                              value === 'MEDIO' ? 'info' : 'success'
                            }
                          />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="CRITICO">Crítico</MenuItem>
                    <MenuItem value="ALTO">Alto</MenuItem>
                    <MenuItem value="MEDIO">Medio</MenuItem>
                    <MenuItem value="BAJO">Bajo</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Promedio Mínimo"
                  type="number"
                  value={formData.filtros.promedioMinimo}
                  onChange={(e) => updateFiltros('promedioMinimo', e.target.value)}
                  inputProps={{ min: 0, max: 5, step: 0.1 }}
                  placeholder="0.0"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Promedio Máximo"
                  type="number"
                  value={formData.filtros.promedioMaximo}
                  onChange={(e) => updateFiltros('promedioMaximo', e.target.value)}
                  inputProps={{ min: 0, max: 5, step: 0.1 }}
                  placeholder="5.0"
                />
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Destinatarios estimados: <strong>0 estudiantes</strong>
              </Typography>
            </Box>
          </Box>
        );
        
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Contenido del Mensaje
            </Typography>
            
            <TextField
              fullWidth
              label="Asunto del Email"
              value={formData.asunto}
              onChange={(e) => updateFormData('asunto', e.target.value)}
              required
              sx={{ mb: 3 }}
              placeholder="Ej: Importante: Información sobre tu progreso académico"
            />
            
            <TextField
              fullWidth
              label="Contenido del Mensaje"
              value={formData.contenido}
              onChange={(e) => updateFormData('contenido', e.target.value)}
              multiline
              rows={10}
              required
              sx={{ mb: 3 }}
              placeholder="Escribe el contenido de tu mensaje aquí..."
              helperText="Puedes usar variables como {nombre}, {apellido}, {carrera}, {promedio}"
            />
            
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.envioInmediato}
                    onChange={(e) => updateFormData('envioInmediato', e.target.checked)}
                  />
                }
                label="Enviar inmediatamente"
              />
            </Box>
            
            {!formData.envioInmediato && (
              <TextField
                fullWidth
                label="Fecha y Hora de Envío"
                type="datetime-local"
                value={formData.fechaEnvio}
                onChange={(e) => updateFormData('fechaEnvio', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 3 }}
              />
            )}
          </Box>
        );
        
      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Revisión Final
            </Typography>
            
            <Alert severity="warning" sx={{ mb: 3 }}>
              Por favor revisa cuidadosamente la información antes de enviar la campaña.
            </Alert>
            
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Información de la Campaña
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formData.nombre || 'Sin nombre'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formData.descripcion || 'Sin descripción'}
                </Typography>
              </CardContent>
            </Card>
            
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Asunto
                </Typography>
                <Typography variant="body1">
                  {formData.asunto || 'Sin asunto'}
                </Typography>
              </CardContent>
            </Card>
            
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Vista Previa del Mensaje
                </Typography>
                <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                    {formData.contenido || 'Sin contenido'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Configuración de Envío
                </Typography>
                <Typography variant="body2">
                  {formData.envioInmediato 
                    ? 'Se enviará inmediatamente después de confirmar'
                    : `Programado para: ${formData.fechaEnvio || 'No especificado'}`
                  }
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Destinatarios estimados: <strong>0 estudiantes</strong>
                </Typography>
              </CardContent>
            </Card>
          </Box>
        );
        
      default:
        return 'Paso desconocido';
    }
  };

  return (
    <AppLayout>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/campanas')}
          sx={{ mb: 2 }}
        >
          Volver a Campañas
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Nueva Campaña de Comunicación
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Crea y envía mensajes personalizados a tus estudiantes
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          <Box sx={{ minHeight: 400 }}>
            {getStepContent(activeStep)}
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              startIcon={<ArrowBackIcon />}
            >
              Anterior
            </Button>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              {activeStep < steps.length - 1 && (
                <Button
                  variant="outlined"
                  onClick={handleSaveDraft}
                  startIcon={<SaveIcon />}
                >
                  Guardar Borrador
                </Button>
              )}
              
              {activeStep === steps.length - 1 ? (
                <>
                  <Button
                    variant="outlined"
                    onClick={handleSaveDraft}
                    startIcon={<SaveIcon />}
                  >
                    Guardar como Borrador
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSend}
                    startIcon={<SendIcon />}
                    color="primary"
                  >
                    Enviar Campaña
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  endIcon={<ArrowForwardIcon />}
                >
                  Siguiente
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </AppLayout>
  );
}