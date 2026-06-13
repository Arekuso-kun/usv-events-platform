import { ArrowLeft, FileUp, Plus, Trash2 } from "lucide-react";
import {
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Link, useParams } from "react-router-dom";
import { DateTimePicker } from "../components/DateTimePicker";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Combobox } from "../components/ui/combobox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { emptyEventForm, eventToForm } from "../state/forms";
import type {
  EventFormState,
  EventItem,
  Lookup,
  MaterialFormState,
  MaterialType,
  ParticipationMode,
  PendingMaterialState,
  Sponsor,
  SponsorFormState,
  User,
  VenueFormState,
} from "../types";

interface OrganizerEventFormPageProps {
  mode: "create" | "edit";
  user: User | null;
  events: EventItem[];
  eventForm: EventFormState;
  faculties: Lookup[];
  departments: Lookup[];
  venues: Lookup[];
  categories: Lookup[];
  materialForm: MaterialFormState;
  sponsorForm: SponsorFormState;
  sponsors: Sponsor[];
  sponsorToLink: string;
  venueForm: VenueFormState;
  pendingMaterials: PendingMaterialState[];
  pendingSponsorIds: string[];
  loading: boolean;
  setEventForm: Dispatch<SetStateAction<EventFormState>>;
  setEventField: <K extends keyof EventFormState>(name: K, value: EventFormState[K]) => void;
  setMaterialForm: Dispatch<SetStateAction<MaterialFormState>>;
  addMaterial: (event: FormEvent, eventId?: string) => void;
  addPendingMaterial: (event: FormEvent) => void;
  removePendingMaterial: (id: string) => void;
  setSponsorForm: Dispatch<SetStateAction<SponsorFormState>>;
  createSponsor: (event: FormEvent) => Promise<Sponsor | null>;
  setSponsorToLink: (id: string) => void;
  togglePendingSponsor: (id: string) => void;
  linkSponsor: (eventId?: string, sponsorId?: string) => Promise<boolean>;
  setVenueForm: Dispatch<SetStateAction<VenueFormState>>;
  createVenue: () => Promise<boolean>;
  createEvent: (event: FormEvent) => void;
  updateEvent: (eventId: string, event: FormEvent) => void;
}

export function OrganizerEventFormPage(props: OrganizerEventFormPageProps) {
  const { eventId } = useParams();
  const { mode, setEventForm } = props;
  const event = props.events.find((item) => item.id === eventId) || null;
  const [venueModalOpen, setVenueModalOpen] = useState(false);
  const [sponsorModalOpen, setSponsorModalOpen] = useState(false);
  const canUsePage =
    props.user && (props.user.role === "organizer" || props.user.role === "admin");

  useEffect(() => {
    if (mode === "create") {
      setEventForm(emptyEventForm);
      return;
    }
    if (event) {
      setEventForm(eventToForm(event));
    }
  }, [mode, event, setEventForm]);

  if (!canUsePage) {
    return <section className="empty-state">Login cu rol de organizer sau admin.</section>;
  }

  if (props.mode === "edit" && !event) {
    return <section className="empty-state">Evenimentul nu a fost gasit.</section>;
  }

  async function createSponsorFromModal(formEvent: FormEvent) {
    const created = await props.createSponsor(formEvent);
    if (!created) {
      return;
    }
    if (event) {
      await props.linkSponsor(event.id, created.id);
    } else {
      props.togglePendingSponsor(created.id);
    }
    setSponsorModalOpen(false);
  }

  return (
    <div className="grid gap-4">
      <Button asChild variant="ghost" className="w-fit">
        <Link to={event ? `/organizer/events/${event.id}` : "/organizer"}>
          <ArrowLeft />
          Inapoi
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            {props.mode === "create" ? "Eveniment nou" : "Editare eveniment"}
          </CardTitle>
          <CardDescription>Completeaza datele principale si resursele asociate.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form
            id="organizer-event-form"
            className="grid gap-3"
            onSubmit={(formEvent) =>
              props.mode === "create"
                ? props.createEvent(formEvent)
                : props.updateEvent(event!.id, formEvent)
            }
          >
            <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div className="grid gap-3">
                <Field label="Titlu">
                  <Input
                    value={props.eventForm.title}
                    onChange={(formEvent) =>
                      props.setEventField("title", formEvent.target.value)
                    }
                    placeholder="Titlu"
                    required
                  />
                </Field>
                <Field label="Descriere">
                  <Textarea
                    value={props.eventForm.description}
                    onChange={(formEvent) =>
                      props.setEventField("description", formEvent.target.value)
                    }
                    placeholder="Descriere"
                  />
                </Field>
              </div>

              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Incepe la">
                    <DateTimeField
                      value={props.eventForm.starts_at}
                      onChange={(value) => props.setEventField("starts_at", value)}
                      placeholder="Data inceput"
                      required
                    />
                  </Field>
                  <Field label="Se termina la">
                    <DateTimeField
                      value={props.eventForm.ends_at}
                      onChange={(value) => props.setEventField("ends_at", value)}
                      placeholder="Data final"
                    />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Participare">
                    <Select
                      value={props.eventForm.participation_mode}
                      placeholder="Participare"
                      onValueChange={(value) =>
                        props.setEventField(
                          "participation_mode",
                          (value || "physical") as ParticipationMode,
                        )
                      }
                      options={[
                        { value: "physical", label: "Fizic" },
                        { value: "online", label: "Online" },
                        { value: "hybrid", label: "Hibrid" },
                      ]}
                    />
                  </Field>
                  <Field label="Link inscriere">
                    <Input
                      value={props.eventForm.registration_url}
                      onChange={(formEvent) =>
                        props.setEventField("registration_url", formEvent.target.value)
                      }
                      placeholder="Link inscriere"
                    />
                  </Field>
                  <Field label="Max participanti">
                    <Input
                      type="number"
                      min="1"
                      value={props.eventForm.max_participants}
                      onChange={(formEvent) =>
                        props.setEventField("max_participants", formEvent.target.value)
                      }
                      placeholder="Max participanti"
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm text-[#192041]">
                    <Checkbox
                      checked={props.eventForm.registration_required}
                      onCheckedChange={(checked) =>
                        props.setEventField(
                          "registration_required",
                          checked === true,
                        )
                      }
                    />
                    Necesita inscriere
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[#192041]">
                    <Checkbox
                      checked={props.eventForm.is_free}
                      onCheckedChange={(checked) =>
                        props.setEventField("is_free", checked === true)
                      }
                    />
                    Intrare libera
                  </label>
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(18rem,1.1fr)_minmax(14rem,0.6fr)_minmax(0,2fr)]">
              <LookupField
                label="Locatie"
                value={props.eventForm.venue_id}
                items={props.venues}
                placeholder="Locatie"
                onChange={(value) => props.setEventField("venue_id", value)}
              />
              <Button
                className="h-11 w-full self-end justify-center px-5 text-[15px]"
                type="button"
                variant="secondary"
                onClick={() => setVenueModalOpen(true)}
              >
                <Plus className="size-4" />
                Locatie noua
              </Button>
              <div className="grid gap-3 md:grid-cols-3">
                <LookupField
                  label="Categorie"
                  value={props.eventForm.category_id}
                  items={props.categories}
                  placeholder="Categorie"
                  onChange={(value) => props.setEventField("category_id", value)}
                />
                <LookupField
                  label="Facultate"
                  value={props.eventForm.faculty_id}
                  items={props.faculties}
                  placeholder="Facultate"
                  onChange={(value) => props.setEventField("faculty_id", value)}
                />
                <LookupField
                  label="Departament"
                  value={props.eventForm.department_id}
                  items={props.departments}
                  placeholder="Departament"
                  onChange={(value) => props.setEventField("department_id", value)}
                />
              </div>
            </div>
          </form>

          <div className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
              <h3 className="text-sm font-semibold uppercase text-[#667085]">
                Materiale si sponsori
              </h3>
              <p className="mt-1 text-sm text-[#667085]">
                Adauga resursele asociate evenimentului in acelasi flux.
              </p>
              </div>
            </div>
            <div className="grid items-start gap-3 xl:grid-cols-2">
              <MaterialPanel {...props} event={event} />
              <SponsorPanel
                {...props}
                event={event}
                onNewSponsor={() => setSponsorModalOpen(true)}
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              className="min-w-48"
              disabled={props.loading}
              form="organizer-event-form"
              type="submit"
            >
              {props.mode === "create"
                ? "Creeaza eveniment"
                : "Salveaza modificarile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <VenueModal
        open={venueModalOpen}
        {...props}
        onClose={() => setVenueModalOpen(false)}
        onCreate={async () => {
          const created = await props.createVenue();
          if (created) {
            setVenueModalOpen(false);
          }
        }}
      />
      <SponsorModal
        open={sponsorModalOpen}
        {...props}
        onClose={() => setSponsorModalOpen(false)}
        onCreate={createSponsorFromModal}
      />
    </div>
  );
}

function VenueModal(
  props: OrganizerEventFormPageProps & {
    open: boolean;
    onClose: () => void;
    onCreate: () => Promise<void>;
  },
) {
  if (!props.open) {
    return null;
  }

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Locatie noua</DialogTitle>
          <DialogDescription>
            Creeaza o locatie si o selectam automat pentru eveniment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Corp">
              <Input
                value={props.venueForm.building}
                onChange={(formEvent) =>
                  props.setVenueForm((current) => ({
                    ...current,
                    building: formEvent.target.value,
                  }))
                }
                placeholder="Corp"
              />
            </Field>
            <Field label="Sala">
              <Input
                value={props.venueForm.room}
                onChange={(formEvent) =>
                  props.setVenueForm((current) => ({
                    ...current,
                    room: formEvent.target.value,
                  }))
                }
                placeholder="Sala"
              />
            </Field>
          </div>
          <Field label="Adresa / nume locatie">
            <Input
              value={props.venueForm.address}
              onChange={(formEvent) =>
                props.setVenueForm((current) => ({
                  ...current,
                  address: formEvent.target.value,
                }))
              }
              placeholder="Ex: Corp E, str. Universitatii / Casa de Cultura"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={props.onClose}>
            Anuleaza
          </Button>
          <Button
            type="button"
            disabled={
              !props.venueForm.building.trim() &&
              !props.venueForm.room.trim() &&
              !props.venueForm.address.trim()
            }
            onClick={props.onCreate}
          >
            <Plus />
            Creeaza locatie
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SponsorModal(
  props: OrganizerEventFormPageProps & {
    open: boolean;
    onClose: () => void;
    onCreate: (event: FormEvent) => void;
  },
) {
  if (!props.open) {
    return null;
  }

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Sponsor nou</DialogTitle>
          <DialogDescription>
            Logo-ul este incarcat in Supabase Storage si salvat ca URL public.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-3" onSubmit={props.onCreate}>
          <Field label="Nume sponsor">
            <Input
              value={props.sponsorForm.name}
              onChange={(formEvent) =>
                props.setSponsorForm((current) => ({
                  ...current,
                  name: formEvent.target.value,
                }))
              }
              placeholder="Nume sponsor"
              required
            />
          </Field>
          <label className="grid gap-2 text-sm text-[#667085]">
            <span>Logo sponsor</span>
            <Input
              type="file"
              accept="image/*"
              required
              onChange={(formEvent) => {
                const logo_file = formEvent.target.files?.[0] ?? null;
                props.setSponsorForm((current) => ({ ...current, logo_file }));
              }}
            />
          </label>
          <Field label="Website">
            <Input
              value={props.sponsorForm.website_url}
              onChange={(formEvent) =>
                props.setSponsorForm((current) => ({
                  ...current,
                  website_url: formEvent.target.value,
                }))
              }
              placeholder="Website"
            />
          </Field>
          <DialogFooter className="border-t-0 pt-0">
            <Button type="button" variant="outline" onClick={props.onClose}>
              Anuleaza
            </Button>
            <Button
              disabled={!props.sponsorForm.name.trim() || !props.sponsorForm.logo_file}
            >
              <Plus />
              Creeaza sponsor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MaterialPanel(
  props: OrganizerEventFormPageProps & { event: EventItem | null },
) {
  const materialItems = props.event?.materials ?? props.pendingMaterials;
  const hasMaterialUrl = props.materialForm.file_url.trim().length > 0;
  const hasMaterialFile = Boolean(props.materialForm.file);

  return (
    <section className="grid gap-4 rounded-md border border-[#d7dfeb] bg-white p-4">
      <div>
        <h4 className="font-semibold text-[#192041]">Materiale</h4>
        <p className="mt-1 text-sm text-[#667085]">
          Incarca un fisier nou sau ataseaza un link deja existent.
        </p>
      </div>
        <ul className="grid gap-2">
          {materialItems.map((material) => (
            <li
              key={material.id}
              className="flex items-center justify-between gap-3 rounded-md border border-[#d7dfeb] p-3"
            >
              {material.file_url ? (
                <a
                  className="truncate text-sm font-medium text-[#254591]"
                  href={material.file_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {material.title}
                </a>
              ) : (
                <span className="truncate text-sm font-medium text-[#192041]">
                  {material.title}
                </span>
              )}
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-[#667085]">
                  {material.material_type}
                </span>
                {!props.event && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => props.removePendingMaterial(material.id)}
                  >
                    Sterge
                  </Button>
                )}
              </div>
            </li>
          ))}
          {materialItems.length === 0 && (
            <li className="text-sm text-[#667085]">Nu exista materiale atasate.</li>
          )}
        </ul>

        <form
          className="grid gap-3"
          onSubmit={(formEvent) =>
            props.event
              ? props.addMaterial(formEvent, props.event.id)
              : props.addPendingMaterial(formEvent)
          }
        >
          <Field label="Titlu material">
            <Input
              value={props.materialForm.title}
              onChange={(formEvent) =>
                props.setMaterialForm((current) => ({
                  ...current,
                  title: formEvent.target.value,
                }))
              }
              placeholder="Titlu material"
              required
            />
          </Field>
          <Field label="URL material existent">
            <Input
              value={props.materialForm.file_url}
              onChange={(formEvent) => {
                const file_url = formEvent.target.value;
                props.setMaterialForm((current) => ({
                  ...current,
                  file_url,
                  file: file_url.trim() ? null : current.file,
                  file_name: file_url.trim() ? "" : current.file_name,
                  file_size_bytes: file_url.trim() ? "" : current.file_size_bytes,
                  material_type: detectMaterialType({
                    fileName: file_url,
                    fallback: current.material_type,
                  }),
                }));
              }}
              placeholder="URL material existent"
              disabled={hasMaterialFile}
            />
          </Field>
          <Field label="Fisier nou">
            <div className="grid gap-2">
              <Input
                key={
                  props.materialForm.file
                    ? `file-${props.materialForm.file.name}`
                    : hasMaterialUrl
                      ? "url-selected"
                      : "empty-file"
                }
                type="file"
                disabled={hasMaterialUrl}
                onChange={(formEvent) => {
                  const file = formEvent.target.files?.[0] ?? null;
                  props.setMaterialForm((current) => ({
                    ...current,
                    file,
                    file_url: file ? "" : current.file_url,
                    file_name: file?.name || "",
                    file_size_bytes: file ? String(file.size) : "",
                    material_type: detectMaterialType({
                      fileName: file?.name,
                      contentType: file?.type,
                      fallback: current.material_type,
                    }),
                    title: current.title || (file ? stripExtension(file.name) : ""),
                  }));
                }}
              />
            </div>
          </Field>
          <div className="flex items-center justify-between gap-3">
            <Button
              className="w-fit"
              variant="secondary"
              disabled={!props.materialForm.file && !props.materialForm.file_url.trim()}
            >
              <FileUp />
              {props.event ? "Ataseaza material" : "Adauga material in formular"}
            </Button>
            {hasMaterialFile && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-fit bg-red-50 px-3 text-red-700 hover:bg-red-100 hover:text-red-800"
                onClick={() =>
                  props.setMaterialForm((current) => ({
                    ...current,
                    file: null,
                    file_name: "",
                    file_size_bytes: "",
                  }))
                }
              >
                <Trash2 />
                Sterge fisier
              </Button>
            )}
          </div>
        </form>
    </section>
  );
}

function SponsorPanel(
  props: OrganizerEventFormPageProps & {
    event: EventItem | null;
    onNewSponsor: () => void;
  },
) {
  const selectedSponsors = props.event
    ? props.event.sponsors
    : props.sponsors.filter((sponsor) => props.pendingSponsorIds.includes(sponsor.id));
  const selectedSponsorIds = new Set(
    selectedSponsors.map((sponsor) => sponsor.id),
  );
  const availableSponsors = props.sponsors.filter(
    (sponsor) => !selectedSponsorIds.has(sponsor.id),
  );

  function attachExisting(sponsorId: string) {
    if (!sponsorId) {
      props.setSponsorToLink("");
      return;
    }
    if (props.event) {
      void props.linkSponsor(props.event.id, sponsorId);
      return;
    }
    props.togglePendingSponsor(sponsorId);
    props.setSponsorToLink("");
  }

  return (
    <section className="grid gap-4 rounded-md border border-[#d7dfeb] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-[#192041]">Sponsori</h4>
          <p className="mt-1 text-sm text-[#667085]">
            Alege un sponsor existent sau creeaza unul nou.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={props.onNewSponsor}>
          <Plus />
          Sponsor nou
        </Button>
      </div>
        <ul className="grid gap-2">
          {selectedSponsors.map((sponsor) => (
            <li
              key={sponsor.id}
              className="flex items-center justify-between gap-3 rounded-md border border-[#d7dfeb] p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                {sponsor.logo_url && (
                  <img
                    className="h-9 w-9 rounded border border-[#d7dfeb] object-contain"
                    src={sponsor.logo_url}
                    alt=""
                  />
                )}
                <span className="truncate text-sm font-medium text-[#192041]">
                  {sponsor.name}
                </span>
              </div>
              {!props.event && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => props.togglePendingSponsor(sponsor.id)}
                >
                  Sterge
                </Button>
              )}
              {props.event && sponsor.website_url && (
                <a className="text-sm text-[#254591]" href={sponsor.website_url}>
                  website
                </a>
              )}
            </li>
          ))}
          {selectedSponsors.length === 0 && (
            <li className="text-sm text-[#667085]">Nu exista sponsori atasati.</li>
          )}
        </ul>

        <div className="grid gap-3">
          <Field label="Sponsor existent">
            <Combobox
              value={props.sponsorToLink}
              placeholder="Sponsor existent"
              searchPlaceholder="Cauta sponsor..."
              emptyText="Nu mai exista sponsori disponibili."
              onValueChange={attachExisting}
              options={availableSponsors.map((sponsor) => ({
                value: sponsor.id,
                label: sponsor.name,
              }))}
            />
          </Field>
        </div>

    </section>
  );
}

function Field(props: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{props.label}</Label>
      {props.children}
    </div>
  );
}

function LookupField(props: {
  label: string;
  value: string;
  items: Lookup[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={props.label}>
      <Combobox
        value={props.value}
        placeholder={props.placeholder}
        searchPlaceholder={`Cauta ${props.label.toLowerCase()}...`}
        onValueChange={props.onChange}
        options={props.items.map((item) => ({ value: item.id, label: item.name }))}
      />
    </Field>
  );
}

function DateTimeField(props: {
  value: string;
  placeholder: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <DateTimePicker
      value={props.value}
      placeholder={props.placeholder}
      required={props.required}
      onChange={props.onChange}
    />
  );
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "");
}

function detectMaterialType(input: {
  fileName?: string | null;
  contentType?: string | null;
  fallback: MaterialType;
}): MaterialType {
  const contentType = input.contentType?.toLowerCase() || "";
  const fileName = input.fileName?.toLowerCase() || "";

  if (contentType.startsWith("image/")) {
    return "image";
  }
  if (contentType.includes("pdf") || fileName.endsWith(".pdf")) {
    return "pdf";
  }
  if (
    contentType.includes("presentation") ||
    contentType.includes("powerpoint") ||
    fileName.endsWith(".ppt") ||
    fileName.endsWith(".pptx") ||
    fileName.endsWith(".odp") ||
    fileName.endsWith(".key")
  ) {
    return "presentation";
  }
  if (/\.(png|jpe?g|gif|webp|svg|bmp|avif)$/.test(fileName)) {
    return "image";
  }
  return fileName || contentType ? "other" : input.fallback;
}
