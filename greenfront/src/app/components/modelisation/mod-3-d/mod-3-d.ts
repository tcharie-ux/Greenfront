import {
  Component,
  ElementRef,
  OnInit,
  AfterViewInit,
  ViewChild,
  OnDestroy
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import jsPDF from 'jspdf';
import { Subscription } from 'rxjs';
import { MaterialCalculationService } from '../../../services/material-calculation.service';
import { FormsModule } from '@angular/forms';
import { Project, Floor } from '../../../models/drawing-element';
import { ColorPanelComponent } from '../color-panel/color-panel';
import { ColorService, DEFAULT_VIEWER_COLORS } from '../../../services/color.service';
import { FurnitureService, FurnitureType } from '../../../services/furniture.service';

interface WallOpening {
  source: any;
  kind: 'door' | 'window';
  startPx: number;
  endPx: number;
  lengthPx: number;
  centerPx: number;
}

@Component({
  selector: 'app-mod-3-d',
  standalone: true,
  templateUrl: './mod-3-d.html',
  styleUrl: './mod-3-d.scss',
  imports: [CommonModule, DecimalPipe, FormsModule, ColorPanelComponent],
})
export class Mod3D implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('rendererContainer') rendererContainer!: ElementRef<HTMLDivElement>;

  viewerLoading = true;
  project: Project | null = null;
  materials: any = null;
  rawElements: any[] = [];
  projectId: string | null = null;

  // Three.js properties
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private animationId!: number;
  private clippingPlane!: THREE.Plane;
  private readonly subscriptions = new Subscription();
  private readonly currentColors = { ...DEFAULT_VIEWER_COLORS };
  private modelCenterX = 0;
  private modelCenterY = 0;
  private readonly planScale = 50;

  // UI State
  isRoofOpen = false;
  clipHeight = 10;
  selectedFloorId: string = 'all';
  floors: Floor[] = [];
  private roofGroup = new THREE.Group();
  private buildingGroup = new THREE.Group();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly materialService: MaterialCalculationService,
    private readonly colorService: ColorService,
    private readonly furnitureService: FurnitureService
  ) { }

  ngOnInit(): void {
    this.projectId = this.route.parent?.snapshot.paramMap.get('id') ??
      this.route.snapshot.paramMap.get('id');

    const rawData = localStorage.getItem('archimorph_transfer_data');
    if (rawData) {
      const transferData = JSON.parse(rawData);
      this.project = transferData.project;
      this.materials = transferData.materials;
      this.rawElements = transferData.rawElements || [];
      this.floors = this.project?.floors || [];
    }

    this.subscriptions.add(
      this.colorService.wallColor$.subscribe((color) => {
        this.currentColors.wall = color;
      })
    );
    this.subscriptions.add(
      this.colorService.roofColor$.subscribe((color) => {
        this.currentColors.roof = color;
      })
    );
    this.subscriptions.add(
      this.colorService.floorColor$.subscribe((color) => {
        this.currentColors.floor = color;
      })
    );
  }

  ngAfterViewInit(): void {
    this.initThree();
    this.colorService.bindScene(this.scene);
    this.createModel();
    this.applyCurrentColors();
    this.animate();

    setTimeout(() => {
      this.viewerLoading = false;
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    this.subscriptions.unsubscribe();
  }

  private initThree(): void {
    const container = this.rendererContainer.nativeElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xF1F5F9); // Light Gray background

    this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(15, 12, 15);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.localClippingEnabled = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Clipping plane
    this.clippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), this.clipHeight);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(10, 20, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    this.scene.add(sunLight);

    // Grid
    const grid = new THREE.GridHelper(100, 100, 0xCBD5E1, 0xE2E8F0);
    this.scene.add(grid);

    this.scene.add(this.buildingGroup);
    this.scene.add(this.roofGroup);
  }

  private createModel(): void {
    this.buildingGroup.clear();
    this.roofGroup.clear();

    if (!this.rawElements || this.rawElements.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    this.rawElements.forEach(el => {
      minX = Math.min(minX, el.x);
      maxX = Math.max(maxX, el.x + (el.width || 0));
      minY = Math.min(minY, el.y);
      maxY = Math.max(maxY, el.y + (el.height || 0));
    });

    this.modelCenterX = (minX + maxX) / 2;
    this.modelCenterY = (minY + maxY) / 2;
    const projectWidth = (maxX - minX) / this.planScale;
    const projectDepth = (maxY - minY) / this.planScale;

    // Rendre chaque étage
    this.floors.forEach(floor => {
      if (this.selectedFloorId !== 'all' && this.selectedFloorId !== floor.id) return;

      const floorElements = this.rawElements.filter(e => e.floorId === floor.id);
      const elevation = floor.elevation || 0;

      // Dalle de l'étage
      const slabGeo = new THREE.BoxGeometry(projectWidth + 1, 0.2, projectDepth + 1);
      const slabMat = new THREE.MeshStandardMaterial({
        color: this.currentColors.floor,
        clippingPlanes: [this.clippingPlane],
        roughness: 0.65
      });
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.set(0, elevation - 0.1, 0);
      slab.receiveShadow = true;
      slab.userData['type'] = 'floor';
      this.buildingGroup.add(slab);

      // Éléments de l'étage
      const walls = floorElements.filter(el => el.type === 'wall');
      const wallOpenings = floorElements.filter(el => el.type === 'door' || el.type === 'window');
      const usedOpenings = new Set<string>();

      walls.forEach(wall => {
        this.createWallWithOpenings(wall, wallOpenings, usedOpenings, elevation, floor.height);
      });

      wallOpenings.forEach(opening => {
        if (usedOpenings.has(opening.id)) return;
        const relX = (opening.x - this.modelCenterX) / this.planScale;
        const relY = (opening.y - this.modelCenterY) / this.planScale;
        this.createStackedElement(opening, relX, relY, elevation, floor.height);
      });

      floorElements
        .filter(el => el.type !== 'wall' && el.type !== 'door' && el.type !== 'window')
        .forEach(el => {
          const relX = (el.x - this.modelCenterX) / this.planScale;
          const relY = (el.y - this.modelCenterY) / this.planScale;
          this.createStackedElement(el, relX, relY, elevation, floor.height);
        });
    });

    // Générer le TOIT sur le dernier étage
    const topFloor = this.floors[this.floors.length - 1];
    if (topFloor && (this.selectedFloorId === 'all' || this.selectedFloorId === topFloor.id)) {
      this.createSlopedRoof(projectWidth + 1.2, projectDepth + 1.2, topFloor.elevation + topFloor.height);
    }

    this.furnitureService.replacePlaceholders(this.buildingGroup);
    this.applyCurrentColors();
  }

  private createStackedElement(el: any, relX: number, relY: number, elevation: number, floorHeight: number): void {
    const scale = this.planScale;
    const w = (el.width * (el.scaleX || 1)) / scale;
    const h = el.type === 'wall' ? floorHeight : (el.height || 0.1) / scale;
    const d = el.type === 'wall' ? (el.thickness || 0.2) : (el.height || 0.1) / scale;

    let geometry: THREE.BufferGeometry;
    let materialProps: any = {
      color: el.type === 'wall' ? this.currentColors.wall : el.color || 0xFFFFFF,
      clippingPlanes: [this.clippingPlane],
      roughness: 0.7
    };

    if (el.type === 'wall') {
      geometry = new THREE.BoxGeometry(w, h, d);
      materialProps.roughness = 0.85;
    } else if (el.type === 'furniture') {
      geometry = new THREE.BoxGeometry(w, 0.8, d);
      materialProps.color = 0x94A3B8;
    } else if (el.type === 'door') {
      geometry = new THREE.BoxGeometry(Math.max(w, 0.65), 2.1, 0.08);
      materialProps.color = 0xA16207;
      materialProps.roughness = 0.72;
    } else if (el.type === 'window') {
      geometry = new THREE.BoxGeometry(Math.max(w, 0.75), 1.05, 0.06);
      materialProps.color = 0x7DD3FC;
      materialProps.roughness = 0.18;
      materialProps.metalness = 0.05;
      materialProps.transparent = true;
      materialProps.opacity = 0.55;
    } else {
      return;
    }

    const material = new THREE.MeshStandardMaterial(materialProps);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const angle = -(el.rotation || 0) * (Math.PI / 180);
    mesh.rotation.y = angle;

    const offset = new THREE.Vector3(w / 2, 0, d / 2);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

    mesh.position.set(relX + offset.x, elevation + h / 2, relY + offset.z);

    if (el.type === 'wall') {
      mesh.userData['type'] = 'wall';
    }

    if (el.type === 'door' || el.type === 'window') {
      mesh.userData['type'] = el.type;
      mesh.position.y = elevation + (el.type === 'door' ? 1.05 : 1.45);
    }

    if (el.type === 'furniture') {
      mesh.userData['furnitureType'] = this.toFurnitureType(el.furnitureType);
      mesh.userData['targetSize'] = new THREE.Vector3(Math.max(w, 0.3), 0.9, Math.max(d, 0.3));
      mesh.userData['sourceElementId'] = el.id;
    }

    this.buildingGroup.add(mesh);
  }

  private createWallWithOpenings(
    wall: any,
    openings: any[],
    usedOpenings: Set<string>,
    elevation: number,
    floorHeight: number
  ): void {
    const wallLengthPx = Math.max(Math.abs(wall.width * (wall.scaleX || 1)), 1);
    const angle = (wall.rotation || 0) * (Math.PI / 180);
    const direction = new THREE.Vector2(Math.cos(angle), Math.sin(angle));
    const normal = new THREE.Vector2(-direction.y, direction.x);

    const wallOpenings = openings
      .map(opening => this.projectOpeningOnWall(opening, wall, direction, normal, wallLengthPx))
      .filter((opening): opening is WallOpening => opening !== null)
      .sort((a, b) => a.startPx - b.startPx);

    let cursorPx = 0;
    wallOpenings.forEach(opening => {
      usedOpenings.add(opening.source.id);

      if (opening.startPx > cursorPx) {
        this.addWallSegment(wall, cursorPx, opening.startPx - cursorPx, 0, floorHeight, elevation);
      }

      if (opening.kind === 'door') {
        const doorHeight = Math.min(2.1, floorHeight - 0.15);
        if (floorHeight > doorHeight) {
          this.addWallSegment(wall, opening.startPx, opening.lengthPx, doorHeight, floorHeight - doorHeight, elevation);
        }
        this.addDoorPanel(wall, opening, elevation, doorHeight);
      } else {
        const sillHeight = Math.min(0.9, floorHeight * 0.35);
        const windowHeight = Math.min(1.15, Math.max(floorHeight - sillHeight - 0.35, 0.55));
        const topHeight = Math.max(floorHeight - sillHeight - windowHeight, 0);
        this.addWallSegment(wall, opening.startPx, opening.lengthPx, 0, sillHeight, elevation);
        if (topHeight > 0.05) {
          this.addWallSegment(wall, opening.startPx, opening.lengthPx, sillHeight + windowHeight, topHeight, elevation);
        }
        this.addWindowPanel(wall, opening, elevation, sillHeight, windowHeight);
      }

      cursorPx = opening.endPx;
    });

    if (cursorPx < wallLengthPx) {
      this.addWallSegment(wall, cursorPx, wallLengthPx - cursorPx, 0, floorHeight, elevation);
    }
  }

  private projectOpeningOnWall(
    opening: any,
    wall: any,
    direction: THREE.Vector2,
    normal: THREE.Vector2,
    wallLengthPx: number
  ): WallOpening | null {
    const openingWidthPx = Math.max(Math.abs(opening.width * (opening.scaleX || 1)), 30);
    const openingCenter = new THREE.Vector2(
      opening.x + (opening.width || 0) * (opening.scaleX || 1) / 2,
      opening.y + (opening.height || 0) * (opening.scaleY || 1) / 2
    );
    const wallStart = new THREE.Vector2(wall.x, wall.y);
    const fromStart = openingCenter.clone().sub(wallStart);
    const distanceFromWall = Math.abs(fromStart.dot(normal));
    const centerPx = fromStart.dot(direction);

    if (distanceFromWall > 35 || centerPx < -openingWidthPx || centerPx > wallLengthPx + openingWidthPx) {
      return null;
    }

    const startPx = Math.max(centerPx - openingWidthPx / 2, 0);
    const endPx = Math.min(centerPx + openingWidthPx / 2, wallLengthPx);
    if (endPx - startPx < 10) return null;

    return {
      source: opening,
      kind: opening.type,
      startPx,
      endPx,
      lengthPx: endPx - startPx,
      centerPx: (startPx + endPx) / 2,
    };
  }

  private addWallSegment(
    wall: any,
    startPx: number,
    lengthPx: number,
    bottom: number,
    height: number,
    elevation: number
  ): void {
    if (lengthPx <= 0.05 || height <= 0.05) return;

    const width = lengthPx / this.planScale;
    const depth = wall.thickness || 0.2;
    const material = new THREE.MeshStandardMaterial({
      color: this.currentColors.wall,
      clippingPlanes: [this.clippingPlane],
      roughness: 0.85,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    const position = this.pointOnWall(wall, startPx + lengthPx / 2);

    mesh.position.set(
      (position.x - this.modelCenterX) / this.planScale,
      elevation + bottom + height / 2,
      (position.y - this.modelCenterY) / this.planScale
    );
    mesh.rotation.y = -(wall.rotation || 0) * (Math.PI / 180);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData['type'] = 'wall';
    this.buildingGroup.add(mesh);
  }

  private addDoorPanel(wall: any, opening: WallOpening, elevation: number, doorHeight: number): void {
    const group = new THREE.Group();
    const width = opening.lengthPx / this.planScale;
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(width, doorHeight, 0.075),
      new THREE.MeshStandardMaterial({ color: 0xA16207, roughness: 0.72 })
    );
    const handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xFACC15, roughness: 0.35, metalness: 0.25 })
    );
    handle.position.set(width * 0.32, 0.05, -0.055);
    panel.add(handle);
    group.add(panel);
    this.placeOpeningGroup(group, wall, opening.centerPx, elevation + doorHeight / 2);
    group.userData['type'] = 'door';
    this.buildingGroup.add(group);
  }

  private addWindowPanel(
    wall: any,
    opening: WallOpening,
    elevation: number,
    sillHeight: number,
    windowHeight: number
  ): void {
    const group = new THREE.Group();
    const width = opening.lengthPx / this.planScale;
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(width, windowHeight, 0.045),
      new THREE.MeshStandardMaterial({
        color: 0x7DD3FC,
        roughness: 0.08,
        transparent: true,
        opacity: 0.48,
      })
    );
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xE2E8F0, roughness: 0.46, metalness: 0.12 });
    const frameThickness = 0.045;
    const frameDepth = 0.07;
    const top = new THREE.Mesh(new THREE.BoxGeometry(width + frameThickness, frameThickness, frameDepth), frameMat);
    const bottom = top.clone();
    const left = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, windowHeight + frameThickness, frameDepth), frameMat);
    const right = left.clone();
    top.position.y = windowHeight / 2;
    bottom.position.y = -windowHeight / 2;
    left.position.x = -width / 2;
    right.position.x = width / 2;
    group.add(glass, top, bottom, left, right);
    this.placeOpeningGroup(group, wall, opening.centerPx, elevation + sillHeight + windowHeight / 2);
    group.userData['type'] = 'window';
    this.buildingGroup.add(group);
  }

  private placeOpeningGroup(group: THREE.Group, wall: any, centerPx: number, y: number): void {
    const position = this.pointOnWall(wall, centerPx);
    group.position.set(
      (position.x - this.modelCenterX) / this.planScale,
      y,
      (position.y - this.modelCenterY) / this.planScale
    );
    group.rotation.y = -(wall.rotation || 0) * (Math.PI / 180);
  }

  private pointOnWall(wall: any, distancePx: number): THREE.Vector2 {
    const angle = (wall.rotation || 0) * (Math.PI / 180);
    return new THREE.Vector2(
      wall.x + Math.cos(angle) * distancePx,
      wall.y + Math.sin(angle) * distancePx
    );
  }

  private createSlopedRoof(width: number, depth: number, elevation: number): void {
    const roofHeight = 2;
    const geometry = new THREE.BufferGeometry();

    // Sommet de la pyramide
    const top = new THREE.Vector3(0, roofHeight, 0);
    const v1 = new THREE.Vector3(-width / 2, 0, -depth / 2);
    const v2 = new THREE.Vector3(width / 2, 0, -depth / 2);
    const v3 = new THREE.Vector3(width / 2, 0, depth / 2);
    const v4 = new THREE.Vector3(-width / 2, 0, depth / 2);

    const vertices = new Float32Array([
      v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, top.x, top.y, top.z, // Face avant
      v2.x, v2.y, v2.z, v3.x, v3.y, v3.z, top.x, top.y, top.z, // Face droite
      v3.x, v3.y, v3.z, v4.x, v4.y, v4.z, top.x, top.y, top.z, // Face arrière
      v4.x, v4.y, v4.z, v1.x, v1.y, v1.z, top.x, top.y, top.z  // Face gauche
    ]);

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: this.currentColors.roof,
      side: THREE.DoubleSide,
      clippingPlanes: [this.clippingPlane],
      roughness: 0.78,
      metalness: 0.08
    });
    const roof = new THREE.Mesh(geometry, material);
    roof.position.y = elevation;
    roof.castShadow = true;
    roof.userData['type'] = 'roof';
    this.roofGroup.add(roof);
  }

  toggleRoof(): void {
    this.isRoofOpen = !this.isRoofOpen;
    // Animation simple
    const targetY = this.isRoofOpen ? 5 : 0;
    this.roofGroup.position.y = targetY;
  }

  onClipChange(): void {
    this.clippingPlane.constant = this.clipHeight;
  }

  selectFloor3D(id: string): void {
    this.selectedFloorId = id;
    this.createModel();
  }

  takeScreenshot(): void {
    const dataURL = this.renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'archimorph-view.png';
    link.href = dataURL;
    link.click();
  }

  returnTo2D(): void {
    const screenshot = this.renderer.domElement.toDataURL('image/png');
    if (this.projectId) {
      localStorage.setItem(`project_3d_preview_${this.projectId}`, screenshot);
      this.router.navigate(['/modelisation', this.projectId, '2d']);
    } else {
      this.router.navigate(['/']);
    }
  }

  generatePDF(): void {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('Rapport BIM - Archimorph', 20, 20);
    doc.setFontSize(14);
    doc.text(`Projet : ${this.project?.name}`, 20, 35);
    doc.text(`Matériau principal : Béton`, 20, 50);
    doc.text(`Volume estimé : ${this.materials?.concrete} m³`, 20, 60);
    doc.text(`Coût total estimé : ${this.materials?.totalCost} €`, 20, 70);
    doc.save('rapport_bim.pdf');
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.animateFurnitureSpinners();
    this.colorService.animateColorTransitions();
    this.renderer.render(this.scene, this.camera);
  }

  private applyCurrentColors(): void {
    this.colorService.setWallColor(this.currentColors.wall);
    this.colorService.setRoofColor(this.currentColors.roof);
    this.colorService.setFloorColor(this.currentColors.floor);
  }

  private animateFurnitureSpinners(): void {
    this.buildingGroup.traverse((object) => {
      if (object.userData?.['isLoadingSpinner']) {
        object.rotation.z += 0.12;
      }
    });
  }

  private toFurnitureType(rawType?: string): FurnitureType {
    switch (rawType) {
      case 'bed':
      case 'chair':
      case 'table':
      case 'sofa':
      case 'wardrobe':
        return rawType;
      case 'toilet':
      case 'bathtub':
      case 'kitchen-sink':
      case 'bathroom':
        return 'bathroom';
      default:
        return 'table';
    }
  }
}
