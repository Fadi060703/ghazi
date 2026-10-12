import type { Metadata } from "next";
import { PrintControls } from "@/components/print-controls";
import { formatDate, isBusinessDate } from "@/lib/business-date";
import { calculateNet, formatMoney, MONEY_FIELDS } from "@/lib/money";
import { recordTypeLabel, TEXT_FIELDS } from "@/lib/records";
import type { CompanyRecord } from "@/lib/records";
import { getRecordStore } from "@/lib/server/database";
import "./print.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "طباعة السجلات" };

function PrintNotice({ message, canRetry = false }: { message: string; canRetry?: boolean }) {
  return (
    <main className="print-preview" aria-label="معاينة الطباعة">
      <PrintControls disabled canRetry={canRetry} />
      <p className="print-preview-message" role="alert">{message}</p>
    </main>
  );
}

export default async function PrintPage({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  const { date } = await searchParams;
  if (!isBusinessDate(date)) {
    return <PrintNotice message="اختر تاريخاً صالحاً بين عامي 1900 و2100 من سجلات الشركة." />;
  }

  let records: CompanyRecord[];
  try {
    records = getRecordStore().list(date);
  } catch (failure) {
    console.error("Print records failed:", failure);
    return <PrintNotice message="تعذّر تحميل السجلات للطباعة. تحقق من الخادم وحاول مجدداً." canRetry />;
  }

  return (
    <main className="print-preview" aria-label="معاينة طباعة سجلات اليوم المحدد">
      <PrintControls disabled={records.length === 0} canRetry={records.length === 0} />
      <p className="print-date"><time dateTime={date}>{formatDate(date)}</time></p>
      {records.length === 0 ? (
        <p className="print-preview-message" role="status">لا توجد سجلات محفوظة لهذا التاريخ.</p>
      ) : (
        <table className="print-records-table">
          <caption className="sr-only">سجلات الشركة بتاريخ {formatDate(date)} مع جميع الرسوم والصافي المحسوب.</caption>
          <thead>
            <tr>
              <th scope="col">تسلسي</th>
              <th scope="col">نوع البيان</th>
              {TEXT_FIELDS.map((field) => <th key={field.key} scope="col">{field.label}</th>)}
              {MONEY_FIELDS.map((field) => <th key={field.key} scope="col">{field.label}</th>)}
              <th scope="col">صافي</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td><bdi dir="ltr">#{record.id}</bdi></td>
                <td>{recordTypeLabel(record.type)}</td>
                {TEXT_FIELDS.map((field) => <td key={field.key}><bdi dir="auto">{record[field.key]}</bdi></td>)}
                {MONEY_FIELDS.map((field) => <td key={field.key}><bdi dir="ltr">{formatMoney(record[field.key])}</bdi></td>)}
                <td><bdi dir="ltr">{formatMoney(calculateNet(record))}</bdi></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
