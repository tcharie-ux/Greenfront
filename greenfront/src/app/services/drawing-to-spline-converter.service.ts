import { Injectable } from '@angular/core';
import { DrawingElement, ElementType } from '../models/drawing-element';
import { SplineJsonGeneratorService, BuildingData, BuildingElement } from './spline-json-generator.service';

/**
 * Converts 2D Konva drawing elements to 3D Spline scene format
 * Handles geometry transformation, scaling, and material mapping
 */
@Injectable({
  providedIn: 'root'
})
export class DrawingToSplineConverterService {
  private readonly pixelsPerMeter = 50;

  constructor(private readonly splineGenerator: SplineJsonGeneratorService) {}

  // ... convert2DTo3D reste identique ...

  private transformElements(elements: DrawingElement[], dims: any): BuildingElement[] {
    return elements.map(el => {
      // On utilise la fonction de transformation spécifique pour chaque type
      const transformed = this.transformElement(el, dims);
      // On filtre les nuls (comme les labels de pièces)
      return transformed;
    }).filter(el => el !== null) as BuildingElement[];
  }

  private transformElement(element: DrawingElement, dims: any): BuildingElement | null {
    const x = (element.x || 0) / this.pixelsPerMeter;
    const z = (element.y || 0) / this.pixelsPerMeter; // 2D Y devient 3D Z (sol)
    const width = (element.width || 0) / this.pixelsPerMeter;
    const height = dims.height || 3;

    switch (element.type) {
      case 'wall':
        return this.createWallElement(element, x, z, width, height);
      case 'door':
        return this.createDoorElement(element, x, z, width, height);
      case 'window':
        return this.createWindowElement(element, x, z, width, height);
      case 'toilet' as any: // Ajout du cas toilet
        return this.createGenericElement(element, x, z, width, height, 'toilet');
      case 'room-label' as any:
        return null;
      default:
        return this.createGenericElement(element, x, z, width, height);
    }
  }

  private createWallElement(el: DrawingElement, x: number, z: number, w: number, h: number): BuildingElement {
    return {
      id: el.id,
      name: el.name || `Wall_${el.id}`,
      type: 'wall',
      x: x,
      y: 0, // Position au sol
      z: z,
      width: w,
      height: h,
      depth: 0.2, // Épaisseur du mur
      material: el.properties?.material || 'concrete',
      color: el.color || '#A9A9A9'
    };
  }

  private createDoorElement(el: DrawingElement, x: number, z: number, w: number, h: number): BuildingElement {
    return {
      id: el.id,
      name: el.name || `Door_${el.id}`,
      type: 'door',
      x: x,
      y: 0,
      z: z,
      width: w || 0.9,
      height: 2.1, // Hauteur porte standard
      depth: 0.1,
      material: el.properties?.material || 'wood',
      color: el.color || '#8B4513'
    };
  }

  private createWindowElement(el: DrawingElement, x: number, z: number, w: number, h: number): BuildingElement {
    return {
      id: el.id,
      name: el.name || `Window_${el.id}`,
      type: 'window',
      x: x,
      y: 1.0, // Fenêtre à 1m du sol
      z: z,
      width: w || 1.2,
      height: 1.2,
      depth: 0.1,
      material: el.properties?.material || 'glass',
      color: el.color || '#87CEEB'
    };
  }

  private createGenericElement(el: DrawingElement, x: number, z: number, w: number, h: number, forcedType?: any): BuildingElement {
    return {
      id: el.id,
      name: el.name || `Element_${el.id}`,
      type: forcedType || 'furniture',
      x: x,
      y: 0,
      z: z,
      width: w || 1,
      height: h || 0.8,
      depth: 0.5,
      material: el.properties?.material || 'concrete',
      color: el.color || '#CCCCCC'
    };
  }
  /**
   * Get optimized scene configuration for different viewport sizes
   */
  getOptimizedCameraConfig(width: number, height: number): any {
    const aspect = width / height;

    return {
      fov: 45,
      near: 0.1,
      far: 1000,
      aspect,
      // Adjust camera distance based on viewport
      cameraDistance: Math.max(width, height) / 100,
    };
  }

  /**
   * Convert scene to Blob for download
   */
  sceneToBlob(scene: any): Blob {
    const jsonString = JSON.stringify(scene, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  /**
   * Create data URL from scene for preview
   */
  sceneToDataUrl(scene: any): string {
    const blob = this.sceneToBlob(scene);
    return URL.createObjectURL(blob);
  }
  convert2DTo3D(
    elements: DrawingElement[],
    projectName: string,
    projectDescription: string,
    dimensions: { length: number; width: number; height: number; floors: number }
  ): any {
    // 1. Transformation des éléments
    const building3DElements = this.transformElements(elements, dimensions);

    // 2. Préparation des données pour le générateur Spline
    const buildingData: BuildingData = {
      projectName,
      projectDescription,
      elements: building3DElements,
      baseHeight: dimensions.height || 3,
      floorCount: dimensions.floors || 1,
      includeVegetation: true,
    };

    // 3. Appel au générateur JSON
    return this.splineGenerator.generateSplineScene(buildingData);
  }
}
 
 
