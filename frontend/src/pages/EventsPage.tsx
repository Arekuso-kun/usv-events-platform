import {
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../api/client";
import { DatePicker } from "../components/DatePicker";
import { SelectField } from "../components/SelectField";
import { StatusBadge } from "../components/StatusBadge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import type { EventItem, FilterState, Lookup, User } from "../types";
import { formatDateTime, getGoogleCalendarUrl } from "../utils/date";

const PAGE_SIZE = 8;

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
  registerForEvent: (id: string) => Promise<void>;
  submitFeedback: (event: FormEvent) => void;
  feedbackForm: { rating: string; comment: string };
  setFeedbackForm: Dispatch<SetStateAction<{ rating: string; comment: string }>>;
}

export function EventsPage(props: EventsPageProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(props.events.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);

  const visibleEvents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return props.events.slice(start, start + PAGE_SIZE);
  }, [currentPage, props.events]);

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
              {props.events.length} rezultate dupa filtrele curente
            </CardDescription>
          </div>
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
                  <TableCell>{event.category_name || "Fara categorie"}</TableCell>
                  <TableCell>{event.organizer_name}</TableCell>
                  <TableCell>
                    <StatusBadge status={event.status} />
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

export function EventDetailPage(props: EventDetailPageProps) {
  const { eventId } = useParams();
  const event = props.events.find((item) => item.id === eventId) || null;

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

  return (
    <div className="grid gap-4">
      <EventBreadcrumb title={event.title} />

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <StatusBadge status={event.status} />
            <CardTitle className="mt-3 text-2xl">{event.title}</CardTitle>
            <CardDescription>{event.description || "Fara descriere."}</CardDescription>
          </div>
          <span className="rounded-full bg-[rgba(134,193,234,0.22)] px-3 py-1 text-sm font-semibold text-[#192041]">
            {event.registration_count}/{event.max_participants || "nelimitat"}
          </span>
        </CardHeader>
        <CardContent className="grid gap-5">
          <dl className="grid gap-3 sm:grid-cols-2">
            <DetailItem
              label="Data"
              value={`${formatDateTime(event.starts_at)} - ${formatDateTime(event.ends_at)}`}
            />
            <DetailItem label="Locatie" value={event.venue_name || "-"} />
            <DetailItem label="Organizator" value={event.organizer_name} />
            <DetailItem label="Participare" value={event.participation_mode} />
            <DetailItem label="Categorie" value={event.category_name || "-"} />
            <DetailItem label="Facultate" value={event.faculty_name || "-"} />
            <DetailItem
              label="Inscriere"
              value={event.registration_required ? "Necesara" : "Nu este necesara"}
            />
          </dl>

          <EventQrCode event={event} />

          <div className="flex flex-wrap gap-2">
            {props.user && (
              <Button
                type="button"
                onClick={() => void props.registerForEvent(event.id)}
                disabled={event.is_full}
              >
                Inscriere
              </Button>
            )}
            <Button asChild variant="secondary">
              <a href={`${API_URL}/events/${event.id}/calendar.ics`}>ICS</a>
            </Button>
            <Button asChild variant="secondary">
              <a
                href={getGoogleCalendarUrl(event)}
                target="_blank"
                rel="noreferrer"
              >
                Google Calendar
              </a>
            </Button>
            {event.registration_url && (
              <Button asChild variant="secondary">
                <a href={event.registration_url}>Link inscriere</a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <InlineResourceList event={event} />

      {props.user && (
        <Card>
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={props.submitFeedback}>
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
              <textarea
                className="min-h-24 rounded-md border border-[#d7dfeb] bg-white px-3 py-2 text-sm text-[#192041] placeholder:text-[#667085] focus-visible:border-[#254591] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#254591]/20"
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EventFilters(props: EventsPageProps) {
  const hasActiveFilters = Object.values(props.filters).some(Boolean);

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
          variant="outline"
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
            <Input
              value={props.filters.q}
              onChange={(event) => props.setFilter("q", event.target.value)}
              placeholder="Cauta in titlu sau descriere"
            />
            <Input
              value={props.filters.organizer}
              onChange={(event) => props.setFilter("organizer", event.target.value)}
              placeholder="Organizator"
            />
          </div>

          <FilterGroup title="Criterii">
            <LookupFilter
              value={props.filters.faculty_id}
              items={props.faculties}
              placeholder="Facultate"
              onChange={(value) => props.setFilter("faculty_id", value)}
            />
            <LookupFilter
              value={props.filters.department_id}
              items={props.departments}
              placeholder="Departament"
              onChange={(value) => props.setFilter("department_id", value)}
            />
            <LookupFilter
              value={props.filters.category_id}
              items={props.categories}
              placeholder="Categorie"
              onChange={(value) => props.setFilter("category_id", value)}
            />
            <LookupFilter
              value={props.filters.venue_id}
              items={props.venues}
              placeholder="Locatie"
              onChange={(value) => props.setFilter("venue_id", value)}
            />
          </FilterGroup>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
            <FilterGroup title="Participare">
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
              <SelectField
                value={props.filters.is_free}
                placeholder="Intrare"
                onChange={(value) => props.setFilter("is_free", value)}
                options={[
                  { value: "true", label: "Libera" },
                  { value: "false", label: "Cu plata" },
                ]}
              />
              <SelectField
                value={props.filters.registration_required}
                placeholder="Inscriere"
                onChange={(value) => props.setFilter("registration_required", value)}
                options={[
                  { value: "true", label: "Necesara" },
                  { value: "false", label: "Fara inscriere" },
                ]}
              />
            </FilterGroup>

            <FilterGroup title="Perioada" columns="sm:grid-cols-2">
              <DatePicker
                value={props.filters.starts_from}
                placeholder="De la"
                onChange={(value) => props.setFilter("starts_from", value)}
              />
              <DatePicker
                value={props.filters.starts_until}
                placeholder="Pana la"
                onChange={(value) => props.setFilter("starts_until", value)}
              />
            </FilterGroup>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterGroup(props: {
  title: string;
  children: ReactNode;
  columns?: string;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-xs font-semibold uppercase text-[#667085]">
        {props.title}
      </span>
      <div
        className={`grid gap-3 ${props.columns || "md:grid-cols-2 xl:grid-cols-4"}`}
      >
        {props.children}
      </div>
    </div>
  );
}

function LookupFilter(props: {
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

function DetailItem(props: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#d7dfeb] bg-[#fbfcff] p-3">
      <dt className="text-xs font-semibold uppercase text-[#667085]">{props.label}</dt>
      <dd className="mt-1 text-sm text-[#192041]">{props.value}</dd>
    </div>
  );
}

function EventQrCode({ event }: { event: EventItem }) {
  const eventUrl = `${window.location.origin}/events/${event.id}`;

  return (
    <div className="grid gap-4 rounded-md border border-[#d7dfeb] bg-[#fbfcff] p-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
      <div className="w-fit rounded-md border border-[#d7dfeb] bg-white p-3 shadow-sm">
        <QRCodeSVG
          value={eventUrl}
          size={156}
          bgColor="#ffffff"
          fgColor="#192041"
          level="M"
          marginSize={2}
          title={`Cod QR pentru ${event.title}`}
        />
      </div>
      <div>
        <span className="text-xs font-semibold uppercase text-[#667085]">Cod QR</span>
        <p className="mt-1 text-sm text-[#192041]">
          Scaneaza codul pentru a deschide pagina evenimentului.
        </p>
        <code className="mt-3 block break-all rounded-md border border-[#d7dfeb] bg-white px-3 py-2 text-xs text-[#272E53]">
          {eventUrl}
        </code>
      </div>
    </div>
  );
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
                <span className="text-sm font-medium">{sponsor.name}</span>
                {sponsor.website_url && (
                  <a className="text-sm text-[#254591]" href={sponsor.website_url}>
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
