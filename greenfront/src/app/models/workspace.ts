export interface SidebarItem {
  label: string;
  route: string;
  icon: string;
  exact?: boolean;
}

export type ProjectStageKey = 'esquisse' | '2d' | '3d' | 'estimation';

export interface DashboardMetric {
  label: string;
  value: string;
  detail: string;
  tone: 'primary' | 'success' | 'warning' | 'neutral';
}

export interface WorkspacePlanElement {
  id: string;
  kind: 'wall' | 'door' | 'window' | 'column';
  label: string;
  length: number;
  thickness: number;
  height: number;
  x: number;
  y: number;
  material: string;
}

export interface WorkspaceNotification {
  id: string;
  title: string;
  message: string;
  level: 'info' | 'success' | 'warning';
  createdAt: string;
  projectId?: string;
}

export interface ProjectStage {
  key: ProjectStageKey;
  label: string;
  description: string;
  status: 'done' | 'active' | 'pending';
}

export interface WorkspaceProject {
  id: string;
  name: string;
  type: string;
  location: string;
  status: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  clientName: string;
  architectName: string;
  summary: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
    floors: number;
  };
  splineSceneUrl: string;
  materialsReady: boolean;
  elements: WorkspacePlanElement[];
  stages: ProjectStage[];
}

export interface ProfilePreferences {
  fullName: string;
  email: string;
  phone: string;
  roleLabel: string;
  company: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklySummary: boolean;
}
