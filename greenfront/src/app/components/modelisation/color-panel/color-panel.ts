import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ColorService, DEFAULT_VIEWER_COLORS } from '../../../services/color.service';

interface ColorPresetGroup {
  label: string;
  model: 'wallColor' | 'roofColor' | 'floorColor';
  setColor: (hex: string) => void;
  presets: { name: string; hex: string }[];
}

@Component({
  selector: 'app-color-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './color-panel.html',
  styleUrl: './color-panel.scss',
})
export class ColorPanelComponent {
  wallColor = DEFAULT_VIEWER_COLORS.wall;
  roofColor = DEFAULT_VIEWER_COLORS.roof;
  floorColor = DEFAULT_VIEWER_COLORS.floor;

  readonly groups: ColorPresetGroup[] = [
    {
      label: 'Murs',
      model: 'wallColor',
      setColor: (hex) => this.setWallColor(hex),
      presets: [
        { name: 'Blanc casse', hex: '#F5F0E8' },
        { name: 'Beige', hex: '#E8D5B7' },
        { name: 'Gris', hex: '#C9C5BE' },
        { name: 'Bleu pale', hex: '#D4E5F7' },
      ],
    },
    {
      label: 'Toit',
      model: 'roofColor',
      setColor: (hex) => this.setRoofColor(hex),
      presets: [
        { name: 'Ardoise', hex: '#2C3E50' },
        { name: 'Tuile rouge', hex: '#8B3A2F' },
        { name: 'Zinc', hex: '#6B7280' },
        { name: 'Bois', hex: '#8B6914' },
      ],
    },
    {
      label: 'Sol',
      model: 'floorColor',
      setColor: (hex) => this.setFloorColor(hex),
      presets: [
        { name: 'Parquet', hex: '#C8A96E' },
        { name: 'Carrelage', hex: '#E8E8E8' },
        { name: 'Beton', hex: '#9CA3AF' },
        { name: 'Marbre', hex: '#F0EDE8' },
      ],
    },
  ];

  constructor(private readonly colorService: ColorService) {}

  setWallColor(hex: string): void {
    this.wallColor = hex;
    this.colorService.setWallColor(hex);
  }

  setRoofColor(hex: string): void {
    this.roofColor = hex;
    this.colorService.setRoofColor(hex);
  }

  setFloorColor(hex: string): void {
    this.floorColor = hex;
    this.colorService.setFloorColor(hex);
  }

  setGroupColor(group: ColorPresetGroup, hex: string): void {
    group.setColor(hex);
  }

  getGroupColor(group: ColorPresetGroup): string {
    return this[group.model];
  }

  reset(): void {
    this.wallColor = DEFAULT_VIEWER_COLORS.wall;
    this.roofColor = DEFAULT_VIEWER_COLORS.roof;
    this.floorColor = DEFAULT_VIEWER_COLORS.floor;
    this.colorService.resetColors();
  }
}
