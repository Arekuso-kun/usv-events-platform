import axios from "axios";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { API_URL, apiRequest, getErrorMessage } from "./api/client";
import "./App.css";
import usvLogo from "./assets/usv_logo.png";
import { AuthPanel } from "./components/AuthPanel";
import { Button } from "./components/ui/button";
import { AdminPage } from "./pages/AdminPage";
import { CalendarPage } from "./pages/CalendarPage";
import { EventDetailPage, EventsPage } from "./pages/EventsPage";
import { LoginPage } from "./pages/LoginPage";
import { OrganizerEventFormPage } from "./pages/OrganizerEventFormPage";
import { OrganizerEventDetailPage, OrganizerPage } from "./pages/OrganizerPage";
import {
  emptyEventForm,
  emptyFilters,
  emptyMaterialForm,
  emptySponsorForm,
  emptyVenueForm,
  eventFormPayload,
  eventToForm,
} from "./state/forms";
import type {
  AdminReport,
  AppView,
  AuthMode,
  AuthResponse,
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
import { dateFilterToIso } from "./utils/date";

const TOKEN_KEY = "usv-events-access-token";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [managedEvents, setManagedEvents] = useState<EventItem[]>([]);
  const [pendingEvents, setPendingEvents] = useState<EventItem[]>([]);
  const [organizerUsers, setOrganizerUsers] = useState<User[]>([]);
  const [faculties, setFaculties] = useState<Lookup[]>([]);
  const [departments, setDepartments] = useState<Lookup[]>([]);
  const [venues, setVenues] = useState<Lookup[]>([]);
  const [categories, setCategories] = useState<Lookup[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [report, setReport] = useState<AdminReport | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [authForm, setAuthForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });
  const [eventForm, setEventForm] = useState<EventFormState>(emptyEventForm);
  const [materialForm, setMaterialForm] =
    useState<MaterialFormState>(emptyMaterialForm);
  const [feedbackForm, setFeedbackForm] = useState({ rating: "5", comment: "" });
  const [sponsorForm, setSponsorForm] =
    useState<SponsorFormState>(emptySponsorForm);
  const [venueForm, setVenueForm] = useState<VenueFormState>(emptyVenueForm);
  const [sponsorToLink, setSponsorToLink] = useState("");
  const [pendingMaterials, setPendingMaterials] = useState<PendingMaterialState[]>([]);
  const [pendingSponsorIds, setPendingSponsorIds] = useState<string[]>([]);

  const selectedEvent = useMemo(
    () =>
      events.find((event) => event.id === selectedEventId) ||
      managedEvents.find((event) => event.id === selectedEventId) ||
      pendingEvents.find((event) => event.id === selectedEventId) ||
      null,
    [events, managedEvents, pendingEvents, selectedEventId],
  );

  const canManageSelected =
    Boolean(user && selectedEvent) &&
    (user?.role === "admin" || selectedEvent?.creator_id === user?.id);

  const view = pathToView(location.pathname);

  useEffect(() => {
    handleOAuthRedirect();
  }, []);

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (token) {
      void loadMe(token);
    }
  }, [token]);

  useEffect(() => {
    void loadEvents();
  }, [filters]);

  useEffect(() => {
    if (user?.role === "admin") {
      void loadAdminData();
    }
    if (user?.role === "organizer" || user?.role === "admin") {
      void loadManagedEvents();
    }
  }, [user]);

  useEffect(() => {
    if (selectedEvent && canManageSelected) {
      void loadManagerData(selectedEvent.id);
    } else {
      setRegistrations([]);
      setStats(null);
    }
  }, [selectedEventId, canManageSelected]);

  async function request<T>(
    method: "get" | "post" | "patch" | "delete",
    url: string,
    data?: unknown,
  ) {
    return apiRequest<T>(method, url, token, data);
  }

  async function bootstrap() {
    await Promise.all([loadLookups(), loadEvents(), loadSponsors()]);
  }

  async function loadMe(nextToken = token) {
    if (!nextToken) {
      return;
    }
    try {
      const response = await axios.get<User>(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${nextToken}` },
      });
      setUser(response.data);
    } catch {
      logout();
    }
  }

  async function loadLookups() {
    try {
      const [facultiesData, departmentsData, venuesData, categoriesData] =
        await Promise.all([
          request<Lookup[]>("get", "/faculties"),
          request<Lookup[]>("get", "/departments"),
          request<Lookup[]>("get", "/venues"),
          request<Lookup[]>("get", "/categories"),
        ]);
      setFaculties(facultiesData);
      setDepartments(departmentsData);
      setVenues(venuesData);
      setCategories(categoriesData);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function loadSponsors() {
    try {
      setSponsors(await request<Sponsor[]>("get", "/sponsors"));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function loadEvents() {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (!value) {
        return;
      }
      if (key === "starts_from") {
        params.set(key, dateFilterToIso(value));
      } else if (key === "starts_until") {
        params.set(key, dateFilterToIso(value, true));
      } else {
        params.set(key, value);
      }
    });

    try {
      const suffix = params.size ? `?${params.toString()}` : "";
      const loadedEvents = await request<EventItem[]>("get", `/events${suffix}`);
      setEvents(loadedEvents);
      if (!selectedEventId && loadedEvents.length > 0) {
        setSelectedEventId(loadedEvents[0].id);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function loadAdminData() {
    try {
      const [pending, summary, organizers] = await Promise.all([
        request<EventItem[]>("get", "/admin/events/pending"),
        request<AdminReport>("get", "/admin/reports/summary"),
        request<User[]>("get", "/admin/users/organizers"),
      ]);
      setPendingEvents(pending);
      setReport(summary);
      setOrganizerUsers(organizers);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function loadManagedEvents() {
    try {
      const loadedEvents = await request<EventItem[]>("get", "/events/manage/mine");
      setManagedEvents(loadedEvents);
      if (!selectedEventId && loadedEvents.length > 0) {
        setSelectedEventId(loadedEvents[0].id);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function loadManagerData(eventId: string) {
    try {
      const [registrationData, statsData] = await Promise.all([
        request<Registration[]>("get", `/events/${eventId}/registrations`),
        request<EventStats>("get", `/events/${eventId}/stats`),
      ]);
      setRegistrations(registrationData);
      setStats(statsData);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    clearMessages();
    try {
      const url = authMode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        authMode === "login"
          ? { email: authForm.email, password: authForm.password }
          : authForm;
      const response = await axios.post<AuthResponse>(`${API_URL}${url}`, payload);
      localStorage.setItem(TOKEN_KEY, response.data.access_token);
      setToken(response.data.access_token);
      setUser(response.data.user);
      setAuthForm((current) => ({ ...current, password: "" }));
      setNotice("Sesiune activa.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  function startGoogleLogin() {
    const redirectTo = `${window.location.origin}/events`;
    window.location.assign(
      `${API_URL}/auth/google/start?redirect_to=${encodeURIComponent(redirectTo)}`,
    );
  }

  function handleOAuthRedirect() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hashAccessToken = hash.get("access_token");
    const oauthError = hash.get("error_description") || hash.get("error");

    if (oauthError) {
      setError(oauthError);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (hashAccessToken) {
      localStorage.setItem(TOKEN_KEY, hashAccessToken);
      setToken(hashAccessToken);
      setNotice("Autentificare Google reusita.");
      void loadMe(hashAccessToken);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const queryError = query.get("oauth_error");
    if (queryError) {
      setError("Redirectul OAuth nu este permis de configuratia backend.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
    setNotice("");
  }

  async function createEvent(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    clearMessages();
    try {
      const created = await request<EventItem>(
        "post",
        "/events",
        eventFormPayload(eventForm),
      );
      setEventForm(emptyEventForm);
      setSelectedEventId(created.id);
      for (const material of pendingMaterials) {
        await saveMaterial(created.id, material);
      }
      for (const sponsorId of pendingSponsorIds) {
        await request("post", `/events/${created.id}/sponsors`, {
          sponsor_id: sponsorId,
        });
      }
      setPendingMaterials([]);
      setPendingSponsorIds([]);
      setSponsorToLink("");
      setNotice("Eveniment trimis spre validare.");
      await Promise.all([
        loadEvents(),
        loadManagedEvents(),
        user?.role === "admin" ? loadAdminData() : Promise.resolve(),
      ]);
      navigate(`/organizer/events/${created.id}/edit`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function updateEvent(eventId: string, event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    clearMessages();
    try {
      const updated = await request<EventItem>(
        "patch",
        `/events/${eventId}`,
        eventFormPayload(eventForm),
      );
      setEventForm(eventToForm(updated));
      setSelectedEventId(updated.id);
      setNotice("Eveniment actualizat.");
      await Promise.all([loadEvents(), loadManagedEvents()]);
      navigate(`/organizer/events/${updated.id}`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function deleteManagedEvent(eventId: string) {
    const confirmed = window.confirm("Stergi definitiv acest eveniment?");
    if (!confirmed) {
      return false;
    }
    try {
      await request("delete", `/events/${eventId}`);
      setNotice("Eveniment sters.");
      if (selectedEventId === eventId) {
        setSelectedEventId(null);
      }
      await Promise.all([loadEvents(), loadManagedEvents()]);
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return false;
    }
  }

  async function updateSelectedEventStatus(status: EventStatus) {
    if (!selectedEvent) {
      return;
    }
    try {
      await request<EventItem>("patch", `/events/${selectedEvent.id}`, { status });
      setNotice("Status actualizat.");
      await Promise.all([
        loadEvents(),
        loadManagedEvents(),
        user?.role === "admin" ? loadAdminData() : Promise.resolve(),
        loadManagerData(selectedEvent.id),
      ]);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function approveEvent(eventId: string) {
    try {
      await request<EventItem>("post", `/admin/events/${eventId}/approve`);
      setNotice("Eveniment publicat.");
      await Promise.all([loadEvents(), loadAdminData()]);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function rejectEvent(eventId: string) {
    const reason = window.prompt("Motiv respingere");
    if (!reason) {
      return;
    }
    try {
      await request<EventItem>("post", `/admin/events/${eventId}/reject`, {
        rejection_reason: reason,
      });
      setNotice("Eveniment respins.");
      await loadAdminData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function createOrganizer(payload: OrganizerCreatePayload) {
    setLoading(true);
    clearMessages();
    try {
      await request<User>("post", "/admin/users/organizers", payload);
      setNotice("Utilizator organizer creat.");
      await loadAdminData();
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function updateUserRole(userId: string, role: "organizer" | "admin") {
    try {
      await request<User>("patch", `/admin/users/${userId}`, { role });
      setNotice("Rol actualizat.");
      await loadAdminData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function registerForEvent(eventId: string) {
    try {
      const updated = await request<EventItem>("post", `/events/${eventId}/register`);
      setEvents((current) =>
        current.map((event) => (event.id === eventId ? updated : event)),
      );
      setNotice("Inscriere inregistrata.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function submitFeedback(event: FormEvent) {
    event.preventDefault();
    if (!selectedEvent) {
      return;
    }
    try {
      await request("post", `/events/${selectedEvent.id}/feedback`, {
        rating: Number(feedbackForm.rating),
        comment: feedbackForm.comment || null,
      });
      setFeedbackForm({ rating: "5", comment: "" });
      setNotice("Feedback salvat.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function addMaterial(event: FormEvent, eventId = selectedEvent?.id) {
    event.preventDefault();
    if (!eventId) {
      return;
    }
    if (!materialForm.file && !materialForm.file_url) {
      setError("Alege un fisier sau completeaza un URL pentru material.");
      return;
    }
    try {
      await saveMaterial(eventId, materialForm);
      setMaterialForm(emptyMaterialForm);
      setNotice("Material incarcat.");
      await Promise.all([loadEvents(), loadManagedEvents()]);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function saveMaterial(eventId: string, material: MaterialFormState) {
    if (material.file) {
      await request("post", `/events/${eventId}/materials/upload`, {
        material_type: material.material_type,
        title: material.title,
        file_name: material.file.name,
        content_type: material.file.type || "application/octet-stream",
        content_base64: await fileToBase64(material.file),
      });
      return;
    }

    await request("post", `/events/${eventId}/materials`, {
      material_type: material.material_type,
      title: material.title,
      file_url: material.file_url,
      file_name: material.file_name || null,
      file_size_bytes: material.file_size_bytes
        ? Number(material.file_size_bytes)
        : null,
    });
  }

  function addPendingMaterial(event: FormEvent) {
    event.preventDefault();
    if (!materialForm.file && !materialForm.file_url) {
      setError("Alege un fisier sau completeaza un URL pentru material.");
      return;
    }
    setPendingMaterials((current) => [
      ...current,
      {
        ...materialForm,
        id: crypto.randomUUID(),
      },
    ]);
    setMaterialForm(emptyMaterialForm);
    setNotice("Material adaugat in formular.");
  }

  function removePendingMaterial(materialId: string) {
    setPendingMaterials((current) =>
      current.filter((material) => material.id !== materialId),
    );
  }

  function togglePendingSponsor(sponsorId: string) {
    if (!sponsorId) {
      return;
    }
    setPendingSponsorIds((current) =>
      current.includes(sponsorId)
        ? current.filter((id) => id !== sponsorId)
        : [...current, sponsorId],
    );
  }

  async function createSponsor(event: FormEvent): Promise<Sponsor | null> {
    event.preventDefault();
    try {
      const created = await request<Sponsor>("post", "/sponsors", {
        name: sponsorForm.name,
        logo_url: sponsorForm.logo_url || null,
        website_url: sponsorForm.website_url || null,
      });
      setSponsorForm(emptySponsorForm);
      setNotice("Sponsor adaugat.");
      await loadSponsors();
      return created;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return null;
    }
  }

  async function linkSponsor(eventId = selectedEvent?.id, sponsorId = sponsorToLink) {
    if (!eventId || !sponsorId) {
      return false;
    }
    try {
      await request("post", `/events/${eventId}/sponsors`, {
        sponsor_id: sponsorId,
      });
      setSponsorToLink("");
      setNotice("Sponsor atasat.");
      await Promise.all([loadEvents(), loadManagedEvents()]);
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return false;
    }
  }

  async function createVenue() {
    if (!venueForm.name.trim()) {
      setError("Completeaza numele locatiei.");
      return false;
    }
    try {
      const created = await request<Lookup>("post", "/venues", {
        name: venueForm.name,
        address: venueForm.address || null,
        building: venueForm.building || null,
        room: venueForm.room || null,
        city: venueForm.city || null,
        maps_url: venueForm.maps_url || null,
      });
      setVenues((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setEventField("venue_id", created.id);
      setVenueForm(emptyVenueForm);
      setNotice("Locatie adaugata.");
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return false;
    }
  }

  async function exportRegistrations(eventId: string) {
    try {
      const response = await axios.get(
        `${API_URL}/events/${eventId}/registrations/export`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        },
      );
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `event-${eventId}-registrations.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function checkIn(eventId: string, registrationId: string) {
    try {
      await request("post", `/events/${eventId}/registrations/${registrationId}/check-in`);
      setNotice("Check-in facut.");
      await loadManagerData(eventId);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  function setFilter(name: keyof FilterState, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function setEventField<K extends keyof EventFormState>(
    name: K,
    value: EventFormState[K],
  ) {
    setEventForm((current) => ({ ...current, [name]: value }));
  }

  function clearMessages() {
    setError("");
    setNotice("");
  }

  return (
    <div className="grid min-h-screen bg-[#f5f7fb] text-[#192041] lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-5 border-r border-[#d7dfeb] bg-white p-5 lg:sticky lg:top-0 lg:h-screen">
        <div className="flex min-h-12 items-center gap-3">
          <img className="h-[54px] w-[54px] shrink-0 object-contain" src={usvLogo} alt="USV" />
          <div>
            <strong className="block text-[#192041]">Events</strong>
            <span className="block text-sm text-[#667085]">
              Platforma universitara
            </span>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <NavSection title="Studenti">
            <NavLink className={({ isActive }) => navLinkClass(isActive)} to="/events">
              Evenimente
            </NavLink>
            <NavLink className={({ isActive }) => navLinkClass(isActive)} to="/calendar">
              Calendar
            </NavLink>
          </NavSection>
          <NavSection title="Organizatori">
            <NavLink
              end
              className={({ isActive }) => navLinkClass(isActive)}
              to="/organizer"
            >
              Management
            </NavLink>
            <NavLink
              className={({ isActive }) => navLinkClass(isActive)}
              to="/organizer/events/new"
            >
              Creeaza eveniment
            </NavLink>
          </NavSection>
          <NavSection title="Admin">
            <NavLink className={({ isActive }) => navLinkClass(isActive)} to="/admin">
              Admin
            </NavLink>
          </NavSection>
        </nav>

        {user ? (
          <div className="mt-auto">
            <AuthPanel
              authMode={authMode}
              authForm={authForm}
              loading={loading}
              user={user}
              setAuthMode={setAuthMode}
              setAuthForm={setAuthForm}
              submitAuth={submitAuth}
              startGoogleLogin={startGoogleLogin}
              logout={logout}
            />
          </div>
        ) : (
          <div className="mt-auto border-t border-[#d7dfeb] pt-4">
            <NavLink
              className={({ isActive }) => loginLinkClass(isActive)}
              to="/login"
            >
              Login
            </NavLink>
          </div>
        )}
      </aside>

      <main className="flex min-w-0 flex-col gap-4 p-4 sm:p-5 lg:p-[22px]">
        <header className="flex items-center justify-between gap-4 border-b border-[#d7dfeb] pb-3 max-sm:flex-col max-sm:items-stretch">
          <div>
            <h1 className="m-0 text-3xl leading-tight text-[#192041]">
              {pageTitle(location.pathname, view)}
            </h1>
            <span className="text-sm text-[#667085]">
              {events.length} evenimente publicate
            </span>
          </div>
        </header>

        {(notice || error) && (
          <div
            className={[
              "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm",
              error
                ? "bg-[rgba(39,46,83,0.08)] text-[#272E53]"
                : "bg-[rgba(134,193,234,0.22)] text-[#254591]",
            ].join(" ")}
          >
            <span>{error || notice}</span>
            <Button type="button" variant="ghost" size="sm" onClick={clearMessages}>
              Inchide
            </Button>
          </div>
        )}

        <Routes>
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route
            path="/login"
            element={
              <LoginPage
                authMode={authMode}
                authForm={authForm}
                loading={loading}
                user={user}
                setAuthMode={setAuthMode}
                setAuthForm={setAuthForm}
                submitAuth={submitAuth}
                startGoogleLogin={startGoogleLogin}
                logout={logout}
              />
            }
          />
          <Route
            path="/events"
            element={
              <EventsPage
                events={events}
                filters={filters}
                faculties={faculties}
                departments={departments}
                venues={venues}
                categories={categories}
                setFilter={setFilter}
                selectEvent={setSelectedEventId}
              />
            }
          />
          <Route
            path="/events/:eventId"
            element={
              <EventDetailPage
                events={events}
                user={user}
                registerForEvent={registerForEvent}
                submitFeedback={submitFeedback}
                feedbackForm={feedbackForm}
                setFeedbackForm={setFeedbackForm}
              />
            }
          />
          <Route
            path="/calendar"
            element={
              <CalendarPage
                events={events}
                selectEvent={(eventId) => {
                  setSelectedEventId(eventId);
                  navigate(`/events/${eventId}`);
                }}
              />
            }
          />
          <Route
            path="/organizer"
            element={
              <OrganizerPage
                user={user}
                managedEvents={managedEvents}
                selectEvent={setSelectedEventId}
                deleteEvent={deleteManagedEvent}
              />
            }
          />
          <Route
            path="/organizer/events/:eventId"
            element={
              <OrganizerEventDetailPage
                user={user}
                managedEvents={managedEvents}
                registrations={registrations}
                stats={stats}
                selectEvent={setSelectedEventId}
                deleteEvent={deleteManagedEvent}
                checkIn={checkIn}
                updateEventStatus={updateSelectedEventStatus}
                exportRegistrations={exportRegistrations}
              />
            }
          />
          <Route
            path="/organizer/events/new"
            element={
              <OrganizerEventFormPage
                mode="create"
                user={user}
                events={managedEvents}
                eventForm={eventForm}
                faculties={faculties}
                departments={departments}
                venues={venues}
                categories={categories}
                materialForm={materialForm}
                sponsorForm={sponsorForm}
                sponsors={sponsors}
                sponsorToLink={sponsorToLink}
                venueForm={venueForm}
                pendingMaterials={pendingMaterials}
                pendingSponsorIds={pendingSponsorIds}
                loading={loading}
                setEventForm={setEventForm}
                setEventField={setEventField}
                setMaterialForm={setMaterialForm}
                addMaterial={addMaterial}
                addPendingMaterial={addPendingMaterial}
                removePendingMaterial={removePendingMaterial}
                setSponsorForm={setSponsorForm}
                createSponsor={createSponsor}
                setSponsorToLink={setSponsorToLink}
                togglePendingSponsor={togglePendingSponsor}
                linkSponsor={linkSponsor}
                setVenueForm={setVenueForm}
                createVenue={createVenue}
                createEvent={createEvent}
                updateEvent={updateEvent}
              />
            }
          />
          <Route
            path="/organizer/events/:eventId/edit"
            element={
              <OrganizerEventFormPage
                mode="edit"
                user={user}
                events={managedEvents}
                eventForm={eventForm}
                faculties={faculties}
                departments={departments}
                venues={venues}
                categories={categories}
                materialForm={materialForm}
                sponsorForm={sponsorForm}
                sponsors={sponsors}
                sponsorToLink={sponsorToLink}
                venueForm={venueForm}
                pendingMaterials={pendingMaterials}
                pendingSponsorIds={pendingSponsorIds}
                loading={loading}
                setEventForm={setEventForm}
                setEventField={setEventField}
                setMaterialForm={setMaterialForm}
                addMaterial={addMaterial}
                addPendingMaterial={addPendingMaterial}
                removePendingMaterial={removePendingMaterial}
                setSponsorForm={setSponsorForm}
                createSponsor={createSponsor}
                setSponsorToLink={setSponsorToLink}
                togglePendingSponsor={togglePendingSponsor}
                linkSponsor={linkSponsor}
                setVenueForm={setVenueForm}
                createVenue={createVenue}
                createEvent={createEvent}
                updateEvent={updateEvent}
              />
            }
          />
          <Route
            path="/admin"
            element={
              <AdminPage
                user={user}
                pendingEvents={pendingEvents}
                managedEvents={managedEvents}
                organizerUsers={organizerUsers}
                faculties={faculties}
                departments={departments}
                report={report}
                loading={loading}
                approveEvent={approveEvent}
                rejectEvent={rejectEvent}
                createOrganizer={createOrganizer}
                updateUserRole={updateUserRole}
                reloadAdmin={() => void loadAdminData()}
              />
            }
          />
          <Route path="*" element={<Navigate to="/events" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function pathToView(pathname: string): AppView {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (
    segment === "calendar" ||
    segment === "organizer" ||
    segment === "admin" ||
    segment === "events"
  ) {
    return segment;
  }
  return "events";
}

function viewTitle(view: AppView): string {
  const titles: Record<AppView, string> = {
    events: "Evenimente",
    calendar: "Calendar",
    organizer: "Organizer",
    admin: "Admin",
  };
  return titles[view];
}

function pageTitle(pathname: string, view: AppView): string {
  if (pathname.startsWith("/events/")) {
    return "Detaliu eveniment";
  }
  if (pathname === "/organizer/events/new") {
    return "Eveniment nou";
  }
  if (pathname.startsWith("/organizer/events/") && pathname.endsWith("/edit")) {
    return "Editare eveniment";
  }
  if (pathname.startsWith("/organizer/events/")) {
    return "Management eveniment";
  }
  return viewTitle(view);
}

function NavSection(props: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 pt-2">
      <span className="px-3 pb-1.5 text-[11px] font-bold uppercase text-[#667085]">
        {props.title}
      </span>
      {props.children}
    </div>
  );
}

function navLinkClass(isActive: boolean): string {
  return [
    "rounded-md px-3 py-2.5 text-sm text-[#192041] no-underline transition-colors",
    "hover:bg-[rgba(134,193,234,0.22)] hover:text-[#254591]",
    isActive ? "bg-[rgba(134,193,234,0.22)] text-[#254591]" : "",
  ].join(" ");
}

function loginLinkClass(isActive: boolean): string {
  return [
    "inline-flex min-h-10 w-full items-center justify-center rounded-md px-3 py-2 text-sm font-medium no-underline transition-colors",
    "bg-[rgba(134,193,234,0.22)] text-[#192041] hover:bg-[rgba(134,193,234,0.34)]",
    isActive ? "text-[#254591]" : "",
  ].join(" ");
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}
