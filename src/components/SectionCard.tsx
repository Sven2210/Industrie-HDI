import React from 'react';
import { Box, Typography } from '@mui/material';

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accent?: boolean;
}

const SectionCard: React.FC<SectionCardProps> = ({ icon, title, subtitle, children, accent }) => (
  <Box
    sx={{
      p: 3,
      mb: 2.5,
      borderRadius: 3,
      bgcolor: '#FFFFFF',
      border: '1px solid',
      borderColor: accent ? '#DBEAFE' : '#F1F5F9',
      boxShadow: accent
        ? '0 2px 16px rgba(37,99,235,0.08)'
        : '0 1px 4px rgba(15,23,42,0.05)',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2.5 }}>
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: 2,
          background: accent
            ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'
            : '#F8FAFC',
          border: accent ? 'none' : '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent ? 'white' : '#64748B',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.9rem',
            color: '#0F172A',
            lineHeight: 1.3,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            sx={{ fontSize: '0.75rem', color: '#94A3B8', mt: 0.2, fontWeight: 500 }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
    {children}
  </Box>
);

export default SectionCard;
