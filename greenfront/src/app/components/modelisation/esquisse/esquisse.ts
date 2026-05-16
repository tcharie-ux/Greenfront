import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { v4 as uuidv4 } from 'uuid';
import { WorkspaceData } from '../../../services/workspace-data';
import { Authentification } from '../../../services/authentification';
import { ProjetService } from '../../../services/projet.service';
import { CommonModule } from '@angular/common';

interface SketchPoint {
  x: number;
  y: number;
}

interface SketchShape {
  tool: 'mur' | 'porte' | 'fenetre';
  points: SketchPoint[];
}

@Component({
  selector: 'app-esquisse',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './esquisse.html',
  styleUrls: ['./esquisse.scss'],
})
export class Esquisse implements OnInit, AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  ctx!: CanvasRenderingContext2D;

  currentTool: SketchShape['tool'] | 'delete' = 'mur';
  statusMessage = 'Clique pour commencer à dessiner';
  projectName = 'Projet';
  projectId: string | null = null;
  currentUserId = 'guest';

  public shapes: SketchShape[] = [];
  isSaving = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly workspaceData: WorkspaceData,
    private readonly authService: Authentification,
    private readonly projetService: ProjetService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUser()?.id ?? 'guest';
    this.projectId = this.route.snapshot.paramMap.get('id') ?? uuidv4();
    const project = this.workspaceData.getProjectById(this.projectId);
    this.projectName = project?.name ?? 'Projet';
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;

    canvas.width = canvas.parentElement!.clientWidth;
    canvas.height = 500;

    this.ctx = canvas.getContext('2d')!;
    this.draw();
    this.loadSavedSketch();
    this.loadLatestSketchFromDatabase();

    canvas.addEventListener('click', (e) => this.handleClick(e));
  }
 
  getMousePos(event: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  setTool(tool: string) {
    this.currentTool = tool as SketchShape['tool'];
    this.statusMessage = `Outil actif : ${tool}`;
  }

  handleClick(e: MouseEvent) {
    const pos = this.getMousePos(e);

    if (this.currentTool === 'delete') {
      const index = this.findShapeIndexAt(pos);
      if (index !== -1) {
        this.shapes.splice(index, 1);
        this.draw();
        this.statusMessage = 'Élément supprimé';
      } else {
        this.statusMessage = 'Aucun élément à supprimer ici';
      }
      return;
    }

    if (this.currentTool === 'mur') {
      const lastShape = this.shapes[this.shapes.length - 1];
      if (lastShape?.tool === 'mur') {
        lastShape.points.push(pos);
      } else {
        this.shapes.push({ tool: 'mur', points: [pos] });
      }
    } else {
      this.shapes.push({ tool: this.currentTool, points: [pos] });
    }

    this.draw();
  }

  draw() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawGrid();
    this.drawSketch();
  }
 
  drawGrid() {
    const size = 25;
    this.ctx.strokeStyle = '#e5e7eb';
    this.ctx.lineWidth = 1;

    for (let x = 0; x < this.canvasRef.nativeElement.width; x += size) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvasRef.nativeElement.height);
      this.ctx.stroke();
    }

    for (let y = 0; y < this.canvasRef.nativeElement.height; y += size) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvasRef.nativeElement.width, y);
      this.ctx.stroke();
    }
  }
 
  drawSketch() {
    this.shapes.forEach((shape) => {
      if (shape.tool === 'mur') {
        if (shape.points.length < 2) {
          return;
        }

        this.ctx.strokeStyle = '#173b35';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(shape.points[0].x, shape.points[0].y);

        for (let i = 1; i < shape.points.length; i++) {
          this.ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }

        this.ctx.stroke();
        return;
      }

      const point = shape.points[0];
      if (!point) {
        return;
      }

      if (shape.tool === 'porte') {
        this.ctx.strokeStyle = '#b85c38';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(point.x - 20, point.y);
        this.ctx.lineTo(point.x + 20, point.y);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(point.x + 20, point.y, 8, -Math.PI / 2, Math.PI / 2);
        this.ctx.stroke();
        return;
      }

      if (shape.tool === 'fenetre') {
        this.ctx.strokeStyle = '#2d7ca6';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(point.x - 18, point.y - 10);
        this.ctx.lineTo(point.x - 18, point.y + 10);
        this.ctx.lineTo(point.x + 18, point.y + 10);
        this.ctx.lineTo(point.x + 18, point.y - 10);
        this.ctx.closePath();
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(point.x - 18, point.y);
        this.ctx.lineTo(point.x + 18, point.y);
        this.ctx.moveTo(point.x, point.y - 10);
        this.ctx.lineTo(point.x, point.y + 10);
        this.ctx.stroke();
      }
    });
  }
  
  private findShapeIndexAt(pos: SketchPoint): number {
    const threshold = 15; // pixels
    
    // On parcourt à l'envers pour supprimer l'élément le plus récent (au-dessus)
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const shape = this.shapes[i];
      
      if (shape.tool === 'mur') {
        for (let j = 0; j < shape.points.length - 1; j++) {
          if (this.getDistanceToSegment(pos, shape.points[j], shape.points[j + 1]) < threshold) {
            return i;
          }
        }
      } else {
        // Porte ou Fenêtre (points uniques)
        if (this.getDistance(pos, shape.points[0]) < threshold + 10) {
          return i;
        }
      }
    }
    
    return -1;
  }

  private getDistance(p1: SketchPoint, p2: SketchPoint): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }

  private getDistanceToSegment(p: SketchPoint, v: SketchPoint, w: SketchPoint): number {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return this.getDistance(p, v);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return this.getDistance(p, {
      x: v.x + t * (w.x - v.x),
      y: v.y + t * (w.y - v.y)
    });
  }

  clearSketch() {
    this.shapes = [];
    this.draw();
  }

  private getSketchStorageKey(): string {
    return `esquisse-${this.currentUserId}-${this.projectId ?? 'unknown'}`;
  }

  private loadLatestSketchFromDatabase(): void {
    const idProjet = this.getNumericProjectId();
    if (!idProjet) return;

    this.projetService.listerEsquisses(idProjet).subscribe({
      next: (sketches) => {
        if (sketches && sketches.length > 0) {
          // On pourrait charger l'image ici, mais on privilégie le vectoriel local pour l'édition
          console.log('Esquisses trouvées en base:', sketches.length);
        }
      }
    });
  }

  private async saveCanvasSnapshot(): Promise<void> {
    const canvas = this.canvasRef.nativeElement;
    if (!canvas) {
      return;
    }

    // Sauvegarde de l'image pour l'aperçu
    const dataUrl = canvas.toDataURL('image/png');
    localStorage.setItem(this.getSketchStorageKey(), dataUrl);
    
    // Sauvegarde des données vectorielles (shapes) pour réédition
    localStorage.setItem(`${this.getSketchStorageKey()}-data`, JSON.stringify(this.shapes));
  }

  private getNumericProjectId(): number | null {
    const id = Number(this.projectId);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  private loadSavedSketch(): void {
    const storedImage = localStorage.getItem(this.getSketchStorageKey());
    const storedData = localStorage.getItem(`${this.getSketchStorageKey()}-data`);

    if (storedData) {
      try {
        this.shapes = JSON.parse(storedData);
        this.draw();
      } catch (e) {
        console.error('Erreur chargement données esquisse', e);
      }
    } else if (storedImage) {
      const image = new Image();
      image.onload = () => {
        this.ctx.drawImage(image, 0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
      };
      image.src = storedImage;
    }
  }

  async save() {
    if (this.isSaving) return;

    this.isSaving = true;
    this.statusMessage = 'Sauvegarde du modèle...';

    // 1. Sauvegarde locale
    await this.saveCanvasSnapshot();

    // 2. Sauvegarde base de données (si ID projet valide)
    const idProjet = this.getNumericProjectId();
    if (!idProjet) {
      this.statusMessage = 'Modèle sauvegardé localement.';
      this.isSaving = false;
      return;
    }

    // Préparation du payload avec les données vectorielles dans "objet"
    const canvas = this.canvasRef.nativeElement;
    canvas.toBlob((blob) => {
      if (!blob) {
        this.isSaving = false;
        return;
      }

      // On utilise ajouterEsquisse pour l'image
      this.projetService.ajouterEsquisse(idProjet, blob).subscribe({
        next: () => {
          // On pourrait aussi sauvegarder le JSON ici si l'API le permettait, 
          // mais on va se fier au localStorage pour la réouverture "créative" pour l'instant
          this.statusMessage = 'Modèle et aperçu sauvegardés ✔️';
          this.isSaving = false;
        },
        error: () => {
          this.statusMessage = 'Erreur lors de la sauvegarde distante.';
          this.isSaving = false;
        }
      });
    }, 'image/png');
  }

  async saveAndGoTo2D() {
    if (this.isSaving) {
      return;
    }

    await this.save();

    if (!this.projectId) {
      this.statusMessage = 'Aucun projet trouvé pour passer en 2D.';
      return;
    }

    this.statusMessage = 'Passage au 2D ✔️';
    this.router.navigate(['/modelisation', this.projectId, '2d']);
  }
}
