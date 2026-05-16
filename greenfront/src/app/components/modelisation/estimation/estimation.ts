import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WorkspaceProject } from '../../../models/workspace';
import { WorkspaceData } from '../../../services/workspace-data';

@Component({
  selector: 'app-estimation',
  standalone: true,
  templateUrl: './estimation.html',
  styleUrl: './estimation.scss',
  imports:[RouterLink]
})
export class Estimation implements OnInit {
  project: WorkspaceProject | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly workspaceData: WorkspaceData
  ) {}

  ngOnInit(): void {
    const projectId =
      this.route.parent?.snapshot.paramMap.get('id') ?? this.route.snapshot.paramMap.get('id');
    this.project = this.workspaceData.getProjectById(projectId);
  }
}
