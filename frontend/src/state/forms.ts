import type {
  EventItem,
  EventFormState,
  FilterState,
  MaterialFormState,
  SponsorFormState,
  VenueFormState,
} from "../types";
import { toApiDateTime } from "../utils/date";

export const emptyFilters: FilterState = {
  q: "",
  faculty_id: "",
  department_id: "",
  category_id: "",
  venue_id: "",
  organizer: "",
  participation_mode: "",
  is_free: "",
  registration_required: "",
  starts_from: "",
  starts_until: "",
};

export const emptyEventForm: EventFormState = {
  title: "",
  description: "",
  starts_at: "",
  ends_at: "",
  venue_id: "",
  category_id: "",
  participation_mode: "physical",
  faculty_id: "",
  department_id: "",
  registration_required: false,
  registration_url: "",
  registration_deadline: "",
  max_participants: "",
  is_free: true,
};

export const emptyMaterialForm: MaterialFormState = {
  material_type: "pdf",
  title: "",
  file_url: "",
  file: null,
  file_name: "",
  file_size_bytes: "",
};

export const emptySponsorForm: SponsorFormState = {
  name: "",
  logo_file: null,
  website_url: "",
};

export const emptyVenueForm: VenueFormState = {
  address: "",
  building: "",
  room: "",
};

export function eventFormPayload(form: EventFormState) {
  return {
    title: form.title,
    description: form.description || null,
    starts_at: toApiDateTime(form.starts_at),
    ends_at: toApiDateTime(form.ends_at),
    venue_id: form.venue_id || null,
    category_id: form.category_id || null,
    participation_mode: form.participation_mode,
    faculty_id: form.faculty_id || null,
    department_id: form.department_id || null,
    registration_required: form.registration_required,
    registration_url: form.registration_url || null,
    registration_deadline: form.registration_required && form.registration_deadline
      ? toApiDateTime(form.registration_deadline)
      : null,
    max_participants: form.max_participants ? Number(form.max_participants) : null,
    is_free: form.is_free,
  };
}

export function eventToForm(event: EventItem): EventFormState {
  return {
    title: event.title,
    description: event.description || "",
    starts_at: toLocalDateTimeValue(event.starts_at),
    ends_at: toLocalDateTimeValue(event.ends_at),
    venue_id: event.venue_id || "",
    category_id: event.category_id || "",
    participation_mode: event.participation_mode,
    faculty_id: event.faculty_id || "",
    department_id: event.department_id || "",
    registration_required: event.registration_required,
    registration_url: event.registration_url || "",
    registration_deadline: toLocalDateTimeValue(event.registration_deadline),
    max_participants: event.max_participants ? String(event.max_participants) : "",
    is_free: event.is_free,
  };
}

function toLocalDateTimeValue(value: string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
