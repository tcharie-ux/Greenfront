export interface Utilisateur {
  id: string | number | null;
  nom: string;
  prenom: string;
  fullName?: string;
  email: string;
  username?: string;
  role?: string;
  roles?: string[] | string;
  enable?: boolean;
  ministere?: number | null;
  ministereName?: string | null;
  direction?: string | null;
  directionName?: string | null;
}
