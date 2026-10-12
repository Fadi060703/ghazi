import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { MONEY_FIELDS } from "../money.ts";
import { RecordError } from "../records.ts";
import type { CompanyRecord, RecordValues } from "../records.ts";
import type { StatisticsCounts } from "../statistics.ts";

const valueColumns = ["type", "productType", "merchantName", "carNumber", ...MONEY_FIELDS.map((field) => field.key)];
const recordColumns = ["id", "recordDate", ...valueColumns, "version", "createdAt", "updatedAt"].join(", ");

export class RecordStore {
  private database: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.database = new DatabaseSync(path);
    try {
      this.database.exec("PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;");
      this.transaction(() => {
        this.database.exec(`
      CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recordDate TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('export', 'import')),
        productType TEXT NOT NULL,
        merchantName TEXT NOT NULL,
        carNumber TEXT NOT NULL,
        ${MONEY_FIELDS.map((field) => `${field.key} INTEGER NOT NULL CHECK (${field.key} BETWEEN 0 AND 999999999999)`).join(",\n")},
        requestId TEXT NOT NULL UNIQUE,
        requestFingerprint TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS records_record_date ON records(recordDate, id);
        `);
        const columns = this.database.prepare("PRAGMA table_info(records)").all();
        if (!columns.some((column) => column.name === "type")) {
          this.database.exec("ALTER TABLE records ADD COLUMN type TEXT NOT NULL DEFAULT 'import' CHECK (type IN ('export', 'import'))");
          const rows = this.database.prepare("SELECT id, requestFingerprint FROM records").all();
          const update = this.database.prepare("UPDATE records SET requestFingerprint = ? WHERE id = ?");
          for (const row of rows) {
            const legacyFingerprint: unknown = JSON.parse(String(row.requestFingerprint));
            if (!Array.isArray(legacyFingerprint) || legacyFingerprint.length !== valueColumns.length) {
              throw new Error("Invalid legacy save fingerprint; migration was rolled back.");
            }
            const fingerprint = JSON.stringify([legacyFingerprint[0], "import", ...legacyFingerprint.slice(1)]);
            update.run(fingerprint, row.id);
          }
        }
      });
    } catch (error) {
      this.database.close();
      throw error;
    }
  }

  close() {
    this.database.close();
  }

  private transaction<Result>(action: () => Result): Result {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const result = action();
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  private find(id: number): CompanyRecord {
    const row = this.database.prepare(`SELECT ${recordColumns} FROM records WHERE id = ?`).get(id);
    if (!row) throw new RecordError(404, "NOT_FOUND", "هذا السجل لم يعد موجوداً. حدّث الجدول.");
    return row as unknown as CompanyRecord;
  }

  list(date: string): CompanyRecord[] {
    return this.database.prepare(`SELECT ${recordColumns} FROM records WHERE recordDate = ? ORDER BY id ASC`)
      .all(date) as unknown as CompanyRecord[];
  }

  counts(month: string): Record<string, number> {
    const rows = this.database.prepare(
      "SELECT recordDate, COUNT(*) AS count FROM records WHERE recordDate >= ? AND recordDate <= ? GROUP BY recordDate",
    ).all(`${month}-01`, `${month}-31`);
    return Object.fromEntries(rows.map((row) => [String(row.recordDate), Number(row.count)]));
  }

  yearlyCounts(year: number): StatisticsCounts {
    const rows = this.database.prepare(
      "SELECT type, COUNT(*) AS count FROM records WHERE recordDate >= ? AND recordDate < ? GROUP BY type",
    ).all(`${year}-01-01`, `${year + 1}-01-01`);
    return {
      import: Number(rows.find((row) => row.type === "import")?.count ?? 0),
      export: Number(rows.find((row) => row.type === "export")?.count ?? 0),
    };
  }

  create(values: RecordValues, date: string, requestId: string, today: string): CompanyRecord {
    return this.transaction(() => {
      const fingerprint = JSON.stringify([date, ...valueColumns.map((column) => values[column as keyof RecordValues])]);
      const existing = this.database.prepare("SELECT id, requestFingerprint FROM records WHERE requestId = ?").get(requestId);
      if (existing) {
        if (existing.requestFingerprint !== fingerprint) {
          throw new RecordError(409, "REQUEST_REUSED", "استُخدم طلب الحفظ هذا لقيم أخرى. حدّث الصفحة قبل إضافة سجل جديد.");
        }
        return this.find(Number(existing.id));
      }
      if (date !== today) {
        throw new RecordError(409, "DAY_CHANGED", "تغيّر تاريخ العمل. راجع الصف واستخدم التاريخ الجديد قبل الحفظ.", today);
      }
      const timestamp = new Date().toISOString();
      const columns = ["recordDate", ...valueColumns, "requestId", "requestFingerprint", "createdAt", "updatedAt"];
      const parameters = [date, ...valueColumns.map((column) => values[column as keyof RecordValues]), requestId, fingerprint, timestamp, timestamp];
      const result = this.database.prepare(
        `INSERT INTO records (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
      ).run(...parameters);
      return this.find(Number(result.lastInsertRowid));
    });
  }

  update(id: number, values: RecordValues, version: number, today: string): CompanyRecord {
    return this.transaction(() => {
      const existing = this.find(id);
      this.checkMutable(existing, version, today);
      this.database.prepare(
        `UPDATE records SET ${valueColumns.map((column) => `${column} = ?`).join(", ")}, version = version + 1, updatedAt = ? WHERE id = ? AND version = ?`,
      ).run(...valueColumns.map((column) => values[column as keyof RecordValues]), new Date().toISOString(), id, version);
      return this.find(id);
    });
  }

  delete(id: number, version: number, today: string): void {
    this.transaction(() => {
      const existing = this.find(id);
      this.checkMutable(existing, version, today);
      this.database.prepare("DELETE FROM records WHERE id = ? AND version = ?").run(id, version);
    });
  }

  private checkMutable(record: CompanyRecord, version: number, today: string) {
    if (record.recordDate !== today) {
      throw new RecordError(409, "READ_ONLY_DATE", "السجلات السابقة للعرض فقط. حدّث الجدول لعرض سجلات اليوم.", today);
    }
    if (record.version !== version) {
      throw new RecordError(409, "RECORD_CHANGED", "عُدّل هذا السجل في نافذة أخرى. ألغِ التعديل وحدّث الجدول قبل المحاولة مجدداً.");
    }
  }
}
