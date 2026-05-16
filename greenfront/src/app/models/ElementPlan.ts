import type { Modelisation_2D } from './Modelisation_2D';

export interface ElementPlan {
  id: number;
  longeur: number;
  epaisseur: number;
  type: string;
  hauteur: number;
  position_X: number;
  position_Y: number;
  idModelisation2D?: number | null;
  modelisation2D?: Modelisation_2D | null;
}
