import React from 'react';
import { Box, Button, Typography, Chip, Stack } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import VerifiedIcon from '@mui/icons-material/Verified';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import FactoryIcon from '@mui/icons-material/Factory';

const FEATURES = [
  { icon: <FactoryIcon sx={{ fontSize: 18 }} />, label: 'Feuer & Sach' },
  { icon: <SpeedIcon sx={{ fontSize: 18 }} />, label: 'Betriebsunterbrechung' },
  { icon: <SecurityIcon sx={{ fontSize: 18 }} />, label: 'Einbruch & Elementar' },
  { icon: <VerifiedIcon sx={{ fontSize: 18 }} />, label: 'VdS-zertifiziert' },
];

interface Props {
  onStart: () => void;
}

const LandingPage: React.FC<Props> = ({ onStart }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Background image */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'url(https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          filter: 'brightness(0.45)',
          zIndex: 0,
        }}
      />

      {/* Blue-dark gradient overlay for depth */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, rgba(11,20,38,0.85) 0%, rgba(29,78,216,0.25) 60%, rgba(11,20,38,0.70) 100%)',
          zIndex: 1,
        }}
      />

      {/* Top bar */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 3, md: 6 },
          py: 2.5,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563EB, #06B6D4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FactoryIcon sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
          <Typography
            sx={{
              color: '#fff',
              fontWeight: 800,
              fontSize: '1.05rem',
              letterSpacing: '-0.02em',
            }}
          >
            IndustrieProtect
          </Typography>
        </Box>

        <Chip
          label="Industrieversicherung 2025"
          size="small"
          sx={{
            bgcolor: 'rgba(37,99,235,0.25)',
            color: '#93C5FD',
            border: '1px solid rgba(37,99,235,0.4)',
            fontWeight: 600,
            fontSize: '0.7rem',
          }}
        />
      </Box>

      {/* Hero content */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: { xs: 3, sm: 4, md: 8 },
          py: 8,
        }}
      >
        {/* Eyebrow label */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            bgcolor: 'rgba(37,99,235,0.2)',
            border: '1px solid rgba(37,99,235,0.35)',
            borderRadius: '100px',
            px: 2,
            py: 0.75,
            mb: 3,
          }}
        >
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: '#60A5FA',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.4 },
              },
            }}
          />
          <Typography sx={{ color: '#93C5FD', fontSize: '0.75rem', fontWeight: 700 }}>
            Jetzt Vorschlag anfordern
          </Typography>
        </Box>

        {/* Main headline */}
        <Typography
          variant="h4"
          sx={{
            color: '#fff',
            fontSize: { xs: '2rem', sm: '2.8rem', md: '3.5rem' },
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            maxWidth: 780,
            mb: 2.5,
          }}
        >
          Industrieversicherung,{' '}
          <Box
            component="span"
            sx={{
              background: 'linear-gradient(90deg, #60A5FA, #22D3EE)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            die hält was sie verspricht.
          </Box>
        </Typography>

        {/* Subheading */}
        <Typography
          sx={{
            color: 'rgba(255,255,255,0.65)',
            fontSize: { xs: '1rem', md: '1.15rem' },
            maxWidth: 580,
            lineHeight: 1.6,
            mb: 5,
          }}
        >
          Umfassender Schutz für Ihr Industrieunternehmen — Feuer, Sachschäden,
          Betriebsunterbrechung und Einbruch in einem maßgeschneiderten Paket.
        </Typography>

        {/* Feature chips */}
        <Stack
          direction="row"
          sx={{ mb: 5, gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          {FEATURES.map((f) => (
            <Box
              key={f.label}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                bgcolor: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                px: 1.75,
                py: 0.9,
                backdropFilter: 'blur(8px)',
              }}
            >
              <Box sx={{ color: '#60A5FA', display: 'flex' }}>{f.icon}</Box>
              <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.8rem', fontWeight: 600 }}>
                {f.label}
              </Typography>
            </Box>
          ))}
        </Stack>

        {/* CTA button */}
        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForwardIcon />}
          onClick={onStart}
          sx={{
            fontSize: '1rem',
            fontWeight: 800,
            px: 5,
            py: 1.75,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            boxShadow: '0 8px 32px rgba(37,99,235,0.5)',
            letterSpacing: '-0.01em',
            '&:hover': {
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              boxShadow: '0 12px 40px rgba(37,99,235,0.65)',
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s',
          }}
        >
          Jetzt abschließen
        </Button>

        <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', mt: 2 }}>
          Unverbindlich · Keine Registrierung erforderlich · Dauert ca. 8 Minuten
        </Typography>
      </Box>

      {/* Bottom stats bar */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          bgcolor: 'rgba(11,20,38,0.6)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          justifyContent: 'center',
          gap: { xs: 4, md: 8 },
          flexWrap: 'wrap',
          px: 4,
          py: 2.5,
        }}
      >
        {[
          { value: '2.400+', label: 'Industriebetriebe versichert' },
          { value: '98,3 %', label: 'Kundenzufriedenheit' },
          { value: '< 24 h', label: 'Vorschlagserstellung' },
          { value: 'Seit 1952', label: 'Erfahrung & Verlässlichkeit' },
        ].map((s) => (
          <Box key={s.label} sx={{ textAlign: 'center' }}>
            <Typography
              sx={{ color: '#60A5FA', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}
            >
              {s.value}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', fontWeight: 500, mt: 0.25 }}>
              {s.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default LandingPage;
