import { MAX_YEAR } from "./business-date.ts";
import type { RecordType } from "./records.ts";

export const MIN_STATISTICS_YEAR = 2026;

export type StatisticsCounts = Record<RecordType, number>;
export type StatisticsResponse = { year: number; counts: StatisticsCounts };

export function isStatisticsYear(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}$/.test(value) &&
    Number(value) >= MIN_STATISTICS_YEAR && Number(value) <= MAX_YEAR;
}
