import type { Projet } from './Projet';

export interface Validation {
  commentaire: string;
  statut: boolean;
  dateValidation: string;
  projet?: Projet | null;
}
