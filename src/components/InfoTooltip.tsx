import React from 'react';
import { Tooltip, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface InfoTooltipProps {
  text: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ text }) => (
  <Tooltip title={text} arrow placement="top">
    <IconButton size="small" sx={{ ml: 0.5, p: 0.25, color: 'text.secondary', opacity: 0.7 }}>
      <InfoOutlinedIcon sx={{ fontSize: 16 }} />
    </IconButton>
  </Tooltip>
);

export default InfoTooltip;
