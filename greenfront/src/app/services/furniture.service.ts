import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type FurnitureType = 'bed' | 'chair' | 'table' | 'sofa' | 'wardrobe' | 'bathroom';

export interface FurniturePlacement {
  position: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
}

@Injectable({ providedIn: 'root' })
export class FurnitureService {
  private readonly loader = new GLTFLoader();
  private readonly modelCache = new Map<FurnitureType, Promise<THREE.Object3D>>();
  private readonly registry: Record<FurnitureType, string> = {
    bed: 'assets/models/furniture/bed.glb',
    chair: 'assets/models/furniture/chair.glb',
    table: 'assets/models/furniture/table.glb',
    sofa: 'assets/models/furniture/sofa.glb',
    wardrobe: 'assets/models/furniture/wardrobe.glb',
    bathroom: 'assets/models/furniture/bathroom.glb',
  };

  loadFurniture(
    type: FurnitureType,
    position: THREE.Vector3,
    rotation = new THREE.Euler(),
    scale = new THREE.Vector3(1, 1, 1)
  ): Promise<THREE.Object3D> {
    return this.loadModel(type).then((cachedModel) => {
      const model = cachedModel.clone(true);
      this.prepareModel(model);
      this.fitModelToPlanSize(model, scale);
      const localOffset = model.position.clone();
      model.position.copy(position).add(localOffset);
      model.rotation.copy(rotation);
      model.userData = {
        ...model.userData,
        furnitureType: type,
        isFurnitureModel: true,
      };
      return model;
    });
  }

  replacePlaceholders(scene: THREE.Scene | THREE.Group): void {
    const placeholders: THREE.Mesh[] = [];

    scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        object.userData?.['furnitureType'] &&
        !object.userData?.['isFurnitureModel']
      ) {
        placeholders.push(object);
      }
    });

    placeholders.forEach((placeholder) => {
      const type = placeholder.userData['furnitureType'] as FurnitureType;
      const spinner = this.createLoadingSpinner(placeholder);
      placeholder.add(spinner);
      const targetSize =
        (placeholder.userData['targetSize'] as THREE.Vector3 | undefined)?.clone() ??
        placeholder.scale.clone();
      const basePosition = placeholder.position.clone();
      basePosition.y -= this.getMeshHeight(placeholder) / 2;

      this.loadFurniture(
        type,
        basePosition,
        placeholder.rotation.clone(),
        targetSize
      )
        .then((model) => {
          const parent = placeholder.parent;
          if (!parent) return;

          parent.add(model);
          parent.remove(placeholder);
          this.disposeMesh(placeholder);
        })
        .catch(() => {
          const parent = placeholder.parent;
          placeholder.remove(spinner);
          this.disposeObject(spinner);

          const fallback = this.createProceduralFurniture(
            type,
            basePosition,
            placeholder.rotation.clone(),
            targetSize
          );

          if (parent && fallback) {
            parent.add(fallback);
            parent.remove(placeholder);
            this.disposeMesh(placeholder);
            return;
          }

          placeholder.material = new THREE.MeshStandardMaterial({
            color: '#7C9BBA',
            roughness: 0.75,
            metalness: 0.05,
          });
        });
    });
  }

  private loadModel(type: FurnitureType): Promise<THREE.Object3D> {
    const cached = this.modelCache.get(type);
    if (cached) return cached;

    const promise = new Promise<THREE.Object3D>((resolve, reject) => {
      this.loader.load(
        this.registry[type],
        (gltf) => resolve(gltf.scene),
        undefined,
        (error) => reject(error)
      );
    });

    this.modelCache.set(type, promise);
    return promise;
  }

  private fitModelToPlanSize(model: THREE.Object3D, targetSize: THREE.Vector3): void {
    const box = new THREE.Box3().setFromObject(model);
    const currentSize = box.getSize(new THREE.Vector3());

    if (currentSize.x === 0 || currentSize.y === 0 || currentSize.z === 0) return;

    const fitScale = Math.min(
      targetSize.x / currentSize.x,
      Math.max(targetSize.y, 0.6) / currentSize.y,
      targetSize.z / currentSize.z
    );

    model.scale.multiplyScalar(Number.isFinite(fitScale) && fitScale > 0 ? fitScale : 1);

    const fittedBox = new THREE.Box3().setFromObject(model);
    const center = fittedBox.getCenter(new THREE.Vector3());
    const size = fittedBox.getSize(new THREE.Vector3());
    model.position.sub(center);
    model.position.y += size.y / 2;
  }

  private prepareModel(model: THREE.Object3D): void {
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }

  private createLoadingSpinner(placeholder: THREE.Mesh): THREE.Group {
    const spinner = new THREE.Group();
    spinner.name = 'furniture-loading-spinner';
    spinner.userData['isLoadingSpinner'] = true;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.025, 8, 32, Math.PI * 1.5),
      new THREE.MeshBasicMaterial({ color: '#2563EB' })
    );
    ring.rotation.x = Math.PI / 2;

    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 12),
      new THREE.MeshBasicMaterial({ color: '#7C9BBA' })
    );
    marker.position.x = 0.22;

    spinner.add(ring, marker);
    spinner.position.y = this.getMeshHeight(placeholder) / 2 + 0.45;
    return spinner;
  }

  private createProceduralFurniture(
    type: FurnitureType,
    position: THREE.Vector3,
    rotation: THREE.Euler,
    targetSize: THREE.Vector3
  ): THREE.Group | null {
    const group = new THREE.Group();
    group.position.copy(position);
    group.rotation.copy(rotation);
    group.userData['furnitureType'] = type;
    group.userData['isFurnitureModel'] = true;

    switch (type) {
      case 'bed':
        this.buildBed(group, targetSize);
        break;
      case 'chair':
        this.buildChair(group, targetSize);
        break;
      case 'table':
        this.buildTable(group, targetSize);
        break;
      case 'sofa':
        this.buildSofa(group, targetSize);
        break;
      case 'wardrobe':
        this.buildWardrobe(group, targetSize);
        break;
      case 'bathroom':
        this.buildBathroom(group, targetSize);
        break;
      default:
        return null;
    }

    return group;
  }

  private buildBed(group: THREE.Group, size: THREE.Vector3): void {
    const wood = this.standardMaterial('#8B6F47', 0.68);
    const fabric = this.standardMaterial('#D8B4B8', 0.9);
    const sheet = this.standardMaterial('#F8FAFC', 0.86);
    const w = Math.max(size.x, 0.8);
    const d = Math.max(size.z, 1.1);

    this.addBox(group, w, 0.22, d, 0, 0.18, 0, wood);
    this.addBox(group, w * 0.92, 0.18, d * 0.72, 0, 0.38, d * 0.08, sheet);
    this.addBox(group, w * 0.42, 0.14, d * 0.22, -w * 0.23, 0.52, -d * 0.28, fabric);
    this.addBox(group, w * 0.42, 0.14, d * 0.22, w * 0.23, 0.52, -d * 0.28, fabric);
    this.addBox(group, w, 0.8, 0.12, 0, 0.52, -d * 0.5, wood);
  }

  private buildTable(group: THREE.Group, size: THREE.Vector3): void {
    const top = this.standardMaterial('#B9854A', 0.62);
    const metal = this.standardMaterial('#475569', 0.45, 0.18);
    const w = Math.max(size.x, 0.7);
    const d = Math.max(size.z, 0.55);
    const h = 0.72;

    this.addBox(group, w, 0.1, d, 0, h, 0, top);
    const insetX = w * 0.38;
    const insetZ = d * 0.34;
    [
      [-insetX, -insetZ],
      [insetX, -insetZ],
      [-insetX, insetZ],
      [insetX, insetZ],
    ].forEach(([x, z]) => this.addCylinder(group, 0.04, h, x, h / 2, z, metal));
  }

  private buildChair(group: THREE.Group, size: THREE.Vector3): void {
    const wood = this.standardMaterial('#9A6A3A', 0.64);
    const cushion = this.standardMaterial('#7C9BBA', 0.82);
    const w = Math.max(size.x, 0.45);
    const d = Math.max(size.z, 0.45);

    this.addBox(group, w, 0.12, d, 0, 0.48, 0, cushion);
    this.addBox(group, w, 0.74, 0.1, 0, 0.78, -d * 0.45, wood);
    const insetX = w * 0.38;
    const insetZ = d * 0.35;
    [
      [-insetX, -insetZ],
      [insetX, -insetZ],
      [-insetX, insetZ],
      [insetX, insetZ],
    ].forEach(([x, z]) => this.addCylinder(group, 0.025, 0.48, x, 0.24, z, wood));
  }

  private buildSofa(group: THREE.Group, size: THREE.Vector3): void {
    const fabric = this.standardMaterial('#7C9BBA', 0.88);
    const w = Math.max(size.x, 0.9);
    const d = Math.max(size.z, 0.55);

    this.addBox(group, w, 0.26, d, 0, 0.26, 0.08, fabric);
    this.addBox(group, w, 0.68, 0.16, 0, 0.52, -d * 0.44, fabric);
    this.addBox(group, 0.14, 0.42, d, -w * 0.52, 0.38, 0, fabric);
    this.addBox(group, 0.14, 0.42, d, w * 0.52, 0.38, 0, fabric);
  }

  private buildWardrobe(group: THREE.Group, size: THREE.Vector3): void {
    const wood = this.standardMaterial('#8B6F47', 0.7);
    const handle = this.standardMaterial('#CBD5E1', 0.38, 0.25);
    const w = Math.max(size.x, 0.55);
    const d = Math.max(size.z, 0.35);

    this.addBox(group, w, 1.75, d, 0, 0.88, 0, wood);
    this.addBox(group, 0.025, 1.55, 0.02, 0, 0.88, -d * 0.51, handle);
    this.addBox(group, 0.035, 0.28, 0.025, -w * 0.12, 0.95, -d * 0.54, handle);
    this.addBox(group, 0.035, 0.28, 0.025, w * 0.12, 0.95, -d * 0.54, handle);
  }

  private buildBathroom(group: THREE.Group, size: THREE.Vector3): void {
    const ceramic = this.standardMaterial('#F8FAFC', 0.42);
    const w = Math.max(size.x, 0.45);
    const d = Math.max(size.z, 0.45);

    this.addBox(group, w * 0.82, 0.22, d * 0.72, 0, 0.22, 0, ceramic);
    this.addCylinder(group, Math.min(w, d) * 0.28, 0.38, 0, 0.5, d * 0.05, ceramic, 32);
    this.addBox(group, w * 0.7, 0.55, d * 0.15, 0, 0.58, -d * 0.4, ceramic);
  }

  private addBox(
    group: THREE.Group,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material
  ): void {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  private addCylinder(
    group: THREE.Group,
    radius: number,
    height: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    segments = 16
  ): void {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  private standardMaterial(color: string, roughness: number, metalness = 0.03): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  private getMeshHeight(mesh: THREE.Mesh): number {
    const box = new THREE.Box3().setFromObject(mesh);
    return box.getSize(new THREE.Vector3()).y;
  }

  private disposeMesh(mesh: THREE.Mesh): void {
    mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material) => material.dispose());
    } else {
      mesh.material.dispose();
    }
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        this.disposeMesh(child);
      }
    });
  }
}
