import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, getErrorMessage } from "../api/client";
import {
  emptyEventForm,
  emptyMaterialForm,
  emptySponsorForm,
  emptyVenueForm,
  eventFormPayload,
  eventToForm,
} from "../state/forms";
import type {
  EventFormState,
  EventItem,
  Lookup,
  MaterialFormState,
  PendingMaterialState,
  Sponsor,
  SponsorFormState,
  User,
  VenueFormState,
} from "../types";

interface UseEventFormActionsOptions {
  token: string;
  user: User | null;
  selectedEvent: EventItem | null;
  setSelectedEventId: Dispatch<SetStateAction<string | null>>;
  setError: Dispatch<SetStateAction<string>>;
  setNotice: Dispatch<SetStateAction<string>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  clearMessages: () => void;
  reloadEvents: () => Promise<void>;
  reloadManagedEvents: () => Promise<void>;
  reloadAdmin: () => Promise<void>;
  reloadSponsors: () => Promise<void>;
  addVenueToList: (venue: Lookup) => void;
}

export function useEventFormActions(options: UseEventFormActionsOptions) {
  const navigate = useNavigate();
  const {
    token,
    user,
    selectedEvent,
    setSelectedEventId,
    setError,
    setNotice,
    setLoading,
    clearMessages,
    reloadEvents,
    reloadManagedEvents,
    reloadAdmin,
    reloadSponsors,
    addVenueToList,
  } = options;
  const [eventForm, setEventForm] = useState<EventFormState>(emptyEventForm);
  const [materialForm, setMaterialForm] =
    useState<MaterialFormState>(emptyMaterialForm);
  const [sponsorForm, setSponsorForm] =
    useState<SponsorFormState>(emptySponsorForm);
  const [venueForm, setVenueForm] = useState<VenueFormState>(emptyVenueForm);
  const [sponsorToLink, setSponsorToLink] = useState("");
  const [pendingMaterials, setPendingMaterials] = useState<PendingMaterialState[]>([]);
  const [pendingSponsorIds, setPendingSponsorIds] = useState<string[]>([]);

  async function request<T>(
    method: "get" | "post" | "patch" | "delete",
    url: string,
    data?: unknown,
  ) {
    return apiRequest<T>(method, url, token, data);
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
        reloadEvents(),
        reloadManagedEvents(),
        user?.role === "admin" ? reloadAdmin() : Promise.resolve(),
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
      await Promise.all([reloadEvents(), reloadManagedEvents()]);
      navigate(`/organizer/events/${updated.id}`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function addMaterial(event: FormEvent, eventId = selectedEvent?.id) {
    event.preventDefault();
    if (!eventId) {
      return;
    }
    if (!materialForm.file && !materialForm.file_url.trim()) {
      setError("Alege un fisier sau completeaza un URL pentru material.");
      return;
    }
    try {
      await saveMaterial(eventId, materialForm);
      setMaterialForm(emptyMaterialForm);
      setNotice("Material incarcat.");
      await Promise.all([reloadEvents(), reloadManagedEvents()]);
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
      file_url: material.file_url.trim(),
      file_name: material.file_name || null,
      file_size_bytes: material.file_size_bytes
        ? Number(material.file_size_bytes)
        : null,
    });
  }

  function addPendingMaterial(event: FormEvent) {
    event.preventDefault();
    if (!materialForm.file && !materialForm.file_url.trim()) {
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
      const created = sponsorForm.logo_file
        ? await request<Sponsor>("post", "/sponsors/upload-logo", {
            name: sponsorForm.name,
            file_name: sponsorForm.logo_file.name,
            content_type: sponsorForm.logo_file.type || "application/octet-stream",
            content_base64: await fileToBase64(sponsorForm.logo_file),
            website_url: sponsorForm.website_url || null,
          })
        : await request<Sponsor>("post", "/sponsors", {
            name: sponsorForm.name,
            logo_url: null,
            website_url: sponsorForm.website_url || null,
          });
      setSponsorForm(emptySponsorForm);
      setNotice("Sponsor adaugat.");
      await reloadSponsors();
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
      await Promise.all([reloadEvents(), reloadManagedEvents()]);
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return false;
    }
  }

  async function createVenue() {
    if (
      !venueForm.building.trim() &&
      !venueForm.room.trim() &&
      !venueForm.address.trim()
    ) {
      setError("Completeaza corpul, sala sau adresa locatiei.");
      return false;
    }
    try {
      const created = await request<Lookup>("post", "/venues", {
        address: venueForm.address || null,
        building: venueForm.building || null,
        room: venueForm.room || null,
      });
      addVenueToList(created);
      setEventField("venue_id", created.id);
      setVenueForm(emptyVenueForm);
      setNotice("Locatie adaugata.");
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return false;
    }
  }

  function setEventField<K extends keyof EventFormState>(
    name: K,
    value: EventFormState[K],
  ) {
    setEventForm((current) => ({ ...current, [name]: value }));
  }

  return {
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
  };
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
