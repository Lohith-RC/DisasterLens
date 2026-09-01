/**
 * Core domain types for DisasterLens.
 * Shared between client components, hooks, and API handlers for end-to-end type safety.
 */

export type DisasterType =
  | 'Medical'
  | 'Trapped'
  | 'Fire'
  | 'Flood'
  | 'Earthquake'
  | 'Chemical';

export type InjurySeverity = 'Minor' | 'Moderate' | 'Severe';

export type SignalStatus = 'PENDING' | 'DISPATCHED' | 'RESOLVED';

export type EnvironmentType = 'Normal' | 'Night' | 'Rain' | 'Extreme_Heat';

export interface UserSummary {
  id: string;
  name: string;
  role: 'VICTIM' | 'RESCUER';
}

export interface SOSSignal {
  id: string;
  userId: string;
  user?: UserSummary;
  disaster_type: DisasterType;
  injury_severity: InjurySeverity;
  battery_level: number;
  status: SignalStatus;
  priority_score: number;
  ai_explanation?: string | null;
  location_lat: number | null;
  location_lng: number | null;
  group_size?: number | null;
  environment?: EnvironmentType | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'VICTIM' | 'RESCUER';
  recipientId?: string | null;
  signalId?: string | null;
  content: string;
  read?: boolean;
  createdAt: string | Date;
  updatedAt?: string | Date;
  optimistic?: boolean;
}

export interface OfflineSOSPayload {
  disaster_type: DisasterType;
  injury_severity: InjurySeverity;
  battery_level: number;
  location_lat: number;
  location_lng: number;
  group_size: number;
  environment: EnvironmentType;
}

export interface OfflineMessagePayload {
  content: string;
  recipientId?: string | null;
  signalId?: string | null;
}

export type OfflineQueueItem =
  | { type: 'SOS'; data: OfflineSOSPayload; timestamp: string }
  | { type: 'MESSAGE'; data: OfflineMessagePayload; timestamp: string };
