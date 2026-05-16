import type { LigneEstimation } from './LigneEstimation';
import type { Modelisation_2D } from './Modelisation_2D';

export interface Estimation {
  id: number;
  couts: number;
  dateEstimation: string;
  lignes: LigneEstimation[];
  idModelisation2D?: number | null;
  modelisation2D?: Modelisation_2D | null;
}
