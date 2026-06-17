import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select } from "./ui/select";

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
  disabled?: boolean;
  minValue?: string;
  maxValue?: string;
  onChange: (value: string) => void;
}) {
  const minValue = normalizeDateTimeValue(props.minValue);
  const maxValue = normalizeDateTimeValue(props.maxValue);
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
  const availableHourOptions = date
    ? getAvailableHourOptions(date, minuteValues, minValue, maxValue)
    : hourOptions;
  const safeSelectedHour = availableHourOptions.includes(selectedHour)
    ? selectedHour
    : (availableHourOptions[0] ?? selectedHour);
  const availableMinuteOptions = date
    ? getAvailableMinuteOptions(
        date,
        safeSelectedHour,
        minuteValues,
        minValue,
        maxValue,
      )
    : minuteValues;
  const safeSelectedMinute = availableMinuteOptions.includes(selectedMinute)
    ? selectedMinute
    : (availableMinuteOptions[0] ?? selectedMinute);
  const days = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const canMoveToPreviousMonth = monthIntersectsRange(
    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1),
    minValue,
    maxValue,
  );
  const canMoveToNextMonth = monthIntersectsRange(
    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1),
    minValue,
    maxValue,
  );

  const label = date
    ? `${valueFormatter.format(new Date(`${date}T12:00:00`))}, ${selectedTime}`
    : props.placeholder;

  function moveMonth(delta: number) {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  }

  function selectDay(nextDate: Date) {
    props.onChange(
      clampDateTime(
        joinDateTime(toDateInputValue(nextDate), selectedTime),
        minValue,
        maxValue,
      ),
    );
  }

  function selectTime(hour: string, minute: string) {
    const nextTime = `${hour}:${minute}`;
    setDraftTime(nextTime);
    if (date) {
      const nextValue = clampDateTime(joinDateTime(date, nextTime), minValue, maxValue);
      props.onChange(nextValue);
      const nextParts = splitDateTime(nextValue);
      if (nextParts.time) {
        setDraftTime(nextParts.time);
      }
    }
  }

  function clearValue() {
    props.onChange("");
    setOpen(false);
  }

  useEffect(() => {
    if (!props.value) {
      return;
    }

    const nextValue = clampDateTime(props.value, minValue, maxValue);
    if (nextValue && nextValue !== props.value) {
      props.onChange(nextValue);
    }
  }, [maxValue, minValue, props.value, props.onChange]);

  return (
    <Popover
      open={props.disabled ? false : open}
      onOpenChange={(nextOpen) => setOpen(props.disabled ? false : nextOpen)}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={props.disabled}
          className={[
            "h-11 w-full justify-start gap-2 px-3 text-left font-normal",
            date ? "text-[#192041]" : "text-[#667085]",
          ].join(" ")}
          aria-expanded={open}
        >
          <CalendarDays className="size-4 text-[#254591]" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>

      {props.required && (
        <input
          className="pointer-events-none absolute h-px w-px opacity-0"
          required
          disabled={props.disabled}
          tabIndex={-1}
          value={props.value}
          onChange={() => undefined}
          aria-hidden="true"
        />
      )}

      <PopoverContent className="w-[min(22rem,calc(100vw-3rem))] p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Luna anterioara"
              disabled={!canMoveToPreviousMonth}
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
              disabled={!canMoveToNextMonth}
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
              const disabled = dayIsOutsideRange(value, minValue, maxValue);
              return (
                <Button
                  type="button"
                  key={value}
                  variant="ghost"
                  disabled={disabled}
                  className={[
                    "grid h-9 place-items-center rounded-md text-sm transition-colors",
                    day.inMonth ? "text-[#192041]" : "text-[#b0b7c3]",
                    disabled ? "text-[#b0b7c3]" : "",
                    selected
                      ? "bg-[#254591] text-white"
                      : "hover:bg-[rgba(134,193,234,0.22)] hover:text-[#254591]",
                  ].join(" ")}
                  onClick={() => selectDay(day.date)}
                >
                  {day.date.getDate()}
                </Button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-2 rounded-md border border-[#d7dfeb] bg-[#fbfcff] p-3">
            <div className="grid grid-cols-2 gap-2">
              <TimeSelect
                label="Ora"
                value={safeSelectedHour}
                options={availableHourOptions}
                onChange={(hour) => {
                  const nextMinuteOptions = date
                    ? getAvailableMinuteOptions(
                        date,
                        hour,
                        minuteValues,
                        minValue,
                        maxValue,
                      )
                    : minuteValues;
                  const nextMinute = nextMinuteOptions.includes(safeSelectedMinute)
                    ? safeSelectedMinute
                    : (nextMinuteOptions[0] ?? safeSelectedMinute);
                  selectTime(hour, nextMinute);
                }}
              />
              <TimeSelect
                label="Minut"
                value={safeSelectedMinute}
                options={availableMinuteOptions}
                onChange={(minute) => selectTime(safeSelectedHour, minute)}
              />
            </div>
          </div>

          <div className="mt-3 flex justify-between gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={clearValue}
            >
              Sterge
            </Button>
            <Button type="button" onClick={() => setOpen(false)}>
              Gata
            </Button>
          </div>
      </PopoverContent>
    </Popover>
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
      <Select
        value={props.value}
        placeholder={props.label}
        options={props.options.map((option) => ({ value: option, label: option }))}
        onValueChange={props.onChange}
      />
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

function normalizeDateTimeValue(value?: string): string {
  if (!value) {
    return "";
  }

  const { date, time } = splitDateTime(value);
  if (!date) {
    return "";
  }

  return joinDateTime(date, time || "00:00");
}

function clampDateTime(value: string, minValue: string, maxValue: string): string {
  const normalizedValue = normalizeDateTimeValue(value);
  if (!normalizedValue) {
    return "";
  }

  if (minValue && normalizedValue < minValue) {
    return minValue;
  }
  if (maxValue && normalizedValue > maxValue) {
    return maxValue;
  }
  return normalizedValue;
}

function isDateTimeAllowed(value: string, minValue: string, maxValue: string): boolean {
  const normalizedValue = normalizeDateTimeValue(value);
  if (!normalizedValue) {
    return true;
  }

  if (minValue && normalizedValue < minValue) {
    return false;
  }
  if (maxValue && normalizedValue > maxValue) {
    return false;
  }
  return true;
}

function dayIsOutsideRange(date: string, minValue: string, maxValue: string): boolean {
  const dayStart = joinDateTime(date, "00:00");
  const dayEnd = joinDateTime(date, "23:59");

  if (minValue && dayEnd < minValue) {
    return true;
  }
  if (maxValue && dayStart > maxValue) {
    return true;
  }
  return false;
}

function monthIntersectsRange(month: Date, minValue: string, maxValue: string): boolean {
  const firstDate = toDateInputValue(
    new Date(month.getFullYear(), month.getMonth(), 1),
  );
  const lastDate = toDateInputValue(
    new Date(month.getFullYear(), month.getMonth() + 1, 0),
  );
  const monthStart = joinDateTime(firstDate, "00:00");
  const monthEnd = joinDateTime(lastDate, "23:59");

  if (minValue && monthEnd < minValue) {
    return false;
  }
  if (maxValue && monthStart > maxValue) {
    return false;
  }
  return true;
}

function getAvailableHourOptions(
  date: string,
  minutes: string[],
  minValue: string,
  maxValue: string,
): string[] {
  return hourOptions.filter((hour) =>
    minutes.some((minute) =>
      isDateTimeAllowed(joinDateTime(date, `${hour}:${minute}`), minValue, maxValue),
    ),
  );
}

function getAvailableMinuteOptions(
  date: string,
  hour: string,
  minutes: string[],
  minValue: string,
  maxValue: string,
): string[] {
  return minutes.filter((minute) =>
    isDateTimeAllowed(joinDateTime(date, `${hour}:${minute}`), minValue, maxValue),
  );
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
