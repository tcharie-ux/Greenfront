import type { ElementPlan } from './ElementPlan';
import type { Estimation } from './Estimation';
import type { Projet } from './Projet';
import type { Modelisation_3D } from './Modelistaion_3D';

export interface Modelisation_2D {
  id: number;
  nomModele: string;
  dateCeation: string;
  objet: string;
  idProjet?: number | null;
  projet?: Projet | null;
  elements: ElementPlan[];
  modelisation3D?: Modelisation_3D | null;
  estimations: Estimation[];
}
