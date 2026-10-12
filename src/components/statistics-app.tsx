"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MAX_YEAR } from "@/lib/business-date";
import { MIN_STATISTICS_YEAR } from "@/lib/statistics";
import type { StatisticsResponse } from "@/lib/statistics";
import { Icon } from "./icons";
import { useRecordResource } from "./use-record-resource";

const years = Array.from({ length: MAX_YEAR - MIN_STATISTICS_YEAR + 1 }, (_, index) => MIN_STATISTICS_YEAR + index);

export function StatisticsApp({ initialYear }: { initialYear: number }) {
  const [year, setYear] = useState(initialYear);
  const [revision, setRevision] = useState(0);
  const statistics = useRecordResource<StatisticsResponse>(`/api/records/statistics?year=${year}`, revision);

  useEffect(() => {
    function refresh() { setRevision((value) => value + 1); }
    function onVisible() { if (document.visibilityState === "visible") refresh(); }
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  function retry() { setRevision((value) => value + 1); }

  return (
    <div className="app-shell">
      <header className="site-header"><div className="header-content">
        <Link className="brand" href="/" aria-label="شركة غازي درويش - الصفحة الرئيسية"><Image className="brand-logo" src="/logo.jpg" alt="شعار شركة غازي درويش" width={64} height={64} /><span><strong>شركة غازي درويش</strong><small>تصدير · استيراد · تخليص جمركي</small></span></Link>
        <Link href="/" className="button button-light">العودة إلى السجلات</Link>
      </div></header>
      <main className="main-content statistics-content">
        <div className="page-intro"><div><h1>الإحصاءات</h1><p className="intro-description">عدد سجلات الاستيراد والتصدير خلال السنة المحددة.</p></div></div>
        <div className="statistics-toolbar">
          <label className="statistics-year" htmlFor="statistics-year"><span>السنة</span><select id="statistics-year" value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {years.map((option) => <option key={option} value={option}>{option}</option>)}
          </select></label>
          <button type="button" className="icon-button" disabled={statistics.loading} onClick={retry} aria-label="تحديث الإحصاءات" title="تحديث الإحصاءات"><Icon name="refresh" /></button>
        </div>
        {statistics.error && <div className="alert alert-error statistics-error" role="alert">تعذّر تحميل الإحصاءات. تحقق من الاتصال وحاول مجدداً. <button type="button" className="text-button" onClick={retry}>إعادة المحاولة</button></div>}
        {statistics.loading && <p className="statistics-loading" role="status">جارٍ تحميل الإحصاءات…</p>}
        <section className="summary-grid statistics-summary" aria-label={`عدد السجلات في سنة ${year}`} aria-busy={statistics.loading} aria-live="polite">
          <div className="summary-card"><span className="summary-label">سجلات الاستيراد</span><strong><bdi dir="ltr">{statistics.loading || statistics.error ? "—" : String(statistics.data?.counts.import ?? 0)}</bdi></strong></div>
          <div className="summary-card"><span className="summary-label">سجلات التصدير</span><strong><bdi dir="ltr">{statistics.loading || statistics.error ? "—" : String(statistics.data?.counts.export ?? 0)}</bdi></strong></div>
        </section>
      </main>
    </div>
  );
}
