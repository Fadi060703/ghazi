import { isBusinessMonth } from "@/lib/business-date";
import { RecordError } from "@/lib/records";
import { getRecordStore } from "@/lib/server/database";
import { errorResponse, jsonResponse } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  try {
    const month = new URL(request.url).searchParams.get("month");
    if (!isBusinessMonth(month)) throw new RecordError(400, "INVALID_MONTH", "اختر شهراً وسنة صالحين.");
    return jsonResponse({ counts: getRecordStore().counts(month), month });
  } catch (error) {
    return errorResponse(error);
  }
}
