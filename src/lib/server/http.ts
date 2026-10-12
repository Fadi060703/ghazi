import "server-only";
import { NextResponse } from "next/server";
import { getBusinessDate } from "../business-date.ts";
import { RecordError, RecordValidationError } from "../records.ts";

export function businessContext() {
  const timeZone = process.env.BUSINESS_TIME_ZONE || "Asia/Damascus";
  return { timeZone, today: getBusinessDate(timeZone) };
}

export function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function errorResponse(error: unknown) {
  if (error instanceof RecordValidationError) {
    return jsonResponse({ error: error.message, code: "VALIDATION", fields: error.fields }, 400);
  }
  if (error instanceof RecordError) {
    return jsonResponse({ error: error.message, code: error.code, today: error.today }, error.status);
  }
  console.error("Records request failed:", error);
  return jsonResponse({ error: "تعذّر الوصول إلى قاعدة السجلات. تحقق من الخادم وحاول مجدداً.", code: "SERVER_ERROR" }, 500);
}

export async function readMutation(request: Request): Promise<Record<string, unknown>> {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  const expectedOrigin = process.env.APP_ORIGIN ||
    `${requestUrl.protocol}//${request.headers.get("host") || requestUrl.host}`;
  if ((origin && origin !== expectedOrigin) || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new RecordError(403, "INVALID_ORIGIN", "يجب إرسال هذا الطلب من تطبيق الشركة.");
  }
  const text = await request.text();
  if (text.length > 16_384) throw new RecordError(413, "BODY_TOO_LARGE", "حجم بيانات السجل أكبر من المسموح.");
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new RecordError(400, "INVALID_BODY", "بيانات السجل المرسلة غير صالحة.");
  }
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new RecordError(400, "INVALID_BODY", "بيانات السجل غير صالحة.");
  }
  return input as Record<string, unknown>;
}

export function requireVersion(input: Record<string, unknown>): number {
  if (typeof input.version !== "number" || !Number.isSafeInteger(input.version) || input.version < 1) {
    throw new RecordError(400, "INVALID_VERSION", "حدّث السجل قبل تعديله.");
  }
  return input.version;
}

export function requireId(value: string): number {
  const id = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id < 1) {
    throw new RecordError(400, "INVALID_ID", "رقم السجل غير صالح.");
  }
  return id;
}
