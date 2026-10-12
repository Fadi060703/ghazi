export const MONEY_FIELDS = [
  { key: "receivedMoney", label: "المقبوض" },
  { key: "externalFees", label: "رسوم خارجية" },
  { key: "originLicenseFees", label: "رسوم شهادة منشأ" },
  { key: "customFees", label: "رسوم جمارك" },
  { key: "driverFees", label: "رسوم سائق" },
  { key: "privateFees1", label: "خاصة 1" },
  { key: "privateFees2", label: "خاصة 2" },
  { key: "privateFees3", label: "خاصة 3" },
] as const;

export type MoneyField = (typeof MONEY_FIELDS)[number]["key"];
export type MoneyAmounts = Record<MoneyField, number>;
export const MAX_AMOUNT = 999_999_999_999;

export function parseMoney(value: string, allowEmpty = false): number {
  const normalized = value.trim()
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".");
  if (allowEmpty && normalized === "") return 0;
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error("أدخل مبلغاً غير سالب وبمنزلتين عشريتين كحد أقصى.");
  }
  const [whole, fraction = ""] = normalized.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount > MAX_AMOUNT) {
    throw new Error("الحد الأقصى للمبلغ هو 9,999,999,999.99.");
  }
  return amount;
}

export function calculateNet(amounts: MoneyAmounts): number {
  return amounts.receivedMoney - MONEY_FIELDS.slice(1).reduce(
    (total, field) => total + amounts[field.key],
    0,
  );
}

export function moneyToInput(amount: number): string {
  return `${Math.trunc(amount / 100)}.${String(amount % 100).padStart(2, "0")}`;
}

export function formatMoney(amount: number | bigint): string {
  const integer = BigInt(amount);
  const absolute = integer < 0n ? -integer : integer;
  const whole = new Intl.NumberFormat("en-US").format(absolute / 100n);
  const fraction = String(absolute % 100n).padStart(2, "0");
  return `${integer < 0n ? "−" : ""}${whole}.${fraction}`;
}

export function totalAmounts(records: MoneyAmounts[]) {
  const totals = Object.fromEntries(
    MONEY_FIELDS.map((field) => [field.key, 0n]),
  ) as Record<MoneyField, bigint>;
  let net = 0n;
  for (const record of records) {
    for (const field of MONEY_FIELDS) totals[field.key] += BigInt(record[field.key]);
    net += BigInt(calculateNet(record));
  }
  return { ...totals, net };
}
