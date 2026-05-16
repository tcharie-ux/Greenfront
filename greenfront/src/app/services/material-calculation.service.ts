import { Injectable } from '@angular/core';
import { DrawingElement, MaterialCalculation, Room } from '../models/drawing-element';

@Injectable({
  providedIn: 'root'
})
export class MaterialCalculationService {
  
  // Constantes de densité et coûts en EURO (€)
  private readonly MATERIAL_PROPERTIES = {
    concrete: { density: 2.4, costPerM3: 120 },    // Béton (m³)
    wood: { density: 0.6, costPerM3: 250 },        // Bois (m³)
    sand: { density: 1.6, costPerM3: 35 },         // Sable (m³)
    gravel: { density: 1.5, costPerM3: 40 },       // Gravier (m³)
    cement: { density: 1.4, costPerKg: 0.18 },     // Ciment (€/kg) -> ~9€ le sac de 50kg
    iron: { density: 7.8, costPerKg: 1.2 }         // Fer à béton (€/kg)
  };

  /**
   * Calculer les matériaux basés sur les dimensions réelles (pixels -> mètres)
   */
  calculateMaterials(elements: DrawingElement[], rooms: Room[], scale: number = 50): any {
    let concrete = 0;
    let wood = 0;
    let sand = 0;
    let gravel = 0;
    let cement = 0;
    let iron = 0;

    elements.forEach(el => {
      // Conversion des dimensions (pixels -> mètres)
      const widthMeters = (el.width || 0) / scale;
      const heightMeters = 3; // Hauteur standard
      const thicknessMeters = el.thickness || 0.2; 

      const volume = widthMeters * heightMeters * thicknessMeters;

      switch (el.type) {
        case 'wall':
          concrete += volume;
          // Dosage BIM standard : 350kg ciment, 400L sable, 800L gravier, 80kg fer par m³
          cement += volume * 350;
          sand += volume * 0.4;
          gravel += volume * 0.8;
          iron += volume * 80;
          break;

        case 'door':
        case 'furniture' as any:
          wood += volume;
          break;
      }
    });

    const totalCost = 
      (concrete * this.MATERIAL_PROPERTIES.concrete.costPerM3) +
      (cement * this.MATERIAL_PROPERTIES.cement.costPerKg) +
      (sand * this.MATERIAL_PROPERTIES.sand.costPerM3) +
      (gravel * this.MATERIAL_PROPERTIES.gravel.costPerM3) +
      (iron * this.MATERIAL_PROPERTIES.iron.costPerKg);

    return {
      concrete: Number(concrete.toFixed(2)),
      wood: Number(wood.toFixed(2)),
      sand: Number(sand.toFixed(2)),
      gravel: Number(gravel.toFixed(2)),
      cement: Number(cement.toFixed(0)),
      iron: Number(iron.toFixed(0)),
      totalCost: Number(totalCost.toFixed(2))
    };
  }

  /**
   * Formate les détails pour l'affichage
   */
  getMaterialDetails(materials: any): string {
    return `
      Béton: ${materials.concrete} m³
      Ciment: ${materials.cement} kg
      Sable: ${materials.sand} m³
      Gravier: ${materials.gravel} m³
      Fer: ${materials.iron} kg
      COÛT TOTAL: ${materials.totalCost} €
    `;
  }

  /**
   * Export texte pour rapport
   */
  exportMaterials(materials: any): string {
    return `
RAPPORT DE QUANTITATIF (BIM)
===========================
Béton: ${materials.concrete} m³
Ciment: ${materials.cement} kg
Sable: ${materials.sand} m³
Gravier: ${materials.gravel} m³
Fer: ${materials.iron} kg
---------------------------
ESTIMATION TOTALE: ${materials.totalCost} €
===========================
    `;
  }
}

