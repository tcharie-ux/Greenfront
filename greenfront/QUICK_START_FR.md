# 🚀 QUICK START - Éditeur 2D Architectural

## Démarrage Rapide (2 minutes)

### 1️⃣ Lancer l'application
```bash
npm start
# Ouvre http://localhost:4200
```

### 2️⃣ Créer votre premier plan

**Étape 1: Nommer le projet**
- Cliquez dans le champ "Nom du projet"
- Écrivez: `Ma Première Maison`
- Optionnel: Ajoutez une description

**Étape 2: Dessiner les murs**
- Cliquez sur le bouton `🧱 Mur`
- Cliquez sur le canvas blanc pour placer les murs
- Placez 4 murs pour former un rectangle
- Tirez les poignées pour redimensionner

**Étape 3: Ajouter une porte et une fenêtre**
- Cliquez `🚪 Porte`, placez-la sur un mur
- Cliquez `🪟 Fenêtre`, placez-la sur un autre mur

**Étape 4: Vérifier les matériaux**
- Regardez le panneau "Matériaux Calculés" en bas à droite
- Vous verrez :
  - Béton: X m³
  - Bois: X m³
  - Coût Total: X €

**Étape 5: Sauvegarder**
- Cliquez `💾 Sauvegarder JSON`
- Le projet est automatiquement téléchargé

---

## 🎮 Les Outils Expliqués

| Outil | Fonction | Usage |
|-------|----------|-------|
| 🧱 Mur | Créer des murs | Clic pour placer, drag pour redimensionner |
| 🚪 Porte | Placer une porte | Standard 90cm × 210cm |
| 🪟 Fenêtre | Placer une fenêtre | Standard 120cm × 150cm |
| 🚽 WC | Ajouter toilettes | Standard 60cm × 60cm |
| 🛁 Baignoire | Ajouter baignoire | Standard 170cm × 80cm |
| 👆 Sélectionner | Modifier éléments | Clic pour sélectionner |
| 🗑️ Supprimer | Effacer éléments | Clic sur élément à supprimer |

---

## ⌨️ Raccourcis Clavier (À implémenter)

```
Ctrl+Z  = Annuler
Ctrl+Y  = Refaire
Del     = Supprimer élément sélectionné
Ctrl+S  = Sauvegarder
Ctrl+E  = Exporter
W       = Outil Mur
D       = Outil Porte
```

---

## 📊 Lecture des Matériaux

Quand vous voyez :
```
Béton: 2.75 m³
Bois: 0.15 m³
Sable: 2.75 m³
Gravier: 4.12 m³
Ciment: 825 kg
Coût Total: 1234.56 €
```

Cela signifie :
- Pour ce projet, vous avez besoin de **2.75 mètres cubes de béton**
- Le **coût estimé est 1234.56€** au prix du marché français 2026

---

## 💾 Les 5 Exports Disponibles

### 1. 💾 Sauvegarder JSON
**Quoi:** Sauvegarde complète du projet
**Où:** Téléchargement en fichier `.json`
**Pour:** Charger le projet plus tard

### 2. 📐 Données Spline
**Quoi:** Format pour modélisation 3D
**Où:** Fichier `.json` Spline-compatible
**Pour:** Importer dans Spline pour 3D

### 3. 🖼️ Export PNG
**Quoi:** Image du plan 2D
**Où:** Fichier `.png`
**Pour:** Partager, imprimer, documents

### 4. 📊 Matériaux
**Quoi:** Rapport détaillé des matériaux
**Où:** Affichage dans une popup
**Pour:** Établir un devis

### 5. 📄 Rapport Complet
**Quoi:** Document texte formaté
**Où:** Fichier `.txt`
**Pour:** Archivage, documentation

---

## 🎯 Cas d'Usage Pratiques

### Cas 1: Je veux estimer un budget
1. Créer le plan du projet
2. Cliquer `📊 Matériaux`
3. Voir les quantités et coûts
4. Exporter en CSV pour tableur

### Cas 2: Je veux créer un modèle 3D
1. Créer le plan 2D complet
2. Cliquer `📐 Données Spline`
3. Ouvrir le fichier dans Spline
4. La géométrie 3D se crée automatiquement

### Cas 3: Je veux partager le plan
1. Créer et finaliser le plan
2. Cliquer `🖼️ Export PNG`
3. Envoyer l'image par email/Slack

### Cas 4: Je dois corriger quelque chose
1. Si vous avez fait une erreur, cliquez `↶ Annuler`
2. Répétez jusqu'à correction
3. Vous pouvez annuler jusqu'à 50 actions

---

## ❓ FAQ Rapide

**Q: Comment redimensionner un élément?**
A: Sélectionnez-le (cliquez dessus), puis tirez les poignées aux coins.

**Q: Les mesures sont fausses?**
A: Vérifiez que l'échelle est à 20px = 1m (défaut).

**Q: Je peux charger un ancien projet?**
A: Oui, vos projets sont sauvegardés localement automatiquement.

**Q: Comment supprimer un élément?**
A: Cliquez `🗑️ Supprimer`, puis cliquez sur l'élément.

**Q: Le zoom ne fonctionne pas?**
A: Utilisez la molette de souris pour zoomer.

---

## 🎨 Personnalisation Basique

### Changer les couleurs
1. Ouvrir `src/app/services/drawing.service.ts`
2. Modifier `elementColors` :
   ```typescript
   wall: '#FF0000'  // Murs en rouge
   ```

### Changer les tailles par défaut
1. Ouvrir le même fichier
2. Modifier `defaultSizes`

### Changer les prix des matériaux
1. Ouvrir `src/app/services/material-calculation.service.ts`
2. Modifier `MATERIAL_PROPERTIES`

---

## 🆘 Problèmes Courants

| Problème | Solution |
|----------|----------|
| L'app ne démarre pas | Lancez `npm install` puis `npm start` |
| Les éléments ne s'affichent pas | Attendez 2-3 secondes, rechargez la page |
| Je ne peux pas exporter | Assurez-vous d'avoir au moins un élément |
| Les mesures sont énormes | L'échelle de pixels:mètres est peut-être fausse |
| Mon plan est lent | Vous avez peut-être trop d'éléments (>1000) |

---

## 📞 Support Technique

- **Email:** support@greenfront.dev
- **Documentation complète:** ARCHITECTURE_2D_DOCUMENTATION.md
- **Code source:** `/src/app/services/`

---

**Bon dessin! 🏗️**

