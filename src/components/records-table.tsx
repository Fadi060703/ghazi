"use client";

import { Fragment, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { formatDate } from "@/lib/business-date";
import { ClientRequestError, requestJson } from "@/lib/client-api";
import { calculateNet, formatMoney, MONEY_FIELDS, parseMoney, totalAmounts } from "@/lib/money";
import type { MoneyAmounts } from "@/lib/money";
import { emptyDraft, RecordValidationError, recordToDraft, RECORD_TYPES, recordTypeLabel, TEXT_FIELDS, validateRecord } from "@/lib/records";
import type { CompanyRecord, FieldErrors, RecordDraft } from "@/lib/records";
import { Icon } from "./icons";

type Entry = { values: RecordDraft; recordDate: string; requestId: string; original: CompanyRecord | null; submitted: boolean };
type TableProps = {
  records: CompanyRecord[];
  date: string;
  editable?: boolean;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onChanged: (message: string) => void;
  onDayChanged: (date: string) => void;
};

export function RecordsTable({ records, date, editable = false, loading, error, onRetry, onChanged, onDayChanged }: TableProps) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [fields, setFields] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CompanyRecord | null>(null);
  const submitting = useRef(false);
  const firstInput = useRef<HTMLSelectElement | null>(null);
  const addButton = useRef<HTMLButtonElement | null>(null);
  const identifier = useId();
  const columnCount = editable ? 15 : 14;
  const totals = totalAmounts(records);
  const changedDay = Boolean(entry && entry.recordDate !== date);

  function start(record: CompanyRecord | null = null) {
    setFields({});
    setSaveError(null);
    setDeleteTarget(null);
    setEntry({ values: record ? recordToDraft(record) : emptyDraft(), recordDate: date, requestId: crypto.randomUUID(), original: record, submitted: false });
    requestAnimationFrame(() => firstInput.current?.focus());
  }

  function cancel() {
    if (submitting.current) return;
    setEntry(null);
    setFields({});
    setSaveError(null);
    requestAnimationFrame(() => addButton.current?.focus());
  }

  function change(field: keyof RecordDraft, value: string) {
    setEntry((current) => current ? {
      ...current,
      values: { ...current.values, [field]: value },
      requestId: current.submitted ? crypto.randomUUID() : current.requestId,
      submitted: false,
    } : null);
    setFields((current) => ({ ...current, [field]: undefined }));
  }

  async function save() {
    if (!entry || submitting.current || changedDay || loading || error) return;
    setSaveError(null);
    try {
      validateRecord(entry.values);
    } catch (validation) {
      if (validation instanceof RecordValidationError) setFields(validation.fields);
      setSaveError(validation instanceof Error ? validation.message : "راجع البيانات المدخلة.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    setFields({});
    setEntry((current) => current ? { ...current, submitted: true } : null);
    try {
      const result = await requestJson<{ record: CompanyRecord }>(entry.original ? `/api/records/${entry.original.id}` : "/api/records", {
        method: entry.original ? "PATCH" : "POST",
        body: JSON.stringify({ ...entry.values, recordDate: entry.recordDate, requestId: entry.requestId, version: entry.original?.version }),
      });
      setEntry(null);
      onChanged(`تم ${entry.original ? "تعديل" : "حفظ"} السجل رقم ${result.record.id}.`);
      requestAnimationFrame(() => addButton.current?.focus());
    } catch (failure) {
      setSaveError(failure instanceof Error ? failure.message : "تعذّر حفظ السجل.");
      if (failure instanceof ClientRequestError) {
        setFields(failure.fields ?? {});
        if (failure.today) onDayChanged(failure.today);
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleteTarget || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setSaveError(null);
    try {
      await requestJson(`/api/records/${deleteTarget.id}`, { method: "DELETE", body: JSON.stringify({ version: deleteTarget.version }) });
      setDeleteTarget(null);
      onChanged(`تم حذف السجل رقم ${deleteTarget.id}.`);
    } catch (failure) {
      setSaveError(failure instanceof Error ? failure.message : "تعذّر حذف السجل.");
      if (failure instanceof ClientRequestError && failure.today) onDayChanged(failure.today);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  function entryKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") { event.preventDefault(); void save(); }
    if (event.key === "Escape") { event.preventDefault(); cancel(); }
  }

  function input(field: keyof RecordDraft, label: string, money: boolean, maxLength?: number) {
    const fieldError = fields[field];
    return (
      <td key={field} className="entry-cell">
        <input
          aria-label={label}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? `${identifier}-${field}` : undefined}
          className={`cell-input${fieldError ? " input-error" : ""}${money ? " money-input" : ""}`}
          type="text"
          inputMode={money ? "decimal" : "text"}
          dir={money ? "ltr" : "auto"}
          placeholder={money ? "0.00" : field === "carNumber" ? "مثال: 00123" : field === "merchantName" ? "اسم التاجر" : "نوع البضاعة"}
          maxLength={maxLength ?? 13}
          required={!money || field === "receivedMoney"}
          value={entry?.values[field] ?? ""}
          disabled={busy}
          onChange={(event) => change(field, event.target.value)}
          onKeyDown={entryKey}
          autoComplete="off"
        />
        {fieldError && <span id={`${identifier}-${field}`} className="field-error">{fieldError}</span>}
      </td>
    );
  }

  function entryRow() {
    if (!entry) return null;
    let preview: number | null = null;
    try {
      const amounts = Object.fromEntries(MONEY_FIELDS.map((field) => [field.key, parseMoney(entry.values[field.key], true)])) as MoneyAmounts;
      preview = calculateNet(amounts);
    } catch {
      preview = null;
    }
    return (
      <tr className="entry-row">
        <td className="sticky-id"><span className="draft-label" dir={entry.original ? "ltr" : "rtl"}>{entry.original ? `#${entry.original.id}` : "جديد"}</span></td>
        <td className="entry-cell">
          <select ref={firstInput} className={`cell-input type-select${fields.type ? " input-error" : ""}`} aria-label="نوع البيان" aria-invalid={Boolean(fields.type)} aria-describedby={fields.type ? `${identifier}-type` : undefined} value={entry.values.type} disabled={busy} required onChange={(event) => change("type", event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") cancel(); }}>
            <option value="" disabled>اختر نوع البيان</option>
            {RECORD_TYPES.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
          </select>
          {fields.type && <span id={`${identifier}-type`} className="field-error">{fields.type}</span>}
        </td>
        {TEXT_FIELDS.map((field) => input(field.key, field.label, false, field.maxLength))}
        {MONEY_FIELDS.map((field) => input(field.key, field.label, true))}
        <td className={`money-cell net-cell${preview !== null && preview < 0 ? " negative" : ""}`}><output aria-label="الصافي المحسوب" aria-live="polite"><bdi dir="ltr">{preview === null ? "—" : formatMoney(preview)}</bdi></output></td>
        <td className="actions-cell">
          <button type="button" className="icon-button save-button" aria-label={busy ? "جارٍ حفظ السجل" : "حفظ السجل"} title="حفظ (Enter)" disabled={busy || changedDay || loading || Boolean(error)} onClick={() => void save()}><Icon name="check" /></button>
          <button type="button" className="icon-button" aria-label="إلغاء الإدخال" title="إلغاء (Escape)" disabled={busy} onClick={cancel}><Icon name="close" /></button>
        </td>
      </tr>
    );
  }

  return (
    <div className="surface records-surface">
      <div className="table-toolbar">
        <div><h2>{editable ? "سجلات اليوم" : "سجلات اليوم المحدد"}</h2><p>{formatDate(date, true)} <span className="separator">/</span> {loading ? "جارٍ التحميل…" : error ? "غير متاح" : `عدد السجلات: ${records.length}`}</p></div>
        <div className="table-toolbar-right">
          <span className="status-label"><span className={`status-dot${entry ? " drafting" : ""}`} />{busy ? deleteTarget ? "جارٍ الحذف…" : "جارٍ الحفظ…" : loading ? "جارٍ التحميل…" : error ? "خطأ في الاتصال" : entry ? "وضع الإدخال" : editable ? "جاهز للإدخال" : "السجلات السابقة للعرض فقط"}</span>
          <button type="button" className="button button-light" disabled={loading || busy || Boolean(error) || records.length === 0} aria-label={`طباعة سجلات ${formatDate(date, true)}`} title="معاينة طباعة سجلات هذا اليوم" onClick={() => window.open(`/print?date=${encodeURIComponent(date)}`, "_blank", "noopener,noreferrer")}><Icon name="print" /> طباعة</button>
          <button type="button" className="icon-button" onClick={onRetry} disabled={loading || busy} aria-label="تحديث السجلات" title="تحديث السجلات"><Icon name="refresh" /></button>
        </div>
      </div>
      {error && <div className="alert alert-error" role="alert">{error} <button type="button" className="text-button" onClick={onRetry}>إعادة المحاولة</button></div>}
      {saveError && <div className="alert alert-error" role="alert">{saveError}</div>}
      {changedDay && <div className="alert alert-warning" role="alert">أصبح تاريخ العمل {formatDate(date, true)}. احتفظنا بالقيم التي أدخلتها. {entry?.original ? "السجلات السابقة للعرض فقط؛ ألغِ هذا التعديل للمتابعة." : <button type="button" className="text-button" disabled={busy} onClick={() => { setEntry((current) => current ? { ...current, recordDate: date, requestId: crypto.randomUUID(), submitted: false } : null); setSaveError(null); }}>استخدام تاريخ اليوم</button>}</div>}
      {entry && <div className="entry-help"><Icon name="edit" /><span>{entry.original ? `تعديل السجل رقم ${entry.original.id}` : "صف جديد"} — أدخل البيانات في الجدول ثم اضغط Enter أو علامة الصح للحفظ. اضغط Escape للإلغاء.</span></div>}
      {deleteTarget && <div className="delete-confirmation" role="alert"><span>هل تريد حذف السجل <strong><bdi dir="ltr">#{deleteTarget.id}</bdi></strong> الخاص بالتاجر <bdi>{deleteTarget.merchantName}</bdi>؟ لا يمكن التراجع عن الحذف.</span><div><button type="button" className="button button-danger" disabled={busy} onClick={() => void remove()}>{busy ? "جارٍ الحذف…" : "حذف السجل"}</button><button type="button" className="button button-light" disabled={busy} onClick={() => { setDeleteTarget(null); setSaveError(null); }}>الاحتفاظ بالسجل</button></div></div>}
      <div className="table-scroll" role="region" aria-label={editable ? "جدول سجلات اليوم" : "جدول سجلات اليوم المحدد"} tabIndex={0} aria-busy={loading}>
        <table className="records-table">
          <caption className="sr-only">سجلات الشركة بتاريخ {formatDate(date)} مع جميع الرسوم والصافي المحسوب.</caption>
          <thead><tr>
            <th scope="col" className="sticky-id">تسلسي</th>
            <th scope="col">نوع البيان</th>
            {TEXT_FIELDS.map((field) => <th scope="col" key={field.key}>{field.label}</th>)}
            {MONEY_FIELDS.map((field) => <th scope="col" key={field.key} className="money-cell">{field.label}</th>)}
            <th scope="col" className="money-cell net-cell">صافي <span className="calculated-label">محسوب تلقائياً</span></th>
            {editable && <th scope="col" className="actions-cell">إجراءات</th>}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={columnCount} className="empty-cell"><span className="loading-dot" /> جارٍ تحميل السجلات…</td></tr>}
            {!loading && !error && records.length === 0 && <tr><td colSpan={columnCount} className="empty-cell"><div className="empty-state"><span className="empty-icon"><Icon name="table" width="25" height="25" /></span><strong>{editable ? "لا توجد سجلات لليوم بعد." : "لا توجد سجلات لهذا التاريخ."}</strong><span>{editable ? "اضغط على صف الإضافة (+) أدناه لإدخال أول سجل." : "اختر يوماً آخر من التقويم لعرض سجلاته."}</span></div></td></tr>}
            {!loading && !error && records.map((record) => entry?.original?.id === record.id ? <Fragment key={record.id}>{entryRow()}</Fragment> : (
              <tr key={record.id}>
                <td className="sticky-id record-id"><bdi dir="ltr">#{record.id}</bdi></td>
                <td><span className={`type-badge type-${record.type}`}>{recordTypeLabel(record.type)}</span></td>
                {TEXT_FIELDS.map((field) => <td key={field.key} className={field.key === "merchantName" ? "merchant-cell" : "text-cell"}><bdi dir="auto">{record[field.key]}</bdi></td>)}
                {MONEY_FIELDS.map((field) => <td key={field.key} className={`money-cell${record[field.key] === 0 ? " zero-value" : ""}`}><bdi dir="ltr">{formatMoney(record[field.key])}</bdi></td>)}
                <td className={`money-cell net-cell${calculateNet(record) < 0 ? " negative" : ""}`}><bdi dir="ltr">{formatMoney(calculateNet(record))}</bdi></td>
                {editable && <td className="actions-cell"><button type="button" className="icon-button" aria-label={`تعديل السجل رقم ${record.id}`} title="تعديل الصف" disabled={Boolean(entry) || busy || Boolean(deleteTarget)} onClick={() => start(record)}><Icon name="edit" /></button><button type="button" className="icon-button delete-button" aria-label={`حذف السجل رقم ${record.id}`} title="حذف الصف" disabled={Boolean(entry) || busy || Boolean(deleteTarget)} onClick={() => { setSaveError(null); setDeleteTarget(record); }}><Icon name="trash" /></button></td>}
              </tr>
            ))}
            {entry && !entry.original && entryRow()}
            {entry?.original && (loading || error || !records.some((record) => record.id === entry.original?.id)) && entryRow()}
            {editable && !entry && <tr className="add-record-row"><td colSpan={columnCount}><button ref={addButton} type="button" className="add-record-button" disabled={loading || Boolean(error) || busy || Boolean(deleteTarget)} onClick={() => start()}><span className="add-circle"><Icon name="plus" width="20" height="20" /></span><span>إضافة سجل <span className="add-hint">أدخل البيانات مباشرة في الجدول</span></span></button></td></tr>}
          </tbody>
          {!loading && !error && records.length > 0 && <tfoot><tr><th scope="row" colSpan={5}>مجموع اليوم <span className="totals-count">عدد السجلات: {records.length}</span></th>{MONEY_FIELDS.map((field) => <td key={field.key} className="money-cell"><bdi dir="ltr">{formatMoney(totals[field.key])}</bdi></td>)}<td className={`money-cell net-cell${totals.net < 0n ? " negative" : ""}`}><bdi dir="ltr">{formatMoney(totals.net)}</bdi></td>{editable && <td />}</tr></tfoot>}
        </table>
      </div>
      <div className="table-footnote"><span>الصافي = المقبوض − مجموع الرسوم السبعة</span><span>المبالغ بمنزلتين عشريتين <span className="separator">·</span> مرّر الجدول أفقياً لعرض جميع الأعمدة</span></div>
    </div>
  );
}
