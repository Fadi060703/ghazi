"use client";

import Image from "next/image";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="fallback-page">
      <section className="surface fallback-card" aria-labelledby="error-page-title" role="alert">
        <Image src="/logo.jpg" alt="شعار شركة غازي درويش" width={96} height={96} className="fallback-logo" />
        <p className="eyebrow">شركة غازي درويش</p>
        <h1 id="error-page-title">تعذّر عرض الصفحة</h1>
        <p>حدث خطأ أثناء عرض الصفحة. حاول مجدداً أو عد إلى سجلات الشركة.</p>
        <div className="fallback-actions">
          <button type="button" className="button button-primary" onClick={reset}>إعادة المحاولة</button>
          <Link href="/" className="button button-light">العودة إلى السجلات</Link>
        </div>
      </section>
    </main>
  );
}
