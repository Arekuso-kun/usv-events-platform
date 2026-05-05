import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

const monthFormatter = new Intl.DateTimeFormat("ro-RO", {
  month: "long",
  year: "numeric",
});

const valueFormatter = new Intl.DateTimeFormat("ro-RO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function DatePicker(props: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const initialMonth = props.value ? new Date(`${props.value}T12:00:00`) : new Date();
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1),
  );

  const days = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const selectedLabel = props.value
    ? valueFormatter.format(new Date(`${props.value}T12:00:00`))
    : props.placeholder;

  function moveMonth(delta: number) {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  }

  function selectDay(date: Date) {
    props.onChange(toDateInputValue(date));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={[
            "h-11 w-full justify-between px-3 font-normal",
            props.value ? "text-[#192041]" : "text-[#667085]",
          ].join(" ")}
        >
          <span>{selectedLabel}</span>
          <CalendarDays className="size-4 text-[#254591]" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[min(300px,calc(100vw-48px))] p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => moveMonth(-1)} aria-label="Luna anterioara">
              <ChevronLeft />
            </Button>
            <strong className="text-sm capitalize">{monthFormatter.format(visibleMonth)}</strong>
            <Button type="button" variant="secondary" size="sm" onClick={() => moveMonth(1)} aria-label="Luna urmatoare">
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
              return (
                <Button
                  type="button"
                  key={value}
                  variant="ghost"
                  className={[
                    "h-9 rounded-md p-0 text-sm",
                    day.inMonth ? "text-[#192041]" : "text-[#b0b7c3]",
                    value === props.value ? "bg-[#254591] text-white hover:bg-[#254591] hover:text-white" : "",
                  ].join(" ")}
                  onClick={() => selectDay(day.date)}
                >
                  {day.date.getDate()}
                </Button>
              );
            })}
          </div>
          <Button
            type="button"
            className="mt-3 w-full"
            variant="secondary"
            onClick={() => {
              props.onChange("");
              setOpen(false);
            }}
          >
            Sterge data
          </Button>
      </PopoverContent>
    </Popover>
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
