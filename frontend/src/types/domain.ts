export type VideoJobStatus = 'queued' | 'rendering' | 'completed' | 'failed';
export type VideoJobMode = 'text' | 'image';

export interface VideoJob {
  id: number;
  tenantId: string;
  creatorId: number;
  creatorDisplayName: string;
  title: string;
  prompt: string;
  mode: VideoJobMode;
  sourceImageUrl: string | null;
  status: VideoJobStatus;
  videoUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMessage {
  id: number;
  tenantId: string;
  authorId: number;
  authorDisplayName: string;
  body: string;
  isBot: boolean;
  createdAt: string;
}

export interface DirectMessage {
  id: number;
  tenantId: string;
  senderId: number;
  senderDisplayName: string;
  recipientId: number;
  recipientDisplayName: string;
  body: string;
  createdAt: string;
}

export interface WorkspaceMember {
  id: number;
  displayName: string;
  isAdmin: boolean;
}

export interface TenantSettingsView {
  veoApiKeyConfigured: boolean;
}
