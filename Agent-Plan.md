# Company Records App — Agent Plan

## Goal

Build a small application for saving and reviewing the company's daily records using the existing Next.js, TypeScript, and Tailwind CSS starter.

The app has exactly two main tabs:

1. **Today's Records** — enter and manage today's records in a table that is empty until records are saved.
2. **Calendar** — choose a day, month, and year and view the records saved for the selected date.

Implementation has been requested. The user will run installation, migration, development, build, and validation commands; do not run these commands on their behalf.

## Implementation Status

The two-tab app, persistent SQLite storage, server validation, calculated NET, calendar browsing, daily totals, and inline add/edit controls have been written. Entry starts from the **+** row beneath the saved records, following the user's updated requirement. The user-run automated checks and setup documentation are included. Acceptance items below remain unchecked until runtime validation is performed.

The approved update adds the supplied company logo, its dark teal colors, a fully Arabic RTL interface, and the required import/export record type. The three private-fee labels are exactly `خاصة 1`, `خاصة 2`, and `خاصة 3`; all other field labels use the approved names below. Existing records migrate to `import` without changing their financial data. This migration and runtime checks have not been executed by the agent.

The initial implementation uses two decimal places, `Asia/Damascus`, and received money minus all seven fees. It runs locally on one persistent Node.js server using Node's built-in SQLite module and requires Node.js 22.13 or newer. Today's records can be edited/deleted; historical records are read-only. Currency labeling, shared deployment, and login remain future decisions.

Daily printing is implemented for today and calendar-selected dates. The separate `/print?date=YYYY-MM-DD` preview reads fresh saved records and preserves drafts in the original tab. It prints only the selected date and one plain black-and-white table on A4 landscape paper, using one row per record with all 14 columns, smaller 7pt text, and compact padding. Branding, titles, counts, and totals are omitted. Browser printing also supports Save as PDF. No packages or schema changes were added. Runtime and print-layout validation remain user-run.

Yearly statistics is implemented at `/statistics`, linked from the records header. A year selector from 2026 through the existing 2100 date limit shows only import and export record counts for the full selected year, initially using the current business year. The read-only statistics endpoint aggregates saved records by their business date and current type. Loading/errors stay distinct from zero, and counts refresh on focus or manually. Tests cover supported years, year boundaries, leap days, empty years, and changes after retries, edits, and deletion. No packages or schema changes were added; validation remains user-run.

## Approved Defaults

- **NET:** received money minus all seven fees, calculated automatically.
- **PrivateFees:** three independent amounts labeled `خاصة 1`, `خاصة 2`, and `خاصة 3`.
- **Type:** required choices `تصدير` / `استيراد`, stored as `export` / `import`; existing legacy records become import.
- **Currency and precision:** two decimal places, without a currency symbol.
- **Business time zone:** `Asia/Damascus`; calendar dates remain Gregorian.
- **Localization:** Arabic RTL UI, Western display digits, and support for Arabic digits in monetary input.
- **Branding:** the original supplied logo, deep teal dark backgrounds, mint accents, and Arabic-capable system fonts.
- **Deployment:** one local persistent Node.js server with SQLite. Shared deployment and login remain future decisions.
- **Corrections:** editing/deleting today’s records is enabled; historical records are read-only.

## Tab 1: Today's Records

### Layout

- Show the current business date and the records table, with a **+ Add a record** row beneath the last saved row.
- Start with an empty table and a clear message: **No records for today yet.**
- Keep column headers visible even when there are no records.
- Show records for today's business date only, ordered consistently by ID.
- Use horizontal scrolling for the wide table, with readable column widths and right-aligned money values.
- Display a record count and totals for received money, each fee, and NET after records exist.
- Keep loading, saving, empty, and error states distinct; a failed request must not appear as an empty day.

### Columns and Data Fields

Keep this order and the exact approved Arabic labels. Internal field names remain stable, with the new `type` field added.

| Order | Field | Arabic label | Internal field | Behavior |
| --- | --- | --- | --- | --- |
| 1 | Id | تسلسي | `id` | Generated persistent numeric ID. |
| 2 | Type | نوع البيان | `type` | Required dropdown: تصدير / استيراد. |
| 3 | ProductType | نوع البضاعة | `productType` | Required text. |
| 4 | MerchantName | اسم التاجر | `merchantName` | Required text. |
| 5 | CarNumber | رقم السيارة | `carNumber` | Required text; preserve leading zeros. |
| 6 | RecievedMoney | المقبوض | `receivedMoney` | Required nonnegative amount. |
| 7 | ExternalFees | رسوم خارجية | `externalFees` | Nonnegative amount, default zero. |
| 8 | OriginLicenseFees | رسوم شهادة منشأ | `originLicenseFees` | Nonnegative amount, default zero. |
| 9 | CustomFees | رسوم جمارك | `customFees` | Nonnegative amount, default zero. |
| 10 | DriverFees | رسوم سائق | `driverFees` | Nonnegative amount, default zero. |
| 11 | PrivateFees 1 | خاصة 1 | `privateFees1` | Separate nonnegative amount, default zero. |
| 12 | PrivateFees 2 | خاصة 2 | `privateFees2` | Separate nonnegative amount, default zero. |
| 13 | PrivateFees 3 | خاصة 3 | `privateFees3` | Separate nonnegative amount, default zero. |
| 14 | NET | صافي | Derived | Calculated automatically; never editable. |

### Add Record

- Clicking the **+** row activates inline entry cells directly beneath the saved records. Do not open a dialog or separate form.
- Include the editable fields listed above and a read-only NET preview in the same table row.
- Assign the current business date when the record is saved. If the date changes during entry, keep the inline values and ask the user to review and use the new date rather than silently assigning a different day.
- Validate required text, monetary precision, and nonnegative input amounts on both the client and server.
- Recalculate the preview whenever any amount changes.
- Disable duplicate submissions while saving.
- Reset the entry row only after the server confirms a successful save; then refresh the table and totals and restore the **+** row.
- On failure, preserve the entered values and show an actionable error.
- Press Enter or select the checkmark to save. Escape or the cancel icon exits entry mode without saving anything.

### Proposed Record Actions

- Edit turns the selected saved row into inline entry cells with its existing values and recalculates NET after changes.
- Delete requires explicit confirmation naming the record ID before permanently removing it.
- Refresh the table, totals, and calendar counts after successful changes.
- Initially place these controls on today's rows. Historical editing and deletion remain a decision to confirm.

## NET Calculation

Approved formula:

```text
TotalFees = ExternalFees
          + OriginLicenseFees
          + CustomFees
          + DriverFees
          + PrivateFees1
          + PrivateFees2
          + PrivateFees3

NET = RecievedMoney - TotalFees
```

- NET is derived from the saved input amounts, not accepted from the browser as a trusted value.
- Use one shared calculation function for the inline preview, table rows, and day totals.
- Store money as integer minor units using the agreed decimal scale. Parse decimal inputs without floating-point arithmetic, reject excessive precision, and enforce a safe maximum amount.
- Permit a negative NET when fees exceed received money and display it clearly. Fee and received-money inputs remain nonnegative under the proposed rules.
- Sum the stored monetary values for totals; do not sum rounded display strings.

Example at two-decimal precision: received money `1,000.00` minus fees `50.00 + 20.00 + 30.00 + 100.00 + 10.00 + 15.00 + 25.00` gives NET `750.00`.

## Tab 2: Calendar

### Layout and Navigation

- Show a large monthly calendar, defaulting to the current business month and selected day.
- Provide a month selector, year selector, previous/next month controls, and a **Today** button.
- Select a day by clicking its calendar cell. Also provide a day selector so day, month, and year can all be chosen directly.
- Keep the selected day, month, year, and calendar highlight synchronized. If changing month or year makes the selected day invalid, move it to the last valid day of that month.
- Handle different month lengths, leap years, and December/January transitions.
- Show a record-count badge on days containing records, without requiring the user to open each day.
- Make today and the selected day visually distinguishable.
- Allow keyboard navigation and accessible labels for calendar controls and dates.

### Selected Day's Records

- Show the full selected date above a table beneath the calendar.
- Load records for that exact business date using the same columns, formatting, NET calculation, and totals as today's table.
- Display **No records for this date.** when the selected day has no saved records.
- Keep calendar browsing read-only in the initial scope; adding records is done through Today's Records.
- When users select dates quickly, only show the response matching the currently selected date.
- Refresh today's date and relevant data when returning to the app after midnight.

Month and year selection navigate the calendar. The records table shows the selected day; month-wide and year-wide reports are outside the initial scope.

## Persistence and Data Model

Records must survive page refreshes, browser restarts, and server restarts. The server database is the source of truth.

Each saved record contains:

- A persistent generated `id`.
- A `recordDate` business-date key in `YYYY-MM-DD` format, separate from creation timestamps.
- All editable text and money fields from the table above.
- `createdAt` and `updatedAt` timestamps stored in UTC.

Index `recordDate` for daily record retrieval and monthly counts. Derive NET from the stored money fields rather than maintaining a second manually editable value.

The initial implementation uses SQLite on a single persistent Node.js server. Its database file must live in a persistent data directory with a backup process. If the deployment changes to ephemeral or multiple application servers, replace the local file store with a shared persistent database before deploying.

Never use browser local storage as the only record store. Never reset the database or populate fake company records on application startup.

## Implementation Structure

Use App Router server code for database access and server-side validation. Keep database credentials and storage code out of client components.

Suggested files, adjustable to the final database choice:

| File or directory | Responsibility |
| --- | --- |
| `src/app/page.tsx` | Main page with the two-tab interface. |
| `src/components/records-table.tsx` | Shared table, empty states, monetary formatting, and totals. |
| `src/components/records-table.tsx` (inline entry) | Add/edit cells, save/cancel actions, and live NET preview. |
| `src/components/records-calendar.tsx` | Calendar grid, date selectors, and day-count badges. |
| `src/lib/records.ts` | Record types and validation rules shared where appropriate. |
| `src/lib/money.ts` | Decimal parsing, money formatting, and NET calculation. |
| `src/lib/business-date.ts` | Business-date handling with the configured time zone. |
| `src/lib/server/database.ts` | Server-only database connection and persistence setup. |
| `src/lib/server/sqlite-store.ts` | Daily queries, monthly counts, idempotent creation, and versioned record mutations. |
| `src/app/api/records/route.ts` | Validated daily record reads and record creation. |
| `src/app/api/records/[id]/route.ts` | Record updates/deletion if those actions are approved. |
| `src/app/api/records/calendar/route.ts` | Counts by business date for the visible month. |

Return structured errors for invalid input, missing records, and failed database operations. If login is required, enforce access restrictions on every data endpoint and mutation.

## Implementation Steps

1. Confirm the NET formula, PrivateFees labels, currency precision, business time zone, deployment, access, and correction rules.
2. Define shared record types, date rules, money parsing, validation, and NET calculation.
3. Add the chosen persistent database, schema, date index, and server-only repository.
4. Add validated record endpoints and monthly date counts.
5. Replace the starter home page with the two-tab layout and shared records table.
6. Build inline table entry from the **+** row, live calculation, save behavior, and today's correction actions.
7. Build the calendar, synchronized date selectors, monthly badges, and selected-day table.
8. Add daily totals, responsive layout, keyboard support, and clear loading/error states.
9. Document setup, database initialization, backup location, and user-run validation commands. Add automated checks for money calculations, date boundaries, and persistence when implementation begins.

## Acceptance Checklist

- [ ] Exactly two main tabs are available: Today's Records and Calendar.
- [ ] A fresh database shows an empty table with all 14 requested columns.
- [ ] Saving a record assigns its ID and business date automatically.
- [ ] نوع البيان requires تصدير or استيراد; both persist and appear in the calendar.
- [ ] Legacy records migrate to استيراد without changing their values or retry identity.
- [ ] Arabic labels, dark logo colors, RTL scrolling, and keyboard navigation work on desktop and mobile.
- [ ] Clicking the **+** row enables entry in the table without opening a separate form or dialog.
- [ ] The three PrivateFees fields are separate, identifiable, and all included in the agreed NET formula.
- [ ] NET cannot be entered or edited and updates correctly in the inline entry row, saved rows, and totals.
- [ ] Required text and invalid monetary amounts are rejected without losing entered data.
- [ ] Saved records remain after refreshing the browser and restarting the app.
- [ ] Today's table only contains today's business-date records.
- [ ] Calendar selectors and day cells show records for the exact selected date.
- [ ] Empty days, leap days, month/year transitions, and business-date rollover behave correctly.
- [ ] Failed reads are shown as errors, and fast date changes do not display stale records.
- [ ] Confirmed edit/delete actions update persisted values, totals, and calendar counts.
- [ ] The app remains usable on small screens and through keyboard navigation.
- [ ] The user can run linting, type checking, targeted automated checks, and a production build using the documented commands.

## Outside the Initial Scope

Inventory management, invoicing, attachments, payment processing, multiple currencies, accounting integrations, exports, advanced reporting, and additional main tabs are not part of the requested first version.
