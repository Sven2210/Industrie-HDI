import { createTheme, alpha } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#00612C',
      light: '#3D8B5F',
      dark: '#004A21',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#3D8B5F',
      light: '#7BC9A0',
      dark: '#2E7D52',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F1F5F9',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
    },
    success: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
    },
    warning: {
      main: '#F59E0B',
      light: '#FCD34D',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444',
      dark: '#DC2626',
    },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", "Segoe UI", sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-0.03em' },
    h5: { fontWeight: 700, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.55 },
    button: { fontWeight: 700, letterSpacing: '-0.01em' },
  },
  shape: { borderRadius: 10 },
  shadows: [
    'none',
    '0 1px 2px rgba(15,23,42,0.06)',
    '0 2px 6px rgba(15,23,42,0.08)',
    '0 4px 12px rgba(15,23,42,0.10)',
    '0 8px 24px rgba(15,23,42,0.12)',
    '0 16px 40px rgba(15,23,42,0.14)',
    ...Array(19).fill('none'),
  ] as any,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E1 transparent',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          borderRadius: 8,
          padding: '10px 22px',
          fontSize: '0.875rem',
        },
        contained: {
          background: 'linear-gradient(135deg, #00612C 0%, #004A21 100%)',
          boxShadow: '0 2px 8px rgba(0,97,44,0.35)',
          '&:hover': {
            background: 'linear-gradient(135deg, #3D8B5F 0%, #00612C 100%)',
            boxShadow: '0 4px 16px rgba(0,97,44,0.45)',
          },
          '&:disabled': {
            background: '#E2E8F0',
            boxShadow: 'none',
          },
        },
        outlined: {
          borderColor: '#E2E8F0',
          color: '#475569',
          '&:hover': {
            borderColor: '#00612C',
            color: '#00612C',
            bgcolor: alpha('#00612C', 0.04),
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#FFFFFF',
            fontSize: '0.875rem',
            fontWeight: 500,
            transition: 'box-shadow 0.15s, border-color 0.15s',
            '& fieldset': { borderColor: '#E2E8F0', borderWidth: '1.5px' },
            '&:hover fieldset': { borderColor: '#94A3B8' },
            '&.Mui-focused fieldset': {
              borderColor: '#00612C',
              borderWidth: '2px',
            },
            '&.Mui-focused': {
              boxShadow: '0 0 0 3px rgba(0,97,44,0.12)',
            },
          },
          '& .MuiInputLabel-root': {
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#64748B',
            '&.Mui-focused': { color: '#00612C' },
          },
          '& .MuiFormHelperText-root': {
            marginLeft: 0,
            fontSize: '0.72rem',
            color: '#94A3B8',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        outlined: {
          borderRadius: 8,
          backgroundColor: '#FFFFFF',
          fontSize: '0.875rem',
          fontWeight: 500,
        },
      },
    },
    MuiInputAdornment: {
      styleOverrides: {
        root: {
          color: '#94A3B8',
          fontSize: '0.8rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: '0 2px 12px rgba(15,23,42,0.08)',
          border: '1px solid #F1F5F9',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.72rem',
          borderRadius: 6,
        },
        colorSuccess: {
          backgroundColor: alpha('#10B981', 0.12),
          color: '#059669',
        },
        colorWarning: {
          backgroundColor: alpha('#F59E0B', 0.12),
          color: '#D97706',
        },
        colorPrimary: {
          backgroundColor: alpha('#00612C', 0.1),
          color: '#004A21',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: '0.8rem',
          fontWeight: 500,
          border: '1px solid',
        },
        colorSuccess: {
          backgroundColor: alpha('#10B981', 0.08),
          borderColor: alpha('#10B981', 0.2),
          color: '#065F46',
          '& .MuiAlert-icon': { color: '#10B981' },
        },
        colorWarning: {
          backgroundColor: alpha('#F59E0B', 0.08),
          borderColor: alpha('#F59E0B', 0.2),
          color: '#92400E',
          '& .MuiAlert-icon': { color: '#F59E0B' },
        },
        colorInfo: {
          backgroundColor: alpha('#00612C', 0.06),
          borderColor: alpha('#00612C', 0.15),
          color: '#1E3A8A',
          '& .MuiAlert-icon': { color: '#00612C' },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { padding: 6 },
        track: { borderRadius: 10, backgroundColor: '#CBD5E1' },
        thumb: { boxShadow: '0 1px 4px rgba(0,0,0,0.15)' },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#0F172A',
          fontSize: '0.75rem',
          borderRadius: 6,
          padding: '6px 10px',
          fontWeight: 500,
        },
        arrow: { color: '#0F172A' },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#F1F5F9' },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: '#E2E8F0' },
        bar: {
          borderRadius: 4,
          background: 'linear-gradient(90deg, #00612C, #3D8B5F)',
        },
      },
    },
  },
});

export default theme;
