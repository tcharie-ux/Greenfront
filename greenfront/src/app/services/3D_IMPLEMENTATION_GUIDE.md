# ArchiMorph 3D Visualization - Frontend Implementation Guide

## Overview
This document describes the complete 3D visualization pipeline from 2D drawings to interactive 3D Spline scenes.

## Architecture

### Services

#### 1. **SplineJsonGeneratorService** (`spline-json-generator.service.ts`)
Generates valid Spline scene JSON from building data.

**Key Features:**
- Converts building dimensions and elements to 3D geometry
- Generates realistic materials (concrete, wood, glass, etc.)
- Creates professional lighting setup (sun, ambient, fill lights)
- Configures isometric camera view
- Handles multi-floor buildings with proper z-axis stacking
- Includes vegetation and landscape elements

**Main Methods:**
- `generateSplineScene(buildingData)` - Creates complete Spline scene
- `generateLights()` - Creates 3-light setup for professional rendering
- `generateCamera()` - Sets isometric view with proper perspective
- `generateMaterials()` - Defines material properties for realism

**Example Usage:**
```typescript
const splineScene = this.splineGenerator.generateSplineScene({
  projectName: 'My Building',
  elements: drawing2DElements,
  baseHeight: 3,
  floorCount: 2,
  includeVegetation: true
});
```

#### 2. **DrawingToSplineConverterService** (`drawing-to-spline-converter.service.ts`)
Converts 2D Konva drawing elements to 3D building elements.

**Key Features:**
- Transforms pixel coordinates to real-world meters
- Maps 2D element types (wall, door, window) to 3D geometry
- Handles standard dimensions (door height: 2.1m, window: 1.2m, etc.)
- Creates optimized camera configurations

**Main Methods:**
- `convert2DTo3D()` - Complete pipeline conversion
- `sceneToBlob()` - Export as downloadable JSON
- `sceneToDataUrl()` - Create preview URL

**Conversion Factors:**
- Pixel to Meter: 50 pixels = 1 meter (configurable)
- Door height: 2.1m (standard)
- Window height: 1.2m (standard)
- Wall thickness: 0.2m (20cm)

### Component Updates

#### **Mod3D Component** (`mod-3-d.ts`)
Enhanced to support 2D→3D conversion and camera controls.

**New Features:**
- Auto-generation of 3D from 2D models
- Camera rotation controls (up/down/left/right)
- Camera reset to isometric view
- Better error handling with fallback scenes
- Integration with backend 3D API

**Camera Controls:**
```typescript
rotateCamera('left')   // Rotate camera left
rotateCamera('right')  // Rotate camera right
rotateCamera('up')     // Rotate camera up
rotateCamera('down')   // Rotate camera down
resetCamera()          // Reset to isometric (45°, 25°)
```

**Isometric Camera Configuration:**
- Rotation X: ~0.4 rad (23°) - for top-down view
- Rotation Y: ~0.785 rad (45°) - for isometric angle
- Distance: 1.5× building size

## Data Flow

```
2D Drawing (Konva Elements)
        ↓
DrawingElement[]
        ↓
DrawingToSplineConverterService.convert2DTo3D()
        ↓
BuildingElement[] (3D coordinates)
        ↓
SplineJsonGeneratorService.generateSplineScene()
        ↓
SplineScene JSON
        ↓
Spline Viewer Component
        ↓
Interactive 3D Visualization
```

## JSON Schema

### BuildingData
```typescript
{
  projectName: string;
  projectDescription?: string;
  elements: BuildingElement[];
  baseHeight?: number;  // Default: 3m
  floorCount?: number;  // Default: 1
  includeVegetation?: boolean;
}
```

### BuildingElement
```typescript
{
  id: string;
  name?: string;
  type: 'wall' | 'door' | 'window' | 'room' | 'furniture';
  x: number;      // X position in meters
  y: number;      // Y position in meters
  width: number;
  height?: number;
  material?: string;
  color?: string;
}
```

### Generated SplineScene
```typescript
{
  format: "spline-scene-json";
  version: "1.0";
  metadata: { name, description, created };
  scene: {
    children: SplineObject[];    // 3D objects
    lights: SplineLight[];       // Lighting
    camera: SplineCamera;        // Camera config
    environment: {};             // Sky, fog, etc.
  };
  materials: {};
  textures: [];
}
```

## Features Implemented

### ✅ Completed
1. **Spline Viewer Installation** - Working with @splinetool/viewer v1.12.92
2. **2D to 3D Conversion** - Full pipeline from Konva to Spline
3. **Material System** - Realistic materials (concrete, wood, glass, etc.)
4. **Professional Lighting** - 3-light setup (sun, ambient, fill)
5. **Isometric Camera** - Proper 3D perspective view
6. **Multi-floor Support** - Proper z-axis stacking
7. **Zoom Controls** - Smooth zoom in/out
8. **Camera Rotation** - Interactive camera movement
9. **Error Handling** - Fallback to generated scene

### 🔄 In Progress / Planned
1. **Animation Transitions** - Smooth building reveal
2. **Interactive Elements** - Click-to-explore rooms
3. **Measurement Display** - Show dimensions on hover
4. **Material Customization** - User-defined colors/textures
5. **Export to GLTF** - For external 3D tools
6. **VR Support** - WebXR integration

## Usage Example

### Basic 3D Generation
```typescript
// In a component that has drawn 2D elements
constructor(private converter: DrawingToSplineConverterService) {}

generateAndPreview3D() {
  const scene = this.converter.convert2DTo3D(
    this.drawingElements,           // From Konva canvas
    'My House',
    'Beautiful modern house',
    {
      length: 12,
      width: 8,
      height: 3.5,
      floors: 2
    }
  );
  
  // Get preview URL
  const previewUrl = this.converter.sceneToDataUrl(scene);
  
  // Or download
  const blob = this.converter.sceneToBlob(scene);
}
```

### Advanced - Custom Material
```typescript
const scene = this.splineGenerator.generateSplineScene(buildingData);

// Modify material
scene.materials['custom-brick'] = {
  type: 'standard',
  color: '#CD5C5C',  // Custom brick red
  metalness: 0,
  roughness: 0.8
};

// Use in objects
scene.scene.children[0].material = 'custom-brick';
```

## Spline Viewer Configuration

The Spline viewer is embedded via custom element:

```html
<spline-viewer
  [url]="sceneUrl"
  loading-anim="true"
  loading="eager"
  events-target="global"
  hint="true"
>
</spline-viewer>
```

**Attributes:**
- `url` - URL or Data URL to Spline scene JSON
- `loading-anim` - Show loading animation
- `loading` - Loading strategy (eager/lazy)
- `events-target` - Event handling (global/element)
- `hint` - Show helper text

## Performance Considerations

### Scene Complexity
- Optimal: < 500 objects per scene
- Maximum: < 1000 objects (may impact performance)
- Mitigation: LOD (Level of Detail) system for distant objects

### File Size
- Typical scene: 100-300 KB (JSON)
- Compressed: 20-50 KB (with gzip)
- Consider: Streaming for large buildings

### Rendering
- Target: 60 FPS on mid-range devices
- Camera: Isometric for optimal performance
- Shadows: PCFShadowMap for quality balance

## Troubleshooting

### Spline Viewer Not Loading
1. Check @splinetool/viewer installation: `npm list @splinetool/viewer`
2. Verify URL is valid (HTTP/HTTPS or Data URL)
3. Check browser console for errors
4. Ensure CUSTOM_ELEMENTS_SCHEMA is in component

### Scene Looks Wrong
1. Verify building dimensions are correct (meters)
2. Check element positions (x, y in canvas = z in 3D)
3. Ensure floor count matches building height
4. Review material colors and transparency

### Performance Issues
1. Reduce scene complexity (fewer objects)
2. Disable vegetation if not needed
3. Use lower shadow map resolution
4. Implement object culling for distant elements

## Backend Integration

### 3D Model Storage
```typescript
// Save to backend
const model3D: Modelisation_3D = {
  id: 1,
  nomModel: 'Building_v1',
  format: 'spline-scene-json',
  dateCreation: new Date().toISOString(),
  url_model: JSON.stringify(splineScene)
};

await this.projetService.creerModelisation3D(projectId, model2DId, model3D);
```

### Loading from Backend
```typescript
// Load saved 3D model
this.projetService.obtenirModelisation3D(projectId, model2DId).subscribe(
  (model3D) => {
    this.splineSceneJSON = model3D.url_model;
    this.setSceneUrlFromData(this.splineSceneJSON);
  }
);
```

## Testing Checklist

- [ ] 2D drawing converts to valid 3D JSON
- [ ] Spline viewer loads scene without errors
- [ ] Camera controls work smoothly
- [ ] Multi-floor buildings render correctly
- [ ] Materials display with proper colors/textures
- [ ] Lighting creates realistic shadows
- [ ] Zoom in/out works correctly
- [ ] Scene exports as JSON file
- [ ] Fallback scene appears if Spline fails
- [ ] Mobile responsive (landscape orientation)

## References

- [Spline Viewer Documentation](https://docs.spline.design/viewer)
- [Three.js Materials](https://threejs.org/docs/)
- [Konva.js Canvas Library](https://konvajs.org/)
- [Angular Component Architecture](https://angular.io/guide/component-overview)

## Future Enhancements

1. **Real-time Collaboration** - Multiple users editing same scene
2. **AI-Assisted Design** - Auto-generate layouts
3. **AR Preview** - View in real space with AR
4. **Custom Shaders** - Advanced visual effects
5. **Physics Simulation** - Objects with gravity/collision
6. **Walkthrough Mode** - First-person navigation
7. **Social Sharing** - Share 3D scenes with clients

---

**Version:** 1.0
**Last Updated:** 2024
**Status:** Production Ready
