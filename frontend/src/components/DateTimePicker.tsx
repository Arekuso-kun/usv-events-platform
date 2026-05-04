import { CalendarDays, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "./ui/button";

const monthFormatter = new Intl.DateTimeFormat("ro-RO", {
  month: "long",
  year: "numeric",
});

const valueFormatter = new Intl.DateTimeFormat("ro-RO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const hourOptions = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const minuteOptions = Array.from({ length: 12 }, (_, index) =>
  String(index * 5).padStart(2, "0"),
);

export function DateTimePicker(props: {
  value: string;
  placeholder: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const { date, time } = splitDateTime(props.value);
  const [open, setOpen] = useState(false);
  const [draftTime, setDraftTime] = useState(time || "09:00");
  const initialMonth = date ? new Date(`${date}T12:00:00`) : new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1),
  );

  const selectedTime = time || draftTime;
  const [selectedHour, selectedMinute] = selectedTime.split(":");
  const minuteValues = minuteOptions.includes(selectedMinute)
    ? minuteOptions
    : [...minuteOptions, selectedMinute].sort();
  const days = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);

  const label = date
    ? `${valueFormatter.format(new Date(`${date}T12:00:00`))}, ${selectedTime}`
    : props.placeholder;

  function moveMonth(delta: number) {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  }

  function selectDay(nextDate: Date) {
    props.onChange(joinDateTime(toDateInputValue(nextDate), selectedTime));
  }

  function selectTime(hour: string, minute: string) {
    const nextTime = `${hour}:${minute}`;
    setDraftTime(nextTime);
    if (date) {
      props.onChange(joinDateTime(date, nextTime));
    }
  }

  function clearValue() {
    props.onChange("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className={[
          "h-11 w-full justify-start gap-2 px-3 text-left font-normal",
          date ? "text-[#192041]" : "text-[#667085]",
        ].join(" ")}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <CalendarDays className="size-4 text-[#254591]" />
        <span className="truncate">{label}</span>
      </Button>

      {props.required && (
        <input
          className="pointer-events-none absolute h-px w-px opacity-0"
          required
          tabIndex={-1}
          value={props.value}
          onChange={() => undefined}
          aria-hidden="true"
        />
      )}

      {open && (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[min(22rem,calc(100vw-3rem))] rounded-md border border-[#d7dfeb] bg-white p-3 text-[#192041] shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Luna anterioara"
              onClick={() => moveMonth(-1)}
            >
              <ChevronLeft />
            </Button>
            <strong className="text-sm capitalize">
              {monthFormatter.format(visibleMonth)}
            </strong>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Luna urmatoare"
              onClick={() => moveMonth(1)}
            >
              <ChevronRight />
            </Button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#667085]">
            {["Lu", "Ma", "Mi", "Jo", "Vi", "Sa", "Du"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const value = toDateInputValue(day.date);
              const selected = value === date;
              return (
                <button
                  type="button"
                  key={value}
                  className={[
                    "grid h-9 place-items-center rounded-md text-sm transition-colors",
                    day.inMonth ? "text-[#192041]" : "text-[#b0b7c3]",
                    selected
                      ? "bg-[#254591] text-white"
                      : "hover:bg-[rgba(134,193,234,0.22)] hover:text-[#254591]",
                  ].join(" ")}
                  onClick={() => selectDay(day.date)}
                >
                  {day.date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-2 rounded-md border border-[#d7dfeb] bg-[#fbfcff] p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="size-4 text-[#254591]" />
              Ora evenimentului
            </div>
            <div className="grid grid-cols-2 gap-2">
              <TimeSelect
                label="Ora"
                value={selectedHour}
                options={hourOptions}
                onChange={(hour) => selectTime(hour, selectedMinute)}
              />
              <TimeSelect
                label="Minut"
                value={selectedMinute}
                options={minuteValues}
                onChange={(minute) => selectTime(selectedHour, minute)}
              />
            </div>
          </div>

          <div className="mt-3 flex justify-between gap-2">
            <Button type="button" variant="ghost" onClick={clearValue}>
              Sterge
            </Button>
            <Button type="button" onClick={() => setOpen(false)}>
              Gata
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TimeSelect(props: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-[#667085]">
      {props.label}
      <select
        className="h-10 w-full appearance-none rounded-md border border-[#d7dfeb] bg-white px-3 text-sm text-[#192041] outline-none transition-colors focus:border-[#254591] focus:ring-2 focus:ring-[#254591]/20"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      >
        {props.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function splitDateTime(value: string): { date: string; time: string } {
  const [date = "", rawTime = ""] = value.split("T");
  return { date, time: rawTime.slice(0, 5) };
}

function joinDateTime(date: string, time: string): string {
  return `${date}T${time || "09:00"}`;
}

function buildMonthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      inMonth: date.getMonth() === month.getMonth(),
    };
  });
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
