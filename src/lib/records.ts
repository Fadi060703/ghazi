import { MONEY_FIELDS, parseMoney, moneyToInput } from "./money.ts";
import type { MoneyAmounts } from "./money.ts";

export const TEXT_FIELDS = [
  { key: "productType", label: "نوع البضاعة", maxLength: 120 },
  { key: "merchantName", label: "اسم التاجر", maxLength: 120 },
  { key: "carNumber", label: "رقم السيارة", maxLength: 50 },
] as const;

export const RECORD_TYPES = [
  { value: "export", label: "تصدير" },
  { value: "import", label: "استيراد" },
] as const;

export type RecordType = (typeof RECORD_TYPES)[number]["value"];

export function recordTypeLabel(type: RecordType): string {
  return RECORD_TYPES.find((choice) => choice.value === type)?.label ?? "—";
}

export type TextField = (typeof TEXT_FIELDS)[number]["key"];
export type RecordValues = Record<TextField, string> & MoneyAmounts & { type: RecordType };
export type RecordDraft = Record<TextField | keyof MoneyAmounts | "type", string>;
export type FieldErrors = Partial<Record<keyof RecordDraft, string>>;

export type CompanyRecord = RecordValues & {
  id: number;
  recordDate: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type RecordsResponse = {
  records: CompanyRecord[];
  date: string;
  today: string;
  timeZone: string;
};

export type CalendarResponse = {
  counts: Record<string, number>;
  month: string;
};

export class RecordValidationError extends Error {
  fields: FieldErrors;

  constructor(fields: FieldErrors) {
    super("راجع الحقول المحددة قبل الحفظ.");
    this.name = "RecordValidationError";
    this.fields = fields;
  }
}

export class RecordError extends Error {
  status: number;
  code: string;
  today?: string;

  constructor(status: number, code: string, message: string, today?: string) {
    super(message);
    this.name = "RecordError";
    this.status = status;
    this.code = code;
    this.today = today;
  }
}

export function emptyDraft(): RecordDraft {
  return Object.fromEntries(
    [["type", ""], ...[...TEXT_FIELDS, ...MONEY_FIELDS].map((field) => [field.key, ""])],
  ) as RecordDraft;
}

export function recordToDraft(record: CompanyRecord): RecordDraft {
  return {
    type: record.type,
    productType: record.productType,
    merchantName: record.merchantName,
    carNumber: record.carNumber,
    ...Object.fromEntries(MONEY_FIELDS.map((field) => [field.key, moneyToInput(record[field.key])])),
  } as RecordDraft;
}

export function validateRecord(value: unknown): RecordValues {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new RecordError(400, "INVALID_BODY", "بيانات السجل غير صالحة.");
  }
  const input = value as Record<string, unknown>;
  const fields: FieldErrors = {};
  if (input.type !== "export" && input.type !== "import") {
    fields.type = "اختر نوع البيان: تصدير أو استيراد.";
  }
  const text = {} as Record<TextField, string>;
  const money = {} as MoneyAmounts;
  for (const field of TEXT_FIELDS) {
    const raw = input[field.key];
    const normalized = typeof raw === "string" ? raw.trim() : "";
    if (!normalized || normalized.length > field.maxLength) {
      fields[field.key] = `أدخل ${field.label} (من 1 إلى ${field.maxLength} حرفاً).`;
    }
    text[field.key] = normalized;
  }
  for (const field of MONEY_FIELDS) {
    try {
      const raw = input[field.key];
      if (typeof raw !== "string") throw new Error("أدخل مبلغاً رقمياً صالحاً.");
      money[field.key] = parseMoney(raw, field.key !== "receivedMoney");
    } catch (error) {
      fields[field.key] = error instanceof Error ? error.message : "المبلغ غير صالح.";
    }
  }
  if (Object.keys(fields).length) throw new RecordValidationError(fields);
  return { type: input.type as RecordType, ...text, ...money };
}
