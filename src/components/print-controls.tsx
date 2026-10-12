"use client";

import Link from "next/link";

export function PrintControls({ disabled = false, canRetry = false }: { disabled?: boolean; canRetry?: boolean }) {
  return (
    <div className="print-preview-controls">
      <button type="button" className="print-preview-button" disabled={disabled} onClick={() => window.print()}>طباعة</button>
      {canRetry && <button type="button" className="print-preview-button" onClick={() => window.location.reload()}>إعادة المحاولة</button>}
      <Link href="/" className="print-preview-link">العودة إلى السجلات</Link>
      <p>تُطبع السجلات المحفوظة فقط. اختر ورق A4 بالاتجاه الأفقي وأوقف رؤوس الصفحات وتذييلاتها في إعدادات الطباعة.</p>
    </div>
  );
}
