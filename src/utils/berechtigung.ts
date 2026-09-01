import type { AntragData } from '../types/antrag';
import type { AppUser } from '../types/user';

export function istEigenerVorgang(user: AppUser, vorgang: AntragData): boolean {
  return vorgang.underwriter === user.nachname;
}

// Solange eine Freigabe angefordert ist, darf zusätzlich die zuletzt als Empfänger
// eingetragene Person (Spezialist oder Führungskraft) den Vorgang bearbeiten.
export function istZugewiesenerFreigeber(user: AppUser, vorgang: AntragData): boolean {
  if (vorgang.status !== 'freigabe angefordert') return false;
  const eintraege = vorgang.workflow ?? [];
  for (let i = eintraege.length - 1; i >= 0; i--) {
    const eintrag = eintraege[i];
    if (eintrag.typ === 'weiterleitung') return eintrag.empfaengerId === user.id;
  }
  return false;
}

export function kannBearbeiten(user: AppUser, vorgang: AntragData): boolean {
  return user.rolle === 'admin' || istEigenerVorgang(user, vorgang) || istZugewiesenerFreigeber(user, vorgang);
}
