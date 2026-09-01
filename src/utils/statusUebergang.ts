import type { AntragData, VorgangStatus } from '../types/antrag';
import type { AppUser, UserRolle } from '../types/user';
import { istEigenerVorgang } from './berechtigung';

export interface StatusUebergang {
  ziel: VorgangStatus;
  label: string;
  erlaubtFuer: UserRolle[] | 'eigentuemer-oder-admin';
}

export const STATUS_UEBERGAENGE: Record<VorgangStatus, StatusUebergang[]> = {
  entwurf: [
    { ziel: 'in Prüfung', label: 'Zur Prüfung einreichen', erlaubtFuer: 'eigentuemer-oder-admin' },
  ],
  'in Prüfung': [
    { ziel: 'aktiv', label: 'Angebot erstellen', erlaubtFuer: 'eigentuemer-oder-admin' },
    { ziel: 'rückmeldung benötigt', label: 'Rückmeldung anfordern', erlaubtFuer: 'eigentuemer-oder-admin' },
    { ziel: 'abgelehnt', label: 'Ablehnen', erlaubtFuer: 'eigentuemer-oder-admin' },
    { ziel: 'entwurf', label: 'Zur Überarbeitung zurückweisen', erlaubtFuer: 'eigentuemer-oder-admin' },
  ],
  'rückmeldung benötigt': [
    { ziel: 'in Prüfung', label: 'Rückmeldung eingereicht — erneut prüfen', erlaubtFuer: 'eigentuemer-oder-admin' },
    { ziel: 'entwurf', label: 'Zur Überarbeitung zurückziehen', erlaubtFuer: 'eigentuemer-oder-admin' },
  ],
  'freigabe angefordert': [
    { ziel: 'in Prüfung', label: 'Freigabe erteilt — zurück zur Prüfung', erlaubtFuer: ['spezialist', 'admin'] },
    { ziel: 'entwurf', label: 'Zur Überarbeitung zurückziehen', erlaubtFuer: 'eigentuemer-oder-admin' },
  ],
  abgelehnt: [
    { ziel: 'entwurf', label: 'Wiedereröffnen', erlaubtFuer: 'eigentuemer-oder-admin' },
  ],
  aktiv: [
    { ziel: 'in Prüfung', label: 'Angebot zurückziehen', erlaubtFuer: 'eigentuemer-oder-admin' },
  ],
};

export function verfuegbareUebergaenge(vorgang: AntragData, user: AppUser): StatusUebergang[] {
  const kandidaten = STATUS_UEBERGAENGE[vorgang.status] ?? [];
  return kandidaten.filter((u) => {
    if (u.erlaubtFuer === 'eigentuemer-oder-admin') {
      return user.rolle === 'admin' || istEigenerVorgang(user, vorgang);
    }
    return u.erlaubtFuer.includes(user.rolle);
  });
}
