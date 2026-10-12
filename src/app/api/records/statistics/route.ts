import { MAX_YEAR } from "@/lib/business-date";
import { RecordError } from "@/lib/records";
import { isStatisticsYear, MIN_STATISTICS_YEAR } from "@/lib/statistics";
import { getRecordStore } from "@/lib/server/database";
import { errorResponse, jsonResponse } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  try {
    const year = new URL(request.url).searchParams.get("year");
    if (!isStatisticsYear(year)) {
      throw new RecordError(400, "INVALID_YEAR", `اختر سنة صالحة بين ${MIN_STATISTICS_YEAR} و${MAX_YEAR}.`);
    }
    return jsonResponse({ counts: getRecordStore().yearlyCounts(Number(year)), year: Number(year) });
  } catch (error) {
    return errorResponse(error);
  }
}
