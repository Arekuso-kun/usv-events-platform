import { CheckCircle2, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { StatusBadge } from "../components/StatusBadge";
import type {
  EventItem,
  EventStats,
  EventStatus,
  Registration,
  User,
} from "../types";
import { formatDateTime } from "../utils/date";

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
                    <Button asChild variant="outline" size="sm">
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
          <div>
            <StatusBadge status={selectedEvent.status} />
            <CardTitle className="mt-3 text-2xl">{selectedEvent.title}</CardTitle>
            <CardDescription>{selectedEvent.description || "Fara descriere."}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to={`/organizer/events/${selectedEvent.id}/edit`}>
                <Pencil />
                Editeaza
              </Link>
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile label="Data" value={formatDateTime(selectedEvent.starts_at)} />
            <SummaryTile label="Locatie" value={selectedEvent.venue_name || "-"} />
            <SummaryTile label="Categorie" value={selectedEvent.category_name || "-"} />
            <SummaryTile label="Participare" value={selectedEvent.participation_mode} />
          </div>
          <div className="flex flex-wrap gap-2">
            {(selectedEvent.status === "draft" || selectedEvent.status === "rejected") && (
              <Button
                type="button"
                onClick={() => void props.updateEventStatus("pending_approval")}
              >
                <CheckCircle2 />
                Trimite spre validare
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => void props.updateEventStatus("cancelled")}
            >
              Anuleaza
            </Button>
            {props.user?.role === "admin" && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void props.updateEventStatus("completed")}
              >
                Finalizeaza
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
          variant="outline"
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
                <TableCell>{registration.status}</TableCell>
                <TableCell>{formatDateTime(registration.registered_at)}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
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

function canManage(user: User | null): boolean {
  return Boolean(user && (user.role === "organizer" || user.role === "admin"));
}
