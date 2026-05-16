import type { Projet } from './Projet';

export interface Client {
  id: number;
  adresse: string;
  document: string;
  localiter: string;
  nom?: string | null;
  prenom?: string | null;
  password?: string | null;
  email?: string | null;
  telephone?: number | null;
  role?: number | null;
  projets?: Projet[];
}
