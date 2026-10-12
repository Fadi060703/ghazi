# DarwishCO

A small company ledger built with Next.js App Router, TypeScript, Tailwind CSS 4, and persistent SQLite storage.

## Using the app

The records interface is Arabic, right-to-left, and permanently dark. It uses the supplied company logo and a deep teal color scheme. Print previews use black text on white. The tabs are **سجلات اليوم** and **التقويم**; all visible labels, calendar names, validation errors, and confirmations are Arabic. Dates stay Gregorian and numbers are displayed as `0–9`.

- **Today's Records:** view all of today's saved rows. Click the **+ Add a record** row beneath the table to start entering directly into its cells. No dialog or separate entry form opens.
- Select **نوع البيان**: **تصدير** (export) or **استيراد** (import). New rows require a selection; it is not guessed from other fields.
- Enter the product type, merchant name, car number, received money, and fees. Blank fee cells count as zero. Car numbers are text so leading zeros are preserved.
- NET updates automatically as received money minus all seven fees, including the three separate PrivateFees amounts. NET cannot be edited.
- Press **Enter** or click the **checkmark** to save. Press **Escape** or click **×** to cancel. Failed saves keep entered values.
- Edit today's records using the pencil icon; delete using the trash icon and the explicit confirmation bar.
- **Calendar:** choose day, month, and year, or click a date. Days with saved records show a count. The selected day's table and totals appear below the calendar. Historical records are read-only.
- Calendar keyboard controls: arrow keys move by day/week, Home/End move within the week, and Page Up/Page Down move by month.

The app starts with no saved records. It does not add sample company data. Monetary inputs accept Western and Arabic digits, including `١٢٣٫٤٥`. Monetary values use two decimal places and no currency symbol; the business currency can be agreed separately.

## Yearly statistics

Click **الإحصاءات** in the header to open `/statistics`. Choose a year from **2026** onward to see only the number of saved **استيراد** and **تصدير** records for that full Gregorian year. The current business year is selected initially. Years are supported through 2100, matching the ledger's existing date limit. Empty years show zero for both counts; loading and failures are distinct from zero.

Counts use each record's business date and current saved type. Saving, deleting, or changing a record's type affects the next refresh. The page refreshes when the window regains focus, and its refresh button reloads the selected year. No new packages or database migration are needed.

The read-only endpoint `/api/records/statistics?year=2026` returns `{ "year": 2026, "counts": { "import": 0, "export": 0 } }`, with actual database counts and no caching. Missing, malformed, or unsupported years return an Arabic validation error. The existing automated checks now include year validation, annual date boundaries, empty years, leap-day records, retry handling, type changes, and deletion. Run the existing validation commands below to check the update.

## Printing a day's records

- Click **طباعة** above today's table, or select a date in **التقويم** and click **طباعة** above that day's table.
- A separate tab opens at `/print?date=YYYY-MM-DD` with fresh saved records for exactly that date, ordered by ID. Unsaved entries remain in the original tab and are not printed. Reopen or reload the preview to include subsequent saved changes.
- Click **طباعة** in the preview to open the browser print dialog. Select **A4**, **landscape**, and disable browser **headers and footers** so URLs and browser-generated text do not appear. Use **Save as PDF** in the same dialog to save a copy.
- The printed document contains only the selected date and a plain black-and-white table. Each record occupies one row with all 14 columns, including the seven separate fees and NET. Smaller 7pt text and compact cell padding fit the table on A4 landscape paper. No logo, branding, title, record count, or totals are printed.
- Long text and amounts wrap within their cells. Table headings repeat on subsequent pages, and individual records stay together where the browser can fit them on one page.
- Printing is disabled while the table is loading, saving, or deleting, and when records are unavailable or the selected day is empty. Invalid preview dates and database failures show Arabic messages without enabling printing.
- This feature adds no packages or database migration. To check the layout, print today's records and a historical day, including a multi-page report, long Arabic/Latin text, leading-zero car numbers, zero fees, and negative NET.

## Requirements

- Node.js **22.13 or newer**; `.nvmrc` selects Node.js 22. This app uses Node's built-in `node:sqlite` module. Node.js 20 is no longer sufficient.
- npm, Yarn, or pnpm to install and run the app.
- To generate all three lockfiles with the helper, install npm, Yarn Classic 1.x, and pnpm, and make them available on your PATH.

## Generate all lockfiles

No installation, development, build, or validation commands were run when creating these files. Resolved lockfiles are generated by the package managers when you run:

```sh
npm run lockfiles
```

This creates `package-lock.json`, `yarn.lock`, and `pnpm-lock.yaml` without installing `node_modules`. It resolves the npm dependency tree first, then imports it into Yarn Classic and pnpm. npm lockfile version 1 is used for Yarn Classic import compatibility. Dependency installation scripts are disabled during npm resolution. An internet connection is required.

The helper stops if `yarn.lock` already exists; back it up and remove it yourself if you intend to regenerate all three lockfiles.

If you prefer to use only one package manager, skip the helper and run its installation command below. That manager will create its own lockfile.

## Development

Choose one package manager for installing dependencies and running the application:

| Task | npm | Yarn | pnpm |
| --- | --- | --- | --- |
| Install | `npm install` | `yarn install` | `pnpm install` |
| Develop | `npm run dev` | `yarn dev` | `pnpm dev` |
| Build | `npm run build` | `yarn build` | `pnpm build` |
| Start production | `npm start` | `yarn start` | `pnpm start` |
| Lint | `npm run lint` | `yarn lint` | `pnpm lint` |
| Check types | `npm run typecheck` | `yarn typecheck` | `pnpm typecheck` |
| Automated checks | `npm test` | `yarn test` | `pnpm test` |

The development server is available at <http://localhost:3000>. The default development and production scripts bind to `127.0.0.1` for use on one computer. Build the app before starting the production server.

For npm, a first run is:

```sh
npm install
npm run dev
```

No installation, migration, server, lint, test, type-checking, or build commands were run while generating the application. To validate it yourself:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

The automated checks cover exact monetary arithmetic, the NET formula, date boundaries, input validation, database persistence, record-type validation, legacy database migration, Arabic monetary input, retrying saves, concurrent edits, and read-only archive behavior. They use temporary or in-memory databases and do not touch the company database. Browser interaction and visual layout still need to be checked with the running app.

## Configuration and database

Copy `.env.example` to `.env.local` if you want to change these defaults:

```dotenv
BUSINESS_TIME_ZONE=Asia/Damascus
RECORDS_DATABASE_PATH=./data/records.sqlite
```

- `BUSINESS_TIME_ZONE` is an IANA time zone and determines today's business date independently of the browser's time zone.
- `RECORDS_DATABASE_PATH` selects the persistent SQLite file. Relative paths are resolved from the project directory; an absolute path is also supported.
- The database, table, and date index are created automatically on the first records request. When an older database has no `type` column, a transactional migration adds it and classifies its existing records as **استيراد**, as approved. Existing IDs, dates, text, amounts, versions, and timestamps are preserved. Save-retry fingerprints are upgraded in the same transaction. Repeated startup does not reclassify records or repeat the migration.
- Amounts are stored as integer minor units; daily totals use exact integer arithmetic. Individual amounts are limited to `9,999,999,999.99`.
- New records receive their ID and business date from the server. If midnight passes while a row is being entered, the app keeps its values and asks the user to review and use the new date.
- Creation retries use a request ID to avoid inserting the same submitted row twice. Record versions prevent one window from silently overwriting a newer edit from another window.
- Database files are ignored by Git. Keep the selected database path on persistent storage.

For a backup, stop the application, copy the entire database directory (including any `-wal` and `-shm` files), and restart it. Keep dated backup copies outside the application directory. To restore, stop the app first and restore the full saved directory.

The initial version has no login and is intended for local use. A shared deployment needs one persistent Node.js server, durable storage, and access protection. A deployment with ephemeral disk or multiple application servers needs a shared database instead of this local SQLite file. Behind a reverse proxy, set `APP_ORIGIN` to the browser-facing origin, for example `https://records.example.com`, so mutation origin checks match the public address.

## Applying this update

Restart your development or production server, then reload the browser. The migration runs when the app receives its first records request with the updated storage code. The agent did not execute migration or validation commands. Take a database backup using the steps above before the first restart. No new packages were added for this update.

Check the logo, Arabic headings, right-to-left horizontal scrolling, import/export dropdown, negative NET display, calendar keyboard controls, and inline save/edit/delete on desktop and mobile. The saved legacy record should appear as **استيراد**.

## Approved field labels

| Field | Arabic label |
| --- | --- |
| Id | تسلسي |
| Type | نوع البيان |
| ProductType | نوع البضاعة |
| MerchantName | اسم التاجر |
| CarNumber | رقم السيارة |
| RecievedMoney | المقبوض |
| ExternalFees | رسوم خارجية |
| OriginLicenseFees | رسوم شهادة منشأ |
| CustomFees | رسوم جمارك |
| DriverFees | رسوم سائق |
| PrivateFees 1 | خاصة 1 |
| PrivateFees 2 | خاصة 2 |
| PrivateFees 3 | خاصة 3 |
| NET | صافي |

## Project files

- `src/app/page.tsx`: server-rendered entry point with the business date and time zone.
- `src/components/records-app.tsx`: two tabs, daily summaries, and date rollover.
- `src/components/records-table.tsx`: records, inline add/edit cells, deletion confirmation, and totals.
- `src/components/records-calendar.tsx`: calendar navigation and date-count badges.
- `src/app/api/records/`: validated record endpoints and monthly counts.
- `src/lib/money.ts`: exact input parsing, formatting, and NET calculation.
- `src/lib/business-date.ts`: date validation and calendar helpers.
- `src/lib/server/sqlite-store.ts`: persistent record storage and concurrency checks.
- `tests/`: user-run automated checks for business rules and persistence.
- `src/app/layout.tsx`: root layout and metadata.
- `src/app/globals.css`: Tailwind import and global styles.
- `public/logo.jpg`: supplied logo, used by the header and app icon. The original `logo.jpg` remains in the project root.
- `src/app/error.tsx` and `src/app/not-found.tsx`: Arabic error and missing-page views.
- `next.config.ts`: Next.js configuration.
- `postcss.config.mjs`: Tailwind CSS PostCSS integration.
- `eslint.config.mjs`: Next.js and TypeScript lint configuration.
- `tsconfig.json`: strict TypeScript settings and the `@/*` import alias.

Tailwind CSS 4 uses the CSS configuration in `globals.css`; no `tailwind.config.js` is required. The app uses system fonts, so builds do not need to download a web font.

## References

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Tailwind CSS with PostCSS](https://tailwindcss.com/docs/installation/using-postcss)
- [Yarn Classic lockfile import](https://classic.yarnpkg.com/lang/en/docs/cli/import/)
- [pnpm lockfile import](https://pnpm.io/cli/import)
- [Node.js SQLite](https://nodejs.org/api/sqlite.html)
