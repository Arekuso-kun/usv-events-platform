import { lazy, Suspense, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import type {
  AdminReport,
  AuthMode,
  EventFormState,
  EventItem,
  EventStats,
  EventStatus,
  FilterState,
  Lookup,
  MaterialFormState,
  OrganizerCreatePayload,
  PendingMaterialState,
  Registration,
  Sponsor,
  SponsorFormState,
  User,
  VenueFormState,
} from "./types";

const AdminPage = lazy(() =>
  import("./pages/AdminPage").then((module) => ({ default: module.AdminPage })),
);
const CalendarPage = lazy(() =>
  import("./pages/CalendarPage").then((module) => ({
    default: module.CalendarPage,
  })),
);
const EventDetailPage = lazy(() =>
  import("./pages/EventsPage").then((module) => ({
    default: module.EventDetailPage,
  })),
);
const EventsPage = lazy(() =>
  import("./pages/EventsPage").then((module) => ({ default: module.EventsPage })),
);
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })),
);
const OrganizerEventDetailPage = lazy(() =>
  import("./pages/OrganizerPage").then((module) => ({
    default: module.OrganizerEventDetailPage,
  })),
);
const OrganizerEventFormPage = lazy(() =>
  import("./pages/OrganizerEventFormPage").then((module) => ({
    default: module.OrganizerEventFormPage,
  })),
);
const OrganizerPage = lazy(() =>
  import("./pages/OrganizerPage").then((module) => ({
    default: module.OrganizerPage,
  })),
);
const SetPasswordPage = lazy(() =>
  import("./pages/SetPasswordPage").then((module) => ({
    default: module.SetPasswordPage,
  })),
);

interface AppRoutesProps {
  authMode: AuthMode;
  authForm: { full_name: string; email: string; password: string };
  loading: boolean;
  token: string;
  user: User | null;
  events: EventItem[];
  managedEvents: EventItem[];
  pendingEvents: EventItem[];
  organizerUsers: User[];
  faculties: Lookup[];
  departments: Lookup[];
  venues: Lookup[];
  categories: Lookup[];
  sponsors: Sponsor[];
  registrations: Registration[];
  stats: EventStats | null;
  report: AdminReport | null;
  filters: FilterState;
  eventForm: EventFormState;
  materialForm: MaterialFormState;
  feedbackForm: { rating: string; comment: string };
  myRegistrations: Record<string, Registration | null>;
  sponsorForm: SponsorFormState;
  venueForm: VenueFormState;
  sponsorToLink: string;
  pendingMaterials: PendingMaterialState[];
  pendingSponsorIds: string[];
  setAuthMode: (mode: AuthMode) => void;
  setAuthForm: Dispatch<
    SetStateAction<{ full_name: string; email: string; password: string }>
  >;
  submitAuth: (event: FormEvent) => void;
  setPassword: (password: string) => Promise<boolean>;
  startGoogleLogin: () => void;
  setFilter: (name: keyof FilterState, value: string) => void;
  setSelectedEventId: (eventId: string | null) => void;
  registerForEvent: (
    eventId: string,
    alreadyRegistered?: boolean,
  ) => Promise<void>;
  loadMyRegistration: (eventId: string) => Promise<void>;
  submitFeedback: (event: FormEvent, eventId: string) => Promise<void>;
  setFeedbackForm: Dispatch<SetStateAction<{ rating: string; comment: string }>>;
  deleteManagedEvent: (eventId: string) => Promise<boolean>;
  checkIn: (eventId: string, registrationId: string) => Promise<void>;
  updateSelectedEventStatus: (status: EventStatus) => Promise<void>;
  exportRegistrations: (eventId: string) => Promise<void>;
  setEventForm: Dispatch<SetStateAction<EventFormState>>;
  setEventField: <K extends keyof EventFormState>(
    name: K,
    value: EventFormState[K],
  ) => void;
  setMaterialForm: Dispatch<SetStateAction<MaterialFormState>>;
  addMaterial: (event: FormEvent, eventId?: string) => Promise<void>;
  addPendingMaterial: (event: FormEvent) => void;
  removePendingMaterial: (id: string) => void;
  setSponsorForm: Dispatch<SetStateAction<SponsorFormState>>;
  createSponsor: (event: FormEvent) => Promise<Sponsor | null>;
  setSponsorToLink: (id: string) => void;
  togglePendingSponsor: (id: string) => void;
  linkSponsor: (eventId?: string, sponsorId?: string) => Promise<boolean>;
  setVenueForm: Dispatch<SetStateAction<VenueFormState>>;
  createVenue: () => Promise<boolean>;
  createEvent: (event: FormEvent) => Promise<void>;
  updateEvent: (eventId: string, event: FormEvent) => Promise<void>;
  approveEvent: (eventId: string) => Promise<void>;
  rejectEvent: (eventId: string) => Promise<void>;
  createOrganizer: (payload: OrganizerCreatePayload) => Promise<boolean>;
  reloadAdmin: () => void;
}

export function AppRoutes(props: AppRoutesProps) {
  const navigate = useNavigate();

  return (
    <Suspense fallback={<div className="py-10 text-sm text-[#667085]">Se incarca...</div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/events" replace />} />
        <Route
          path="/login"
          element={
            props.user ? (
              <Navigate to="/events" replace />
            ) : (
              <LoginPage
                authForm={props.authForm}
                loading={props.loading}
                setAuthForm={props.setAuthForm}
                submitAuth={props.submitAuth}
                startGoogleLogin={props.startGoogleLogin}
              />
            )
          }
        />
        <Route
          path="/events"
          element={
            <EventsPage
              events={props.events}
              filters={props.filters}
              faculties={props.faculties}
              departments={props.departments}
              venues={props.venues}
              categories={props.categories}
              setFilter={props.setFilter}
              selectEvent={props.setSelectedEventId}
            />
          }
        />
        <Route
          path="/set-password"
          element={
            <SetPasswordPage
              loading={props.loading}
              token={props.token}
              user={props.user}
              setPassword={props.setPassword}
            />
          }
        />
        <Route
          path="/events/:eventId"
          element={
            <EventDetailPage
              events={props.events}
              user={props.user}
              myRegistrations={props.myRegistrations}
              loadMyRegistration={props.loadMyRegistration}
              registerForEvent={props.registerForEvent}
              submitFeedback={props.submitFeedback}
              feedbackForm={props.feedbackForm}
              setFeedbackForm={props.setFeedbackForm}
            />
          }
        />
        <Route
          path="/calendar"
          element={
            <CalendarPage
              events={props.events}
              selectEvent={(eventId) => {
                props.setSelectedEventId(eventId);
                navigate(`/events/${eventId}`);
              }}
            />
          }
        />
        <Route
          path="/organizer"
          element={
            <OrganizerPage
              user={props.user}
              managedEvents={props.managedEvents}
              selectEvent={props.setSelectedEventId}
              deleteEvent={props.deleteManagedEvent}
            />
          }
        />
        <Route
          path="/organizer/events/:eventId"
          element={
            <OrganizerEventDetailPage
              user={props.user}
              managedEvents={props.managedEvents}
              registrations={props.registrations}
              stats={props.stats}
              selectEvent={props.setSelectedEventId}
              deleteEvent={props.deleteManagedEvent}
              checkIn={props.checkIn}
              updateEventStatus={props.updateSelectedEventStatus}
              exportRegistrations={props.exportRegistrations}
            />
          }
        />
        <Route
          path="/organizer/events/new"
          element={<OrganizerEventFormPage mode="create" {...formPageProps(props)} />}
        />
        <Route
          path="/organizer/events/:eventId/edit"
          element={<OrganizerEventFormPage mode="edit" {...formPageProps(props)} />}
        />
        <Route
          path="/admin"
          element={
            <AdminPage
              user={props.user}
              pendingEvents={props.pendingEvents}
              managedEvents={props.managedEvents}
              organizerUsers={props.organizerUsers}
              faculties={props.faculties}
              departments={props.departments}
              report={props.report}
              loading={props.loading}
              approveEvent={props.approveEvent}
              rejectEvent={props.rejectEvent}
              createOrganizer={props.createOrganizer}
              reloadAdmin={props.reloadAdmin}
            />
          }
        />
        <Route path="*" element={<Navigate to="/events" replace />} />
      </Routes>
    </Suspense>
  );
}

function formPageProps(props: AppRoutesProps) {
  return {
    user: props.user,
    events: props.managedEvents,
    eventForm: props.eventForm,
    faculties: props.faculties,
    departments: props.departments,
    venues: props.venues,
    categories: props.categories,
    materialForm: props.materialForm,
    sponsorForm: props.sponsorForm,
    sponsors: props.sponsors,
    sponsorToLink: props.sponsorToLink,
    venueForm: props.venueForm,
    pendingMaterials: props.pendingMaterials,
    pendingSponsorIds: props.pendingSponsorIds,
    loading: props.loading,
    setEventForm: props.setEventForm,
    setEventField: props.setEventField,
    setMaterialForm: props.setMaterialForm,
    addMaterial: props.addMaterial,
    addPendingMaterial: props.addPendingMaterial,
    removePendingMaterial: props.removePendingMaterial,
    setSponsorForm: props.setSponsorForm,
    createSponsor: props.createSponsor,
    setSponsorToLink: props.setSponsorToLink,
    togglePendingSponsor: props.togglePendingSponsor,
    linkSponsor: props.linkSponsor,
    setVenueForm: props.setVenueForm,
    createVenue: props.createVenue,
    createEvent: props.createEvent,
    updateEvent: props.updateEvent,
  };
}
