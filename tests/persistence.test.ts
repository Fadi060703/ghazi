import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { MONEY_FIELDS } from "../src/lib/money.ts";
import { emptyDraft, RecordError, validateRecord } from "../src/lib/records.ts";
import { RecordStore } from "../src/lib/server/sqlite-store.ts";

const today = "2026-10-01";

function values(receivedMoney = "1000.00") {
  return validateRecord({ ...emptyDraft(), type: "import", productType: "Cement", merchantName: "Company", carNumber: "00123", receivedMoney, privateFees1: "10.00", privateFees2: "20.00", privateFees3: "30.00" });
}

function hasCode(code: string) {
  return (error: unknown) => error instanceof RecordError && error.code === code;
}

test("a fresh store is empty, and records survive closing and reopening it", () => {
  const directory = mkdtempSync(join(tmpdir(), "darwish-records-"));
  const path = join(directory, "records.sqlite");
  let store: RecordStore | null = null;
  try {
    store = new RecordStore(path);
    assert.deepEqual(store.list(today), []);
    const record = store.create(values(), today, randomUUID(), today);
    assert.equal(record.id, 1);
    assert.equal(record.carNumber, "00123");
    store.close();
    store = null;
    store = new RecordStore(path);
    assert.deepEqual(store.list(today), [record]);
    assert.deepEqual(store.list("2026-10-02"), []);
    assert.deepEqual(store.counts("2026-10"), { "2026-10-01": 1 });
  } finally {
    store?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("retrying a save creates only one row and refuses token reuse with different values", () => {
  const store = new RecordStore(":memory:");
  try {
    const requestId = randomUUID();
    const first = store.create(values(), today, requestId, today);
    const retry = store.create(values(), today, requestId, "2026-10-02");
    assert.equal(retry.id, first.id);
    assert.equal(store.list(today).length, 1);
    assert.throws(() => store.create(values("2000.00"), today, requestId, today), hasCode("REQUEST_REUSED"));
    assert.throws(() => store.create(values(), today, randomUUID(), "2026-10-02"), hasCode("DAY_CHANGED"));
  } finally {
    store.close();
  }
});

test("updates detect concurrent edits, archived records are read-only, and IDs are not reused", () => {
  const store = new RecordStore(":memory:");
  try {
    const original = store.create(values(), today, randomUUID(), today);
    const updated = store.update(original.id, { ...values("2000.00"), type: "export" }, original.version, today);
    assert.equal(updated.receivedMoney, 200000);
    assert.equal(updated.type, "export");
    assert.equal(updated.version, 2);
    assert.throws(() => store.update(original.id, values(), original.version, today), hasCode("RECORD_CHANGED"));
    assert.throws(() => store.delete(updated.id, updated.version, "2026-10-02"), hasCode("READ_ONLY_DATE"));
    assert.throws(() => store.update(updated.id, values(), updated.version, "2026-10-02"), hasCode("READ_ONLY_DATE"));
    store.delete(updated.id, updated.version, today);
    assert.deepEqual(store.list(today), []);
    assert.deepEqual(store.counts("2026-10"), {});
    assert.throws(() => store.update(updated.id, values(), updated.version, today), hasCode("NOT_FOUND"));
    const replacement = store.create(values(), today, randomUUID(), today);
    assert.ok(replacement.id > original.id);
  } finally {
    store.close();
  }
});

test("yearly statistics count both types across the full record-date year", () => {
  const store = new RecordStore(":memory:");
  try {
    assert.deepEqual(store.yearlyCounts(2026), { import: 0, export: 0 });
    const entries = [
      ["2025-12-31", "import"],
      ["2026-01-01", "import"],
      ["2026-06-15", "import"],
      ["2026-12-31", "export"],
      ["2027-01-01", "export"],
      ["2028-02-29", "export"],
      ["2100-12-31", "import"],
    ] as const;
    for (const [date, type] of entries) {
      store.create({ ...values(), type }, date, randomUUID(), date);
    }
    assert.deepEqual(store.yearlyCounts(2026), { import: 2, export: 1 });
    assert.deepEqual(store.yearlyCounts(2027), { import: 0, export: 1 });
    assert.deepEqual(store.yearlyCounts(2028), { import: 0, export: 1 });
    assert.deepEqual(store.yearlyCounts(2029), { import: 0, export: 0 });
    assert.deepEqual(store.yearlyCounts(2100), { import: 1, export: 0 });
  } finally {
    store.close();
  }
});

test("yearly statistics reflect save retries, type edits, and deletion", () => {
  const store = new RecordStore(":memory:");
  try {
    const requestId = randomUUID();
    const original = store.create(values(), today, requestId, today);
    store.create(values(), today, requestId, today);
    assert.deepEqual(store.yearlyCounts(2026), { import: 1, export: 0 });
    const updated = store.update(original.id, { ...values(), type: "export" }, original.version, today);
    assert.deepEqual(store.yearlyCounts(2026), { import: 0, export: 1 });
    store.delete(updated.id, updated.version, today);
    assert.deepEqual(store.yearlyCounts(2026), { import: 0, export: 0 });
  } finally {
    store.close();
  }
});

test("legacy records migrate to import without changing their values or retry identity", () => {
  const directory = mkdtempSync(join(tmpdir(), "darwish-migration-"));
  const path = join(directory, "records.sqlite");
  const requestId = randomUUID();
  const createdAt = "2026-10-01T09:00:00.000Z";
  const updatedAt = "2026-10-01T10:00:00.000Z";
  const savedValues = values();
  const legacyColumns = ["productType", "merchantName", "carNumber", ...MONEY_FIELDS.map((field) => field.key)] as const;
  let legacy: DatabaseSync | null = null;
  let store: RecordStore | null = null;
  try {
    legacy = new DatabaseSync(path);
    legacy.exec(`
      CREATE TABLE records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recordDate TEXT NOT NULL,
        productType TEXT NOT NULL,
        merchantName TEXT NOT NULL,
        carNumber TEXT NOT NULL,
        ${MONEY_FIELDS.map((field) => `${field.key} INTEGER NOT NULL`).join(",\n")},
        requestId TEXT NOT NULL UNIQUE,
        requestFingerprint TEXT NOT NULL,
        version INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      ) STRICT;
    `);
    const columns = ["recordDate", ...legacyColumns, "requestId", "requestFingerprint", "version", "createdAt", "updatedAt"];
    const originalFingerprint = JSON.stringify([today, ...legacyColumns.map((column) => savedValues[column])]);
    legacy.prepare(`INSERT INTO records (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`).run(
      today, ...legacyColumns.map((column) => savedValues[column]), requestId, originalFingerprint, 7, createdAt, updatedAt,
    );
    legacy.close();
    legacy = null;
    store = new RecordStore(path);
    const expected = { id: 1, recordDate: today, ...savedValues, version: 7, createdAt, updatedAt };
    assert.deepEqual(store.list(today), [expected]);
    assert.deepEqual(store.create(savedValues, today, requestId, today), expected);
    store.close();
    store = null;
    store = new RecordStore(path);
    assert.deepEqual(store.list(today), [expected]);
    assert.equal(store.create(savedValues, today, requestId, today).id, 1);
    const exported = store.create({ ...savedValues, type: "export" }, today, randomUUID(), today);
    assert.equal(exported.type, "export");
    assert.equal(store.list(today).length, 2);
    assert.throws(() => store.create({ ...savedValues, type: "export" }, today, requestId, today), hasCode("REQUEST_REUSED"));
  } finally {
    legacy?.close();
    store?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
