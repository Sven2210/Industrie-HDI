import type { AppUser } from '../types/user';

export const MOCK_USERS: AppUser[] = [
  { id: 'u-brandt', vorname: 'Anna', nachname: 'Brandt', email: 'a.brandt@versicherung.de', rolle: 'nutzer', kuerzel: 'AB' },
  { id: 'u-kessler', vorname: 'Stefan', nachname: 'Kessler', email: 's.kessler@versicherung.de', rolle: 'nutzer', kuerzel: 'SK' },
  { id: 'u-lindner', vorname: 'Julia', nachname: 'Lindner', email: 'j.lindner@versicherung.de', rolle: 'nutzer', kuerzel: 'JL' },
  { id: 'u-hartmann', vorname: 'Thomas', nachname: 'Hartmann', email: 't.hartmann@versicherung.de', rolle: 'nutzer', kuerzel: 'TH' },
  { id: 'u-vogt', vorname: 'Karin', nachname: 'Vogt', email: 'k.vogt@versicherung.de', rolle: 'admin', kuerzel: 'KV' },
  { id: 'u-weber', vorname: 'Markus', nachname: 'Weber', email: 'm.weber@versicherung.de', rolle: 'spezialist', kuerzel: 'MW' },
];
