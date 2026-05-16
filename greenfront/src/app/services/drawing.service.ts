/**
 * Service de gestion du dessin 2D
 * Gère la création, modification et suppression des éléments
 */
import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { BehaviorSubject } from 'rxjs';
import { DrawingElement, ElementType, Room, Project, Measurement, Floor } from '../models/drawing-element';

@Injectable({
  providedIn: 'root'
})
export class DrawingService {

  private elementsSubject = new BehaviorSubject<DrawingElement[]>([]);
  private roomsSubject = new BehaviorSubject<Room[]>([]);
  private measurementsSubject = new BehaviorSubject<Measurement[]>([]);
  private floorsSubject = new BehaviorSubject<Floor[]>([]);
  private currentFloorIdSubject = new BehaviorSubject<string>('');

  public elements$ = this.elementsSubject.asObservable();
  public rooms$ = this.roomsSubject.asObservable();
  public measurements$ = this.measurementsSubject.asObservable();
  public floors$ = this.floorsSubject.asObservable();
  public currentFloorId$ = this.currentFloorIdSubject.asObservable();

  private scale: number = 50; // pixels par mètre par défaut (standardisé)
  private defaultThickness: number = 0.2; // 20cm de murs par défaut

  // Couleurs des éléments
  private elementColors: Record<string, string> = {
    wall: '#1e293b', // Slate 800, visible sur le canvas clair
    door: '#fbbf24', // Amber 400
    window: '#38bdf8', // Sky 400
    toilet: '#a78bfa', // Violet 400
    bathtub: '#818cf8', // Indigo 400
    room: '#dcfce7',
    'room-label': '#f8fafc',
    line: '#94a3b8', // Slate 400
    rectangle: '#334155', // Plus sombre pour les zones
    polygon: '#334155',
    arc: '#94a3b8',
    furniture: '#fb7185', // Rose 400
    label: '#f8fafc',
    dimension: '#38bdf8'
  };

  // Tailles par défaut
  private defaultSizes: Record<string, { width: number; height: number }> = {
    wall: { width: 150, height: 0 },
    door: { width: 40, height: 10 },
    window: { width: 60, height: 8 },
    toilet: { width: 30, height: 30 },
    bathtub: { width: 70, height: 40 },
    room: { width: 100, height: 100 },
    'room-label': { width: 100, height: 30 },
    line: { width: 100, height: 2 },
    rectangle: { width: 100, height: 100 },
    polygon: { width: 100, height: 100 },
    arc: { width: 100, height: 100 },
    furniture: { width: 80, height: 80 },
    label: { width: 120, height: 40 },
    dimension: { width: 100, height: 20 }
  };

  constructor() {
    this.initializeDefaultFloor();
  }

  private initializeDefaultFloor(): void {
    const defaultFloor: Floor = {
      id: uuidv4(),
      name: 'Rez-de-chaussée',
      level: 0,
      height: 2.8,
      elevation: 0
    };
    this.floorsSubject.next([defaultFloor]);
    this.currentFloorIdSubject.next(defaultFloor.id);
  }

  /**
   * Créer un élément
   */
  createElement(type: ElementType, x: number, y: number, label?: string, furnitureType?: any): DrawingElement {
    const sizes = this.defaultSizes[type] || { width: 100, height: 100 };

    const element: DrawingElement = {
      id: uuidv4(),
      type,
      furnitureType,
      x,
      y,
      width: sizes.width,
      height: sizes.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      color: this.elementColors[type] || '#000000',
      label: label || `${type}_${Date.now()}`,
      thickness: type === 'wall' ? this.defaultThickness : undefined,
      material: this.getMaterialForType(type),
      dimensions: this.calculateDimensions(type, sizes.width, sizes.height),
      points: (type === 'line' || type === 'polygon') ? [0, 0, 100, 0] : undefined,
      layer: type === 'wall' ? 'murs' : type === 'furniture' ? 'mobilier' : 'murs',
      floorId: this.currentFloorIdSubject.value
    };

    return element;
  }

  /**
   * Obtenir le matériau selon le type
   */
  private getMaterialForType(type: ElementType): string {
    const materials: Record<string, string> = {
      wall: 'béton',
      door: 'bois',
      window: 'aluminium',
      toilet: 'céramique',
      bathtub: 'acrylique',
      room: 'zone',
      line: 'métal',
      rectangle: 'zone',
      furniture: 'bois/tissu',
      label: 'texte'
    };
    return materials[type] || 'matériau générique';
  }

  /**
   * Calculer les dimensions réelles en mètres
   */
  private calculateDimensions(type: ElementType, widthPx: number, heightPx: number) {
    if (type === 'wall') {
      return {
        width: widthPx / this.scale,
        height: 3,
        depth: this.defaultThickness
      };
    }

    return {
      width: widthPx / this.scale,
      height: heightPx / this.scale,
      depth: 0.1
    };
  }

  /**
   * Ajouter un élément
   */
  addElement(element: DrawingElement): void {
    const current = this.elementsSubject.value;
    this.elementsSubject.next([...current, element]);
  }

  /**
   * Mettre à jour un élément
   */
  updateElement(id: string, updates: Partial<DrawingElement>): void {
    const current = this.elementsSubject.value;
    const updated = current.map(el => el.id === id ? { ...el, ...updates } : el);
    this.elementsSubject.next(updated);
  }

  /**
   * Supprimer un élément
   */
  deleteElement(id: string): void {
    const current = this.elementsSubject.value;
    this.elementsSubject.next(current.filter(el => el.id !== id));
  }

  /**
   * Obtenir tous les éléments
   */
  getElements(): DrawingElement[] {
    return this.elementsSubject.value;
  }

  /**
   * Restaurer les éléments (pour undo/redo)
   */
  restoreElements(elements: DrawingElement[]): void {
    this.elementsSubject.next([...elements]);
  }

  /**
   * Créer une pièce
   */
  createRoom(name: string, color: string, wallIds: string[]): Room {
    const room: Room = {
      id: uuidv4(),
      name,
      color,
      area: this.calculateRoomArea(wallIds),
      perimeter: this.calculateRoomPerimeter(wallIds),
      floorId: this.currentFloorIdSubject.value,
      walls: wallIds,
      doors: [],
      windows: [],
      elements: []
    };
    return room;
  }

  /**
   * Calculer la surface d'une pièce
   */
  private calculateRoomArea(wallIds: string[]): number {
    const elements = this.elementsSubject.value;
    const walls = elements.filter(e => wallIds.includes(e.id) && e.type === 'wall');

    if (walls.length < 2) return 0;

    // Estimation simple basée sur les dimensions des murs
    const avgLength = walls.reduce((sum, w) => sum + (w.width * w.scaleX) / this.scale, 0) / walls.length;
    const avgHeight = walls.reduce((sum, w) => sum + (w.height * w.scaleY) / this.scale, 0) / walls.length;

    return Math.round(avgLength * avgHeight * 100) / 100;
  }

  /**
   * Calculer le périmètre d'une pièce
   */
  private calculateRoomPerimeter(wallIds: string[]): number {
    const elements = this.elementsSubject.value;
    const walls = elements.filter(e => wallIds.includes(e.id) && e.type === 'wall');

    return walls.reduce((sum, w) => sum + (w.width * w.scaleX) / this.scale, 0);
  }

  /**
   * Ajouter une pièce
   */
  addRoom(room: Room): void {
    const current = this.roomsSubject.value;
    this.roomsSubject.next([...current, room]);
  }

  /**
   * Obtenir toutes les pièces
   */
  getRooms(): Room[] {
    return this.roomsSubject.value;
  }

  /**
   * Ajouter une mesure d'affichage
   */
  addMeasurement(measurement: Measurement): void {
    const current = this.measurementsSubject.value;
    this.measurementsSubject.next([...current, measurement]);
  }

  /**
   * Obtenir toutes les mesures
   */
  getMeasurements(): Measurement[] {
    return this.measurementsSubject.value;
  }

  /**
   * Effacer toutes les mesures
   */
  clearMeasurements(): void {
    this.measurementsSubject.next([]);
  }


  /**
   * Gestion des Étages
   */
  getFloors(): Floor[] {
    return this.floorsSubject.value;
  }

  addFloor(): Floor {
    const currentFloors = this.floorsSubject.value;
    const lastFloor = currentFloors[currentFloors.length - 1];
    const newFloor: Floor = {
      id: uuidv4(),
      name: `Étage ${currentFloors.length}`,
      level: currentFloors.length,
      height: 2.8,
      elevation: lastFloor ? lastFloor.elevation + lastFloor.height : 2.8
    };
    this.floorsSubject.next([...currentFloors, newFloor]);
    return newFloor;
  }

  setCurrentFloor(floorId: string): void {
    this.currentFloorIdSubject.next(floorId);
  }

  getCurrentFloorId(): string {
    return this.currentFloorIdSubject.value;
  }

  /**
   * Exporter le projet en JSON complet
   */
  exportProject(projectName: string = 'Projet'): Project {
    const elements = this.elementsSubject.value;
    const rooms = this.roomsSubject.value;
    const floors = this.floorsSubject.value;

    return {
      id: uuidv4(),
      name: projectName,
      description: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      floors: floors,
      elements: elements,
      rooms: rooms,
      scale: this.scale,
      totalArea: rooms.reduce((sum, r) => sum + r.area, 0),
      currentFloorId: this.currentFloorIdSubject.value
    };
  }

  /**
   * Exporter le projet en JSON
   */
  exportProjectJSON(project: Project): string {
    return JSON.stringify(project, null, 2);
  }

  /**
   * Importer un projet depuis JSON
   */
  importProjectJSON(jsonString: string): Project {
    const project = JSON.parse(jsonString);
    if (project.floors && project.floors.length > 0) {
      this.floorsSubject.next(project.floors);
      this.currentFloorIdSubject.next(project.currentFloorId || project.floors[0].id);
    }
    if (project.elements) {
      this.elementsSubject.next(project.elements);
    }
    if (project.rooms) {
      this.roomsSubject.next(project.rooms);
    }
    return project;
  }

  /**
   * Réinitialiser le dessin
   */
  clear(): void {
    this.elementsSubject.next([]);
    this.roomsSubject.next([]);
    this.measurementsSubject.next([]);
    this.initializeDefaultFloor();
  }

  /**
   * Obtenir l'échelle actuelle
   */
  getScale(): number {
    return this.scale;
  }

  /**
   * Définir l'échelle
   */
  setScale(scale: number): void {
    this.scale = scale;
  }

  /**
   * Exporter au format Spline (JSON)
   */
  exportSplineJSON(project: Project): string {
    return JSON.stringify(project);
  }
}
