export interface Architecture {
  id: number;
  fileName: string;
  fileType: string;
  taille: number;
  dateDepot: string;
  idAuteur?: string | null;
  nomAuteur?: string | null;
}

export type architecte = Architecture;
