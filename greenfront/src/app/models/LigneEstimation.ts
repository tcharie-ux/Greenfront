import type { Materiau } from './Materiau';

export interface LigneEstimation {
  id: number;
  quantter: number;
  prixTotal: number;
  lignes: LigneEstimation[];
  materiau?: Materiau | null;
}
