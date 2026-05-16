import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Architecture } from '../models/architecte';
import { Projet } from '../models/Projet';
import { Modelisation_2D } from '../models/Modelisation_2D';
import { Modelisation_3D } from '../models/Modelistaion_3D';

export interface ProjetCreationRequest {
  nomProjet: string;
  description: string;
  dateCreation: string;
  emailArchitecte?: string | null;
}

export interface ElementPlanCreationRequest {
  longueur: number;
  epaisseur: number;
  type: string;
  hauteur: number;
  positionX: number;
  positionY: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

export interface Modelisation2DCreationRequest {
  nomModele: string;
  objet: string;
  elements: ElementPlanCreationRequest[];
}

export interface Modelisation3DCreationRequest {
  nomModel: string;
  format: string;
  url_model: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProjetService {
  private readonly apiBaseUrl = '/api/v1/projects';

  constructor(private readonly http: HttpClient) {}

  creerProjet(payload: ProjetCreationRequest): Observable<Projet> {
    return this.http.post<Projet>(this.apiBaseUrl, payload);
  }

  listerMesProjets(): Observable<Projet[]> {
    return this.http.get<Projet[]>(this.apiBaseUrl);
  }

  ajouterEsquisse(idProjet: number, fichier: Blob): Observable<Architecture> {
    const formData = new FormData();
    formData.append('file', fichier, `esquisse-projet-${idProjet}.png`);

    return this.http.post<Architecture>(`${this.apiBaseUrl}/${idProjet}/sketches`, formData);
  }

  listerEsquisses(idProjet: number): Observable<Architecture[]> {
    return this.http.get<Architecture[]>(`${this.apiBaseUrl}/${idProjet}/sketches`);
  }

  telechargerEsquisse(idProjet: number, idArchitecture: number): Observable<Blob> {
    return this.http.get(`${this.apiBaseUrl}/${idProjet}/sketches/${idArchitecture}`, {
      responseType: 'blob',
    });
  }

  creerModelisation2D(
    idProjet: number,
    payload: Modelisation2DCreationRequest
  ): Observable<Modelisation_2D> {
    return this.http.post<Modelisation_2D>(`${this.apiBaseUrl}/${idProjet}/models-2d`, payload);
  }

  listerModelisations2D(idProjet: number): Observable<Modelisation_2D[]> {
    return this.http.get<Modelisation_2D[]>(`${this.apiBaseUrl}/${idProjet}/models-2d`);
  }

  sauvegarderModelisation3D(
    idProjet: number,
    idModelisation2D: number,
    payload: Modelisation3DCreationRequest
  ): Observable<Modelisation_3D> {
    return this.http.post<Modelisation_3D>(
      `${this.apiBaseUrl}/${idProjet}/models-2d/${idModelisation2D}/models-3d`,
      payload
    );
  }

  obtenirModelisation3D(idProjet: number, idModelisation2D: number): Observable<Modelisation_3D> {
    return this.http.get<Modelisation_3D>(
      `${this.apiBaseUrl}/${idProjet}/models-2d/${idModelisation2D}/models-3d`
    );
  }
}
