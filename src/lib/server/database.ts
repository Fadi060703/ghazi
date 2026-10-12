import "server-only";
import { resolve } from "node:path";
import { RecordStore } from "./sqlite-store.ts";

const DATABASE_SCHEMA_VERSION = 2;

const databaseGlobal = globalThis as typeof globalThis & {
  companyRecordStore?: { path: string; schemaVersion: number; store: RecordStore };
};

export function getRecordStore(): RecordStore {
  const path = resolve(process.env.RECORDS_DATABASE_PATH || "./data/records.sqlite");
  if (!databaseGlobal.companyRecordStore || databaseGlobal.companyRecordStore.path !== path || databaseGlobal.companyRecordStore.schemaVersion !== DATABASE_SCHEMA_VERSION) {
    databaseGlobal.companyRecordStore?.store.close();
    delete databaseGlobal.companyRecordStore;
    databaseGlobal.companyRecordStore = { path, schemaVersion: DATABASE_SCHEMA_VERSION, store: new RecordStore(path) };
  }
  return databaseGlobal.companyRecordStore.store;
}
