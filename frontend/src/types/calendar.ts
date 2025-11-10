export type EventType =
  | 'MEETING'
  | 'HEARING'
  | 'DEADLINE'
  | 'CONSULTATION'
  | 'COURT_DATE'
  | 'DOCUMENT_FILING'
  | 'MEDIATION'
  | 'DEPOSITION'
  | 'OTHER';

export type EventStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'RESCHEDULED'
  | 'NO_SHOW';

export type ReminderType = 'EMAIL' | 'SMS' | 'IN_APP' | 'PUSH';

export interface EventParticipant {
  id: string;
  eventId: string;
  userId?: string;
  email?: string;
  name?: string;
  role: string;
  status: string;
  responseTime?: string;
  createdAt: string;
}

export interface EventReminder {
  id: string;
  eventId: string;
  type: ReminderType;
  minutesBefore: number;
  recipientUserId?: string;
  recipientEmail?: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  sentAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  status: EventStatus;
  location?: string;
  meetingLink?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  timezone: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  recurrenceEnd?: string;
  caseId?: string;
  createdBy: string;
  color?: string;
  isPrivate: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  participants?: EventParticipant[];
  reminders?: EventReminder[];
  case?: {
    id: string;
    title: string;
    clientName: string;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateEventData {
  title: string;
  description?: string;
  type: EventType;
  startTime: string;
  endTime: string;
  location?: string;
  meetingLink?: string;
  allDay?: boolean;
  timezone?: string;
  caseId?: string;
  color?: string;
  isPrivate?: boolean;
  notes?: string;
  participants?: Array<{
    userId?: string;
    email?: string;
    name?: string;
    role?: string;
  }>;
  reminders?: Array<{
    type: ReminderType;
    minutesBefore: number;
  }>;
}

export interface EventFilters {
  dateFrom?: string;
  dateTo?: string;
  type?: EventType;
  status?: EventStatus;
  caseId?: string;
}
