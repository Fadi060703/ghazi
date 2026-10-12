import assert from "node:assert/strict";
import test from "node:test";
import { calendarDays, changeDateParts, getBusinessDate, isBusinessDate, isBusinessMonth, shiftDay, shiftMonth } from "../src/lib/business-date.ts";
import { isStatisticsYear } from "../src/lib/statistics.ts";

test("today follows the configured business time zone rather than UTC", () => {
  const instant = new Date("2026-10-01T21:30:00Z");
  assert.equal(getBusinessDate("Asia/Damascus", instant), "2026-10-02");
  assert.equal(getBusinessDate("UTC", instant), "2026-10-01");
});

test("date validation handles leap years and rejects impossible dates", () => {
  assert.equal(isBusinessDate("2024-02-29"), true);
  for (const date of ["2025-02-29", "2026-04-31", "2026-13-01", "2026-00-01", "2026-01-00", "2026-1-1", "1899-12-31", "2101-01-01", null]) {
    assert.equal(isBusinessDate(date), false);
  }
  assert.equal(isBusinessMonth("2026-10"), true);
  assert.equal(isBusinessMonth("2026-10-01"), false);
});

test("statistics accepts only whole years from 2026 through the supported date limit", () => {
  for (const year of ["2026", "2027", "2100"]) {
    assert.equal(isStatisticsYear(year), true);
  }
  for (const year of ["2025", "2101", "2026.0", "2026-01", " 2026", "2026 ", "２０２６", "2026extra", "", 2026, null, undefined]) {
    assert.equal(isStatisticsYear(year), false);
  }
});

test("changing months clamps the day and crosses year boundaries", () => {
  assert.equal(shiftMonth("2026-01-31", 1), "2026-02-28");
  assert.equal(shiftMonth("2024-01-31", 1), "2024-02-29");
  assert.equal(shiftMonth("2026-12-31", 1), "2027-01-31");
  assert.equal(shiftMonth("2026-01-31", -1), "2025-12-31");
  assert.equal(changeDateParts(2025, 2, 29), "2025-02-28");
  assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDay("1900-01-01", -1), "1900-01-01");
});

test("calendar cells include every valid day once with Sunday-first alignment", () => {
  const cells = calendarDays("2026-10-15");
  assert.equal(cells.length % 7, 0);
  assert.deepEqual(cells.slice(0, 4), [null, null, null, null]);
  assert.equal(cells[4], "2026-10-01");
  const dates = cells.filter(Boolean);
  assert.equal(dates.length, 31);
  assert.equal(new Set(dates).size, 31);
  assert.equal(dates.at(-1), "2026-10-31");
});
