"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { KeyboardEvent } from "react";
import { formatDate, getBusinessDate } from "@/lib/business-date";
import { formatMoney, totalAmounts } from "@/lib/money";
import type { CalendarResponse, RecordsResponse } from "@/lib/records";
import { Icon } from "./icons";
import { RecordsCalendar } from "./records-calendar";
import { RecordsTable } from "./records-table";
import { useRecordResource } from "./use-record-resource";

type Tab = "today" | "calendar";

export function RecordsApp({ initialToday, timeZone }: { initialToday: string; timeZone: string }) {
  const [tab, setTab] = useState<Tab>("today");
  const [today, setToday] = useState(initialToday);
  const [selectedDate, setSelectedDate] = useState(initialToday);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const todayTab = useRef<HTMLButtonElement>(null);
  const calendarTab = useRef<HTMLButtonElement>(null);
  const daily = useRecordResource<RecordsResponse>(`/api/records?date=${today}`, revision);
  const archive = useRecordResource<RecordsResponse>(tab === "calendar" ? `/api/records?date=${selectedDate}` : null, revision);
  const month = selectedDate.slice(0, 7);
  const calendar = useRecordResource<CalendarResponse>(tab === "calendar" ? `/api/records/calendar?month=${month}` : null, revision);
  const active = tab === "today" ? daily : archive;
  const amounts = totalAmounts(active.data?.records ?? []);

  useEffect(() => {
    function updateClock() { setToday(getBusinessDate(timeZone)); }
    function refresh() { updateClock(); setRevision((value) => value + 1); }
    function onVisible() { if (document.visibilityState === "visible") refresh(); }
    const interval = window.setInterval(updateClock, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [timeZone]);

  useEffect(() => {
    if (!daily.data) return;
    const serverToday = daily.data.today;
    const timer = window.setTimeout(() => setToday(serverToday), 0);
    return () => window.clearTimeout(timer);
  }, [daily.data]);

  function retry() { setRevision((value) => value + 1); }
  function changed(message: string) { setNotice(message); retry(); }
  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "today" : event.key === "End" ? "calendar" : tab === "today" ? "calendar" : "today";
    setTab(next);
    (next === "today" ? todayTab : calendarTab).current?.focus();
  }

  return (
    <div className="app-shell">
      <header className="site-header"><div className="header-content">
        <Link className="brand" href="/" aria-label="شركة غازي درويش - الصفحة الرئيسية"><Image className="brand-logo" src="/logo.jpg" alt="شعار شركة غازي درويش" width={64} height={64} /><span><strong>شركة غازي درويش</strong><small>تصدير · استيراد · تخليص جمركي</small></span></Link>
        <div className="header-meta"><span className="local-badge"><span className="status-dot" /> السجل اليومي</span><span className="header-date">{formatDate(today, true)}</span><Link href="/statistics" className="button button-light">الإحصاءات</Link></div>
      </div></header>
      <main className="main-content">
        <div className="page-intro"><div><p className="eyebrow">متابعة واضحة لكل يوم</p><h1>سجل الشركة<span>.</span></h1><p className="intro-description">سجلاتك ورسومك وصافي حساباتك اليومية في مكان واحد.</p></div><div className="business-date"><span>تاريخ العمل</span><strong>{formatDate(tab === "today" ? today : selectedDate, true)}</strong><small>{timeZone === "Asia/Damascus" ? "توقيت دمشق" : timeZone.replaceAll("_", " ")}</small></div></div>
        <div className="tab-bar" role="tablist" aria-label="عرض السجلات">
          <button ref={todayTab} id="today-tab" role="tab" aria-selected={tab === "today"} aria-controls="today-panel" tabIndex={tab === "today" ? 0 : -1} className={`tab-button${tab === "today" ? " active" : ""}`} onClick={() => setTab("today")} onKeyDown={navigateTabs}><Icon name="table" /> سجلات اليوم{daily.data && <span className="tab-count">{daily.data.records.length}</span>}</button>
          <button ref={calendarTab} id="calendar-tab" role="tab" aria-selected={tab === "calendar"} aria-controls="calendar-panel" tabIndex={tab === "calendar" ? 0 : -1} className={`tab-button${tab === "calendar" ? " active" : ""}`} onClick={() => setTab("calendar")} onKeyDown={navigateTabs}><Icon name="calendar" /> التقويم</button>
        </div>
        {notice && <div className="success-notice" role="status"><Icon name="check" /><span>{notice}</span><button type="button" className="icon-button" aria-label="إغلاق الإشعار" onClick={() => setNotice(null)}><Icon name="close" /></button></div>}
        <div className="summary-grid" aria-label="ملخص اليوم المحدد">
          <div className="summary-card"><span className="summary-label">عدد السجلات</span><strong><bdi dir="ltr">{active.loading || active.error ? "—" : String(active.data?.records.length ?? 0).padStart(2, "0")}</bdi></strong><span className="summary-description">{tab === "today" ? "السجلات المدخلة اليوم" : formatDate(selectedDate, true)}</span></div>
          <div className="summary-card"><span className="summary-label">المقبوض</span><strong><bdi dir="ltr">{active.loading || active.error ? "—" : formatMoney(amounts.receivedMoney)}</bdi></strong><span className="summary-description">إجمالي المبالغ المقبوضة</span></div>
          <div className="summary-card"><span className="summary-label">إجمالي الرسوم</span><strong><bdi dir="ltr">{active.loading || active.error ? "—" : formatMoney(amounts.receivedMoney - amounts.net)}</bdi></strong><span className="summary-description">مجموع بنود الرسوم السبعة</span></div>
          <div className={`summary-card net-summary${amounts.net < 0n ? " negative-summary" : ""}`}><span className="summary-label">صافي <span className="auto-badge">تلقائي</span></span><strong><bdi dir="ltr">{active.loading || active.error ? "—" : formatMoney(amounts.net)}</bdi></strong><span className="summary-description">المقبوض بعد خصم جميع الرسوم</span></div>
        </div>
        <section id="today-panel" role="tabpanel" aria-labelledby="today-tab" hidden={tab !== "today"}>
          <RecordsTable records={daily.data?.records ?? []} date={today} editable loading={daily.loading} error={daily.error} onRetry={retry} onChanged={changed} onDayChanged={setToday} />
        </section>
        <section id="calendar-panel" role="tabpanel" aria-labelledby="calendar-tab" hidden={tab !== "calendar"}>
          <RecordsCalendar selectedDate={selectedDate} today={today} counts={calendar.data?.counts ?? {}} loading={calendar.loading} error={calendar.error} onChange={setSelectedDate} onRetry={retry} />
          <RecordsTable records={archive.data?.records ?? []} date={selectedDate} loading={archive.loading} error={archive.error} onRetry={retry} onChanged={changed} onDayChanged={setToday} />
        </section>
        <footer className="site-footer"><span>شركة غازي درويش <span className="separator">/</span> سجل واضح لكل يوم.</span><span>سجلات اليوم للإدخال، والتقويم لمراجعة السجلات السابقة.</span></footer>
      </main>
    </div>
  );
}
