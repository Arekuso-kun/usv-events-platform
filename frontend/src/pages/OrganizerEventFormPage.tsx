import { ArrowLeft, FileUp, LinkIcon, Plus, X } from "lucide-react";
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
import { SelectField } from "../components/SelectField";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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
          <CardDescription>
            Detalii, locatie, materiale si sponsori in acelasi flux.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <form
            id="organizer-event-form"
            className="grid gap-4"
            onSubmit={(formEvent) =>
              props.mode === "create"
                ? props.createEvent(formEvent)
                : props.updateEvent(event!.id, formEvent)
            }
          >
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
              <textarea
                className="min-h-28 rounded-md border border-[#d7dfeb] bg-white px-3 py-2 text-sm text-[#192041] placeholder:text-[#667085] focus-visible:border-[#254591] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#254591]/20"
                value={props.eventForm.description}
                onChange={(formEvent) =>
                  props.setEventField("description", formEvent.target.value)
                }
                placeholder="Descriere"
              />
            </Field>

            <div className="grid gap-3 lg:grid-cols-2">
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

            <div className="grid gap-3 lg:grid-cols-[minmax(18rem,1.1fr)_minmax(14rem,0.6fr)_minmax(0,2fr)]">
              <LookupField
                value={props.eventForm.venue_id}
                items={props.venues}
                placeholder="Locatie"
                onChange={(value) => props.setEventField("venue_id", value)}
              />
              <Button
                className="h-11 w-full justify-center px-5 text-[15px]"
                type="button"
                variant="secondary"
                onClick={() => setVenueModalOpen(true)}
              >
                <Plus className="size-4" />
                Locatie noua
              </Button>
              <div className="grid gap-3 md:grid-cols-3">
                <LookupField
                  value={props.eventForm.category_id}
                  items={props.categories}
                  placeholder="Categorie"
                  onChange={(value) => props.setEventField("category_id", value)}
                />
                <LookupField
                  value={props.eventForm.faculty_id}
                  items={props.faculties}
                  placeholder="Facultate"
                  onChange={(value) => props.setEventField("faculty_id", value)}
                />
                <LookupField
                  value={props.eventForm.department_id}
                  items={props.departments}
                  placeholder="Departament"
                  onChange={(value) => props.setEventField("department_id", value)}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                value={props.eventForm.participation_mode}
                placeholder="Participare"
                onChange={(value) =>
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
              <Input
                value={props.eventForm.organizer_name}
                onChange={(formEvent) =>
                  props.setEventField("organizer_name", formEvent.target.value)
                }
                placeholder="Organizator"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                value={props.eventForm.registration_url}
                onChange={(formEvent) =>
                  props.setEventField("registration_url", formEvent.target.value)
                }
                placeholder="Link inscriere"
              />
              <Input
                type="number"
                min="1"
                value={props.eventForm.max_participants}
                onChange={(formEvent) =>
                  props.setEventField("max_participants", formEvent.target.value)
                }
                placeholder="Max participanti"
              />
            </div>

            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-sm text-[#192041]">
                <input
                  className="size-4"
                  type="checkbox"
                  checked={props.eventForm.registration_required}
                  onChange={(formEvent) =>
                    props.setEventField(
                      "registration_required",
                      formEvent.target.checked,
                    )
                  }
                />
                Necesita inscriere
              </label>
              <label className="flex items-center gap-2 text-sm text-[#192041]">
                <input
                  className="size-4"
                  type="checkbox"
                  checked={props.eventForm.is_free}
                  onChange={(formEvent) =>
                    props.setEventField("is_free", formEvent.target.checked)
                  }
                />
                Intrare libera
              </label>
            </div>
          </form>

          <div className="grid gap-4 border-t border-[#d7dfeb] pt-5">
            <div>
              <h3 className="text-sm font-semibold uppercase text-[#667085]">
                Materiale si sponsori
              </h3>
              <p className="mt-1 text-sm text-[#667085]">
                Adauga resursele asociate evenimentului in acelasi flux.
              </p>
            </div>
            <div className="grid items-start gap-4 xl:grid-cols-2">
              <MaterialPanel {...props} event={event} />
              <SponsorPanel {...props} event={event} />
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#192041]/45 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-[#d7dfeb] bg-white text-[#192041] shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#d7dfeb] p-5">
          <div>
            <h2 className="text-lg font-semibold">Locatie noua</h2>
            <p className="mt-1 text-sm text-[#667085]">
              Creeaza o locatie si o selectam automat pentru eveniment.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={props.onClose}>
            <X />
          </Button>
        </div>

        <div className="grid gap-3 p-5">
          <Input
            value={props.venueForm.name}
            onChange={(formEvent) =>
              props.setVenueForm((current) => ({
                ...current,
                name: formEvent.target.value,
              }))
            }
            placeholder="Nume locatie"
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
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
          </div>
          <Input
            value={props.venueForm.address}
            onChange={(formEvent) =>
              props.setVenueForm((current) => ({
                ...current,
                address: formEvent.target.value,
              }))
            }
            placeholder="Adresa"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={props.venueForm.city}
              onChange={(formEvent) =>
                props.setVenueForm((current) => ({
                  ...current,
                  city: formEvent.target.value,
                }))
              }
              placeholder="Oras"
            />
            <Input
              value={props.venueForm.maps_url}
              onChange={(formEvent) =>
                props.setVenueForm((current) => ({
                  ...current,
                  maps_url: formEvent.target.value,
                }))
              }
              placeholder="Google Maps URL"
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[#d7dfeb] p-5">
          <Button type="button" variant="outline" onClick={props.onClose}>
            Anuleaza
          </Button>
          <Button
            type="button"
            disabled={!props.venueForm.name.trim()}
            onClick={props.onCreate}
          >
            <Plus />
            Creeaza locatie
          </Button>
        </div>
      </div>
    </div>
  );
}

function MaterialPanel(
  props: OrganizerEventFormPageProps & { event: EventItem | null },
) {
  const materialItems = props.event?.materials ?? props.pendingMaterials;

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
          <SelectField
            value={props.materialForm.material_type}
            placeholder="Tip material"
            onChange={(value) =>
              props.setMaterialForm((current) => ({
                ...current,
                material_type: (value || "pdf") as MaterialType,
              }))
            }
            options={[
              { value: "presentation", label: "Prezentare" },
              { value: "image", label: "Imagine" },
              { value: "pdf", label: "PDF" },
              { value: "other", label: "Altul" },
            ]}
          />
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
          <Input
            value={props.materialForm.file_url}
            onChange={(formEvent) =>
              props.setMaterialForm((current) => ({
                ...current,
                file_url: formEvent.target.value,
              }))
            }
            placeholder="URL material existent"
          />
          <label className="grid gap-2 text-sm text-[#667085]">
            <span>Fisier nou</span>
            <Input
              type="file"
              onChange={(formEvent) => {
                const file = formEvent.target.files?.[0] ?? null;
                props.setMaterialForm((current) => ({
                  ...current,
                  file,
                  file_name: file?.name || "",
                  file_size_bytes: file ? String(file.size) : "",
                  title: current.title || (file ? stripExtension(file.name) : ""),
                }));
              }}
            />
          </label>
          <Button
            className="w-fit"
            variant="secondary"
            disabled={!props.materialForm.file && !props.materialForm.file_url}
          >
            <FileUp />
            {props.event ? "Ataseaza material" : "Adauga material in formular"}
          </Button>
        </form>
    </section>
  );
}

function SponsorPanel(
  props: OrganizerEventFormPageProps & { event: EventItem | null },
) {
  const selectedSponsors = props.event
    ? props.event.sponsors
    : props.sponsors.filter((sponsor) => props.pendingSponsorIds.includes(sponsor.id));

  async function createAndMaybeAttach(formEvent: FormEvent) {
    const created = await props.createSponsor(formEvent);
    if (!created) {
      return;
    }
    if (props.event) {
      await props.linkSponsor(props.event.id, created.id);
      return;
    }
    props.togglePendingSponsor(created.id);
  }

  function attachExisting() {
    if (!props.sponsorToLink) {
      return;
    }
    if (props.event) {
      void props.linkSponsor(props.event.id, props.sponsorToLink);
      return;
    }
    props.togglePendingSponsor(props.sponsorToLink);
    props.setSponsorToLink("");
  }

  return (
    <section className="grid gap-4 rounded-md border border-[#d7dfeb] bg-white p-4">
      <div>
        <h4 className="font-semibold text-[#192041]">Sponsori</h4>
        <p className="mt-1 text-sm text-[#667085]">
          Alege un sponsor existent sau creeaza unul nou.
        </p>
      </div>
        <ul className="grid gap-2">
          {selectedSponsors.map((sponsor) => (
            <li
              key={sponsor.id}
              className="flex items-center justify-between gap-3 rounded-md border border-[#d7dfeb] p-3"
            >
              <span className="text-sm font-medium text-[#192041]">{sponsor.name}</span>
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
          <SelectField
            value={props.sponsorToLink}
            placeholder="Sponsor existent"
            onChange={props.setSponsorToLink}
            options={props.sponsors.map((sponsor) => ({
              value: sponsor.id,
              label: sponsor.name,
            }))}
          />
          <Button
            type="button"
            className="w-fit"
            variant="secondary"
            disabled={!props.sponsorToLink}
            onClick={attachExisting}
          >
            <LinkIcon />
            {props.event ? "Ataseaza sponsor" : "Adauga sponsor in formular"}
          </Button>
        </div>

        <form
          className="grid gap-3 border-t border-[#d7dfeb] pt-4"
          onSubmit={(formEvent) => void createAndMaybeAttach(formEvent)}
        >
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
          <Input
            value={props.sponsorForm.logo_url}
            onChange={(formEvent) =>
              props.setSponsorForm((current) => ({
                ...current,
                logo_url: formEvent.target.value,
              }))
            }
            placeholder="Logo URL"
          />
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
          <Button className="w-fit" variant="outline">
            <Plus />
            {props.event ? "Creeaza si ataseaza" : "Creeaza sponsor"}
          </Button>
        </form>
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
  value: string;
  items: Lookup[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <SelectField
      value={props.value}
      placeholder={props.placeholder}
      onChange={props.onChange}
      options={props.items.map((item) => ({ value: item.id, label: item.name }))}
    />
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
