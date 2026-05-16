import { Injectable } from '@angular/core';

/**
 * Generates Spline-compatible scene JSON format
 * Based on Spline viewer specifications for 3D rendering
 */
@Injectable({
  providedIn: 'root'
})
export class SplineJsonGeneratorService {
  private readonly SCALE_FACTOR = 1; // 1 unit = 1 meter in 3D

  /**
   * Generate a complete Spline scene from building data
   */
  generateSplineScene(buildingData: BuildingData): SplineScene {
    const scene: SplineScene = {
      format: 'spline-scene-json',
      version: '1.0',
      metadata: {
        name: buildingData.projectName,
        description: buildingData.projectDescription,
        created: new Date().toISOString(),
      },
      scene: {
        children: this.generateSceneObjects(buildingData),
        lights: this.generateLights(buildingData),
        camera: this.generateCamera(buildingData),
        environment: this.generateEnvironment(),
      },
      materials: this.generateMaterials(),
      textures: []
    };

    return scene;
  }

  /**
   * Convert building data to Spline scene objects
   */
  private generateSceneObjects(buildingData: BuildingData): SplineObject[] {
    const objects: SplineObject[] = [];
    const baseHeight = buildingData.baseHeight || 3;
    const floorCount = buildingData.floorCount || 1;

    // Generate floor objects
    for (let floor = 0; floor < floorCount; floor++) {
      const floorElements = this.generateFloorElements(
        buildingData.elements,
        floor,
        baseHeight,
        floorCount
      );
      objects.push(...floorElements);
    }

    // Add roof if applicable
    if (floorCount > 1) {
      objects.push(this.generateRoof(buildingData, floorCount, baseHeight));
    }

    // Add exterior elements
    objects.push(...this.generateExteriorElements(buildingData, floorCount, baseHeight));

    return objects;
  }

  /**
   * Generate elements for a specific floor
   */
  private generateFloorElements(
    elements: BuildingElement[],
    floorIndex: number,
    floorHeight: number,
    totalFloors: number
  ): SplineObject[] {
    const floorObjects: SplineObject[] = [];
    const zOffset = floorIndex * floorHeight;

    // Generate floor surface
    const floorSurface = this.generateFloor(elements, zOffset, floorIndex, totalFloors);
    floorObjects.push(floorSurface);

    // Generate walls, doors, windows for this floor
    for (const element of elements) {
      if (element.type === 'wall') {
        floorObjects.push(this.generateWall(element, zOffset, floorHeight));
      } else if (element.type === 'door') {
        floorObjects.push(this.generateDoor(element, zOffset, floorHeight));
      } else if (element.type === 'window') {
        floorObjects.push(this.generateWindow(element, zOffset, floorHeight));
      } else if (element.type === 'room') {
        // Room is just for organization, don't render separately
      }
    }

    // Add ceiling
    const ceiling = this.generateCeiling(elements, zOffset + floorHeight, floorIndex, totalFloors);
    floorObjects.push(ceiling);

    return floorObjects;
  }

  /**
   * Generate a wall object
   */
  private generateWall(element: BuildingElement, zOffset: number, height: number): SplineObject {
    const wallThickness = 0.2; // 20cm walls
    const elementHeight = element.height || height;

    return {
      id: `wall_${element.id}`,
      name: element.name || `Wall_${element.id}`,
      type: 'mesh',
      position: {
        x: element.x + element.width / 2,
        y: zOffset + elementHeight / 2,
        z: element.y + wallThickness / 2,
      },
      scale: {
        x: element.width,
        y: elementHeight,
        z: wallThickness,
      },
      rotation: { x: 0, y: 0, z: 0 },
      material: 'concrete-wall',
      color: this.getMaterialColor('wall'),
      properties: {
        castShadow: true,
        receiveShadow: true,
        type: 'wall',
        material: element.material || 'concrete',
      }
    };
  }

  /**
   * Generate a door object
   */
  private generateDoor(element: BuildingElement, zOffset: number, floorHeight: number): SplineObject {
    const doorHeight = 2.1; // Standard door height
    const doorThickness = 0.05; // 5cm door

    return {
      id: `door_${element.id}`,
      name: element.name || `Door_${element.id}`,
      type: 'mesh',
      position: {
        x: element.x + element.width / 2,
        y: zOffset + doorHeight / 2,
        z: element.y,
      },
      scale: {
        x: element.width,
        y: doorHeight,
        z: doorThickness,
      },
      rotation: { x: 0, y: 0, z: 0 },
      material: 'door-wood',
      color: this.getMaterialColor('door'),
      properties: {
        castShadow: true,
        receiveShadow: true,
        type: 'door',
        interactive: true,
      }
    };
  }

  /**
   * Generate a window object
   */
  private generateWindow(element: BuildingElement, zOffset: number, floorHeight: number): SplineObject {
    const windowHeight = element.height || 1.2;
    const windowDepth = 0.1;
    const windowSillHeight = 0.9;

    return {
      id: `window_${element.id}`,
      name: element.name || `Window_${element.id}`,
      type: 'mesh',
      position: {
        x: element.x + element.width / 2,
        y: zOffset + windowSillHeight + windowHeight / 2,
        z: element.y,
      },
      scale: {
        x: element.width,
        y: windowHeight,
        z: windowDepth,
      },
      rotation: { x: 0, y: 0, z: 0 },
      material: 'glass-window',
      color: this.getMaterialColor('window'),
      properties: {
        castShadow: false,
        receiveShadow: true,
        type: 'window',
        transparency: 0.7,
      }
    };
  }

  /**
   * Generate floor surface
   */
  private generateFloor(
    elements: BuildingElement[],
    zOffset: number,
    floorIndex: number,
    totalFloors: number
  ): SplineObject {
    const bounds = this.calculateBounds(elements);
    const floorThickness = 0.2;

    return {
      id: `floor_${floorIndex}`,
      name: `Floor_${floorIndex + 1}`,
      type: 'mesh',
      position: {
        x: bounds.centerX,
        y: zOffset - floorThickness / 2,
        z: bounds.centerZ,
      },
      scale: {
        x: bounds.width,
        y: floorThickness,
        z: bounds.depth,
      },
      rotation: { x: 0, y: 0, z: 0 },
      material: 'floor-tile',
      color: this.getMaterialColor('floor'),
      properties: {
        castShadow: true,
        receiveShadow: true,
        type: 'floor',
      }
    };
  }

  /**
   * Generate ceiling surface
   */
  private generateCeiling(
    elements: BuildingElement[],
    yPosition: number,
    floorIndex: number,
    totalFloors: number
  ): SplineObject {
    const bounds = this.calculateBounds(elements);
    const ceilingThickness = 0.2;

    return {
      id: `ceiling_${floorIndex}`,
      name: `Ceiling_${floorIndex + 1}`,
      type: 'mesh',
      position: {
        x: bounds.centerX,
        y: yPosition + ceilingThickness / 2,
        z: bounds.centerZ,
      },
      scale: {
        x: bounds.width,
        y: ceilingThickness,
        z: bounds.depth,
      },
      rotation: { x: 0, y: 0, z: 0 },
      material: 'ceiling-plaster',
      color: this.getMaterialColor('ceiling'),
      properties: {
        castShadow: true,
        receiveShadow: true,
        type: 'ceiling',
      }
    };
  }

  /**
   * Generate roof
   */
  private generateRoof(
    buildingData: BuildingData,
    floorCount: number,
    baseHeight: number
  ): SplineObject {
    const elements = buildingData.elements;
    const bounds = this.calculateBounds(elements);
    const roofHeight = baseHeight * floorCount;

    return {
      id: 'roof',
      name: 'Roof',
      type: 'mesh',
      position: {
        x: bounds.centerX,
        y: roofHeight + 0.5,
        z: bounds.centerZ,
      },
      scale: {
        x: bounds.width + 0.5,
        y: 0.3,
        z: bounds.depth + 0.5,
      },
      rotation: { x: 0, y: 0, z: 0 },
      material: 'roof-tile',
      color: this.getMaterialColor('roof'),
      properties: {
        castShadow: true,
        receiveShadow: true,
        type: 'roof',
      }
    };
  }

  /**
   * Generate exterior elements (landscaping, etc.)
   */
  private generateExteriorElements(
    buildingData: BuildingData,
    floorCount: number,
    baseHeight: number
  ): SplineObject[] {
    const objects: SplineObject[] = [];
    const elements = buildingData.elements;
    const bounds = this.calculateBounds(elements);

    // Add ground plane
    const groundSize = Math.max(bounds.width, bounds.depth) * 1.5;
    objects.push({
      id: 'ground',
      name: 'Ground',
      type: 'mesh',
      position: {
        x: bounds.centerX,
        y: -0.5,
        z: bounds.centerZ,
      },
      scale: {
        x: groundSize,
        y: 0.3,
        z: groundSize,
      },
      rotation: { x: 0, y: 0, z: 0 },
      material: 'grass',
      color: '#90EE90',
      properties: {
        castShadow: true,
        receiveShadow: true,
        type: 'ground',
      }
    });

    // Add plants/vegetation if applicable
    if (buildingData.includeVegetation !== false) {
      objects.push(...this.generateVegetation(bounds));
    }

    return objects;
  }

  /**
   * Generate vegetation for landscaping
   */
  private generateVegetation(bounds: Bounds): SplineObject[] {
    const plants: SplineObject[] = [];
    const plantPositions = [
      { x: bounds.minX - 2, z: bounds.minZ - 2 },
      { x: bounds.maxX + 2, z: bounds.minZ - 2 },
      { x: bounds.minX - 2, z: bounds.maxZ + 2 },
      { x: bounds.maxX + 2, z: bounds.maxZ + 2 },
    ];

    plantPositions.forEach((pos, index) => {
      plants.push({
        id: `plant_${index}`,
        name: `Plant_${index + 1}`,
        type: 'mesh',
        position: {
          x: pos.x,
          y: 0.75,
          z: pos.z,
        },
        scale: {
          x: 1,
          y: 1.5,
          z: 1,
        },
        rotation: { x: 0, y: 0, z: 0 },
        material: 'vegetation',
        color: '#228B22',
        properties: {
          castShadow: true,
          receiveShadow: true,
          type: 'plant',
        }
      });
    });

    return plants;
  }

  /**
   * Generate lights for the scene
   */
  private generateLights(buildingData: BuildingData): SplineLight[] {
    const lights: SplineLight[] = [];
    const elements = buildingData.elements;
    const bounds = this.calculateBounds(elements);

    // Main sunlight (directional)
    lights.push({
      id: 'sun',
      name: 'Sunlight',
      type: 'directional',
      position: {
        x: bounds.centerX + 15,
        y: 20,
        z: bounds.centerZ + 15,
      },
      target: {
        x: bounds.centerX,
        y: 0,
        z: bounds.centerZ,
      },
      intensity: 1,
      color: '#FFFFFF',
      castShadow: true,
      shadowMapSize: 2048,
    });

    // Ambient light
    lights.push({
      id: 'ambient',
      name: 'Ambient Light',
      type: 'ambient',
      intensity: 0.5,
      color: '#FFFFFF',
    });

    // Fill light (soft light)
    lights.push({
      id: 'fill',
      name: 'Fill Light',
      type: 'directional',
      position: {
        x: bounds.centerX - 10,
        y: 15,
        z: bounds.centerZ - 10,
      },
      target: {
        x: bounds.centerX,
        y: 0,
        z: bounds.centerZ,
      },
      intensity: 0.4,
      color: '#87CEEB',
    });

    return lights;
  }

  /**
   * Generate camera for the scene
   */
  private generateCamera(buildingData: BuildingData): SplineCamera {
    const elements = buildingData.elements;
    const bounds = this.calculateBounds(elements);
    const distance = Math.max(bounds.width, bounds.depth) * 0.8;

    // Isometric camera angle
    const cameraDistance = distance * 1.5;
    const angle = Math.PI / 4; // 45 degrees
    const height = distance * 0.6;

    return {
      id: 'main-camera',
      name: 'Main Camera',
      type: 'perspective',
      position: {
        x: bounds.centerX + cameraDistance * Math.cos(angle),
        y: bounds.centerY + height,
        z: bounds.centerZ + cameraDistance * Math.sin(angle),
      },
      target: {
        x: bounds.centerX,
        y: bounds.centerY + 1,
        z: bounds.centerZ,
      },
      fov: 45,
      near: 0.1,
      far: 1000,
      aspect: 16 / 9,
    };
  }

  /**
   * Generate environment settings
   */
  private generateEnvironment(): Record<string, any> {
    return {
      background: '#E8F4F8',
      fog: {
        enabled: true,
        color: '#E8F4F8',
        near: 10,
        far: 500,
      },
      shadowMap: {
        enabled: true,
        type: 'PCFShadowMap',
      },
    };
  }

  /**
   * Generate materials
   */
  private generateMaterials(): Record<string, SplineMaterial> {
    return {
      'concrete-wall': {
        type: 'standard',
        color: '#A9A9A9',
        metalness: 0.1,
        roughness: 0.8,
      },
      'door-wood': {
        type: 'standard',
        color: '#8B4513',
        metalness: 0,
        roughness: 0.6,
      },
      'glass-window': {
        type: 'physical',
        color: '#87CEEB',
        metalness: 0,
        roughness: 0.1,
        transmission: 0.9,
        ior: 1.5,
      },
      'floor-tile': {
        type: 'standard',
        color: '#D3D3D3',
        metalness: 0,
        roughness: 0.7,
      },
      'ceiling-plaster': {
        type: 'standard',
        color: '#FFFACD',
        metalness: 0,
        roughness: 0.9,
      },
      'roof-tile': {
        type: 'standard',
        color: '#8B4513',
        metalness: 0,
        roughness: 0.8,
      },
      'grass': {
        type: 'standard',
        color: '#90EE90',
        metalness: 0,
        roughness: 1,
      },
      'vegetation': {
        type: 'standard',
        color: '#228B22',
        metalness: 0,
        roughness: 0.9,
      },
    };
  }

  /**
   * Calculate bounding box of elements
   */
  private calculateBounds(elements: BuildingElement[]): Bounds {
    if (elements.length === 0) {
      return {
        minX: -5,
        maxX: 5,
        minZ: -5,
        maxZ: 5,
        width: 10,
        depth: 10,
        centerX: 0,
        centerZ: 0,
        centerY: 0,
      };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const el of elements) {
      minX = Math.min(minX, el.x);
      maxX = Math.max(maxX, el.x + el.width);
      minZ = Math.min(minZ, el.y);
      maxZ = Math.max(maxZ, el.y + (el.height ?? 0));
    }

    const width = maxX - minX;
    const depth = maxZ - minZ;

    return {
      minX,
      maxX,
      minZ,
      maxZ,
      width,
      depth,
      centerX: minX + width / 2,
      centerZ: minZ + depth / 2,
      centerY: 1.5,
    };
  }

  /**
   * Get color for material type
   */
  private getMaterialColor(materialType: string): string {
    const colorMap: Record<string, string> = {
      wall: '#A9A9A9',
      door: '#8B4513',
      window: '#87CEEB',
      floor: '#D3D3D3',
      ceiling: '#FFFACD',
      roof: '#8B4513',
      ground: '#90EE90',
    };
    return colorMap[materialType] || '#CCCCCC';
  }
}

// Type definitions for Spline scene structure
export interface BuildingData {
  projectName: string;
  projectDescription?: string;
  elements: BuildingElement[];
  baseHeight?: number;
  floorCount?: number;
  includeVegetation?: boolean;
}

export interface BuildingElement {
  id: string;
  name?: string;
  type: 'wall' | 'door' | 'window' | 'room' | 'furniture'| 'toilet';
  x: number;
  y: number;
  z: number;
  width: number;
  height?: number;
  depth?: number;
  material?: string;
  color?: string;
}
// Dans spline-json-generator.service.ts

export interface SplineScene {
  format: string;
  version: string;
  metadata: {
    name: string;
    description?: string;
    created: string;
  };
  scene: {
    children: SplineObject[];
    lights: SplineLight[];
    camera: SplineCamera;
    environment: Record<string, any>;
  };
  materials: Record<string, SplineMaterial>;
  textures: any[];
}

export interface SplineObject {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  material: string;
  color: string;
  properties: Record<string, any>;
}

export interface SplineLight {
  id: string;
  name: string;
  type: 'directional' | 'ambient' | 'point' | 'spot';
  position?: { x: number; y: number; z: number };
  target?: { x: number; y: number; z: number };
  intensity: number;
  color: string;
  castShadow?: boolean;
  shadowMapSize?: number;
}

export interface SplineCamera {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
  near: number;
  far: number;
  aspect: number;
}

export interface SplineMaterial {
  type: string;
  color: string;
  metalness?: number;
  roughness?: number;
  transmission?: number;
  ior?: number;
}

interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  width: number;
  depth: number;
  centerX: number;
  centerZ: number;
  centerY: number;
}
