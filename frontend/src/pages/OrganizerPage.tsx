import { CheckCircle2, Download, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  RegistrationStatusBadge,
  StatusBadge,
} from "../components/StatusBadge";
import type {
  EventItem,
  EventStats,
  EventStatus,
  Registration,
  User,
} from "../types";
import { formatDateTime } from "../utils/date";
import { formatCategoryName, formatParticipationMode } from "../utils/labels";

const PAGE_SIZE = 8;

interface OrganizerPageProps {
  user: User | null;
  managedEvents: EventItem[];
  selectEvent: (id: string) => void;
  deleteEvent: (id: string) => Promise<boolean>;
}

interface OrganizerEventDetailPageProps {
  user: User | null;
  managedEvents: EventItem[];
  registrations: Registration[];
  stats: EventStats | null;
  selectEvent: (id: string) => void;
  deleteEvent: (id: string) => Promise<boolean>;
  checkIn: (eventId: string, registrationId: string) => Promise<void>;
  updateEventStatus: (status: EventStatus) => Promise<void>;
  exportRegistrations: (eventId: string) => Promise<void>;
}

export function OrganizerPage(props: OrganizerPageProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  if (!canManage(props.user)) {
    return <section className="empty-state">Login cu rol de organizer sau admin.</section>;
  }

  const pageCount = Math.max(1, Math.ceil(props.managedEvents.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleEvents = props.managedEvents.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function openEvent(eventId: string) {
    props.selectEvent(eventId);
    navigate(`/organizer/events/${eventId}`);
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle>
            {props.user?.role === "admin" ? "Toate evenimentele" : "Evenimentele mele"}
          </CardTitle>
          <CardDescription>
            {props.managedEvents.length} evenimente disponibile pentru management
          </CardDescription>
        </div>
        <Button asChild>
          <Link to="/organizer/events/new">
            <Plus />
            Eveniment nou
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titlu</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Locatie</TableHead>
              <TableHead>Participanti</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actiuni</TableHead>
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
                  {event.registration_count}/{event.max_participants || "nelimitat"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={event.status} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="secondary" size="sm">
                      <Link
                        to={`/organizer/events/${event.id}/edit`}
                        onClick={(clickEvent) => clickEvent.stopPropagation()}
                      >
                        <Pencil />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        void props.deleteEvent(event.id);
                      }}
                    >
                      <Trash2 />
                      Sterge
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {visibleEvents.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-[#667085]">
                  Nu exista evenimente de gestionat.
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
  );
}

export function OrganizerEventDetailPage(props: OrganizerEventDetailPageProps) {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { selectEvent } = props;
  const event = useMemo(
    () => props.managedEvents.find((item) => item.id === eventId) || null,
    [eventId, props.managedEvents],
  );

  useEffect(() => {
    if (event) {
      selectEvent(event.id);
    }
  }, [event, selectEvent]);

  if (!canManage(props.user)) {
    return <section className="empty-state">Login cu rol de organizer sau admin.</section>;
  }

  if (!eventId || !event) {
    return (
      <div className="grid gap-4">
        <OrganizerBreadcrumb title="Eveniment negasit" />
        <Card>
          <CardContent className="py-10 text-center text-[#667085]">
            Evenimentul nu a fost gasit sau nu iti apartine.
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedEvent = event;

  async function deleteAndReturn() {
    const deleted = await props.deleteEvent(selectedEvent.id);
    if (deleted) {
      navigate("/organizer");
    }
  }

  return (
    <div className="grid gap-4">
      <OrganizerBreadcrumb title={selectedEvent.title} />

      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={selectedEvent.status} />
              <Badge variant="count">
                {selectedEvent.registration_count}/
                {selectedEvent.max_participants || "nelimitat"}
              </Badge>
            </div>
            <CardTitle className="mt-3 text-2xl">{selectedEvent.title}</CardTitle>
            <CardDescription className="mt-2 max-w-3xl">
              {selectedEvent.description || "Fara descriere."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/organizer/events/${selectedEvent.id}/edit`)}
            >
              <Pencil />
              Editeaza
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void props.updateEventStatus("cancelled")}
            >
              <XCircle />
              Anuleaza
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void deleteAndReturn()}
            >
              <Trash2 />
              Sterge
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <OrganizerEventInfo event={selectedEvent} />
          {(selectedEvent.status === "draft" || selectedEvent.status === "rejected") && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void props.updateEventStatus("pending_approval")}
              >
                <CheckCircle2 />
                Trimite spre validare
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <OrganizerResourceList event={selectedEvent} />
      <StatsCard stats={props.stats} />
      <RegistrationsCard
        event={selectedEvent}
        registrations={props.registrations}
        checkIn={props.checkIn}
        exportRegistrations={props.exportRegistrations}
      />
    </div>
  );
}

function OrganizerEventInfo({ event }: { event: EventItem }) {
  return (
    <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <DetailTile label="Incepe" value={formatReadableDateTime(event.starts_at)} />
      <DetailTile
        label="Se termina"
        value={formatReadableDateTime(event.ends_at || event.starts_at)}
      />
      <DetailTile label="Locatie" value={event.venue_name || "-"} />
      <DetailTile label="Organizator" value={event.creator_full_name} />
      <DetailTile
        label="Participare"
        value={formatParticipationMode(event.participation_mode)}
      />
      <DetailTile
        label="Categorie"
        value={formatCategoryName(event.category_name) || "-"}
      />
      <DetailTile label="Facultate" value={event.faculty_name || "-"} />
      <DetailTile label="Departament" value={event.department_name || "-"} />
      <DetailTile
        label="Inscriere"
        value={registrationSummary(event)}
      />
      <DetailTile
        label="Deadline inscriere"
        value={formatReadableDateTime(event.registration_deadline)}
      />
      <DetailTile label="Intrare" value={event.is_free ? "Libera" : "Cu plata"} />
      <DetailTile
        label="Participanti"
        value={`${event.registration_count}/${event.max_participants || "nelimitat"}`}
      />
      <DetailTile label="Creat la" value={formatDateTime(event.created_at)} />
      <DetailTile
        label="Link inscriere"
        value={
          event.registration_url ? (
            <a
              className="text-[#254591] hover:underline"
              href={event.registration_url}
              target="_blank"
              rel="noreferrer"
            >
              Deschide linkul
            </a>
          ) : (
            "-"
          )
        }
      />
    </dl>
  );
}

function OrganizerResourceList({ event }: { event: EventItem }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Materiale</CardTitle>
          <CardDescription>
            {formatResourceCount(event.materials.length, "material atasat", "materiale atasate")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2">
            {event.materials.map((material) => (
              <li
                key={material.id}
                className="flex items-center justify-between gap-3 rounded-md border border-[#d7dfeb] p-3"
              >
                <a
                  className="min-w-0 truncate text-sm font-medium text-[#254591]"
                  href={material.file_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {material.title}
                </a>
                <span className="shrink-0 text-xs text-[#667085]">
                  {material.material_type}
                </span>
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
          <CardDescription>
            {formatResourceCount(event.sponsors.length, "sponsor atasat", "sponsori atasati")}
          </CardDescription>
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
                  <span className="truncate text-sm font-medium text-[#192041]">
                    {sponsor.name}
                  </span>
                </div>
                {sponsor.website_url && (
                  <a
                    className="shrink-0 text-sm text-[#254591] hover:underline"
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

function StatsCard({ stats }: { stats: EventStats | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistici</CardTitle>
        <CardDescription>Participanti, check-in si feedback.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryTile label="Inscrisi" value={stats?.registration_count ?? 0} />
          <SummaryTile label="Check-in" value={stats?.checked_in_count ?? 0} />
          <SummaryTile label="Feedback" value={stats?.feedback_count ?? 0} />
          <SummaryTile label="Rating mediu" value={stats?.average_rating ?? "-"} />
        </div>
      </CardContent>
    </Card>
  );
}

function RegistrationsCard(props: {
  event: EventItem;
  registrations: Registration[];
  checkIn: (eventId: string, registrationId: string) => Promise<void>;
  exportRegistrations: (eventId: string) => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle>Participanti</CardTitle>
          <CardDescription>Liste, export si check-in pentru eveniment.</CardDescription>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void props.exportRegistrations(props.event.id)}
        >
          <Download />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nume</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Inscris la</TableHead>
              <TableHead className="text-right">Actiune</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.registrations.map((registration) => (
              <TableRow key={registration.id}>
                <TableCell className="font-medium">
                  {registration.user_name || "-"}
                </TableCell>
                <TableCell>{registration.user_email || "-"}</TableCell>
                <TableCell>
                  <RegistrationStatusBadge status={registration.status} />
                </TableCell>
                <TableCell>{formatDateTime(registration.registered_at)}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={registration.status === "checked_in"}
                      onClick={() =>
                        void props.checkIn(props.event.id, registration.id)
                      }
                    >
                      <CheckCircle2 />
                      Check-in
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {props.registrations.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-[#667085]">
                  Nu exista participanti inscrisi.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function OrganizerBreadcrumb({ title }: { title: string }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink to="/organizer">Management</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function SummaryTile(props: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-[#d7dfeb] bg-[#fbfcff] p-3">
      <span className="text-xs font-semibold uppercase text-[#667085]">
        {props.label}
      </span>
      <strong className="mt-1 block text-lg text-[#192041]">{props.value}</strong>
    </div>
  );
}

function DetailTile(props: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-[#d7dfeb] bg-[#fbfcff] px-4 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#667085]">
        {props.label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-[#192041]">
        {props.value}
      </dd>
    </div>
  );
}

function registrationSummary(event: EventItem): string {
  if (!event.registration_required) {
    return "Nu este necesara";
  }

  return event.registration_url ? "Necesara, link extern" : "Necesara";
}

function formatResourceCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
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

function canManage(user: User | null): boolean {
  return Boolean(user && (user.role === "organizer" || user.role === "admin"));
}
