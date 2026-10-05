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

