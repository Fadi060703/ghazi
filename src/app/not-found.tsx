import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="fallback-page">
      <section className="surface fallback-card" aria-labelledby="missing-page-title">
        <Image src="/logo.jpg" alt="شعار شركة غازي درويش" width={96} height={96} className="fallback-logo" />
        <p className="eyebrow"><bdi dir="ltr">404</bdi></p>
        <h1 id="missing-page-title">الصفحة غير موجودة</h1>
        <p>تعذّر العثور على الصفحة المطلوبة. يمكنك العودة إلى سجلات الشركة.</p>
        <Link href="/" className="button button-primary">العودة إلى السجلات</Link>
      </section>
    </main>
  );
}
