import assert from "node:assert/strict";
import test from "node:test";
import { calculateNet, formatMoney, MAX_AMOUNT, MONEY_FIELDS, moneyToInput, parseMoney, totalAmounts } from "../src/lib/money.ts";
import type { MoneyAmounts } from "../src/lib/money.ts";

function amounts(values: Partial<MoneyAmounts> = {}): MoneyAmounts {
  return { ...Object.fromEntries(MONEY_FIELDS.map((field) => [field.key, 0])), ...values } as MoneyAmounts;
}

test("decimal text is converted to exact integer minor units", () => {
  assert.equal(parseMoney("0.29"), 29);
  assert.equal(parseMoney("123.4"), 12340);
  assert.equal(parseMoney(" 00123.45 "), 12345);
  assert.equal(parseMoney("", true), 0);
  assert.equal(parseMoney("9999999999.99"), MAX_AMOUNT);
  assert.equal(moneyToInput(12345), "123.45");
});

test("invalid amounts and excess precision are rejected", () => {
  for (const input of ["", "-1", "0.001", "1e3", "NaN", "1,000.00", "12.", "10000000000.00"]) {
    assert.throws(() => parseMoney(input));
  }
});

test("NET deducts all seven fees including three separate private fees", () => {
  const record = amounts({ receivedMoney: 100000, externalFees: 5000, originLicenseFees: 2000, customFees: 3000, driverFees: 10000, privateFees1: 1000, privateFees2: 1500, privateFees3: 2500 });
  assert.equal(calculateNet(record), 75000);
  assert.equal(calculateNet(amounts({ receivedMoney: 100, privateFees3: 250 })), -150);
  assert.equal(formatMoney(-150), "−1.50");
});

test("daily totals stay exact even beyond the safe integer range", () => {
  const largeDay = Array.from({ length: 10000 }, () => amounts({ receivedMoney: MAX_AMOUNT, privateFees1: 1 }));
  const totals = totalAmounts(largeDay);
  assert.equal(totals.receivedMoney, BigInt(MAX_AMOUNT) * 10000n);
  assert.equal(totals.privateFees1, 10000n);
  assert.equal(totals.net, totals.receivedMoney - 10000n);
  assert.equal(formatMoney(totals.receivedMoney), "99,999,999,999,900.00");
});

test("Arabic digits and decimal separators preserve exact monetary values", () => {
  assert.equal(parseMoney("١٢٣٫٤٥"), 12345);
  assert.equal(parseMoney("۱۲۳٫۴۵"), 12345);
  assert.equal(parseMoney("٠٫٢٩"), 29);
  assert.equal(parseMoney(" ١٢٣.٤٥ "), 12345);
  assert.throws(() => parseMoney("١٢٣٫٤٥٦"));
  assert.throws(() => parseMoney("-١٠"));
});
