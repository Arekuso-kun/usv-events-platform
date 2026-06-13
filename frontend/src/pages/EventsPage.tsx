import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../api/client";
import { DatePicker } from "../components/DatePicker";
import { SelectField } from "../components/SelectField";
import {
  EventTimingBadge,
  getEventTiming,
  RegistrationStatusBadge,
} from "../components/StatusBadge";
import { Combobox } from "../components/ui/combobox";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../components/ui/breadcrumb";
import { Badge } from "../components/ui/badge";
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
import { Textarea } from "../components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import type { EventItem, FilterState, Lookup, Registration, User } from "../types";
import { formatDateTime, getGoogleCalendarUrl } from "../utils/date";
import { formatCategoryName, formatParticipationMode } from "../utils/labels";

const PAGE_SIZE = 8;
type EventVisibility = "all" | "upcoming" | "finished";

interface EventsPageProps {
  events: EventItem[];
  filters: FilterState;
  faculties: Lookup[];
  departments: Lookup[];
  venues: Lookup[];
  categories: Lookup[];
  setFilter: (name: keyof FilterState, value: string) => void;
  selectEvent: (id: string) => void;
}

interface EventDetailPageProps {
  events: EventItem[];
  user: User | null;
  myRegistrations: Record<string, Registration | null>;
  loadMyRegistration: (eventId: string) => Promise<void>;
  registerForEvent: (id: string, alreadyRegistered?: boolean) => Promise<void>;
  submitFeedback: (event: FormEvent, eventId: string) => void;
  feedbackForm: { rating: string; comment: string };
  setFeedbackForm: Dispatch<SetStateAction<{ rating: string; comment: string }>>;
}

export function EventsPage(props: EventsPageProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [eventVisibility, setEventVisibility] =
    useState<EventVisibility>("all");

  const filteredEvents = useMemo(
    () =>
      props.events.filter((event) => {
        if (eventVisibility === "all") {
          return true;
        }
        const timing = getEventTiming(event);
        if (eventVisibility === "finished") {
          return timing === "finished";
        }
        return timing !== "finished";
      }),
    [eventVisibility, props.events],
  );

  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);

  const visibleEvents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEvents.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredEvents]);

  function setFilterAndResetPage(name: keyof FilterState, value: string) {
    setPage(1);
    props.setFilter(name, value);
  }

  function openEvent(eventId: string) {
    props.selectEvent(eventId);
    navigate(`/events/${eventId}`);
  }

  return (
    <div className="grid gap-4">
      <EventFilters {...props} setFilter={setFilterAndResetPage} />

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Evenimente publicate</CardTitle>
            <CardDescription>
              {filteredEvents.length === props.events.length
                ? `${props.events.length} rezultate dupa filtrele curente`
                : `${filteredEvents.length} din ${props.events.length} rezultate dupa filtrele curente`}
            </CardDescription>
          </div>
          <EventVisibilityControl
            value={eventVisibility}
            onChange={(value) => {
              setPage(1);
              setEventVisibility(value);
            }}
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titlu</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Locatie</TableHead>
                <TableHead>Categorie</TableHead>
                <TableHead>Organizator</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleEvents.map((event) => (
                <TableRow
                  key={event.id}
                  className="cursor-pointer"
                  onClick={() => openEvent(event.id)}
                >
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell>{formatDateTime(event.starts_at)}</TableCell>
                  <TableCell>{event.venue_name || "Locatie nesetata"}</TableCell>
                  <TableCell>
                    {formatCategoryName(event.category_name) || "Fara categorie"}
                  </TableCell>
                  <TableCell>{event.creator_full_name}</TableCell>
                  <TableCell>
                    <EventTimingBadge event={event} />
                  </TableCell>
                </TableRow>
              ))}
              {visibleEvents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-[#667085]">
                    Nu exista evenimente pentru filtrele alese.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-[#667085]">
              Pagina {currentPage} din {pageCount}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Anterior
              </Button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant={item === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(item)}
                >
                  {item}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage === pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              >
                Urmator
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EventVisibilityControl(props: {
  value: EventVisibility;
  onChange: (value: EventVisibility) => void;
}) {
  const options: Array<{ value: EventVisibility; label: string }> = [
    { value: "all", label: "Toate" },
    { value: "upcoming", label: "Urmeaza" },
    { value: "finished", label: "Finalizate" },
  ];

  return (
    <div
      className="grid w-full rounded-md border border-[#d7dfeb] bg-[#fbfcff] p-1 sm:w-auto sm:grid-cols-3"
      role="tablist"
      aria-label="Afisare evenimente"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={props.value === option.value}
          className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
            props.value === option.value
              ? "bg-[#254591] text-white shadow-sm"
              : "text-[#667085] hover:bg-[rgba(134,193,234,0.22)] hover:text-[#192041]"
          }`}
          onClick={() => props.onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function EventDetailPage(props: EventDetailPageProps) {
  const { eventId } = useParams();
  const { loadMyRegistration, user } = props;
  const event = props.events.find((item) => item.id === eventId) || null;
  const currentEventId = event?.id;
  const userId = user?.id;
  const myRegistration = event ? props.myRegistrations[event.id] ?? null : null;

  useEffect(() => {
    if (!currentEventId || !userId) {
      return;
    }

    void loadMyRegistration(currentEventId);
  }, [currentEventId, loadMyRegistration, userId]);

  if (!event) {
    return (
      <div className="grid gap-4">
        <EventBreadcrumb title="Eveniment negasit" />
        <Card>
          <CardContent className="py-10 text-center text-[#667085]">
            Evenimentul nu a fost gasit sau nu mai este public.
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasRegistrationLink = Boolean(event.registration_url);
  const canUseInternalRegistration =
    Boolean(props.user) &&
    event.registration_required &&
    !hasRegistrationLink;

  return (
    <div className="grid gap-4">
      <EventBreadcrumb title={event.title} />

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
          <div className="min-w-0">
            <CardTitle className="break-words text-3xl leading-tight">
              {event.title}
            </CardTitle>
            {event.description && (
              <CardDescription className="mt-2 max-w-3xl">
                {event.description}
              </CardDescription>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <EventTimingBadge event={event} />
            <Badge variant="count">
              {event.registration_count}/{event.max_participants || "nelimitat"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DetailItem
              label="Incepe"
              value={formatReadableDateTime(event.starts_at)}
            />
            <DetailItem
              label="Se termina"
              value={formatReadableDateTime(event.ends_at || event.starts_at)}
            />
            <DetailItem label="Locatie" value={event.venue_name || "-"} />
            <DetailItem label="Organizator" value={event.creator_full_name} />
            <DetailItem
              label="Participare"
              value={formatParticipationMode(event.participation_mode)}
            />
            <DetailItem
              label="Categorie"
              value={formatCategoryName(event.category_name) || "-"}
            />
            <DetailItem label="Facultate" value={event.faculty_name || "-"} />
            <DetailItem
              label="Inscriere"
              value={event.registration_required ? "Necesara" : "Nu este necesara"}
            />
            <DetailItem
              label="Deadline inscriere"
              value={formatReadableDateTime(event.registration_deadline)}
            />
          </dl>

          <EventActionPanel
            event={event}
            myRegistration={myRegistration}
            canUseInternalRegistration={canUseInternalRegistration}
            registerForEvent={props.registerForEvent}
            user={props.user}
          />
        </CardContent>
      </Card>

      <InlineResourceList event={event} />

      <Card>
        <CardHeader>
          <CardTitle>Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          {props.user ? (
            <form
              className="grid gap-3"
              onSubmit={(formEvent) => props.submitFeedback(formEvent, event.id)}
            >
              <SelectField
                value={props.feedbackForm.rating}
                placeholder="Rating"
                onChange={(value) =>
                  props.setFeedbackForm((current) => ({
                    ...current,
                    rating: value,
                  }))
                }
                options={["5", "4", "3", "2", "1"].map((value) => ({
                  value,
                  label: value,
                }))}
              />
              <Textarea
                value={props.feedbackForm.comment}
                onChange={(formEvent) =>
                  props.setFeedbackForm((current) => ({
                    ...current,
                    comment: formEvent.target.value,
                  }))
                }
                placeholder="Comentariu"
              />
              <Button className="w-fit">Trimite</Button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#d7dfeb] px-3 py-3 text-sm text-[#667085]">
              <span>Autentifica-te pentru a trimite feedback la acest eveniment.</span>
              <Button asChild variant="secondary">
                <Link to="/login">Autentificare</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EventFilters(props: EventsPageProps) {
  const hasActiveFilters = Object.values(props.filters).some(Boolean);
  const organizerOptions = useMemo(() => {
    const optionsByName = new Map<string, string>();

    props.events.forEach((event) => {
      const name = event.creator_full_name.trim();
      if (name) {
        optionsByName.set(name.toLowerCase(), name);
      }
    });

    const selectedOrganizer = props.filters.organizer.trim();
    if (selectedOrganizer) {
      optionsByName.set(selectedOrganizer.toLowerCase(), selectedOrganizer);
    }

    return Array.from(optionsByName.values())
      .sort((first, second) => first.localeCompare(second, "ro"))
      .map((name) => ({ value: name, label: name }));
  }, [props.events, props.filters.organizer]);

  function resetFilters() {
    (Object.keys(props.filters) as Array<keyof FilterState>).forEach((name) => {
      props.setFilter(name, "");
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Filtre</CardTitle>
          <CardDescription>Cauta rapid evenimentele potrivite.</CardDescription>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={!hasActiveFilters}
          onClick={resetFilters}
        >
          Reseteaza
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
            <FilterField label="Cautare">
              <Input
                value={props.filters.q}
                onChange={(event) => props.setFilter("q", event.target.value)}
                placeholder="Cauta in titlu sau descriere"
              />
            </FilterField>
            <FilterField label="Organizator">
              <Combobox
                value={props.filters.organizer}
                placeholder="Organizator"
                searchPlaceholder="Cauta organizator..."
                emptyText="Nu exista organizatori disponibili."
                options={organizerOptions}
                onValueChange={(value) => props.setFilter("organizer", value)}
              />
            </FilterField>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FilterField label="Facultate">
              <LookupFilter
                value={props.filters.faculty_id}
                items={props.faculties}
                placeholder="Facultate"
                onChange={(value) => props.setFilter("faculty_id", value)}
              />
            </FilterField>
            <FilterField label="Departament">
              <LookupFilter
                value={props.filters.department_id}
                items={props.departments}
                placeholder="Departament"
                onChange={(value) => props.setFilter("department_id", value)}
              />
            </FilterField>
            <FilterField label="Categorie">
              <LookupFilter
                value={props.filters.category_id}
                items={props.categories}
                placeholder="Categorie"
                formatLabel={formatCategoryName}
                onChange={(value) => props.setFilter("category_id", value)}
              />
            </FilterField>
            <FilterField label="Locatie">
              <LookupFilter
                value={props.filters.venue_id}
                items={props.venues}
                placeholder="Locatie"
                onChange={(value) => props.setFilter("venue_id", value)}
              />
            </FilterField>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
            <div className="grid gap-3 md:grid-cols-3">
              <FilterField label="Participare">
                <SelectField
                  value={props.filters.participation_mode}
                  placeholder="Participare"
                  onChange={(value) => props.setFilter("participation_mode", value)}
                  options={[
                    { value: "physical", label: "Fizic" },
                    { value: "online", label: "Online" },
                    { value: "hybrid", label: "Hibrid" },
                  ]}
                />
              </FilterField>
              <FilterField label="Intrare">
                <SelectField
                  value={props.filters.is_free}
                  placeholder="Intrare"
                  onChange={(value) => props.setFilter("is_free", value)}
                  options={[
                    { value: "true", label: "Libera" },
                    { value: "false", label: "Cu plata" },
                  ]}
                />
              </FilterField>
              <FilterField label="Inscriere">
                <SelectField
                  value={props.filters.registration_required}
                  placeholder="Inscriere"
                  onChange={(value) => props.setFilter("registration_required", value)}
                  options={[
                    { value: "true", label: "Necesara" },
                    { value: "false", label: "Fara inscriere" },
                  ]}
                />
              </FilterField>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FilterField label="De la">
                <DatePicker
                  value={props.filters.starts_from}
                  placeholder="De la"
                  onChange={(value) => props.setFilter("starts_from", value)}
                />
              </FilterField>
              <FilterField label="Pana la">
                <DatePicker
                  value={props.filters.starts_until}
                  placeholder="Pana la"
                  onChange={(value) => props.setFilter("starts_until", value)}
                />
              </FilterField>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterField(props: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{props.label}</Label>
      {props.children}
    </div>
  );
}

function LookupFilter(props: {
  value: string;
  items: Lookup[];
  placeholder: string;
  formatLabel?: (value: string) => string;
  onChange: (value: string) => void;
}) {
  return (
    <Combobox
      value={props.value}
      placeholder={props.placeholder}
      searchPlaceholder={`Cauta ${props.placeholder.toLowerCase()}...`}
      emptyText="Nu exista rezultate."
      options={props.items.map((item) => ({
        value: item.id,
        label: props.formatLabel ? props.formatLabel(item.name) : item.name,
      }))}
      onValueChange={props.onChange}
    />
  );
}

function EventBreadcrumb({ title }: { title: string }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink to="/events">Evenimente</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function DetailItem(props: {
  className?: string;
  label: string;
  value: ReactNode;
}) {
  return (
    <div
      className={`rounded-md border border-[#d7dfeb] bg-[#fbfcff] px-4 py-3 ${
        props.className || ""
      }`}
    >
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#667085]">
        {props.label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-[#192041]">
        {props.value}
      </dd>
    </div>
  );
}

function EventActionPanel(props: {
  event: EventItem;
  myRegistration: Registration | null;
  canUseInternalRegistration: boolean;
  user: User | null;
  registerForEvent: (id: string, alreadyRegistered?: boolean) => Promise<void>;
}) {
  const registrationClosed = isRegistrationDeadlinePassed(
    props.event.registration_deadline,
  );

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.36fr)] lg:items-end">
      <section className="grid content-end gap-3">
        {props.user && (
          <InternalRegistrationStatus registration={props.myRegistration} />
        )}

        <div className="flex flex-wrap gap-2">
          {props.canUseInternalRegistration && (
            <Button
              type="button"
              onClick={() =>
                void props.registerForEvent(
                  props.event.id,
                  Boolean(props.myRegistration),
                )
              }
              disabled={
                Boolean(props.myRegistration) ||
                props.event.is_full ||
                registrationClosed
              }
            >
              {props.myRegistration
                ? "Inscris"
                : registrationClosed
                  ? "Inscriere inchisa"
                  : "Inscriere"}
            </Button>
          )}
          {props.event.registration_url && (
            <Button asChild>
              <a href={props.event.registration_url}>Link inscriere</a>
            </Button>
          )}
          <Button asChild variant="secondary">
            <a href={`${API_URL}/events/${props.event.id}/calendar.ics`}>ICS</a>
          </Button>
          <Button asChild variant="secondary">
            <a
              href={getGoogleCalendarUrl(props.event)}
              target="_blank"
              rel="noreferrer"
            >
              Google Calendar
            </a>
          </Button>
        </div>
      </section>

      <div className="lg:justify-self-end">
        <EventQrCode event={props.event} />
      </div>
    </div>
  );
}

function EventQrCode({ event }: { event: EventItem }) {
  const eventUrl = `${window.location.origin}/events/${event.id}`;
  const [copied, setCopied] = useState(false);

  async function copyEventUrl() {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function shareEventUrl() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: event.title,
          text: event.description || "Eveniment USV",
          url: eventUrl,
        });
        return;
      }
    } catch {
      return;
    }

    await copyEventUrl();
  }

  return (
    <section className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-end">
      <div className="grid min-w-0 content-end gap-2 self-stretch">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 justify-start px-2.5 text-xs"
            onClick={() => void copyEventUrl()}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? "Copiat" : "Copiaza"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 justify-start px-2.5 text-xs"
            onClick={() => void shareEventUrl()}
          >
            <Share2 />
            Share
          </Button>
      </div>
      <div className="w-fit shrink-0 rounded-md border border-[#d7dfeb] bg-white p-1.5 shadow-sm">
        <QRCodeSVG
          value={eventUrl}
          size={116}
          bgColor="#ffffff"
          fgColor="#192041"
          level="M"
          marginSize={2}
          title={`Cod QR pentru ${event.title}`}
        />
      </div>
    </section>
  );
}

function isRegistrationDeadlinePassed(value: string | null): boolean {
  if (!value) {
    return false;
  }
  return new Date(value).getTime() <= Date.now();
}

function formatReadableDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return `${formatLongDate(date)}, ora ${formatTime(date)}`;
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function InternalRegistrationStatus(props: { registration: Registration | null }) {
  if (props.registration) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#192041]">
        <RegistrationStatusBadge status={props.registration.status} />
        <p className="text-[#667085]">
          Esti inscris din {formatDateTime(props.registration.registered_at)}.
        </p>
      </div>
    );
  }

  return null;
}

function InlineResourceList({ event }: { event: EventItem }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Materiale</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2">
            {event.materials.map((material) => (
              <li
                key={material.id}
                className="flex items-center justify-between gap-3 rounded-md border border-[#d7dfeb] p-3"
              >
                <a className="text-sm font-medium text-[#254591]" href={material.file_url} target="_blank" rel="noreferrer">
                  {material.title}
                </a>
                <span className="text-xs text-[#667085]">{material.material_type}</span>
              </li>
            ))}
            {event.materials.length === 0 && (
              <li className="text-sm text-[#667085]">Nu exista materiale.</li>
            )}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sponsori</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2">
            {event.sponsors.map((sponsor) => (
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
                  <span className="truncate text-sm font-medium">
                    {sponsor.name}
                  </span>
                </div>
                {sponsor.website_url && (
                  <a
                    className="shrink-0 text-sm text-[#254591]"
                    href={sponsor.website_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    website
                  </a>
                )}
              </li>
            ))}
            {event.sponsors.length === 0 && (
              <li className="text-sm text-[#667085]">Nu exista sponsori.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
