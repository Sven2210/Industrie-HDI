export type UserRolle = 'nutzer' | 'admin' | 'spezialist';

export interface AppUser {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  rolle: UserRolle;
  kuerzel: string;
}

export const ROLLE_LABELS: Record<UserRolle, string> = {
  nutzer: 'Nutzer',
  admin: 'Admin',
  spezialist: 'Spezialist',
};
