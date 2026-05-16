/**
 * Service de sauvegarde et export du projet
 */
import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { Authentification } from './authentification';
import { Project } from '../models/drawing-element';

@Injectable({
  providedIn: 'root'
})
export class SaveExportService {
  
  private readonly STORAGE_KEY_PREFIX = 'greenfront_projects';
  private readonly MAX_PROJECTS = 20;

  constructor(private readonly authService: Authentification) {}

  /**
   * Sauvegarder un projet localement
   */
  private getStorageKey(): string {
    const currentUser = this.authService.getCurrentUser();
    return `${this.STORAGE_KEY_PREFIX}_${currentUser?.id ?? 'guest'}`;
  }

  saveProjectLocal(project: Project): boolean {
    try {
      const projects = this.getAllProjectsLocal();
      
      // Mettre à jour ou ajouter le projet
      const index = projects.findIndex(p => p.id === project.id);
      if (index >= 0) {
        projects[index] = project;
      } else {
        projects.push(project);
      }

      // Limiter le nombre de projets stockés
      if (projects.length > this.MAX_PROJECTS) {
        projects.shift();
      }

      localStorage.setItem(this.getStorageKey(), JSON.stringify(projects));
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      return false;
    }
  }

  /**
   * Charger tous les projets locaux
   */
  getAllProjectsLocal(): Project[] {
    try {
      const data = localStorage.getItem(this.getStorageKey());
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur lors de la lecture:', error);
      return [];
    }
  }

  /**
   * Charger un projet par ID
   */
  loadProjectLocal(id: string): Project | null {
    const projects = this.getAllProjectsLocal();
    return projects.find(p => p.id === id) || null;
  }

  /**
   * Supprimer un projet local
   */
  deleteProjectLocal(id: string): boolean {
    try {
      let projects = this.getAllProjectsLocal();
      projects = projects.filter(p => p.id !== id);
      localStorage.setItem(this.getStorageKey(), JSON.stringify(projects));
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      return false;
    }
  }

  /**
   * Sauvegarder un fichier de scène Spline par utilisateur
   */
  saveSplineScene(projectId: string, splineData: string): boolean {
    try {
      const userKey = this.authService.getCurrentUser()?.id ?? 'guest';
      localStorage.setItem(`spline_scene_${userKey}_${projectId}`, splineData);
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la scène Spline:', error);
      return false;
    }
  }

  /**
   * Charger une scène Spline par projet
   */
  loadSplineScene(projectId: string): string | null {
    try {
      const userKey = this.authService.getCurrentUser()?.id ?? 'guest';
      return localStorage.getItem(`spline_scene_${userKey}_${projectId}`);
    } catch (error) {
      console.error('Erreur lors de la lecture de la scène Spline:', error);
      return null;
    }
  }

  /**
   * Exporter un projet en fichier JSON
   */
  exportProjectAsJSON(project: Project): void {
    const dataStr = JSON.stringify(project, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    this.downloadFile(dataBlob, `${project.name}_${Date.now()}.json`);
  }

  /**
   * Exporter un contenu texte en fichier
   */
  exportTextAsFile(content: string, filename: string, mimeType = 'application/json'): void {
    const blob = new Blob([content], { type: mimeType });
    this.downloadFile(blob, filename);
  }

  /**
   * Exporter un rapport PDF
   */
  exportReportAsPDF(project: Project, materials: any): void {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const reportMaterials = materials || project.materials || {
      concrete: 0,
      cement: 0,
      sand: 0,
      gravel: 0,
      wood: 0,
      totalCost: 0
    };

    const totalCost = reportMaterials.totalCost || 0;
    const values = [
      { label: 'Béton', qty: reportMaterials.concrete || 0, unit: 'm³' },
      { label: 'Ciment', qty: reportMaterials.cement || 0, unit: 'kg' },
      { label: 'Sable', qty: reportMaterials.sand || 0, unit: 'm³' },
      { label: 'Gravier', qty: reportMaterials.gravel || 0, unit: 'm³' },
      { label: 'Bois', qty: reportMaterials.wood || 0, unit: 'm³' }
    ];

    const accent = { r: 201, g: 119, b: 28 };
    const accentSoft = { r: 245, g: 241, b: 232 };
    const dark = { r: 22, g: 22, b: 22 };
    const muted = { r: 102, g: 96, b: 79 };
    const border = { r: 222, g: 218, b: 210 };
    const background = { r: 249, g: 247, b: 242 };

    pdf.setFillColor(background.r, background.g, background.b);
    pdf.rect(0, 0, 210, 297, 'F');

    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(10, 10, 190, 43, 16, 16, 'F');
    pdf.setDrawColor(border.r, border.g, border.b);
    pdf.roundedRect(10, 10, 190, 43, 16, 16, 'S');

    pdf.setFontSize(28);
    pdf.setTextColor(dark.r, dark.g, dark.b);
    pdf.text('ARCHMORPH', 18, 27);

    pdf.setFontSize(9);
    pdf.setTextColor(muted.r, muted.g, muted.b);
    pdf.text('Rapport intelligent de matériaux — version éditoriale', 18, 34);

    pdf.setFontSize(8);
    pdf.setTextColor(muted.r, muted.g, muted.b);
    pdf.text(`Projet : ${project.name}`, 168, 18, { align: 'right' });
    pdf.text(`Type : Estimation issue d’un plan 2D`, 168, 24, { align: 'right' });
    pdf.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 168, 30, { align: 'right' });
    pdf.text(`Description : ${project.description || 'Non renseignée'}`, 168, 36, { align: 'right', maxWidth: 60 });

    const tableX = 12;
    const tableY = 58;
    const tableWidth = 118;
    const headerHeight = 13;
    const rowHeight = 11;
    const tableHeight = headerHeight + values.length * rowHeight;

    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(tableX, tableY, tableWidth, tableHeight + 6, 16, 16, 'F');
    pdf.setDrawColor(border.r, border.g, border.b);
    pdf.roundedRect(tableX, tableY, tableWidth, tableHeight + 6, 16, 16, 'S');

    pdf.setFillColor(accentSoft.r, accentSoft.g, accentSoft.b);
    pdf.rect(tableX, tableY, tableWidth, headerHeight, 'F');

    pdf.setFontSize(9);
    pdf.setTextColor(dark.r, dark.g, dark.b);
    pdf.text('Détail des matériaux', tableX + 5, tableY - 2);

    pdf.setFontSize(8);
    pdf.setTextColor(muted.r, muted.g, muted.b);
    pdf.text('Matériaux', tableX + 5, tableY + 8);
    pdf.text('Quantité', tableX + 70, tableY + 8);
    pdf.text('Unité', tableX + 100, tableY + 8);

    pdf.setFontSize(10);
    values.forEach((item, index) => {
      const currentY = tableY + headerHeight + 8 + index * rowHeight;
      pdf.setTextColor(dark.r, dark.g, dark.b);
      pdf.text(item.label, tableX + 5, currentY);
      pdf.text(this.formatNumber(item.qty), tableX + 70, currentY);
      pdf.text(item.unit, tableX + 100, currentY);
      if (index < values.length - 1) {
        pdf.setDrawColor(245, 245, 245);
        pdf.line(tableX + 5, currentY + 2, tableX + tableWidth - 5, currentY + 2);
      }
    });

    const costX = 135;
    const costY = 58;
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(costX, costY, 65, 38, 16, 16, 'F');
    pdf.setDrawColor(border.r, border.g, border.b);
    pdf.roundedRect(costX, costY, 65, 38, 16, 16, 'S');

    pdf.setFontSize(8);
    pdf.setTextColor(muted.r, muted.g, muted.b);
    pdf.text('COÛT TOTAL ESTIMÉ', costX + 4, costY + 8);

    pdf.setFontSize(26);
    pdf.setTextColor(dark.r, dark.g, dark.b);
    pdf.text(`${this.formatFCFA(totalCost)}`, costX + 4, costY + 22, { maxWidth: 56 });

    pdf.setFontSize(7.5);
    pdf.setTextColor(muted.r, muted.g, muted.b);
    pdf.text('Éditorial · élégant et synthétique', costX + 4, costY + 30, { maxWidth: 56 });

    const chartX = 135;
    const chartY = 102;
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(chartX, chartY, 65, 51, 16, 16, 'F');
    pdf.setDrawColor(border.r, border.g, border.b);
    pdf.roundedRect(chartX, chartY, 65, 51, 16, 16, 'S');

    pdf.setFontSize(9);
    pdf.setTextColor(dark.r, dark.g, dark.b);
    pdf.text('Répartition visuelle', chartX + 4, chartY + 8);

    const maxQty = Math.max(...values.map(i => i.qty), 1);
    values.forEach((item, idx) => {
      const barY = chartY + 15 + idx * 9;
      const barWidth = Math.max(6, 42 * (item.qty / maxQty));
      pdf.setFillColor(accent.r, accent.g, accent.b);
      pdf.roundedRect(chartX + 4, barY, barWidth, 4, 2, 2, 'F');
      pdf.setFillColor(235, 235, 235);
      pdf.roundedRect(chartX + 4 + barWidth, barY, 42 - barWidth, 4, 2, 2, 'F');
      pdf.setFontSize(7.5);
      pdf.setTextColor(dark.r, dark.g, dark.b);
      pdf.text(item.label, chartX + 4, barY + 8);
      pdf.text(this.formatNumber(item.qty), chartX + 48, barY + 8);
    });

    const infoX = 12;
    const infoY = 168;
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(infoX, infoY, 118, 52, 16, 16, 'F');
    pdf.setDrawColor(border.r, border.g, border.b);
    pdf.roundedRect(infoX, infoY, 118, 52, 16, 16, 'S');

    pdf.setFontSize(11);
    pdf.setTextColor(dark.r, dark.g, dark.b);
    pdf.text('Points d’attention', infoX + 6, infoY + 11);
    pdf.setFontSize(7.5);
    pdf.setTextColor(muted.r, muted.g, muted.b);
    pdf.text(
      'Ce rapport est généré automatiquement par l’intelligence ArchMorph à partir de votre plan 2D. Les prix affichés sont indicatifs et peuvent évoluer selon les fournisseurs, la localisation, la saison et la disponibilité des matériaux. Il est conseillé de confirmer les montants auprès des prestataires avant toute prise de décision.',
      infoX + 6,
      infoY + 17,
      { maxWidth: 106 }
    );

    const stampX = 153;
    const stampY = 188;
    const radius = 28;
    pdf.setLineWidth(1.1);
    pdf.setDrawColor(accent.r, accent.g, accent.b);
    pdf.circle(stampX, stampY, radius, 'S');
    pdf.setFontSize(9);
    pdf.setTextColor(accent.r, accent.g, accent.b);
    pdf.text('ESTIMATION', stampX, stampY - 3, { align: 'center' });
    pdf.setFontSize(7);
    pdf.setTextColor(muted.r, muted.g, muted.b);
    pdf.text('Document généré automatiquement', stampX, stampY + 3, { align: 'center' });
    pdf.text('par ArchMorph Intelligence', stampX, stampY + 8, { align: 'center' });

    pdf.setFontSize(8);
    pdf.setTextColor(muted.r, muted.g, muted.b);
    pdf.text('Design de document proposé pour ' + project.name, 15, 292);
    pdf.text('Style : éditorial architectural.', 135, 292);

    pdf.save(`${project.name || 'rapport'}_${Date.now()}.pdf`);
  }

  private formatNumber(value: number | undefined): string {
    if (value == null) {
      return '0';
    }
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: 2
    }).format(value);
  }

  private formatFCFA(value: number | undefined): string {
    if (value == null) {
      return '0 FCFA';
    }
    return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
  }

  /**
   * Exporter un projet en fichier CSV (matériaux)
   */
  exportMaterialsAsCSV(project: Project): void {
    if (!project.materials) return;

    const materials = project.materials;
    const csvContent = `
Matériau,Quantité,Unité,Coût
Béton,${materials.concrete},m³,${(materials.concrete * 150).toFixed(2)}€
Bois,${materials.wood},m³,${(materials.wood * 800).toFixed(2)}€
Sable,${materials.sand},m³,${(materials.sand * 20).toFixed(2)}€
Gravier,${materials.gravel},m³,${(materials.gravel * 25).toFixed(2)}€
Ciment,${materials.cement},kg,${((materials.cement / 1000) * 0.15).toFixed(2)}€
TOTAL,,€,${materials.totalCost?.toFixed(2)}€
    `;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadFile(blob, `${project.name}_materiaux_${Date.now()}.csv`);
  }

  /**
   * Exporter en SVG pour visualisation
   */
  exportAsSVG(project: Project): string {
    const width = 1200;
    const height = 800;
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="white"/>`;

    // Ajouter les éléments
    project.elements.forEach(element => {
      const x = element.x;
      const y = element.y;
      const w = element.width * element.scaleX;
      const h = element.height * element.scaleY;

      svg += `
        <rect x="${x}" y="${y}" width="${w}" height="${h}" 
              fill="${element.color}" stroke="black" stroke-width="1"/>
        <text x="${x + w/2}" y="${y + h/2}" text-anchor="middle" 
              font-size="12">${element.label}</text>`;
    });

    svg += `</svg>`;
    return svg;
  }

  /**
   * Télécharger un fichier
   */
  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Exporter l'image du canvas en PNG
   */
  exportCanvasAsPNG(canvasElement: HTMLCanvasElement): void {
    canvasElement.toBlob((blob) => {
      if (blob) {
        this.downloadFile(blob, `plan_2d_${Date.now()}.png`);
      }
    });
  }

  /**
   * Générer un rapport complet
   */
  generateFullReport(project: Project, materials: any): string {
    const report = `
╔════════════════════════════════════════════════════════════════════╗
║                    RAPPORT DE PROJET D'ARCHITECTURE                ║
╚════════════════════════════════════════════════════════════════════╝

INFORMATIONS GÉNÉRALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nom du projet: ${project.name}
Description: ${project.description}
Date de création: ${new Date(project.createdAt).toLocaleDateString('fr-FR')}
Dernière modification: ${new Date(project.updatedAt).toLocaleDateString('fr-FR')}

ÉLÉMENTS DU PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total d'éléments: ${project.elements.length}
Murs: ${project.elements.filter(e => e.type === 'wall').length}
Portes: ${project.elements.filter(e => e.type === 'door').length}
Fenêtres: ${project.elements.filter(e => e.type === 'window').length}
Autres: ${project.elements.filter(e => !['wall', 'door', 'window'].includes(e.type)).length}

PIÈCES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Surface totale: ${project.totalArea} m²
Nombre de pièces: ${project.rooms.length}

${project.rooms.map(room => `
  • ${room.name}
    - Surface: ${room.area} m²
    - Périmètre: ${room.perimeter} m
`).join('')}

MATÉRIAUX NÉCESSAIRES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Béton: ${project.materials?.concrete || 0} m³
Bois: ${project.materials?.wood || 0} m³
Sable: ${project.materials?.sand || 0} m³
Gravier: ${project.materials?.gravel || 0} m³
Ciment: ${project.materials?.cement || 0} kg

ESTIMATION FINANCIÈRE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Coût total estimé: ${project.materials?.totalCost?.toFixed(2) || 'N/A'} €

╔════════════════════════════════════════════════════════════════════╗
║                    FIN DU RAPPORT                                  ║
╚════════════════════════════════════════════════════════════════════╝
    `;
    return report;
  }
}
