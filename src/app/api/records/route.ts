import { isBusinessDate } from "@/lib/business-date";
import { RecordError, validateRecord } from "@/lib/records";
import { getRecordStore } from "@/lib/server/database";
import { businessContext, errorResponse, jsonResponse, readMutation } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  try {
    const context = businessContext();
    const date = new URL(request.url).searchParams.get("date") ?? context.today;
    if (!isBusinessDate(date)) throw new RecordError(400, "INVALID_DATE", "اختر تاريخاً صالحاً بين عامي 1900 و2100.");
    return jsonResponse({ records: getRecordStore().list(date), date, ...context });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = await readMutation(request);
    const values = validateRecord(input);
    if (!isBusinessDate(input.recordDate)) throw new RecordError(400, "INVALID_DATE", "اختر تاريخ عمل صالحاً.");
    if (typeof input.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) {
      throw new RecordError(400, "INVALID_REQUEST_ID", "ابدأ صفاً جديداً قبل الحفظ.");
    }
    const context = businessContext();
    const record = getRecordStore().create(values, input.recordDate, input.requestId, context.today);
    return jsonResponse({ record, ...context }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
