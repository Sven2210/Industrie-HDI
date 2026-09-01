import type { VorgangStatus } from '../types/antrag';

export const STATUS_CONFIG: Record<VorgangStatus, {
  label: string;
  color: 'success' | 'warning' | 'error' | 'default' | 'info';
  bg: string;
  text: string;
  border: string;
}> = {
  aktiv: { label: 'Aktiv', color: 'success', bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  'rückmeldung benötigt': { label: 'Rückmeldung benötigt', color: 'info', bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  'freigabe angefordert': { label: 'Freigabe angefordert', color: 'info', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  'in Prüfung': { label: 'In Prüfung', color: 'warning', bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  abgelehnt: { label: 'Abgelehnt', color: 'error', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  entwurf: { label: 'Entwurf', color: 'default', bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' },
};
