import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjetService } from '../../../services/projet.service';
import { Projet } from '../../../models/Projet';
import { Authentification } from '../../../services/authentification';
import { MaterialCalculationService } from '../../../services/material-calculation.service';
import { Project as DrawingProject } from '../../../models/drawing-element';
import jsPDF from 'jspdf';

type ProjectStep = 'esquisse' | '2d' | '3d' | 'estimation';

@Component({
  selector: 'app-mesprojet',
  standalone: false,
  templateUrl: './mesprojet.html',
  styleUrl: './mesprojet.scss',
})
export class Mesprojet implements OnInit {
  projectId: number | null = null;
  project: Projet | null = null;
  projects: Projet[] = [];
  currentStep: ProjectStep = 'esquisse';
  loading = true;
  errorMessage = '';

  // Previews
  sketchImageUrl: string | null = null;
  plan2DImageUrl: string | null = null;

  // Estimation data
  materials: any = null;
  is3DReady = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly projetService: ProjetService,
    private readonly authService: Authentification,
    private readonly materialService: MaterialCalculationService
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.projectId = params['projectId'] ? Number(params['projectId']) : null;
      if (this.projectId) {
        this.loadProject();
      } else {
        this.loadProjectsList();
      }
    });
  }

  loadProjectsList(): void {
    this.loading = true;
    this.errorMessage = '';
    this.project = null;
    this.projetService.listerMesProjets().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger vos projets.';
        this.loading = false;
      },
    });
  }

  selectProject(id: number): void {
    localStorage.setItem('greenfront_last_project_id', String(id));
    this.router.navigate(['/mesprojets'], { queryParams: { projectId: id } });
  }

  createProject(): void {
    this.router.navigate(['/create-projet']);
  }

  loadProject(): void {
    if (!this.projectId) return;

    this.loading = true;
    this.projetService.listerMesProjets().subscribe({
      next: (projects) => {
        this.project = projects.find(p => p.id === this.projectId) || null;
        if (this.project) {
          this.check3DStatus();
          this.loadSketchPreview();
          this.loadLocalPreviews();
        } else {
          this.errorMessage = 'Projet introuvable.';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors du chargement du projet.';
        this.loading = false;
      }
    });
  }

  private loadSketchPreview(): void {
    if (!this.projectId || !this.project?.architectures?.length) return;

    const latestSketch = this.project.architectures[0];
    this.projetService.telechargerEsquisse(this.projectId, latestSketch.id).subscribe({
      next: (blob) => {
        this.sketchImageUrl = URL.createObjectURL(blob);
      }
    });
  }

  private loadLocalPreviews(): void {
    if (!this.projectId) return;
    this.plan2DImageUrl = localStorage.getItem(`project_2d_preview_${this.projectId}`);

    if (!this.plan2DImageUrl) {
      this.loadLatest2DPreviewFromDatabase();
    }

    const screenshot3D = localStorage.getItem(`project_3d_preview_${this.projectId}`);
    if (screenshot3D && this.currentStep === '3d') {
      // Logic for 3D preview if needed
    }
  }

  private loadLatest2DPreviewFromDatabase(): void {
    if (!this.projectId) return;

    this.projetService.listerModelisations2D(this.projectId).subscribe({
      next: (models) => {
        const latest = models?.[0];
        if (!latest?.objet) return;

        try {
          const savedProject = JSON.parse(latest.objet) as DrawingProject;
          if (savedProject?.preview2D) {
            this.plan2DImageUrl = savedProject.preview2D;
            localStorage.setItem(`project_2d_preview_${this.projectId}`, savedProject.preview2D);
          }

        } catch {
          // L'ancien format serveur ne contenait pas toujours un objet 2D complet.
        }
      }
    });
  }

  setStep(step: ProjectStep): void {
    if (step === '3d' || step === 'estimation') {
      const has2D = this.project?.modeles2D && this.project.modeles2D.length > 0;
      if (!has2D) {
        this.errorMessage = 'Vous devez d\'abord créer un plan 2D pour accéder à la 3D.';
        setTimeout(() => this.errorMessage = '', 3000);
        return;
      }
    }
    this.currentStep = step;
    if (step === 'estimation') {
      this.updateEstimation();
    }
  }

  private check3DStatus(): void {
    // Dans notre logique, si le projet est "statut: true" ou s'il y a des modélisations 3D rattachées
    this.is3DReady = !!(this.project?.statut || localStorage.getItem('archimorph_transfer_data'));
  }

  updateEstimation(): void {
    if (!this.is3DReady) return;

    // Récupérer les données de transfert (volumes calculés en 3D)
    const rawData = localStorage.getItem('archimorph_transfer_data');
    if (rawData) {
      const data = JSON.parse(rawData);
      this.materials = data.materials;
    }
  }

  getMaterialPercentage(value: number, type: string): number {
    if (!value) return 0;
    // Simple normalization for progress bars
    // Based on average house values
    const maxValues: { [key: string]: number } = {
      concrete: 50,
      cement: 15000,
      sand: 30,
      gravel: 40,
      iron: 4000
    };
    const max = maxValues[type] || 100;
    return Math.min(100, (value / max) * 100);
  }

  modifier(): void {
    if (!this.projectId) return;

    switch (this.currentStep) {
      case 'esquisse':
        this.router.navigate(['/modelisation', this.projectId, 'esquisse']);
        break;
      case '2d':
        this.router.navigate(['/modelisation', this.projectId, '2d']);
        break;
      case '3d':
        this.router.navigate(['/modelisation', this.projectId, '3d']);
        break;
    }
  }

  generatePDF(): void {
    if (!this.materials || !this.project) return;

    const element = document.querySelector('.editorial-report') as HTMLElement;
    if (!element) {
      console.error('Élément .editorial-report non trouvé');
      return;
    }

    // On utilise html2canvas pour capturer le rendu exact avec le CSS
    import('html2canvas').then((html2canvas) => {
      html2canvas.default(element, {
        scale: 2, // Meilleure qualité
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Si le contenu dépasse une page
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`Rapport_BIM_${this.project?.nomProjet || 'Projet'}.pdf`);
      });
    });
  }

  get3DPreview(): string | null {
    if (!this.projectId) return null;
    return localStorage.getItem(`project_3d_preview_${this.projectId}`);
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }
}
