/**
 * Modèle complet pour les éléments de dessin 2D
 * Compatible avec Spline et les calculs de matériaux
 */

export type ElementType = 
  | 'wall' | 'door' | 'window' | 'room' | 'line' | 'rectangle' | 'polygon' | 'arc' 
  | 'furniture' | 'label' | 'dimension' | 'room-label';

export type FurnitureType = 'bed' | 'table' | 'chair' | 'toilet' | 'bathtub' | 'sofa' | 'kitchen-sink';

export interface DrawingElement {
  id: string;
  type: ElementType;
  furnitureType?: FurnitureType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  color: string;
  points?: number[]; // Pour les polygones et lignes
  radius?: number; // Pour les arcs
  name?: string;
  label?: string;
  thickness?: number; // Pour les murs (ex: 0.15m)
  material?: string; // Type de matériau (béton, bois, verre)
  layer?: 'murs' | 'plomberie' | 'electricite' | 'mobilier';
  floorId: string; // ID de l'étage auquel appartient l'élément
  properties?: {
    material?: string;
    thickness?: number;
    color?: string;
    openingDirection?: 'inside' | 'outside' | 'left' | 'right';
  };
  dimensions?: {
    width: number; // en mètres
    height: number;
    depth: number;
  };
}

export interface Room {
  id: string;
  name: string;
  color: string;
  area: number; // m²
  perimeter: number; // m
  floorId: string;
  walls: string[]; // IDs des murs
  doors: string[];
  windows: string[];
  elements: string[]; // Toilettes, baignoires, etc.
}

export interface Floor {
  id: string;
  name: string;
  level: number; // 0 pour RDC, 1 pour étage 1...
  height: number; // Hauteur sous plafond (m)
  elevation: number; // Altitude de départ par rapport au sol (m)
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  floors: Floor[]; // Liste des étages
  elements: DrawingElement[];
  rooms: Room[];
  scale: number; // pixels par mètre (ex: 50)
  totalArea: number; // m²
  materials?: MaterialCalculation;
  preview2D?: string;
  currentFloorId: string; // Étage actuellement édité
  dimensions?: {
    width: number;
    length: number;
    height: number;
  };
}

export interface MaterialCalculation {
  concrete: number; // m³
  wood: number; // m³
  sand: number; // m³
  gravel: number; // m³
  cement: number; // kg
  totalCost?: number;
}

export interface Measurement {
  elementId: string;
  label: string;
  value: number;
  unit: 'm' | 'cm' | 'm²';
  position: { x: number; y: number };
}
