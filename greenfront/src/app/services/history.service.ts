/**
 * Service de gestion d'historique pour undo/redo
 */
import { Injectable } from '@angular/core';
import { DrawingElement, Room, Project } from '../models/drawing-element';

interface HistoryState {
  elements: DrawingElement[];
  rooms: Room[];
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private history: HistoryState[] = [];
  private currentIndex: number = -1;
  private maxHistory: number = 50; // Limiter à 50 actions

  constructor() {}

  /**
   * Ajouter une action à l'historique
   */
  addState(elements: DrawingElement[], rooms: Room[]): void {
    // Supprimer tous les états après l'index actuel
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Ajouter le nouvel état
    this.history.push({
      elements: JSON.parse(JSON.stringify(elements)),
      rooms: JSON.parse(JSON.stringify(rooms)),
      timestamp: Date.now()
    });

    // Limiter l'historique
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  /**
   * Annuler l'action précédente
   */
  undo(): HistoryState | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.history[this.currentIndex];
    }
    return null;
  }

  /**
   * Refaire l'action annulée
   */
  redo(): HistoryState | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    }
    return null;
  }

  /**
   * Vérifier si on peut annuler
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Vérifier si on peut refaire
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Réinitialiser l'historique
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * Obtenir l'état actuel de l'historique
   */
  getCurrentState(): HistoryState | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex];
    }
    return null;
  }
}
