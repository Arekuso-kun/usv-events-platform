export type Role = "student" | "organizer" | "admin";

export type ParticipationMode = "physical" | "online" | "hybrid";

export type EventStatus =
  | "draft"
  | "pending_approval"
  | "published"
  | "rejected"
  | "cancelled"
  | "completed";

export type MaterialType = "presentation" | "image" | "pdf" | "other";

export type AppView = "events" | "calendar" | "organizer" | "admin";

export type AuthMode = "login" | "register";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  auth_provider: string;
  faculty_id?: string | null;
  department_id?: string | null;
  created_at: string;
}

export interface OrganizerCreatePayload {
  full_name: string;
  email: string;
  faculty_id: string | null;
  department_id: string | null;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string | null;
  expires_at?: number | null;
  user: User;
}

export interface Lookup {
  id: string;
  name: string;
  short_name: string | null;
}

export interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
}

export interface Material {
  id: string;
  event_id: string;
  uploaded_by: string;
  material_type: MaterialType;
  title: string;
  file_url: string;
  file_name: string | null;
  file_size_bytes: number | null;
  created_at: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  venue_id: string | null;
  venue_name: string | null;
  starts_at: string;
  ends_at: string | null;
  category_id: string | null;
  category_name: string | null;
  participation_mode: ParticipationMode;
  faculty_id: string | null;
  faculty_name: string | null;
  department_id: string | null;
  department_name: string | null;
  registration_required: boolean;
  registration_url: string | null;
  registration_deadline: string | null;
  max_participants: number | null;
  is_free: boolean;
  status: EventStatus;
  creator_id: string;
  creator_full_name: string;
  rejection_reason: string | null;
  created_at: string;
  registration_count: number;
  is_full: boolean;
  sponsors: Sponsor[];
  materials: Material[];
}

export interface Registration {
  id: string;
  event_id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  status: string;
  registered_at: string;
  cancelled_at: string | null;
  checked_in_at: string | null;
}

export interface EventStats {
  registration_count: number;
  checked_in_count: number;
  feedback_count: number;
  average_rating: number | null;
}

export interface AdminReport {
  events_total: number;
  events_by_status: Record<string, number>;
  events_by_month: Array<{
    month: string;
    count: number;
  }>;
  events_by_organizer: Array<{
    organizer_id: string;
    organizer_name: string;
    count: number;
  }>;
  registrations_total: number;
  average_participation: number;
  average_feedback_rating: number | null;
}

export interface EventFormState {
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  venue_id: string;
  category_id: string;
  participation_mode: ParticipationMode;
  faculty_id: string;
  department_id: string;
  registration_required: boolean;
  registration_url: string;
  registration_deadline: string;
  max_participants: string;
  is_free: boolean;
}

export interface FilterState {
  q: string;
  faculty_id: string;
  department_id: string;
  category_id: string;
  venue_id: string;
  organizer: string;
  participation_mode: string;
  is_free: string;
  registration_required: string;
  starts_from: string;
  starts_until: string;
}

export interface MaterialFormState {
  material_type: MaterialType;
  title: string;
  file_url: string;
  file: File | null;
  file_name: string;
  file_size_bytes: string;
}

export interface PendingMaterialState extends MaterialFormState {
  id: string;
}

export interface SponsorFormState {
  name: string;
  logo_file: File | null;
  website_url: string;
}

export interface VenueFormState {
  address: string;
  building: string;
  room: string;
}

export interface CalendarDay {
  key: string;
  date: Date;
  inMonth: boolean;
  events: EventItem[];
}
