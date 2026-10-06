export interface DashboardMetricDto {
  key: string;
  label: string;
  value: string;
  hint?: string;
  delta?: string;
  status?: 'ok' | 'warning' | 'critical';
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  icon?: string;
}

export interface DashboardUserSummaryDto {
  id: string;
  displayName: string;
  email: string;
  role: 'owner' | 'member';
  totalEmails: number;
  unreadEmails: number;
  telegramEnabled: boolean;
}

export interface DashboardUserInsightsDto {
  total: number;
  telegramEnabled: number;
  telegramDisabled: number;
  topActive: DashboardUserSummaryDto[];
}

export interface DashboardPipelineDto {
  total: number;
  read: number;
  unread: number;
  starred: number;
  deleted: number;
  withAttachments: number;
  averageSizeKb: number;
  totalSizeMb: number;
  receivedToday: number;
  receivedLast7Days: number;
}

export type DashboardWorkerStatus = 'operational' | 'degraded' | 'down';

export interface DashboardSystemHealthDto {
  worker: DashboardWorkerStatus;
  activeLoginSessions: number;
  activeApiKeys: number;
  pendingAccessCodes: number;
  telegramUpdatesLast24h: number;
  emailsLastHour: number;
}

export interface DashboardActivityEntryDto {
  id: string;
  action: string;
  actor: string;
  fromState: string;
  toState: string;
  createdAt: string;
}

export interface DashboardDto {
  generatedAt: string;
  metrics: DashboardMetricDto[];
  pipeline: DashboardPipelineDto;
  users: DashboardUserInsightsDto;
  system: DashboardSystemHealthDto;
  recentActivity: DashboardActivityEntryDto[];
}

export type MetricDto = DashboardMetricDto;

export interface UserLabelDto {
  id: string;
  name: string;
  color: string;
  visible?: boolean;
}

export interface LabelDto extends UserLabelDto {
  userCount: number;
}

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: 'active' | 'disabled';
  telegramEnabled: boolean;
  totalEmails?: number;
  unreadEmails?: number;
  /** Total ukuran email (byte) milik user. */
  storageBytes?: number;
  /** Label yang ditempel ke akun user (bisa lebih dari satu). */
  labels?: UserLabelDto[];
  /** Waktu soft delete (isi bila status = disabled karena dihapus). */
  deletedAt?: string | null;
  /** Email terakhir yang masuk untuk user ini (ringkasan di User List). */
  latestEmail?: {
    subject: string;
    sender: string;
    receivedAt: string;
  } | null;
}

export interface EmailDto {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
}

export interface EmailDetailDto {
  id: string;
  userId: string;
  sender: string;
  recipient: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  bodyText: string;
  bodyHtml: string;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  attachmentCount?: number;
}

export interface WorkerSettingsDto {
  botStatus: string;
  botTokenConfigured: boolean;
  webhookSecretConfigured: boolean;
  allowedIds: string;
  forwardInbound: boolean;
  targetMode: string;
  defaultChatId: string;
  testChatId: string;
}
