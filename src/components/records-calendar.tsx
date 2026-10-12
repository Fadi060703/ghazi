"use client";

import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { calendarDays, changeDateParts, DISPLAY_LOCALE, daysInMonth, formatDate, MAX_YEAR, MIN_YEAR, shiftDay, shiftMonth } from "@/lib/business-date";
import { Icon } from "./icons";

const months = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat(DISPLAY_LOCALE, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2000, index, 1))),
);
const weekdays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const years = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, index) => MIN_YEAR + index);

type CalendarProps = {
  selectedDate: string;
  today: string;
  counts: Record<string, number>;
  loading: boolean;
  error: string | null;
  onChange: (date: string) => void;
  onRetry: () => void;
};

export function RecordsCalendar({ selectedDate, today, counts, loading, error, onChange, onRetry }: CalendarProps) {
  const [year, month, day] = selectedDate.split("-").map(Number);
  const calendarRef = useRef<HTMLDivElement>(null);
  const focusPending = useRef(false);

  useEffect(() => {
    if (focusPending.current) {
      calendarRef.current?.querySelector<HTMLButtonElement>(`[data-date="${selectedDate}"]`)?.focus();
      focusPending.current = false;
    }
  }, [selectedDate]);

  function navigate(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const offsets: Record<string, number> = { ArrowLeft: 1, ArrowRight: -1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday };
    let nextDate;
    if (event.key in offsets) nextDate = shiftDay(date, offsets[event.key]);
    else if (event.key === "PageUp") nextDate = shiftMonth(date, -1);
    else if (event.key === "PageDown") nextDate = shiftMonth(date, 1);
    else return;
    event.preventDefault();
    focusPending.current = true;
    onChange(nextDate);
    if (nextDate === selectedDate) focusPending.current = false;
  }

  return (
    <section className="surface calendar-surface" aria-label="تقويم السجلات">
      <div className="calendar-toolbar">
        <div>
          <p className="eyebrow">مراجعة السجلات السابقة</p>
          <h2>{months[month - 1]} <span className="muted">{year}</span></h2>
        </div>
        <div className="calendar-controls">
          <label><span className="sr-only">اليوم</span><select value={day} onChange={(event) => onChange(changeDateParts(year, month, Number(event.target.value)))}>
            {Array.from({ length: daysInMonth(year, month) }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
          </select></label>
          <label><span className="sr-only">الشهر</span><select value={month} onChange={(event) => onChange(changeDateParts(year, Number(event.target.value), day))}>
            {months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
          </select></label>
          <label><span className="sr-only">السنة</span><select value={year} onChange={(event) => onChange(changeDateParts(Number(event.target.value), month, day))}>
            {years.map((value) => <option key={value} value={value}>{value}</option>)}
          </select></label>
          <button type="button" className="button button-light" onClick={() => onChange(today)}>اليوم</button>
          <div className="month-arrows">
            <button type="button" className="icon-button" aria-label="الشهر السابق" disabled={year === MIN_YEAR && month === 1} onClick={() => onChange(shiftMonth(selectedDate, -1))}><Icon name="right" /></button>
            <button type="button" className="icon-button" aria-label="الشهر التالي" disabled={year === MAX_YEAR && month === 12} onClick={() => onChange(shiftMonth(selectedDate, 1))}><Icon name="left" /></button>
          </div>
        </div>
      </div>
      {error && <div className="alert alert-error" role="alert">{error} <button className="text-button" onClick={onRetry}>إعادة تحميل الأعداد</button></div>}
      <div ref={calendarRef} className="calendar-grid" role="group" aria-label={`${months[month - 1]} ${year}`} aria-busy={loading}>
        {weekdays.map((name) => <div key={name} className="calendar-weekday">{name}</div>)}
        {calendarDays(selectedDate).map((date, index) => date ? (
          <button
            key={date}
            type="button"
            data-date={date}
            className={`calendar-day${date === selectedDate ? " is-selected" : ""}${date === today ? " is-today" : ""}`}
            aria-label={`${formatDate(date)}${date === today ? "، اليوم" : ""}${loading ? "، جارٍ تحميل عدد السجلات" : error ? "، عدد السجلات غير متاح" : `، عدد السجلات: ${counts[date] || 0}`}`}
            aria-pressed={date === selectedDate}
            aria-current={date === today ? "date" : undefined}
            tabIndex={date === selectedDate ? 0 : -1}
            onClick={() => onChange(date)}
            onKeyDown={(event) => navigate(event, date)}
          >
            <span className="day-number">{Number(date.slice(-2))}</span>
            {date === today && <span className="today-marker" aria-hidden="true" />}
            {!loading && !error && Boolean(counts[date]) && <span className="day-count">{counts[date]} <span className="count-label">سجل</span></span>}
          </button>
        ) : <div key={`empty-${index}`} className="calendar-blank" />)}
      </div>
      <div className="calendar-legend"><span><span className="legend-dot" /> اليوم</span><span><span className="legend-square" /> اليوم المحدد</span><span className="muted">{loading ? "جارٍ تحميل أعداد السجلات…" : "اختر يوماً لعرض سجلاته"}</span></div>
    </section>
  );
}
