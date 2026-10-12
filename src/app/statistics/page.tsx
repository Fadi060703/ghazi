import type { Metadata } from "next";
import { StatisticsApp } from "@/components/statistics-app";
import { MAX_YEAR } from "@/lib/business-date";
import { MIN_STATISTICS_YEAR } from "@/lib/statistics";
import { businessContext } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "الإحصاءات | شركة غازي درويش" };

export default function StatisticsPage() {
  const { today } = businessContext();
  const initialYear = Math.min(MAX_YEAR, Math.max(MIN_STATISTICS_YEAR, Number(today.slice(0, 4))));
  return <StatisticsApp initialYear={initialYear} />;
}
