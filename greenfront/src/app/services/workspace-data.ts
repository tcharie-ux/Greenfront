import { Injectable } from '@angular/core';
import { DashboardMetric, ProfilePreferences, WorkspaceNotification, WorkspaceProject } from '../models/workspace';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceData {
  private readonly mockProjects: WorkspaceProject[] = [
    {
      id: '1',
      name: 'Villa Moderne',
      type: 'Résidentiel',
      location: 'Paris',
      status: 'En cours',
      progress: 65,
      createdAt: '2024-01-15',
      updatedAt: '2024-05-01',
      clientName: 'Jean Dupont',
      architectName: 'Marie Martin',
      summary: 'Villa moderne avec piscine',
      dimensions: {
        length: 20,
        width: 15,
        height: 8,
        floors: 2,
      },
      splineSceneUrl: 'https://example.com/scene1',
      materialsReady: true,
      elements: [],
      stages: [
        { key: 'esquisse', label: 'Esquisse', description: 'Phase initiale', status: 'done' },
        { key: '2d', label: 'Plan 2D', description: 'Plans détaillés', status: 'active' },
        { key: '3d', label: 'Modélisation 3D', description: 'Modèle 3D', status: 'pending' },
        { key: 'estimation', label: 'Estimation', description: 'Devis final', status: 'pending' },
      ],
    },
    {
      id: '2',
      name: 'Bureau Commercial',
      type: 'Commercial',
      location: 'Lyon',
      status: 'Planification',
      progress: 20,
      createdAt: '2024-03-10',
      updatedAt: '2024-04-20',
      clientName: 'Pierre Durand',
      architectName: 'Paul Leroy',
      summary: 'Bureau moderne pour entreprise tech',
      dimensions: {
        length: 50,
        width: 30,
        height: 12,
        floors: 3,
      },
      splineSceneUrl: 'https://example.com/scene2',
      materialsReady: false,
      elements: [],
      stages: [
        { key: 'esquisse', label: 'Esquisse', description: 'Phase initiale', status: 'done' },
        { key: '2d', label: 'Plan 2D', description: 'Plans détaillés', status: 'active' },
        { key: '3d', label: 'Modélisation 3D', description: 'Modèle 3D', status: 'pending' },
        { key: 'estimation', label: 'Estimation', description: 'Devis final', status: 'pending' },
      ],
    },
  ];

  private readonly mockNotifications: WorkspaceNotification[] = [
    {
      id: '1',
      title: 'Nouveau message',
      message: 'Votre architecte a envoyé un message concernant le projet Villa Moderne.',
      level: 'info',
      createdAt: '2024-05-01T10:00:00Z',
      projectId: '1',
    },
    {
      id: '2',
      title: 'Échéance proche',
      message: 'La date limite pour les modifications du projet Bureau Commercial approche.',
      level: 'warning',
      createdAt: '2024-04-30T14:30:00Z',
      projectId: '2',
    },
  ];
  getFeaturedProject(): WorkspaceProject {
    return this.mockProjects[0];
  }

  getDashboardMetrics(role: string): DashboardMetric[] {
    if (role === 'CLIENT') {
      const totalProjects = this.mockProjects.length;
      const inProgress = this.mockProjects.filter((project) => project.status === 'En cours').length;
      const completed = this.mockProjects.filter((project) => project.status === 'Terminé').length;

      return [
        {
          label: 'Projets assignés',
          value: `${totalProjects}`,
          detail: 'Projets affectés au client',
          tone: 'primary',
        },
        {
          label: 'En cours',
          value: `${inProgress}`,
          detail: 'Projets en cours',
          tone: 'warning',
        },
        {
          label: 'Terminés',
          value: `${completed}`,
          detail: 'Projets terminés',
          tone: 'success',
        },
        {
          label: 'Notifications',
          value: `${this.mockNotifications.length}`,
          detail: 'Messages non lus',
          tone: 'neutral',
        },
      ];
    }
    return [];
  }

  getProjects(): WorkspaceProject[] {
    return this.mockProjects;
  }

  getProjectById(projectId: string | number | null | undefined): WorkspaceProject | null {
    if (projectId === null || projectId === undefined) {
      return null;
    }

    return this.mockProjects.find((project) => project.id === String(projectId)) ?? null;
  }

  getNotifications(): WorkspaceNotification[] {
    return this.mockNotifications;
  }

  getProfile(role: 'ADMIN' | 'ARCHITECTE' | 'CLIENT', fullName: string, email: string): ProfilePreferences {
    return {
      fullName,
      email,
      phone: '77 123 45 67',
      roleLabel: role === 'ADMIN' ? 'Administrateur' : role === 'ARCHITECTE' ? 'Architecte' : 'Client',
      company: 'BuildPlan',
      emailNotifications: true,
      pushNotifications: false,
      weeklySummary: true,
    };
  }
}
