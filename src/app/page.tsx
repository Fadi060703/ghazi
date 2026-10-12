import { RecordsApp } from "@/components/records-app";
import { businessContext } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Home() {
  const { today, timeZone } = businessContext();
  return <RecordsApp initialToday={today} timeZone={timeZone} />;
}
