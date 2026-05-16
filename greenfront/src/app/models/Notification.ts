export interface Notification {
  idNotification: number;
  message: string;
  statut: string;
  typeNotification: string;
  idEmetteur?: string | null;
  nomEmetteur?: string | null;
  idDestinataire?: string | null;
  nomDestinataire?: string | null;
  emailDestinataire?: string | null;
  idProjet?: number | null;
  nomProjet?: string | null;
  tokenInvitation?: string | null;
  dateEnvoie: string;
  dateReponse?: string | null;
}
