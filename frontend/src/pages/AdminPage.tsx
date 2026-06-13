import { CheckCircle2, Eye, RefreshCw, UserPlus, XCircle } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { SelectField } from "../components/SelectField";
import { StatusBadge } from "../components/StatusBadge";
import type {
  AdminReport,
  EventItem,
  Lookup,
  OrganizerCreatePayload,
  User,
} from "../types";
import { formatDateTime } from "../utils/date";
import { formatCategoryName, formatParticipationMode } from "../utils/labels";

interface AdminPageProps {
  user: User | null;
  pendingEvents: EventItem[];
  managedEvents: EventItem[];
  organizerUsers: User[];
  faculties: Lookup[];
  departments: Lookup[];
  report: AdminReport | null;
  loading: boolean;
  approveEvent: (id: string) => Promise<void>;
  rejectEvent: (id: string) => Promise<void>;
  createOrganizer: (payload: OrganizerCreatePayload) => Promise<boolean>;
  reloadAdmin: () => void;
}

const emptyOrganizerForm = {
  full_name: "",
  email: "",
  faculty_id: "",
  department_id: "",
};

const monthFormatter = new Intl.DateTimeFormat("ro-RO", {
  month: "short",
  year: "numeric",
});

export function AdminPage(props: AdminPageProps) {
  const [organizerForm, setOrganizerForm] = useState(emptyOrganizerForm);
  const [selectedOrganizer, setSelectedOrganizer] = useState("");

  const eventsByMonth = useMemo(
    () => buildEventsByMonth(props.managedEvents),
    [props.managedEvents],
  );
  const eventsByOrganizer = useMemo(
    () => buildEventsByOrganizer(props.managedEvents),
    [props.managedEvents],
  );
  const averageParticipation = useMemo(() => {
    if (props.managedEvents.length === 0) {
      return 0;
    }
    const total = props.managedEvents.reduce(
      (sum, event) => sum + event.registration_count,
      0,
    );
    return total / props.managedEvents.length;
  }, [props.managedEvents]);

  const selectedOrganizerCount = selectedOrganizer
    ? props.managedEvents.filter((event) => event.creator_id === selectedOrganizer).length
    : null;

  async function submitOrganizer(formEvent: FormEvent) {
    formEvent.preventDefault();
    const created = await props.createOrganizer({
      ...organizerForm,
      faculty_id: organizerForm.faculty_id || null,
      department_id: organizerForm.department_id || null,
    });
    if (created) {
      setOrganizerForm(emptyOrganizerForm);
    }
  }

  if (props.user?.role !== "admin") {
    return <section className="empty-state">Login cu rol de admin.</section>;
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-4">
        <ReportTile
          label="Evenimente"
          value={props.report?.events_total ?? props.managedEvents.length}
        />
        <ReportTile
          label="Inscrieri"
          value={props.report?.registrations_total ?? "-"}
        />
        <ReportTile
          label="Participare medie"
          value={averageParticipation.toFixed(1)}
        />
        <ReportTile
          label="Rating mediu"
          value={props.report?.average_feedback_rating ?? "-"}
        />
      </div>

      <div className="grid items-start gap-4">
        <PendingEventsCard
          events={props.pendingEvents}
          approveEvent={props.approveEvent}
          rejectEvent={props.rejectEvent}
          reloadAdmin={props.reloadAdmin}
        />
        <OrganizersCard
          organizers={props.organizerUsers}
          faculties={props.faculties}
          departments={props.departments}
          form={organizerForm}
          loading={props.loading}
          setForm={setOrganizerForm}
          submitOrganizer={submitOrganizer}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rapoarte</CardTitle>
          <CardDescription>
            Sinteze pentru volum lunar, participare si activitatea organizatorilor.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-4">
          <ReportList
            title="Evenimente pe luna"
            items={eventsByMonth.map((item) => ({
              label: item.label,
              value: item.count,
            }))}
            empty="Nu exista evenimente inregistrate."
          />
          <ReportList
            title="Evenimente pe status"
            items={Object.entries(props.report?.events_by_status ?? {}).map(
              ([status, count]) => ({
                label: status,
                value: count,
              }),
            )}
            empty="Nu exista date despre statusuri."
          />
          <div className="grid content-start gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#192041]">
                Organizator selectat
              </h3>
              <p className="mt-1 text-sm text-[#667085]">
                Numar evenimente organizate de un organizator dat.
              </p>
            </div>
            <SelectField
              value={selectedOrganizer}
              placeholder="Alege organizator"
              onChange={setSelectedOrganizer}
              options={props.organizerUsers.map((organizer) => ({
                value: organizer.id,
                label: organizer.full_name,
              }))}
            />
            <div className="rounded-md border border-[#d7dfeb] bg-[#fbfcff] p-4">
              <span className="text-sm text-[#667085]">Evenimente organizate</span>
              <strong className="mt-1 block text-3xl text-[#192041]">
                {selectedOrganizerCount ?? "-"}
              </strong>
            </div>
          </div>
          <ReportList
            title="Top organizatori"
            items={eventsByOrganizer.slice(0, 5).map((item) => ({
              label: item.name,
              value: item.count,
            }))}
            empty="Nu exista organizatori cu evenimente."
          />
        </CardContent>
      </Card>
    </div>
  );
}

function PendingEventsCard(props: {
  events: EventItem[];
  approveEvent: (id: string) => Promise<void>;
  rejectEvent: (id: string) => Promise<void>;
  reloadAdmin: () => void;
}) {
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle>Validare evenimente</CardTitle>
          <CardDescription>
            {props.events.length} evenimente asteapta publicarea
          </CardDescription>
        </div>
        <Button type="button" variant="secondary" onClick={props.reloadAdmin}>
          <RefreshCw />
          Actualizeaza
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titlu</TableHead>
              <TableHead>Organizator</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">{event.title}</TableCell>
                <TableCell>{event.creator_full_name}</TableCell>
                <TableCell>{formatDateTime(event.starts_at)}</TableCell>
                <TableCell>
                  <StatusBadge status={event.status} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <Eye />
                      Detalii
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void props.approveEvent(event.id)}
                    >
                      <CheckCircle2 />
                      Aproba
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => void props.rejectEvent(event.id)}
                    >
                      <XCircle />
                      Respinge
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {props.events.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-[#667085]">
                  Nu exista evenimente in asteptare.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <PendingEventDetailsDialog
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onApprove={async (eventId) => {
            await props.approveEvent(eventId);
            setSelectedEvent(null);
          }}
          onReject={async (eventId) => {
            await props.rejectEvent(eventId);
            setSelectedEvent(null);
          }}
        />
      </CardContent>
    </Card>
  );
}

function PendingEventDetailsDialog(props: {
  event: EventItem | null;
  onClose: () => void;
  onApprove: (eventId: string) => Promise<void>;
  onReject: (eventId: string) => Promise<void>;
}) {
  if (!props.event) {
    return null;
  }

  const event = props.event;

  return (
    <Dialog open={Boolean(props.event)} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
          <DialogDescription>
            Verifica detaliile evenimentului inainte de aprobare sau respingere.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[65vh] gap-4 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminDetailItem
              label="Perioada"
              value={`${formatDateTime(event.starts_at)} - ${formatDateTime(event.ends_at)}`}
            />
            <AdminDetailItem label="Organizator" value={event.creator_full_name} />
            <AdminDetailItem label="Locatie" value={event.venue_name || "-"} />
            <AdminDetailItem
              label="Participare"
              value={formatParticipationMode(event.participation_mode)}
            />
            <AdminDetailItem
              label="Categorie"
              value={formatCategoryName(event.category_name) || "-"}
            />
            <AdminDetailItem label="Facultate" value={event.faculty_name || "-"} />
            <AdminDetailItem label="Departament" value={event.department_name || "-"} />
            <AdminDetailItem
              label="Inscriere"
              value={registrationLabel(event)}
            />
            <AdminDetailItem
              label="Deadline inscriere"
              value={formatDateTime(event.registration_deadline)}
            />
          </div>

          <div className="rounded-md border border-[#d7dfeb] bg-[#fbfcff] p-3">
            <h3 className="text-sm font-semibold text-[#192041]">Descriere</h3>
            <p className="mt-2 whitespace-pre-line text-sm text-[#667085]">
              {event.description || "Fara descriere."}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <AdminResourceList
              title="Materiale"
              empty="Nu exista materiale atasate."
              items={event.materials.map((material) => ({
                label: material.title,
                detail: material.material_type,
                href: material.file_url,
              }))}
            />
            <AdminResourceList
              title="Sponsori"
              empty="Nu exista sponsori atasati."
              items={event.sponsors.map((sponsor) => ({
                label: sponsor.name,
                detail: sponsor.website_url || "",
                href: sponsor.website_url || undefined,
              }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={props.onClose}
          >
            Inchide
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void props.onReject(event.id)}
          >
            <XCircle />
            Respinge
          </Button>
          <Button type="button" onClick={() => void props.onApprove(event.id)}>
            <CheckCircle2 />
            Aproba
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminDetailItem(props: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#d7dfeb] bg-[#fbfcff] p-3">
      <dt className="text-xs font-semibold uppercase text-[#667085]">{props.label}</dt>
      <dd className="mt-1 text-sm text-[#192041]">{props.value}</dd>
    </div>
  );
}

function AdminResourceList(props: {
  title: string;
  empty: string;
  items: { label: string; detail: string; href?: string }[];
}) {
  return (
    <div className="rounded-md border border-[#d7dfeb] p-3">
      <h3 className="text-sm font-semibold text-[#192041]">{props.title}</h3>
      <div className="mt-3 grid gap-2">
        {props.items.map((item) => (
          <div
            key={`${item.label}-${item.href || item.detail}`}
            className="flex items-center justify-between gap-3 rounded-md border border-[#d7dfeb] px-3 py-2"
          >
            {item.href ? (
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm font-medium text-[#254591]"
              >
                {item.label}
              </a>
            ) : (
              <span className="truncate text-sm font-medium text-[#192041]">
                {item.label}
              </span>
            )}
            {item.detail && (
              <span className="shrink-0 text-xs text-[#667085]">{item.detail}</span>
            )}
          </div>
        ))}
        {props.items.length === 0 && (
          <p className="rounded-md border border-[#d7dfeb] px-3 py-3 text-sm text-[#667085]">
            {props.empty}
          </p>
        )}
      </div>
    </div>
  );
}

function OrganizersCard(props: {
  organizers: User[];
  faculties: Lookup[];
  departments: Lookup[];
  form: typeof emptyOrganizerForm;
  loading: boolean;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyOrganizerForm>>;
  submitOrganizer: (event: FormEvent) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organizatori</CardTitle>
        <CardDescription>
          Trimite invitatii pentru conturi de organizator.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <form className="grid gap-3" onSubmit={props.submitOrganizer}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nume">
              <Input
                value={props.form.full_name}
                onChange={(event) =>
                  props.setForm((current) => ({
                    ...current,
                    full_name: event.target.value,
                  }))
                }
                placeholder="Nume complet"
                required
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={props.form.email}
                onChange={(event) =>
                  props.setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="organizer@usv.ro"
                required
              />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Facultate">
              <SelectField
                value={props.form.faculty_id}
                placeholder="Facultate"
                onChange={(faculty_id) =>
                  props.setForm((current) => ({ ...current, faculty_id }))
                }
                options={props.faculties.map((faculty) => ({
                  value: faculty.id,
                  label: faculty.name,
                }))}
              />
            </Field>
            <Field label="Departament">
              <SelectField
                value={props.form.department_id}
                placeholder="Departament"
                onChange={(department_id) =>
                  props.setForm((current) => ({ ...current, department_id }))
                }
                options={props.departments.map((department) => ({
                  value: department.id,
                  label: department.name,
                }))}
              />
            </Field>
          </div>
          <Button className="w-fit" disabled={props.loading}>
            <UserPlus />
            Trimite invitatie
          </Button>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilizator</TableHead>
              <TableHead>Facultate</TableHead>
              <TableHead>Departament</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.organizers.map((organizer) => (
              <TableRow key={organizer.id}>
                <TableCell>
                  <div className="grid gap-1">
                    <span className="font-medium">{organizer.full_name}</span>
                    <span className="text-xs text-[#667085]">{organizer.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {lookupName(props.faculties, organizer.faculty_id) || "-"}
                </TableCell>
                <TableCell>
                  {lookupName(props.departments, organizer.department_id) || "-"}
                </TableCell>
              </TableRow>
            ))}
            {props.organizers.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-[#667085]">
                  Nu exista utilizatori organizatori.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ReportTile(props: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <span className="text-sm text-[#667085]">{props.label}</span>
        <strong className="mt-2 block text-3xl text-[#192041]">{props.value}</strong>
      </CardContent>
    </Card>
  );
}

function ReportList(props: {
  title: string;
  items: { label: string; value: number | string }[];
  empty: string;
}) {
  return (
    <div className="grid content-start gap-3">
      <h3 className="text-sm font-semibold text-[#192041]">{props.title}</h3>
      <div className="grid gap-2">
        {props.items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 rounded-md border border-[#d7dfeb] px-3 py-2"
          >
            <span className="truncate text-sm text-[#192041]">{item.label}</span>
            <strong className="text-sm text-[#254591]">{item.value}</strong>
          </div>
        ))}
        {props.items.length === 0 && (
          <div className="rounded-md border border-[#d7dfeb] px-3 py-3 text-sm text-[#667085]">
            {props.empty}
          </div>
        )}
      </div>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{props.label}</Label>
      {props.children}
    </div>
  );
}

function buildEventsByMonth(events: EventItem[]) {
  const grouped = new Map<string, { label: string; count: number }>();
  for (const event of events) {
    const date = new Date(event.starts_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = monthFormatter.format(date);
    grouped.set(key, {
      label,
      count: (grouped.get(key)?.count ?? 0) + 1,
    });
  }
  return [...grouped.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([, value]) => value);
}

function lookupName(items: Lookup[], id?: string | null): string {
  return items.find((item) => item.id === id)?.name || "";
}

function registrationLabel(event: EventItem): string {
  const parts = [
    event.registration_required ? "Necesita inscriere" : "Nu necesita inscriere",
    event.is_free ? "Intrare libera" : "Intrare cu plata",
  ];

  if (event.registration_url) {
    parts.push("Are link de inscriere");
  }

  if (event.max_participants) {
    parts.push(`${event.registration_count}/${event.max_participants} participanti`);
  }

  return parts.join(" · ");
}

function buildEventsByOrganizer(events: EventItem[]) {
  const grouped = new Map<string, { name: string; count: number }>();
  for (const event of events) {
    const key = event.creator_id;
    grouped.set(key, {
      name: event.creator_full_name,
      count: (grouped.get(key)?.count ?? 0) + 1,
    });
  }
  return [...grouped.values()].sort((first, second) => second.count - first.count);
}
