import { useMemo, useState } from "react";

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
    <div className="date-picker">
      <button
        type="button"
        className={`date-picker-trigger ${props.value ? "has-value" : ""}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selectedLabel}</span>
        <span className="date-icon" aria-hidden="true" />
      </button>

      {open && (
        <div className="date-popover">
          <div className="date-popover-head">
            <button type="button" onClick={() => moveMonth(-1)} aria-label="Luna anterioara">
              {"<"}
            </button>
            <strong>{monthFormatter.format(visibleMonth)}</strong>
            <button type="button" onClick={() => moveMonth(1)} aria-label="Luna urmatoare">
              {">"}
            </button>
          </div>
          <div className="date-weekdays">
            {["Lu", "Ma", "Mi", "Jo", "Vi", "Sa", "Du"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="date-grid">
            {days.map((day) => {
              const value = toDateInputValue(day.date);
              return (
                <button
                  type="button"
                  key={value}
                  className={[
                    day.inMonth ? "" : "muted",
                    value === props.value ? "selected" : "",
                  ].join(" ")}
                  onClick={() => selectDay(day.date)}
                >
                  {day.date.getDate()}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="date-clear"
            onClick={() => {
              props.onChange("");
              setOpen(false);
            }}
          >
            Sterge data
          </button>
        </div>
      )}
    </div>
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
