import { z } from 'zod';

export const loginSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(1, 'Password is required'),
});

export const sosCreateSchema = z.object({
  disaster_type: z.enum(['Medical', 'Trapped', 'Fire', 'Flood', 'Earthquake', 'Chemical']),
  injury_severity: z.enum(['Minor', 'Moderate', 'Severe']),
  battery_level: z.number().int().min(0).max(100),
  location_lat: z.number().min(-90).max(90).optional().nullable(),
  location_lng: z.number().min(-180).max(180).optional().nullable(),
  group_size: z.number().int().min(1).max(999).optional().default(1),
  environment: z.enum(['Normal', 'Night', 'Rain', 'Extreme_Heat']).optional().default('Normal'),
});

export const messageSendSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(1000),
  recipientId: z.string().optional().nullable(),
  signalId: z.string().optional().nullable(),
});

export const dispatchSchema = z.object({
  signalId: z.string().min(1),
  action: z.enum(['DISPATCHED', 'RESOLVED']),
});
