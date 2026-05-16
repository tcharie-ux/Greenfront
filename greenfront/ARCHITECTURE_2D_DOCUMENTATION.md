# 🏗️ Documentation - Éditeur 2D Architectural - Greenfront

## 📋 Vue d'ensemble

La modélisation 2D est organisée en **deux éditeurs complémentaires** et un flux projet unique :

| Étape | Route | Composant | Rôle |
|-------|-------|-----------|------|
| 1. Esquisse | `/modelisation/:id/esquisse` | `Esquisse` | Croquis libre (canvas HTML) |
| 2. Plan 2D | `/modelisation/:id/2d` | `EditorPageComponent` | **Éditeur principal** — murs, portes, étages |
| 2b. Mode avancé | `/modelisation/:id/2d-classique` | `Mod2D` | Matériaux, mobilier, export Spline → 3D |
| 3. Vue 3D | `/modelisation/:id/3d` | `Mod3D` | Visualisation 3D |

**Hub projet :** `/mesprojets?projectId={id}` — point d’entrée unique depuis les dashboards.

Les anciennes URLs (`/modelisation/mod-2-d`, `/editor`, etc.) redirigent vers **Mes projets** ou le plan 2D du projet.

### Dossiers

- `src/app/editor/` — éditeur 2D moderne (`SketchService`, `FloorService`, `EditorPersistenceService`)
- `src/app/components/modelisation/` — esquisse, Mod2D (legacy avancé), Mod3D
- `src/app/services/` — API (`projet.service`), matériaux, historique Mod2D

---

## ✨ Fonctionnalités Implémentées

### 1. **Palette d'Outils Complète**
- 🧱 **Murs** - Créer des murs avec dimensions précises
- 🚪 **Portes** - Placer des ouvertures de portes
- 🪟 **Fenêtres** - Ajouter des fenêtres
- 🚽 **Toilettes** - Symboles sanitaires
- 🛁 **Baignoires** - Éléments de salle de bain
- 👆 **Sélection** - Modifier les éléments
- 🗑️ **Suppression** - Effacer les éléments

### 2. **Système d'Historique**
- ↶ **Annuler (Undo)** - Revenir à l'état précédent
- ↷ **Refaire (Redo)** - Avancer dans l'historique
- Jusqu'à 50 actions sauvegardées

### 3. **Affichage et Visualisation**
- 📏 **Mesures automatiques** en mètres et centimètres
- 📐 **Grille de précision** pour alignement parfait
- 🔍 **Zoom et Pan** pour navigation fluide
- 📊 **Panneau des matériaux** en temps réel

### 4. **Calcul des Matériaux** ⭐ CRITIQUE
Calcul automatique de :
- **Béton** - Volume total (m³)
- **Bois** - Pour cadres et charpente (m³)
- **Sable** - Pour mortier et béton (m³)
- **Gravier** - Pour le béton (m³)
- **Ciment** - Quantité nécessaire (kg)
- **Coût estimé** - Somme totale en €

### 5. **Sauvegarde et Export**
- 💾 **Sauvegarde locale** - Stockage en LocalStorage
- 📄 **Export JSON** - Format complet du projet
- 📐 **Données Spline** - Format compatible 3D
- 🖼️ **Export PNG** - Image du plan
- 📊 **Rapport complet** - Document texte formaté
- 📋 **Export CSV** - Matériaux pour tableurs

---

## 🎯 Flux de Travail Type

### Étape 1 : Nommer le projet
```
1. Saisir le nom du projet (ex: "Maison T4 - Étage 1")
2. Ajouter une description optionnelle
```

### Étape 2 : Créer le plan
```
1. Sélectionner "🧱 Mur"
2. Cliquer sur le canvas pour placer les murs
3. Redimensionner en tirant les poignées
4. Ajouter portes, fenêtres, sanitaires
```

### Étape 3 : Ajuster les dimensions
```
1. Cliquer sur un élément pour le sélectionner
2. Redimensionner à la taille réelle
3. Les mesures s'affichent automatiquement
```

### Étape 4 : Vérifier les matériaux
```
1. Le panneau "Matériaux Calculés" se met à jour automatiquement
2. Vérifier les quantités
3. Cliquer "📊 Matériaux" pour voir le rapport détaillé
```

### Étape 5 : Exporter les données
```
1. "💾 Sauvegarder JSON" - Sauvegarder le projet localement
2. "📐 Données Spline" - Importer dans Spline pour la 3D
3. "🖼️ Export PNG" - Partager l'image du plan
4. "📄 Rapport complet" - Documentation complète
```

---

## 🔧 Architecture Technique

### Services Créés

#### 1. **DrawingService**
```typescript
// Gère la création, modification et suppression des éléments
- createElement() : Créer un élément
- addElement() : Ajouter au canvas
- updateElement() : Modifier les propriétés
- deleteElement() : Supprimer
- exportToSpline() : Convertir pour Spline 3D
```

#### 2. **HistoryService**
```typescript
// Gère l'undo/redo
- addState() : Sauvegarder l'état actuel
- undo() : Revenir en arrière
- redo() : Avancer
- canUndo() / canRedo() : Vérifier disponibilité
```

#### 3. **MaterialCalculationService**
```typescript
// Calcule les matériaux de construction
- calculateMaterials() : Calcul complet
- getMaterialDetails() : Détails avec poids et coûts
- exportMaterials() : Rapport texte
```

#### 4. **SaveExportService**
```typescript
// Sauvegarde et export
- saveProjectLocal() : LocalStorage
- exportProjectAsJSON() : Fichier JSON
- exportMaterialsAsCSV() : Feuille calcul
- exportCanvasAsPNG() : Image PNG
- generateFullReport() : Rapport complet
```

---

## 📊 Format des Données Spline

Les données exportées en format Spline JSON contiennent :

```json
{
  "version": "1.0",
  "name": "Mon Projet",
  "description": "Description du projet",
  "scale": 20,
  "objects": [
    {
      "id": "uuid",
      "type": "wall",
      "position": { "x": 0, "y": 0, "z": 0 },
      "rotation": { "x": 0, "y": 0, "z": 0 },
      "scale": { "x": 1, "y": 1, "z": 1 },
      "material": "béton",
      "dimensions": { "width": 5.5, "height": 2.5, "depth": 0.2 }
    }
  ],
  "materials": {
    "concrete": 2.75,
    "wood": 0.15,
    "sand": 2.75,
    "gravel": 4.12,
    "cement": 825,
    "totalCost": 1234.56
  }
}
```

---

## 🎨 Personnalisation

### Modifier les couleurs des éléments
Dans `drawing.service.ts` :
```typescript
private elementColors = {
  wall: '#1f2937',      // Gris foncé
  door: '#8b5e3c',      // Marron
  window: '#87ceeb',    // Bleu ciel
  toilet: '#e5e7eb',    // Gris clair
  bathtub: '#d1d5db'    // Gris moyen
};
```

### Modifier les tailles par défaut
```typescript
private defaultSizes = {
  wall: { width: 150, height: 15 },
  door: { width: 40, height: 10 },
  // ...
};
```

### Modifier les coûts des matériaux
Dans `material-calculation.service.ts` :
```typescript
private readonly MATERIAL_PROPERTIES = {
  concrete: { density: 2.4, costPerM3: 150 },
  wood: { density: 0.6, costPerM3: 800 },
  // ...
};
```

---

## 📈 Cas d'Usage

### 1. **Architecture Résidentielle**
- Créer les plans de maisons/appartements
- Calculer les matériaux pour devis
- Générer visuels pour clients

### 2. **Gestion de Projets**
- Historique complet des modifications
- Sauvegarde automatique en local
- Export pour collaboration

### 3. **Estimation et Budgétisation**
- Calcul précis des matériaux
- Estimation de coûts
- Rapports détaillés pour devis

### 4. **Intégration 3D**
- Données compatibles Spline
- Passage 2D → 3D automatisé
- Visualisation professionnelle

---

## ⚙️ Points Techniques Importants

### Échelle de Conversion
- **Par défaut : 20 pixels = 1 mètre**
- Modifiable via `DrawingService.setScale()`
- Affecte tous les calculs

### Système de Grille
- Grille de 20px x 20px
- Peut être activée/désactivée
- Aide à l'alignement

### Stockage Local
- Jusqu'à 20 projets stockés
- Utilise le LocalStorage du navigateur
- Persiste entre les sessions

### Performance
- Gestion efficace des centaines d'éléments
- Rafraîchissement optimisé du canvas
- Historique limité à 50 actions pour la mémoire

---

## 🚀 Prochaines Étapes Recommandées

1. **Intégration Backend**
   - API pour sauvegarder les projets
   - Synchronisation multi-utilisateurs

2. **Fonctionnalités Avancées**
   - Calques (layers) pour organisation
   - Templates de pièces pré-faites
   - Photoshop des dimensionsMarqueurs et annotations

3. **Amélioration UX**
   - Clavier raccourcis (W pour mur, D pour porte, etc.)
   - Palette de couleurs personnalisable
   - Assistants de dimensionnement

4. **Interopérabilité**
   - Import de plans AutoCAD
   - Export en SVG vectoriel
   - Partage en temps réel (WebSocket)

---

## 📞 Support

### Erreurs Courantes

**Q: Les matériaux ne se calculent pas**
- A: Vérifiez que le scale est correct (défaut: 20 px/m)

**Q: L'export PNG ne fonctionne pas**
- A: Assurez-vous d'avoir des éléments sur le canvas

**Q: Je ne peux pas importer dans Spline**
- A: Utilisez le JSON standard, pas "Données Spline"

---

## 📄 Fichiers Modifiés

```
src/app/
├── models/
│   └── drawing-element.ts          [NEW] Modèles de données
├── services/
│   ├── drawing.service.ts          [NEW] Gestion du dessin
│   ├── history.service.ts          [NEW] Undo/Redo
│   ├── material-calculation.service.ts [NEW] Calcul matériaux
│   └── save-export.service.ts      [NEW] Sauvegarde/Export
└── components/
    └── modelisation/
        └── mod-2-d/
            ├── mod-2-d.ts          [UPDATED] Composant principal
            ├── mod-2-d.html        [UPDATED] Template
            └── mod-2-d.scss        [UPDATED] Styles
```

---

## ✅ Vérification d'Installation

```bash
# 1. Vérifier les dépendances
npm list uuid konva @angular/core

# 2. Compiler
ng build

# 3. Démarrer dev
ng serve

# 4. Ouvrir http://localhost:4200
```

---

**Version:** 1.0 | **Date:** 2026-05-03 | **Status:** ✅ Production Ready

