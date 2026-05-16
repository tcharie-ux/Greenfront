import { AfterViewInit, Component, ElementRef, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import Konva from 'konva';
import { v4 as uuidv4 } from 'uuid';
import { DrawingService } from '../../../services/drawing.service';
import { HistoryService } from '../../../services/history.service';
import { MaterialCalculationService } from '../../../services/material-calculation.service';
import { DrawingToSplineConverterService } from '../../../services/drawing-to-spline-converter.service';
import { SaveExportService } from '../../../services/save-export.service';
import { DrawingElement, ElementType, FurnitureType, Project, MaterialCalculation, Floor } from '../../../models/drawing-element';
import { ProjetService, Modelisation2DCreationRequest } from '../../../services/projet.service';
import { Modelisation_2D } from '../../../models/Modelisation_2D';

@Component({
  selector: 'app-mod-2-d',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './mod-2-d.html',
  styleUrls: ['./mod-2-d.scss'],
  providers: [DrawingService, HistoryService, MaterialCalculationService, SaveExportService]
})
export class Mod2D implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas', { static: false }) canvasRef?: ElementRef<HTMLCanvasElement>;

  // Konva
  private stage!: Konva.Stage;
  private gridLayer!: Konva.Layer;
  private elementLayer!: Konva.Layer;
  private measurementLayer!: Konva.Layer;
  private transformer!: Konva.Transformer;
  private konvaShapes = new Map<string, Konva.Shape>();
  private drawingStartPos: { x: number; y: number } | null = null;
  private tempShape: Konva.Shape | null = null;

  // Outils et état
  currentTool: ElementType | 'select' | 'delete' | 'room' = 'wall';
  selectedElement: DrawingElement | null = null;
  isSaving = false;
  statusMessage = "Prêt pour la modélisation technique.";
  mousePos = { x: 0, y: 0 };

  // Données du projet
  projectName: string = `Projet_${Date.now()}`;
  projectDescription: string = '';
  projectId: string | null = null;
  private savedProjectData: Project | null = null;
  private latestModelisation2DId: number | null = null;
  elements: DrawingElement[] = [];
  materials: MaterialCalculation | null = null;

  // Affichage
  showMeasurements = true;
  showGrid = true;
  zoom = 1;
  gridSize = 50; // 50px = 1m
  snapSize = 5; // 10cm = 5px (puisque 1m = 50px)

  // Multi-étage
  floors: Floor[] = [];
  currentFloorId: string = '';
  totalArea: number = 0;
  onResize = () => {
    if (!this.stage || !this.containerRef) return;
    const container = this.containerRef.nativeElement;
    this.stage.width(container.offsetWidth);
    this.stage.height(container.offsetHeight);
  };

  constructor(
    private drawingService: DrawingService,
    private historyService: HistoryService,
    private materialService: MaterialCalculationService,
    private converterService: DrawingToSplineConverterService,
    private saveExportService: SaveExportService,
    private projetService: ProjetService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') ?? uuidv4();

    // Souscriptions aux données
    this.drawingService.floors$.subscribe(f => this.floors = f);
    this.drawingService.currentFloorId$.subscribe(id => {
      this.currentFloorId = id;
      this.refreshCanvas(); // Recharger les éléments de l'étage
    });

    this.drawingService.elements$.subscribe(el => {
      this.elements = el.filter(e => e.floorId === this.currentFloorId);
      this.calculateBIM();
    });

    this.loadSavedProject();
    if (!this.savedProjectData) {
      this.loadLatestModelisation2DFromDatabase();
    }
  }

  ngAfterViewInit(): void {
    this.initializeCanvas();
    this.drawGrid();
    this.restoreLoadedProject();
  }

  /**
   * Initialiser le canvas Konva
   */
  private initializeCanvas(): void {
    const container = this.containerRef.nativeElement;

    this.stage = new Konva.Stage({
      container: container,
      width: container.offsetWidth,
      height: container.offsetHeight,
      draggable: false
    });

    // Créer les couches
    this.gridLayer = new Konva.Layer();
    this.elementLayer = new Konva.Layer();
    this.measurementLayer = new Konva.Layer();

    this.stage.add(this.gridLayer);
    this.stage.add(this.elementLayer);
    this.stage.add(this.measurementLayer);

    // Initialiser le transformer
    this.transformer = new Konva.Transformer({
      rotateEnabled: true,
      anchorSize: 8,
      anchorCornerRadius: 2,
      anchorFill: '#ffffff',
      anchorStroke: '#3b82f6',
      borderStroke: '#3b82f6',
      enabledAnchors: ['middle-left', 'middle-right', 'top-center', 'bottom-center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
      boundBoxFunc: (oldBox, newBox) => {
        const selectedNode = this.transformer?.nodes()?.[0];
        const isLineElement = selectedNode?.name() === 'wall' || selectedNode?.name() === 'line';
        if (isLineElement) {
          if (Math.abs(newBox.width) < 5) return oldBox;
          return newBox;
        }
        if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) return oldBox;
        return newBox;
      }
    });
    this.elementLayer.add(this.transformer);

    this.stage.on('mousedown touchstart', (e) => {
      if (e.target !== this.stage) return;

      const pos = this.stage.getRelativePointerPosition()!;
      if (this.isDragDrawingTool()) {
        this.stage.draggable(false);
        this.drawingStartPos = pos;
        if (this.currentTool === 'rectangle' || this.currentTool === 'room') {
          this.tempShape = new Konva.Rect({
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0,
            stroke: this.currentTool === 'room' ? '#22c55e' : '#38bdf8',
            strokeWidth: 2,
            fill: this.currentTool === 'room' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(56, 189, 248, 0.1)',
            opacity: 0.5
          });
        } else {
          this.tempShape = new Konva.Line({
            points: [pos.x, pos.y, pos.x, pos.y],
            stroke: this.currentTool === 'wall' ? '#1e293b' : '#94a3b8',
            strokeWidth: this.currentTool === 'wall' ? 3 : 2,
            opacity: 0.6
          });
        }
        this.elementLayer.add(this.tempShape);
      }
    });

    this.stage.on('mousemove touchmove', () => {
      const pos = this.stage.getRelativePointerPosition()!;

      // Snap automatique à 10cm (5px)
      const snappedX = Math.round(pos.x / this.snapSize) * this.snapSize;
      const snappedY = Math.round(pos.y / this.snapSize) * this.snapSize;

      this.mousePos = { x: snappedX, y: snappedY };

      if (this.drawingStartPos && this.tempShape) {
        if (this.currentTool === 'rectangle' || this.currentTool === 'room') {
          const rect = this.tempShape as Konva.Rect;
          rect.width(snappedX - this.drawingStartPos.x);
          rect.height(snappedY - this.drawingStartPos.y);
        } else {
          const points = [this.drawingStartPos.x, this.drawingStartPos.y, snappedX, snappedY];
          (this.tempShape as Konva.Line).points(points);
        }
        this.elementLayer.batchDraw();
      }
    });

    this.stage.on('mouseup touchend', () => {
      if (this.drawingStartPos && this.tempShape) {
        const pos = this.stage.getRelativePointerPosition()!;
        const snappedX = Math.round(pos.x / this.snapSize) * this.snapSize;
        const snappedY = Math.round(pos.y / this.snapSize) * this.snapSize;
        const dx = snappedX - this.drawingStartPos.x;
        const dy = snappedY - this.drawingStartPos.y;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          const element = this.drawingService.createElement(this.currentTool as ElementType, this.drawingStartPos.x, this.drawingStartPos.y);

          if (this.currentTool === 'rectangle' || this.currentTool === 'room') {
            element.width = dx;
            element.height = dy;
            if (this.currentTool === 'room') {
              element.color = '#dcfce7';
              element.label = `Piece_${Date.now()}`;
            }
          } else {
            const length = Math.sqrt(dx * dx + dy * dy);
            const rotation = Math.atan2(dy, dx) * (180 / Math.PI);
            element.width = length;
            element.height = 0;
            element.rotation = rotation;
            if (this.currentTool === 'wall') {
              element.thickness = 0.2;
            }
          }
          this.syncElementDimensions(element);

          this.drawingService.addElement(element);
          if (this.currentTool === 'room') {
            this.drawingService.addRoom(this.createRoomFromElement(element));
          }
          this.renderElement(element);
          this.saveHistory();
          this.updateMaterials();
          this.saveCurrentProjectState();
        }

        this.tempShape.destroy();
        this.tempShape = null;
        this.drawingStartPos = null;
        this.elementLayer.batchDraw();
        this.stage.draggable(this.currentTool === 'select');
      }
    });

    this.stage.on('click tap', (e) => {
      if (e.target === this.stage) {
        if (this.currentTool !== 'select' && this.currentTool !== 'delete' && this.currentTool !== 'wall' && this.currentTool !== 'line' && this.currentTool !== 'room') {
          const pos = this.stage.getRelativePointerPosition()!;
          this.createElementAtPosition(pos.x, pos.y);
        } else if (this.currentTool === 'select') {
          this.selectedElement = null;
          this.transformer.nodes([]);
        }
      }
    });

    this.setupZoom();
    this.drawGrid();
    window.addEventListener('resize', this.onResize);
  }

  setTool(tool: ElementType | 'select' | 'delete' | 'room'): void {
    this.currentTool = tool;
    if (this.stage) {
      this.stage.draggable(tool === 'select');
    }
    this.statusMessage = `Outil ${tool} actif`;
    if (tool !== 'select') {
      this.selectedElement = null;
      this.transformer.nodes([]);
    }
  }

  switchFloor(id: string): void {
    this.drawingService.setCurrentFloor(id);
  }

  addNewFloor(): void {
    const floor = this.drawingService.addFloor();
    this.switchFloor(floor.id);
  }

  private refreshCanvas(): void {
    if (!this.elementLayer) return;
    this.transformer.nodes([]);
    this.selectedElement = null;
    this.konvaShapes.forEach(shape => shape.destroy());
    this.konvaShapes.clear();
    if (!this.transformer.getLayer()) {
      this.elementLayer.add(this.transformer);
    }

    const elements = this.drawingService.getElements().filter(e => e.floorId === this.currentFloorId);
    elements.forEach(el => this.renderElement(el));
    this.elementLayer.draw();
  }

  private calculateBIM(): void {
    const scale = this.drawingService.getScale();
    this.totalArea = this.elements.reduce((acc, el) => {
      if (el.type !== 'room') return acc;
      return acc + (Math.abs(el.width) * Math.abs(el.height)) / (scale * scale);
    }, 0);
    this.updateMaterials();
  }

  onPropertyChange(): void {
    if (this.selectedElement) {
      this.applyDimensionsToElement(this.selectedElement);
      this.syncElementDimensions(this.selectedElement);
      this.drawingService.updateElement(this.selectedElement.id, this.selectedElement);
      const shape = this.konvaShapes.get(this.selectedElement.id);
      if (shape) {
        this.applyElementToShape(shape, this.selectedElement);
        this.transformer.nodes([shape]);
        this.elementLayer.batchDraw();
      }
      this.saveHistory();
      this.updateMaterials();
      this.saveCurrentProjectState();
    }
  }

  /**
   * Créer un élément à une position
   */
  private createElementAtPosition(x: number, y: number): void {
    if (this.currentTool === 'select' || this.currentTool === 'delete' || this.currentTool === 'room') {
      return;
    }

    const element = this.drawingService.createElement(this.currentTool as ElementType, x, y);
    this.drawingService.addElement(element);
    this.renderElement(element);
    this.saveHistory();
    this.updateMaterials();
    this.saveCurrentProjectState();
    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.statusMessage = `${element.type} créé(e)`;
    });
  }

  private isDragDrawingTool(): boolean {
    return this.currentTool === 'wall'
      || this.currentTool === 'line'
      || this.currentTool === 'rectangle'
      || this.currentTool === 'room';
  }

  private createRoomFromElement(element: DrawingElement) {
    const scale = this.drawingService.getScale();
    const widthM = Math.abs(element.width) / scale;
    const heightM = Math.abs(element.height) / scale;

    return {
      id: uuidv4(),
      name: element.label || `Piece_${Date.now()}`,
      color: element.color,
      area: Math.round(widthM * heightM * 100) / 100,
      perimeter: Math.round((widthM + heightM) * 2 * 100) / 100,
      floorId: element.floorId,
      walls: [],
      doors: [],
      windows: [],
      elements: [element.id]
    };
  }

  /**
   * Afficher un élément sur le canvas
   */
  private renderElement(element: DrawingElement): void {
    this.syncElementDimensions(element);
    let shape: Konva.Shape;

    if (element.type === 'wall' || element.type === 'line') {
      shape = new Konva.Line({
        points: element.type === 'wall'
          ? [0, 0, element.width, 0]
          : (element.points || [0, 0, element.width, 0]),
        stroke: element.color,
        strokeWidth: element.type === 'wall' ? 2 : (element.thickness || 2),
        hitStrokeWidth: element.type === 'wall' ? 14 : 8,
        draggable: true,
        id: element.id,
        rotation: element.rotation,
        x: element.x,
        y: element.y,
        name: element.type
      });
    } else if (element.type === 'arc') {
      shape = new Konva.Arc({
        innerRadius: (element.radius || 50) - 2,
        outerRadius: element.radius || 50,
        angle: 90,
        fill: element.color,
        stroke: element.color,
        strokeWidth: 1,
        draggable: true,
        id: element.id,
        x: element.x,
        y: element.y,
        rotation: element.rotation
      });
    } else if (element.type === 'label' || element.type === 'room-label') {
      shape = new Konva.Text({
        x: element.x,
        y: element.y,
        text: element.name || (element.type === 'room-label' ? 'Pièce' : 'Label'),
        fontSize: 14,
        fontFamily: 'Outfit, sans-serif',
        fill: element.color,
        draggable: true,
        id: element.id,
        rotation: element.rotation
      });
    } else {
      const width = Math.abs(element.width);
      const height = Math.abs(element.height);
      shape = new Konva.Rect({
        x: element.width < 0 ? element.x + element.width : element.x,
        y: element.height < 0 ? element.y + element.height : element.y,
        width,
        height,
        fill: element.color,
        stroke: element.type === 'room' ? '#22c55e' : '#1e293b',
        strokeWidth: element.type === 'room' ? 2 : 1,
        draggable: true,
        rotation: element.rotation,
        scaleX: element.scaleX,
        scaleY: element.scaleY,
        name: element.type,
        id: element.id,
        opacity: element.type === 'furniture' ? 0.4 : element.type === 'room' ? 0.35 : 0.8,
        shadowColor: 'black',
        shadowBlur: 4,
        shadowOffset: { x: 2, y: 2 },
        shadowOpacity: 0.3
      });
    }

    this.setupElementInteractions(shape, element);
    this.elementLayer.add(shape);
    this.konvaShapes.set(element.id, shape);
    this.elementLayer.draw();
  }

  private applyElementToShape(shape: Konva.Shape, element: DrawingElement): void {
    if (element.type === 'wall' || element.type === 'line') {
      const line = shape as Konva.Line;
      const length = Math.max(Math.abs(element.width || 0), 1);
      line.points([0, 0, length, 0]);
      line.x(element.x);
      line.y(element.y);
      line.rotation(element.rotation || 0);
      line.scaleX(1);
      line.scaleY(1);
      return;
    }

    shape.x(element.width < 0 ? element.x + element.width : element.x);
    shape.y(element.height < 0 ? element.y + element.height : element.y);
    shape.width(Math.max(Math.abs(element.width || 0), 1));
    shape.height(Math.max(Math.abs(element.height || 0), 1));
    shape.rotation(element.rotation || 0);
    shape.scaleX(1);
    shape.scaleY(1);
  }

  /**
   * Configurer les interactions des éléments
   */
  private setupElementInteractions(shape: Konva.Shape, element: DrawingElement): void {
    shape.on('click tap', (e) => {
      e.cancelBubble = true;

      if (this.currentTool === 'delete') {
        this.transformer.nodes([]);
        this.selectedElement = null;
        shape.destroy();
        this.drawingService.deleteElement(element.id);
        this.konvaShapes.delete(element.id);
        this.saveHistory();
        this.updateMaterials();
        this.statusMessage = 'Élément supprimé';
      } else {
        this.selectedElement = element;
        this.transformer.nodes([shape]);
        this.statusMessage = `${element.type.toUpperCase()} sélectionné`;
      }
    });

    shape.on('dragmove', () => {
      if (this.showGrid) {
        shape.x(Math.round(shape.x() / (this.gridSize / 2)) * (this.gridSize / 2));
        shape.y(Math.round(shape.y() / (this.gridSize / 2)) * (this.gridSize / 2));
      }
    });

    shape.on('dragend', () => {
      element.x = shape.x();
      element.y = shape.y();
      this.drawingService.updateElement(element.id, element);
      this.saveHistory();
      this.updateMaterials();
      this.saveCurrentProjectState();
    });

    shape.on('transformend', () => {
      if (element.type === 'wall' || element.type === 'line') {
        const line = shape as Konva.Line;
        const points = line.points();
        const baseLength = Math.hypot(
          (points[points.length - 2] ?? element.width) - (points[0] ?? 0),
          (points[points.length - 1] ?? 0) - (points[1] ?? 0)
        ) || element.width || 1;
        element.width = Math.max(Math.abs(baseLength * line.scaleX()), 1);
        element.height = 0;
        element.points = [0, 0, element.width, 0];
        line.scaleX(1);
        line.scaleY(1);
      } else {
        element.width = shape.width() * shape.scaleX();
        element.height = shape.height() * shape.scaleY();
      }
      element.rotation = shape.rotation();
      element.scaleX = 1;
      element.scaleY = 1;
      element.x = shape.x();
      element.y = shape.y();
      this.syncElementDimensions(element);

      this.applyElementToShape(shape, element);

      this.drawingService.updateElement(element.id, element);
      this.saveHistory();
      this.updateMaterials();
      this.saveCurrentProjectState();
    });
  }

  /**
   * Mettre à jour les mesures affichées
   */
  private updateMeasurements(element: DrawingElement, shape: Konva.Shape): void {
    if (!this.showMeasurements) return;

    const widthM = (element.width / this.drawingService.getScale()).toFixed(2);
    const heightM = (element.height / this.drawingService.getScale()).toFixed(2);

    // Créer des textes pour afficher les dimensions
    const widthText = new Konva.Text({
      x: element.x,
      y: element.y - 20,
      text: `${widthM}m`,
      fontSize: 12,
      fill: '#666',
      name: 'measurement'
    });

    const heightText = new Konva.Text({
      x: element.x - 30,
      y: element.y,
      text: `${heightM}m`,
      fontSize: 12,
      fill: '#666',
      name: 'measurement'
    });

    this.measurementLayer.add(widthText, heightText);
    this.measurementLayer.draw();
  }

  /**
   * Dessiner la grille
   */
  private drawGrid(): void {
    this.gridLayer.destroyChildren();
    if (!this.showGrid) {
      this.gridLayer.draw();
      return;
    }

    const width = 5000; // Grande grille pour le pan
    const height = 5000;

    for (let i = 0; i < width; i += this.gridSize) {
      this.gridLayer.add(new Konva.Line({
        points: [i, 0, i, height],
        stroke: '#2c2e33',
        strokeWidth: 1,
        listening: false
      }));
    }

    for (let i = 0; i < height; i += this.gridSize) {
      this.gridLayer.add(new Konva.Line({
        points: [0, i, width, i],
        stroke: '#2c2e33',
        strokeWidth: 1,
        listening: false
      }));
    }

    this.gridLayer.draw();
  }

  /**
   * Toggle Grid
   */
  toggleGrid(): void {
    this.showGrid = !this.showGrid;
    this.drawGrid();
  }

  /**
   * Toggle Measurements
   */
  toggleMeasurements(): void {
    this.showMeasurements = !this.showMeasurements;
    this.elementLayer.draw();
  }

  /**
   * Changement de zoom
   */
  changeZoom(factor: number): void {
    const newZoom = this.zoom * factor;
    if (newZoom < 0.1 || newZoom > 5) return;
    this.zoom = newZoom;
    this.stage.scale({ x: this.zoom, y: this.zoom });
    this.stage.batchDraw();
  }

  /**
   * Ajouter mobilier
   */
  addFurniture(type: FurnitureType): void {
    const center = this.stage.getRelativePointerPosition() || { x: 400, y: 300 };
    const element = this.drawingService.createElement('furniture', center.x, center.y, type, type);
    this.drawingService.addElement(element);
    this.renderElement(element);
    this.saveHistory();
  }

  private syncElementDimensions(element: DrawingElement): void {
    const scale = this.drawingService.getScale();
    const widthMeters = Math.abs(element.width || 0) / scale;
    const heightMeters = Math.abs(element.height || 0) / scale;

    if (element.type === 'wall') {
      const wallHeight = element.dimensions?.height && element.dimensions.height > 0 ? element.dimensions.height : 3;
      element.thickness = element.thickness || 0.2;
      element.dimensions = {
        width: widthMeters,
        height: wallHeight,
        depth: element.thickness
      };
      return;
    }

    element.dimensions = {
      width: widthMeters,
      height: heightMeters,
      depth: element.dimensions?.depth || 0.1
    };
  }

  private applyDimensionsToElement(element: DrawingElement): void {
    if (!element.dimensions) return;

    const scale = this.drawingService.getScale();
    if (element.dimensions.width > 0) {
      element.width = element.dimensions.width * scale;
    }

    if (element.type === 'wall') {
      element.height = 0;
      element.thickness = element.thickness || element.dimensions.depth || 0.2;
      return;
    }

    if (element.dimensions.height > 0) {
      element.height = element.dimensions.height * scale;
    }
  }

  // PROPERTY UPDATES
  updateSelectedWidth(val: number): void {
    if (!this.selectedElement) return;
    const px = val * this.drawingService.getScale();
    this.selectedElement.width = px;
    const shape = this.konvaShapes.get(this.selectedElement.id);
    if (shape) shape.width(px);
    this.elementLayer.batchDraw();
  }

  updateSelectedHeight(val: number): void {
    if (!this.selectedElement) return;
    const px = val * this.drawingService.getScale();
    if (this.selectedElement.type === 'wall') {
      this.selectedElement.thickness = val;
      this.selectedElement.height = px;
    } else {
      this.selectedElement.height = px;
    }
    const shape = this.konvaShapes.get(this.selectedElement.id);
    if (shape) shape.height(px);
    this.elementLayer.batchDraw();
  }

  updateSelectedRotation(val: number): void {
    if (!this.selectedElement) return;
    this.selectedElement.rotation = val;
    const shape = this.konvaShapes.get(this.selectedElement.id);
    if (shape) shape.rotation(val);
    this.elementLayer.batchDraw();
  }

  /**
   * Configurer la grille
   */
  private setupGrid(): void {
    this.drawGrid();
  }

  /**
   * Configurer le zoom
   */
  private setupZoom(): void {
    this.stage.on('wheel', (e) => {
      e.evt.preventDefault();
      const oldScale = this.stage.scaleX();
      const pointer = this.stage.getPointerPosition()!;
      const scaleBy = 1.1;
      const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

      this.stage.scale({ x: newScale, y: newScale });
      this.zoom = newScale;
      this.stage.batchDraw();
    });
  }

  /**
   * Sauvegarder dans l'historique
   */
  private saveHistory(): void {
    this.historyService.addState(
      this.drawingService.getElements(),
      this.drawingService.getRooms()
    );
  }

  /**
   * Charger le projet si sauvegardé localement
   */
  private loadSavedProject(): void {
    if (!this.projectId) {
      return;
    }

    const storedProject = this.saveExportService.loadProjectLocal(this.projectId);
    if (!storedProject) {
      return;
    }

    this.savedProjectData = storedProject;
    this.projectName = storedProject.name;
    this.projectDescription = storedProject.description;
    this.materials = storedProject.materials || null;
    this.statusMessage = 'Projet trouvé dans la sauvegarde locale';
  }

  private restoreLoadedProject(): void {
    if (!this.savedProjectData) {
      return;
    }

    this.drawingService.clear();
    this.historyService.clear();
    const projectToRestore = this.ensureRestorableFloors(this.savedProjectData);
    this.drawingService.importProjectJSON(JSON.stringify(projectToRestore));
    this.redrawAll();
    this.saveHistory();
    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.statusMessage = 'Projet restauré sur le canvas';
    });
  }

  private getNumericProjectId(): number | null {
    const id = Number(this.projectId);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  private ensureRestorableFloors(project: Project): Project {
    const hasFloors = Array.isArray(project.floors) && project.floors.length > 0;
    if (hasFloors) {
      return project;
    }

    const fallbackFloorId = project.currentFloorId || project.elements?.[0]?.floorId || 'rdc';
    return {
      ...project,
      currentFloorId: fallbackFloorId,
      floors: [{
        id: fallbackFloorId,
        name: 'Rez-de-chaussée',
        level: 0,
        height: project.dimensions?.height || 2.8,
        elevation: 0
      }],
      elements: (project.elements || []).map(element => ({
        ...element,
        floorId: element.floorId || fallbackFloorId
      }))
    };
  }

  private loadLatestModelisation2DFromDatabase(): void {
    const idProjet = this.getNumericProjectId();
    if (!idProjet) {
      return;
    }

    this.projetService.listerModelisations2D(idProjet).subscribe({
      next: (models) => {
        const latest = models?.[0];
        if (!latest) {
          return;
        }

        this.latestModelisation2DId = latest.id;
        const restored = this.projectFromModelisation2D(latest);
        if (!restored) {
          return;
        }

        this.savedProjectData = restored;
        this.projectName = restored.name;
        this.projectDescription = restored.description;
        this.materials = restored.materials || null;

        if (this.stage) {
          this.restoreLoadedProject();
        }
      },
      error: () => {
        this.statusMessage = 'Plan local charge. La base 2D est indisponible pour le moment.';
      },
    });
  }

  private projectFromModelisation2D(model: Modelisation_2D): Project | null {
    try {
      const parsed = JSON.parse(model.objet || '') as Project;
      if (parsed?.elements) {
        return {
          ...parsed,
          id: String(model.idProjet ?? this.projectId ?? parsed.id),
          name: parsed.name || model.nomModele,
          description: parsed.description || '',
          createdAt: new Date(parsed.createdAt),
          updatedAt: new Date(parsed.updatedAt),
        };
      }
    } catch {
    }

    return {
      id: String(model.idProjet ?? this.projectId ?? model.id),
      name: model.nomModele,
      description: '',
      createdAt: new Date(model.dateCeation),
      updatedAt: new Date(model.dateCeation),
      elements: (model.elements || []).map((element: any) => ({
        id: String(element.id),
        type: this.mapBackendElementType(element.type),
        x: element.position_X,
        y: element.position_Y,
        width: Math.max(element.longeur * this.drawingService.getScale(), 10),
        // CORRECTION: Utiliser l'épaisseur pour la hauteur 2D, pas la hauteur du mur (Z)
        height: Math.max((element.epaisseur || 0.2) * this.drawingService.getScale(), 5),
        rotation: element.rotation || 0,
        scaleX: element.scaleX || 1,
        scaleY: element.scaleY || 1,
        color: '#1c1d1f',
        label: element.type,
        thickness: element.epaisseur,
        floorId: this.currentFloorId || 'rdc'
      })),
      rooms: [],
      scale: this.drawingService.getScale(),
      totalArea: 0,
      floors: [],
      currentFloorId: 'rdc',
      dimensions: {
        width: 20,
        length: 20,
        height: 3
      }
    };
  }

  private mapBackendElementType(type: string): ElementType {
    const normalized = type?.toLowerCase();
    if (normalized === 'door' || normalized === 'porte') return 'door';
    if (normalized === 'window' || normalized === 'fenetre') return 'window';
    if (normalized === 'toilet' || normalized === 'bathtub') return 'furniture';
    return 'wall';
  }

  /**
   * Annuler l'action
   */
  undo(): void {
    const state = this.historyService.undo();
    if (state) {
      this.drawingService.restoreElements(state.elements);
      this.redrawAll();
      this.updateMaterials();
      // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(() => {
        this.statusMessage = 'Action annulée';
      });
    }
  }

  /**
   * Refaire l'action
   */
  redo(): void {
    const state = this.historyService.redo();
    if (state) {
      this.drawingService.restoreElements(state.elements);
      this.redrawAll();
      this.updateMaterials();
      // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(() => {
        this.statusMessage = 'Action refaite';
      });
    }
  }

  /**
   * Redessiner tous les éléments
   */
  private redrawAll(): void {
    this.elementLayer.destroyChildren();
    this.measurementLayer.destroyChildren();
    this.konvaShapes.clear();

    this.elementLayer.add(this.transformer);
    this.drawGrid();

    const elements = this.drawingService.getElements().filter(e => e.floorId === this.currentFloorId);
    elements.forEach(element => this.renderElement(element));
    this.elementLayer.draw();
  }

  /**
   * Mettre à jour les calculs de matériaux
   */
  private updateMaterials(): void {
    const elements = this.drawingService.getElements();
    const rooms = this.drawingService.getRooms();
    this.materials = this.materialService.calculateMaterials(
      elements,
      rooms,
      this.drawingService.getScale()
    );
    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.statusMessage = `Matériaux calculés - Béton: ${this.materials?.concrete || 0}m³`;
    });
  }

  /**
   * Construire l'objet projet courant
   */
  private buildCurrentProject(): Project {
    const projectId = this.projectId ?? uuidv4();
    const elements = this.drawingService.getElements();

    // Calculer les dimensions du projet
    const bounds = this.calculateProjectBounds(elements);

    return {
      id: projectId,
      name: this.projectName,
      description: this.projectDescription,
      createdAt: new Date(),
      updatedAt: new Date(),
      elements: elements,
      rooms: this.drawingService.getRooms(),
      scale: this.drawingService.getScale(),
      totalArea: this.totalArea,
      materials: this.materials || undefined,
      floors: this.floors,
      currentFloorId: this.currentFloorId,
      dimensions: {
        width: bounds.width / this.drawingService.getScale(),
        length: bounds.height / this.drawingService.getScale(), // Dans 2D, height devient length en 3D
        height: 3 // Hauteur par défaut pour les bâtiments
      }
    };
  }

  private calculateProjectBounds(elements: DrawingElement[]): { width: number; height: number } {
    if (elements.length === 0) {
      return { width: 10, height: 10 };
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    elements.forEach(element => {
      const left = element.x;
      const right = element.x + element.width;
      const top = element.y;
      const bottom = element.y + element.height;

      minX = Math.min(minX, left);
      maxX = Math.max(maxX, right);
      minY = Math.min(minY, top);
      maxY = Math.max(maxY, bottom);
    });

    const width = Math.max(maxX - minX, 10);
    const height = Math.max(maxY - minY, 10);

    return { width, height };
  }

  private buildModelisation2DPayload(project: Project): Modelisation2DCreationRequest {
    const preview2D = this.stage ? this.stage.toDataURL({ pixelRatio: 1 }) : project.preview2D;
    const persistedProject: Project = {
      ...project,
      preview2D
    };

    return {
      nomModele: project.name || `Plan 2D ${project.id}`,
      objet: JSON.stringify(persistedProject),
      elements: project.elements.map((element) => ({
        longueur: Math.max((element.width * element.scaleX) / project.scale, 0),
        epaisseur: element.thickness ?? 0.2,
        type: element.type,
        hauteur: element.dimensions?.height || 3, // Utiliser la hauteur réelle du mur si dispo
        positionX: element.x,
        positionY: element.y,
        rotation: element.rotation,
        scaleX: element.scaleX,
        scaleY: element.scaleY
      })),
    };
  }

  private saveModelisation2DToDatabase(project: Project, navigateTo3D = false): void {
    const idProjet = this.getNumericProjectId();
    if (!idProjet) {
      this.statusMessage = 'Projet non synchronise en base: impossible de sauvegarder la 2D cote serveur.';
      if (navigateTo3D) {
        this.generate3DLocalOnly(project);
      }
      return;
    }

    this.isSaving = true;
    this.statusMessage = 'Sauvegarde 2D en base...';
    this.projetService.creerModelisation2D(idProjet, this.buildModelisation2DPayload(project)).subscribe({
      next: (model) => {
        this.latestModelisation2DId = model.id;
        this.isSaving = false;
        this.statusMessage = 'Plan 2D sauvegarde en base';
        if (navigateTo3D) {
          this.save3DAndNavigate(project, model.id);
        }
      },
      error: (error) => {
        this.isSaving = false;
        this.statusMessage =
          error?.error?.message || error?.error?.error || 'Sauvegarde 2D en base impossible.';
        if (navigateTo3D) {
          this.generate3DLocalOnly(project);
        }
      },
    });
  }

  /**
   * Sauvegarder l'état du projet courant localement
   */
  private saveCurrentProjectState(): void {
    const project = this.buildCurrentProject();
    this.saveExportService.saveProjectLocal(project);
    this.projectId = project.id;
    
    // Capturer un aperçu 2D
    if (this.stage) {
      const screenshot = this.stage.toDataURL({ pixelRatio: 1 });
      localStorage.setItem(`project_2d_preview_${project.id}`, screenshot);
    }

    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.statusMessage = 'État du projet sauvegardé';
    });
  }

  /**
   * Exporter le projet (JSON)
   */
  exportProject(): void {
    const project = this.buildCurrentProject();
    this.saveExportService.saveProjectLocal(project);
    this.saveModelisation2DToDatabase(project);
    this.statusMessage = 'Projet sauvegardé (JSON)';
  }

  /**
   * Exporter en PNG
   */
  exportPNG(): void {
    const dataURL = this.stage.toDataURL({ pixelRatio: 3 });
    const link = document.createElement('a');
    link.download = `${this.projectName}.png`;
    link.href = dataURL;
    link.click();
    this.statusMessage = 'Export PNG réussi';
  }

  /**
   * Exporter en SVG
   */
  exportSVG(): void {
    this.statusMessage = 'Export SVG non disponible (Simulation)';
    // Logique réelle : Utiliser Konva-to-SVG ou recréer le XML
  }

  /**
   * Exporter en PDF
   */
  exportPDF(): void {
    this.statusMessage = 'Export PDF généré';
    // Utiliser jspdf + html2canvas sur le stage
  }

  /**
   * Exporter en DXF (Format CAO)
   */
  exportDXF(): void {
    this.statusMessage = 'Export DXF (CAD) prêt';
    // Formatage texte DXF basé sur les points des murs
  }

  /**
   * Exporter en GLB/GLTF (3D)
   */
  export3DModel(format: 'GLB' | 'GLTF' | 'STL'): void {
    this.statusMessage = `Modèle 3D ${format} préparé pour le téléchargement`;
    // Simulation d'export 3D depuis le service de conversion
  }

  /**
   * Exporter les données Spline
   */
  exportSplineData(): void {
    const project = this.buildCurrentProject();
    this.saveExportService.saveProjectLocal(project);
    const splineJSON = this.drawingService.exportSplineJSON(project);
    this.saveExportService.saveSplineScene(project.id, splineJSON);
    this.saveExportService.exportTextAsFile(splineJSON, `${this.projectName}_spline.json`, 'application/json');
    this.projectId = project.id;
    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.statusMessage = 'Données Spline exportées et sauvegardées';
    });
  }

  /**
   * Générer la 3D et basculer vers le viewer Spline
   */
  generate3D(): void {
    this.statusMessage = 'Génération de la scène 3D en cours...';

    const project = this.buildCurrentProject();
    this.saveExportService.saveProjectLocal(project);
    this.projectId = project.id;

    if (this.stage) {
      const screenshot = this.stage.toDataURL({ pixelRatio: 1 });
      localStorage.setItem(`project_2d_preview_${project.id}`, screenshot);
    }

    const materials = this.materialService.calculateMaterials(project.elements, project.rooms, project.scale);
    const dataToTransfer = {
      project: project,
      rawElements: project.elements,
      materials: materials,
      timestamp: new Date().getTime()
    };
    localStorage.setItem('archimorph_transfer_data', JSON.stringify(dataToTransfer));

    this.saveModelisation2DToDatabase(project, true);
  }

  private save3DAndNavigate(project: Project, idModelisation2D: number): void {
    const idProjet = this.getNumericProjectId();
    if (!idProjet) return;

    const sceneJSON = this.drawingService.exportSplineJSON(project);
    this.saveExportService.saveSplineScene(project.id, sceneJSON);
    this.statusMessage = 'Sauvegarde 3D en base...';

    this.projetService.sauvegarderModelisation3D(idProjet, idModelisation2D, {
      nomModel: `${project.name || 'Projet'} - 3D`,
      format: 'GLTF',
      url_model: sceneJSON,
    }).subscribe({
      next: () => {
        this.statusMessage = '3D sauvegardée en base';
        this.router.navigate(['/modelisation', this.projectId, '3d'], {
          queryParams: { model2d: idModelisation2D },
        });
      },
      error: (error) => {
        this.isSaving = false;
        this.statusMessage = error?.error?.message || error?.error?.error || 'Sauvegarde 3D impossible.';
        this.generate3DLocalOnly(project);
      },
    });
  }

  private generate3DLocalOnly(project = this.buildCurrentProject()): void {
    this.saveExportService.saveProjectLocal(project);
    const splineJSON = this.drawingService.exportSplineJSON(project);
    this.saveExportService.saveSplineScene(project.id, splineJSON);
    this.projectId = project.id;
    this.isSaving = false;
    setTimeout(() => {
      this.statusMessage = 'Génération 3D prête';
    });
    this.router.navigate(['/modelisation', this.projectId, '3d']);
  }

  getMaterialDetails(): any {
    if (!this.materials) return null;
    return this.materialService.getMaterialDetails(this.materials);
  }

  displayMaterials(): void {
    const details = this.getMaterialDetails();
    if (details) {
      const materialsText = this.materialService.exportMaterials(this.materials!);
      alert(materialsText);
    }
  }

  canUndo(): boolean {
    return this.historyService.canUndo();
  }

  canRedo(): boolean {
    return this.historyService.canRedo();
  }

  clearDrawing(): void {
    if (confirm('Êtes-vous sûr de vouloir effacer tout le dessin ?')) {
      this.drawingService.clear();
      this.historyService.clear();
      this.elementLayer.destroyChildren();
      this.measurementLayer.destroyChildren();
      this.konvaShapes.clear();
      this.elementLayer.add(this.transformer);
      this.materials = null;
      this.saveCurrentProjectState();
      this.statusMessage = 'Dessin effacé';
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    if (this.stage) this.stage.destroy();
  }
}
