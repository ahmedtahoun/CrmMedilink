# Handoff: MediLink360 — Clinic/Trainer Booking & Ops Platform

## Overview
MediLink360 is a CRM-style operations tool for a medical-training/booking business. It manages the pipeline of clinics/providers from prospect to live client, trainer and sales-rep booking calendars, and a Finance module (revenue, invoices, quotations, expenses). It supports multiple "markets" (Egypt, UAE, Saudi Arabia, Qatar) and multiple internal workspaces (CEO/board, Trainer, Closer/Sales, HR), each with role-appropriate views of the same underlying data.

## About the Design Files
The bundled files are **design references built in HTML/JS** — a working interactive prototype used to define look, feel, and behavior. They are **not production code**. The task is to **recreate this design in a real application stack** (recommended: React or similar SPA framework, with a proper backend + database for persistence, auth, and multi-user access) — not to ship the HTML files as-is. If no stack is chosen yet, pick whatever fits the team's skills; the interaction patterns and data model described below should carry over directly.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and copy in the prototype are intentional and final; recreate them precisely. Layout structure (flex/grid, columns, modal patterns) should also be preserved.

## Recommended Stack
For rebuilding this as a real, multi-user, deployed app:
- **Framework**: Next.js (React) — pairs well with Claude Code scaffolding.
- **ORM**: Prisma (or Drizzle) against PostgreSQL — matches the relational data model below (clinics ↔ invoices ↔ line items ↔ calendar events ↔ users).
- **Database + Auth**: Supabase (managed Postgres, built-in auth/session handling, free tier to start, paid tiers scale cleanly — no migration needed later).
- **Hosting**: Vercel (native Next.js support, free tier to start).
- **Domain**: point `crm.medilink360.ai` (via Spaceship DNS, CNAME record) at the Vercel deployment once live.

This stack works identically whether on free or paid tiers — upgrading later is a billing change, not a rebuild.

## Core Data Model
- **Clinic / Provider**: id, name, category (medical specialty), priority, area/city, contact name, phone, market, assigned trainer, assigned closer, sales stage (`cs`) or training stage (`ts`), notes count, engagement date, MRR, overdue flag, trial dates, subscription status (active/inactive), subscription reason, comments[].
- **Employee/Rep**: name, position (trainer/sales), country, status (active/inactive) — used to populate trainer/closer assignment dropdowns per market.
- **Calendar Event**: title, type (Task/Meeting/Follow-up/Reminder), priority, linked clinicId, date, time, notes, done flag, market, owner. Trainer-booked meetings sync in from a public booking page via localStorage in the prototype — in production this should be a real booking-link integration writing to the same events table.
- **Finance — Invoice**: clinicId, PO/reference, issue date, due date, status (Draft/Sent/Paid/Overdue/Cancelled — see status list in code), line items (description, qty, unit price), discount %, tax %. Computed: subtotal, tax amount, total.
- **Finance — Quotation**: same shape as Invoice (clinic, line items, discount %, tax %, status) minus due date; used pre-sale.
- **Finance — Expense**: description, category (enum), vendor (optional), date, amount.
- **Auth User**: name, email, password (plaintext in prototype — replace with hashed credentials + real session/auth service), role.

## Screens / Views

### 1. Marketing/Pitch sections (Hero, Problem/Solution)
Static marketing content introducing the product — likely not needed 1:1 in the production app; kept in the file for pitch purposes. Skip unless the team wants a public landing page.

### 2. Workspace shell (`Live product` section)
A tabbed app shell with a left/top navigation switching between workspaces: **CEO/Board**, **Trainer**, **Closer (Sales)**, **HR**. Each workspace reuses the same clinic data but filters/frames it differently (e.g., trainer sees only their assigned clinics and training-stage kanban; closer sees sales-stage kanban).

Key sub-views inside the shell:
- **Pipeline / Kanban board** — clinics as draggable cards across stage columns (lead → ... → live, or training stages for trainers). Supports drag-reorder, bulk-select + bulk reassign/move-stage, and a detail panel per clinic (sessions, tasks, comments, subscription status/deactivation).
- **Calendar** — month/week/day views, add/edit event modal, clinic-linked events, color-coded by event type and priority.
- **Import Providers** — modal to bring prospects/providers into the clinics pipeline, filterable by country/market.
- **Finance** (see below).

### 3. Finance module
Reached via a tab in the workspace shell (replaces a prior "Revenue" nav item). Contains 4 sub-tabs, switched via a pill-style tab row:

**a. Overview (Revenue)**
- KPI cards row (`revenueKpis`) — 3 cards, revenue-related stats.
- Table of revenue by clinic. Shows zero-state until clinics/providers are imported.
- "Import" button in header (visible only on this sub-tab) to bring in clinic data.

**b. Invoices**
- KPI cards row (`invoiceKpis`) — 3 cards.
- Table of invoices with clinic name, reference, dates, status pill, total.
- Empty state: "No invoices yet."
- "+ New" button (header) opens the shared Finance modal in invoice mode.

**c. Quotations**
- KPI cards row (`quotationKpis`) — 3 cards.
- Table of quotations, same structure as invoices minus due date.
- Empty state: "No quotations yet."

**d. Expenses**
- KPI cards row (`expenseKpis`) — 2 cards.
- Table of expenses: description, category, vendor, date, amount.
- Empty state: "No expenses logged yet."

**Finance modal** (shared, opens for Add/Edit across all 3 record types):
- Header: dynamic title, close (×) button.
- **Expense mode**: Description (text), Category (select, enum list), Vendor (text, optional), Date (date), Amount (number).
- **Invoice mode**: Clinic (select, populated from `providerOptions`), PO/reference (text, optional), Issue date, Due date, Status (select: Draft/Sent/Paid/Overdue/Cancelled), line items list (description/qty/price, add/remove rows), discount % and tax % fields, live-computed subtotal/tax/total summary.
- **Quotation mode**: same as invoice minus due date.
- Save/Cancel actions at the bottom (not fully shown in excerpt — verify against live file for exact button copy/style before building).

## Interactions & Behavior
- Tab switching is instant, client-side (`financeTab` state: revenue/invoices/quotations/expenses).
- All modal form fields use **pre-bound handler objects** (e.g., `financeFieldHandlers.description`) rather than inline arrow functions recreated on every render — replicate this pattern in React as memoized/stable handlers (e.g., `useCallback` per field, or a single `onChange(field)` curried handler) to avoid input focus/binding bugs.
- Line items in Invoice/Quotation forms: add row, remove row (by index), edit description/qty/price inline — subtotal, tax, and total recompute live on every keystroke.
- Status is a plain select dropdown rendered as a colored pill in table rows — define a fixed color mapping per status value (see Design Tokens) and reuse it both in the table and anywhere else status appears.
- Drag-and-drop reordering on the pipeline Kanban board (both column reorder and card move-between-columns).
- Bulk actions on the pipeline: multi-select clinic cards, then reassign owner or move stage in bulk.
- Import modal: search + filter by market/country, multi-select, confirm to add.
- Empty states are literal text strings — no illustration, no CTA duplicate button (CTA already lives in the header).

## State Management
The prototype keeps everything in a single component's local state (see `state = {...}` block), including: `financeTab`, `financeModalOpen`, `financeModalKind`, `financeEditingId`, `financeForm` (current draft object, shape varies by kind), `clinics`, `providers`, `employees`, `calendarEvents`, `authed`/`authUserId`/`authUsers`, and various UI-only flags (dropdown open states, drag state, toast message).

For production:
- Move `clinics`, `providers`, `employees`, `calendarEvents`, invoices, quotations, expenses, and auth users into a real backend + database (relational recommended given the linked-record structure: clinics ↔ invoices ↔ line items, clinics ↔ calendar events, etc.).
- Keep UI-only state (modal open/closed, dropdown open, drag-in-progress, toast) local to components.
- Auth needs a real session/auth provider — passwords must be hashed server-side; do not store or compare plaintext passwords as the prototype does.
- Multi-user concurrent editing implies you'll want optimistic UI + server as source of truth (e.g., via REST/GraphQL + refetch, or a realtime layer if simultaneous editing across users is expected).

## Design Tokens
- **Fonts**: Headings in `Space Grotesk` (bold/700, tight letter-spacing e.g. `-0.6px`), body/UI text in the default sans-serif stack used elsewhere in the file — check `<helmet>` for exact `@font-face`/Google Fonts import.
- **Core colors**:
  - Brand green (primary actions, active tab, accent text): `#0e9b76` / gradient `linear-gradient(150deg,#16b98a,#0e9270)`
  - Dark ink (headings): `#16242d`
  - Body/secondary text: `#66757e`, `#5c6c75`, `#647680`
  - Borders: `#dde3e6`, `#cfe3da`
  - Tab-pill track background: `#e2e7ea`
  - Empty-state text: `#9aa7b0`
  - Modal overlay: `rgba(12,25,32,.55)` with `backdrop-filter: blur(2px)`
- **Category tag colors** (clinic specialty tags): General `#15803d`/`#e7f5ec`, Pediatrics `#0d9488`/`#e2f4f2`, Dental `#4f46e5`/`#ebeafd`, Dermatology `#db2777`/`#fbe7f1`, Cardiology `#dc2626`/`#fdeaea`, Gynecology `#933...` (verify exact hex in source — truncated in excerpt).
- **Priority colors**: High `#dc2626`/`#fdecec`, Medium `#b45309`/`#fbf1e0`, Low `#15803d`/`#e7f5ec`.
- **Calendar event-type colors**: Task `#4f46e5`, Meeting `#0e9b76`, Follow-up `#b45309`, Reminder `#c2367b`.
- **Border radius**: pills/tabs `8px`–`11px`; modal card `18px`; inputs `~8px` (verify exact value in source, truncated in excerpt at `border-radius:`).
- **Modal**: width `640px` (max 92% viewport), max-height `88vh`, padding `26px 28px`.

## Assets
No image/icon assets — icons are inline SVGs (stroke-based, `stroke-width` ~2.3–2.6, `currentColor` or explicit hex).

## Screenshots
`screenshots/` contains reference captures of the live prototype (logged in as CEO): landing page, Finance → Overview, Invoices, Quotations, Expenses tabs, and the New Invoice modal with line items. Use these alongside the HTML source to match spacing/colors exactly.

## Files
- `MediLink360 Pitch.dc.html` — full source of the prototype (all screens, state, and logic). This is the authoritative reference; the excerpts above summarize it but the developer should grep this file directly for exact values (colors, copy, field names) before implementation, since some hex values and structures were truncated when this README was compiled.
- `data-model.js` — auxiliary data/model file referenced by the prototype (seed data and/or shared model helpers) — inspect and port its shape into your backend schema.

## Notes for the developer
- Search the HTML file for `data-screen-label` to jump between major sections, and for `financeTab`/`financeForm`/`financeFieldHandlers` to find all Finance-related template and logic code.
- The file also contains an internal component-hierarchy engine (`sc-if`, `sc-for`, `{{ }}` template bindings) — this is prototyping-tool-specific syntax, **not** something to replicate. Treat it purely as pseudocode for conditionals/loops when porting to your framework's own templating (JSX, Vue templates, etc.).
- Multiple workspaces (CEO/Trainer/Closer/HR) reuse the same underlying data with different filters/permissions — model this as a role/permission layer server-side, not just client-side hiding.
