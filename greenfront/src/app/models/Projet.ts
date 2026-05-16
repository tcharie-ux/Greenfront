import type { Architecture } from './architecte';
import type { Modelisation_2D } from './Modelisation_2D';
import type { Validation } from './Validation';

export interface Projet {
  id: number;
  description: string;
  nomProjet: string;
  statut: boolean;
  dateCreation: string;
  validations: Validation[];
  modeles2D: Modelisation_2D[];
  idClient?: string | null;
  nomClient?: string | null;
  idArchitecte?: string | null;
  nomArchitecte?: string | null;
  emailArchitecteInvite?: string | null;
  idNotificationInvitationArchitecte?: number | null;
  tokenInvitationArchitecte?: string | null;
  architectures: Architecture[];
}
