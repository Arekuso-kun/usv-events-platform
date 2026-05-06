import { useEffect, useState } from "react";
import { AppRoutes } from "./AppRoutes";
import "./App.css";
import { AppLayout } from "./components/layout/AppLayout";
import { useAdminData } from "./hooks/useAdminData";
import { useAuth } from "./hooks/useAuth";
import { useEventFormActions } from "./hooks/useEventFormActions";
import { useEvents } from "./hooks/useEvents";
import { useManagedEvents } from "./hooks/useManagedEvents";
import { useReferenceData } from "./hooks/useReferenceData";

export default function App() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const {
    token,
    user,
    authMode,
    authForm,
    setAuthMode,
    setAuthForm,
    submitAuth,
    setPassword,
    startGoogleLogin,
    logout,
  } = useAuth({ setError, setNotice, setLoading, clearMessages });
  const {
    faculties,
    departments,
    venues,
    categories,
    sponsors,
    loadLookups,
    loadSponsors,
    addVenue,
  } = useReferenceData({ token, setError });
  const {
    events,
    filters,
    feedbackForm,
    myRegistrations,
    setFeedbackForm,
    loadEvents,
    loadMyRegistration,
    setFilter,
    registerForEvent,
    submitFeedback,
  } = useEvents({ token, setError, setNotice, setSelectedEventId });
  const {
    pendingEvents,
    organizerUsers,
    report,
    loadAdminData,
    approveEvent,
    rejectEvent,
    createOrganizer,
  } = useAdminData({
    token,
    setError,
    setNotice,
    setLoading,
    clearMessages,
    reloadEvents: loadEvents,
  });
  const {
    managedEvents,
    registrations,
    stats,
    selectedEvent,
    canManageSelected,
    loadManagedEvents,
    loadManagerData,
    clearManagerData,
    deleteManagedEvent,
    updateSelectedEventStatus,
    exportRegistrations,
    checkIn,
  } = useManagedEvents({
    token,
    user,
    events,
    pendingEvents,
    selectedEventId,
    setSelectedEventId,
    setError,
    setNotice,
    reloadEvents: loadEvents,
    reloadAdmin: loadAdminData,
  });
  const {
    eventForm,
    materialForm,
    sponsorForm,
    venueForm,
    sponsorToLink,
    pendingMaterials,
    pendingSponsorIds,
    setEventForm,
    setEventField,
    setMaterialForm,
    addMaterial,
    addPendingMaterial,
    removePendingMaterial,
    setSponsorForm,
    createSponsor,
    setSponsorToLink,
    togglePendingSponsor,
    linkSponsor,
    setVenueForm,
    createVenue,
    createEvent,
    updateEvent,
  } = useEventFormActions({
    token,
    user,
    selectedEvent,
    setSelectedEventId,
    setError,
    setNotice,
    setLoading,
    clearMessages,
    reloadEvents: loadEvents,
    reloadManagedEvents: loadManagedEvents,
    reloadAdmin: loadAdminData,
    reloadSponsors: loadSponsors,
    addVenueToList: addVenue,
  });

  useEffect(() => {
    void Promise.all([loadLookups(), loadSponsors()]);
  }, [loadLookups, loadSponsors]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (user?.role === "admin") {
      void loadAdminData();
    }
    if (user?.role === "organizer" || user?.role === "admin") {
      void loadManagedEvents();
    }
  }, [loadAdminData, loadManagedEvents, user]);

  useEffect(() => {
    if (selectedEvent && canManageSelected) {
      void loadManagerData(selectedEvent.id);
    } else {
      clearManagerData();
    }
  }, [canManageSelected, clearManagerData, loadManagerData, selectedEvent]);

  function clearMessages() {
    setError("");
    setNotice("");
  }

  return (
    <AppLayout
      authMode={authMode}
      authForm={authForm}
      loading={loading}
      user={user}
      eventsCount={events.length}
      notice={notice}
      error={error}
      setAuthMode={setAuthMode}
      setAuthForm={setAuthForm}
      submitAuth={submitAuth}
      startGoogleLogin={startGoogleLogin}
      logout={logout}
      clearMessages={clearMessages}
    >
      <AppRoutes
        authMode={authMode}
        authForm={authForm}
        loading={loading}
        token={token}
        user={user}
        events={events}
        managedEvents={managedEvents}
        pendingEvents={pendingEvents}
        organizerUsers={organizerUsers}
        faculties={faculties}
        departments={departments}
        venues={venues}
        categories={categories}
        sponsors={sponsors}
        registrations={registrations}
        stats={stats}
        report={report}
        filters={filters}
        eventForm={eventForm}
        materialForm={materialForm}
        feedbackForm={feedbackForm}
        myRegistrations={myRegistrations}
        sponsorForm={sponsorForm}
        venueForm={venueForm}
        sponsorToLink={sponsorToLink}
        pendingMaterials={pendingMaterials}
        pendingSponsorIds={pendingSponsorIds}
        setAuthMode={setAuthMode}
        setAuthForm={setAuthForm}
        submitAuth={submitAuth}
        setPassword={setPassword}
        startGoogleLogin={startGoogleLogin}
        setFilter={setFilter}
        setSelectedEventId={setSelectedEventId}
        registerForEvent={registerForEvent}
        loadMyRegistration={loadMyRegistration}
        submitFeedback={submitFeedback}
        setFeedbackForm={setFeedbackForm}
        deleteManagedEvent={deleteManagedEvent}
        checkIn={checkIn}
        updateSelectedEventStatus={updateSelectedEventStatus}
        exportRegistrations={exportRegistrations}
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
        approveEvent={approveEvent}
        rejectEvent={rejectEvent}
        createOrganizer={createOrganizer}
        reloadAdmin={() => void loadAdminData()}
      />
    </AppLayout>
  );
}
