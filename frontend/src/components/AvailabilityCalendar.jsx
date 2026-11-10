import { useState } from "react";

// Shared vehicle/tour date picker with booked and out-of-range dates disabled.
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function bookedSet(bookedRanges = [], bookedDates = []) {
  const dates = new Set(bookedDates);
  bookedRanges.forEach(({ from, to }) => {
    const start = parseLocalDate(from);
    const end = parseLocalDate(to);
    if (!start || !end) return;
    for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.add(toISODate(date));
    }
  });
  return dates;
}

export default function AvailabilityCalendar({
  selectedDate,
  onSelect,
  bookedRanges = [],
  bookedDates = [],
  minDate = toISODate(new Date()),
  maxDate,
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = parseLocalDate(selectedDate) || new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const blocked = bookedSet(bookedRanges, bookedDates);
  const monthLabel = visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstDayOfCurrentMonth = `${minDate.slice(0, 7)}-01`;

  function moveMonth(amount) {
    setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          disabled={toISODate(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1)) < firstDayOfCurrentMonth}
          aria-label="Previous month"
          className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-lg text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ‹
        </button>
        <h3 className="text-sm font-semibold text-slate-900">{monthLabel}</h3>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          aria-label="Next month"
          className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-lg text-slate-700 hover:bg-slate-100"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2 text-xs font-semibold uppercase text-slate-400">{day}</div>
        ))}
        {Array.from({ length: firstDay }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden="true" />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index + 1);
          const isoDate = toISODate(date);
          const isBooked = blocked.has(isoDate);
          const isPast = isoDate < minDate;
          const isTooFar = maxDate ? isoDate > maxDate : false;
          const isSelected = selectedDate === isoDate;
          const disabled = isPast || isBooked || isTooFar;

          return (
            <button
              key={isoDate}
              type="button"
              disabled={disabled}
              aria-label={`${date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}${isBooked ? ", booked" : ""}`}
              aria-pressed={isSelected}
              title={isBooked ? "Already booked" : isTooFar ? "Select a date within the next 12 months" : undefined}
              onClick={() => onSelect(isoDate)}
              className={`aspect-square rounded-full text-sm transition ${
                isSelected
                  ? "bg-orange-600 font-semibold text-white"
                  : disabled
                    ? "cursor-not-allowed bg-slate-100 text-slate-300 line-through"
                    : "text-slate-700 hover:bg-orange-100 hover:text-orange-800"
              }`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-orange-600" />Selected</span>
        <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-slate-200" />Booked or unavailable</span>
      </div>
    </div>
  );
}

export function rangeHasBookedDate(startDate, endDate, bookedRanges = []) {
  if (!startDate || !endDate || endDate < startDate) return false;
  return bookedRanges.some((range) => range.from <= endDate && range.to >= startDate);
}
