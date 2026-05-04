import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import type { CalendarDay, EventItem } from "../types";

const MONTHS = [
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
];
const WEEK_DAYS = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sa", "Du"];

export function CalendarPage(props: {
  events: EventItem[];
  selectEvent: (eventId: string) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const days = useMemo(
    () => buildMonthDays(props.events, selectedYear, selectedMonth),
    [props.events, selectedMonth, selectedYear],
  );

  const monthEvents = useMemo(
    () =>
      props.events
        .filter((event) => {
          const eventDate = new Date(event.starts_at);
          return (
            eventDate.getFullYear() === selectedYear &&
            eventDate.getMonth() === selectedMonth
          );
        })
        .sort(
          (first, second) =>
            new Date(first.starts_at).getTime() - new Date(second.starts_at).getTime(),
        ),
    [props.events, selectedMonth, selectedYear],
  );

  const yearOptions = useMemo(
    () => buildYearOptions(props.events, today.getFullYear()),
    [props.events, today],
  );

  function moveMonth(direction: -1 | 1) {
    const next = new Date(selectedYear, selectedMonth + direction, 1);
    setSelectedMonth(next.getMonth());
    setSelectedYear(next.getFullYear());
  }

  function selectMonth(value: string) {
    setSelectedMonth(Number(value));
  }

  function selectYear(value: string) {
    setSelectedYear(Number(value));
  }

  function selectToday() {
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-5 text-[#254591]" />
                Calendar evenimente
              </CardTitle>
              <CardDescription>
                {monthEvents.length} evenimente in {MONTHS[selectedMonth]}{" "}
                {selectedYear}
              </CardDescription>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Luna anterioara"
                onClick={() => moveMonth(-1)}
              >
                <ChevronLeft />
              </Button>
              <CalendarSelect
                width={148}
                value={String(selectedMonth)}
                ariaLabel="Selecteaza luna"
                onChange={selectMonth}
                options={MONTHS.map((label, index) => ({
                  value: String(index),
                  label,
                }))}
              />
              <CalendarSelect
                width={96}
                value={String(selectedYear)}
                ariaLabel="Selecteaza anul"
                onChange={selectYear}
                options={yearOptions.map((year) => ({
                  value: String(year),
                  label: String(year),
                }))}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Luna urmatoare"
                onClick={() => moveMonth(1)}
              >
                <ChevronRight />
              </Button>
              <Button type="button" variant="secondary" onClick={selectToday}>
                Azi
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 rounded-md border border-[#d7dfeb] bg-white">
            {WEEK_DAYS.map((day) => (
              <div
                key={day}
                className="border-b border-[#d7dfeb] px-3 py-2 text-xs font-semibold uppercase text-[#667085]"
              >
                {day}
              </div>
            ))}
            {days.map((day) => (
              <CalendarCell
                key={day.key}
                day={day}
                isToday={day.key === toDateKey(today)}
                selectEvent={props.selectEvent}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CalendarCell(props: {
  day: CalendarDay;
  isToday: boolean;
  selectEvent: (eventId: string) => void;
}) {
  const visibleEvents = props.day.events.slice(0, 3);
  const hiddenCount = props.day.events.length - visibleEvents.length;

  return (
    <div
      className={`min-h-32 border-b border-r border-[#d7dfeb] p-2 ${
        props.day.inMonth ? "bg-white" : "bg-[#f6f8fc] text-[#98a2b3]"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`grid size-7 place-items-center rounded-full text-sm font-semibold ${
            props.isToday ? "bg-[#254591] text-white" : "text-[#192041]"
          }`}
        >
          {props.day.date.getDate()}
        </span>
      </div>

      <div className="grid gap-1">
        {visibleEvents.map((event) => (
          <button
            key={event.id}
            type="button"
            className="truncate rounded-md bg-[rgba(134,193,234,0.22)] px-2 py-1 text-left text-xs font-medium text-[#192041] hover:bg-[rgba(134,193,234,0.34)]"
            onClick={() => props.selectEvent(event.id)}
          >
            {event.title}
          </button>
        ))}
        {hiddenCount > 0 && (
          <span className="px-2 text-xs font-medium text-[#667085]">
            +{hiddenCount} evenimente
          </span>
        )}
      </div>
    </div>
  );
}

function CalendarSelect(props: {
  value: string;
  ariaLabel: string;
  width: number;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="select-field shrink-0"
      style={{ width: `${props.width}px` }}
    >
      <select
        className="appearance-none rounded-md border border-[#d7dfeb] bg-white px-3 pr-9 text-sm font-medium text-[#192041] outline-none focus:border-[#254591] focus:ring-2 focus:ring-[#254591]/20"
        style={{ height: "40px", minHeight: "40px", width: "100%" }}
        value={props.value}
        aria-label={props.ariaLabel}
        onChange={(event) => props.onChange(event.target.value)}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="select-chevron" aria-hidden="true" />
    </div>
  );
}

function buildMonthDays(
  events: EventItem[],
  selectedYear: number,
  selectedMonth: number,
): CalendarDay[] {
  const first = new Date(selectedYear, selectedMonth, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = toDateKey(date);

    return {
      key,
      date,
      inMonth: date.getMonth() === selectedMonth,
      events: events.filter((event) => toDateKey(new Date(event.starts_at)) === key),
    };
  });
}

function buildYearOptions(events: EventItem[], currentYear: number): number[] {
  const years = events.map((event) => new Date(event.starts_at).getFullYear());
  const minYear = Math.min(currentYear - 2, ...years);
  const maxYear = Math.max(currentYear + 2, ...years);

  return Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
