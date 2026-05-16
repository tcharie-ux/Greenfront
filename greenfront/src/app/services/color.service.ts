import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as THREE from 'three';

export const DEFAULT_VIEWER_COLORS: Record<ColorTarget, string> = {
  wall: '#F5F0E8',
  roof: '#2C3E50',
  floor: '#C8A96E',
};

type ColorTarget = 'wall' | 'roof' | 'floor';

interface ColorTransition {
  mesh: THREE.Mesh;
  from: THREE.Color;
  to: THREE.Color;
  frame: number;
  totalFrames: number;
}

@Injectable({ providedIn: 'root' })
export class ColorService {
  readonly wallColor$ = new BehaviorSubject<string>(DEFAULT_VIEWER_COLORS.wall);
  readonly roofColor$ = new BehaviorSubject<string>(DEFAULT_VIEWER_COLORS.roof);
  readonly floorColor$ = new BehaviorSubject<string>(DEFAULT_VIEWER_COLORS.floor);

  private scene?: THREE.Scene;
  private readonly transitions: ColorTransition[] = [];

  bindScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  setWallColor(hex: string): void {
    this.wallColor$.next(hex);
    this.applyColor('wall', hex, 0.85);
  }

  setRoofColor(hex: string): void {
    this.roofColor$.next(hex);
    this.applyColor('roof', hex, 0.78);
  }

  setFloorColor(hex: string): void {
    this.floorColor$.next(hex);
    this.applyColor('floor', hex, 0.65);
  }

  resetColors(): void {
    this.setWallColor(DEFAULT_VIEWER_COLORS.wall);
    this.setRoofColor(DEFAULT_VIEWER_COLORS.roof);
    this.setFloorColor(DEFAULT_VIEWER_COLORS.floor);
  }

  animateColorTransitions(): void {
    for (let index = this.transitions.length - 1; index >= 0; index -= 1) {
      const transition = this.transitions[index];
      const material = transition.mesh.material;
      if (!(material instanceof THREE.MeshStandardMaterial)) {
        this.transitions.splice(index, 1);
        continue;
      }

      transition.frame += 1;
      const progress = Math.min(transition.frame / transition.totalFrames, 1);
      material.color.copy(transition.from).lerp(transition.to, progress);

      if (progress >= 1) {
        material.color.copy(transition.to);
        this.transitions.splice(index, 1);
      }
    }
  }

  private applyColor(type: ColorTarget, hex: string, roughness: number): void {
    if (!this.scene) return;

    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || object.userData?.['type'] !== type) return;

      const currentMaterial = Array.isArray(object.material) ? object.material[0] : object.material;
      const currentColor =
        currentMaterial instanceof THREE.MeshStandardMaterial
          ? currentMaterial.color.clone()
          : new THREE.Color(hex);

      object.material = new THREE.MeshStandardMaterial({
        color: currentColor,
        roughness,
        metalness: type === 'roof' ? 0.08 : 0.02,
        side: currentMaterial instanceof THREE.Material ? currentMaterial.side : THREE.FrontSide,
        clippingPlanes:
          currentMaterial instanceof THREE.Material ? currentMaterial.clippingPlanes : undefined,
      });

      this.transitions.push({
        mesh: object,
        from: currentColor,
        to: new THREE.Color(hex),
        frame: 0,
        totalFrames: 20,
      });
    });
  }
}
