# Technical Implementation Plan

1. Overview
-----------

Use this document to design and communicate how you will implement product requirements end to end. It helps you:

- Turn the PRD into concrete technical decisions.
- Define service and module boundaries.
- Map key data flows and ownership.
- Choose technologies and patterns that fit the constraints.
- Sequence work into buildable milestones.

You should update this file whenever you introduce non-trivial behaviours, new flows, or cross-cutting changes (auth, data model, performance, etc.). It is the main place where a new engineer can answer “how does this system work under the hood?” before they read the code.

2. Quick-Start
--------------

When you add or change features, keep this short checklist in mind:

- Start from `docs/prd.md` and identify the user flows you are touching.
- Sketch the flow from UI → server → database (including error paths).
- Document:
  - Components/pages you will touch in `app/` and `components/`.
  - Server logic in `lib/`, `server/`, and `db/`.
  - Schema changes in `db/` and how they flow into queries/mutations.
- Add or update a “Sequencing” subsection for any multi-step rollout.
- Cross-link to relevant diagrams or docs in `docs/` or `documentation/`.

3. Key Concepts / Responsibilities
----------------------------------

This plan focuses on a few core concerns:

- End-to-end flows
- Boundaries and ownership
- Technology choices
- Implementation sequencing

For this codebase, typical responsibilities look like:

- Frontend structure and interactions
  - Which pages and layouts in `app/` support each flow.
  - Which UI building blocks from `components/` and `hooks/` you reuse or extend.
  - How local state (React), shared state (e.g. Zustand), and URL state interact.

- Server-side behaviour
  - Where server actions live (`app/`, `server/`) and which flows they support.
  - How you call into database utilities in `lib/` and `db/`.
  - How you model error handling and validation.

- Data model and persistence
  - How entities are represented in the database (`db/` and ORMs/migrations).
  - How those entities map to TypeScript types and API payloads.
  - How reads/writes are grouped for each UX flow (transaction boundaries).

- Cross-cutting concerns
  - Authentication and authorization boundaries (e.g. which calls require which roles).
  - Validation and sanitisation (often centralised in `lib/` or `hooks/`).
  - Performance and caching decisions (e.g. where to memoise, paginate, or batch).

- Sequencing and rollout
  - Phasing for large features (v1, v1.1, etc.).
  - Safe migration paths for schema and behavioural changes.
  - Temporary feature flags or compatibility layers if needed.

4. Usage Examples
-----------------

Use this section as a pattern library for future implementation plans. When you add a new feature, copy one of these patterns and adapt it.

Example A: New end-to-end flow (e.g. “Create Transaction”)
- Frontend:
  - `app/dashboard/page.tsx`: orchestrates layout and passes props.
  - `components/pos/ProductCatalog.tsx`: loads products for the current context.
  - `components/pos/CartAndCheckout.tsx`: manages cart UI and triggers payment.
- Server:
  - `server/actions/transactions/createTransaction.ts`: validates input, applies pricing, updates inventory, and returns a result payload.
  - `lib/pricing.ts`: encapsulates pricing rules for reuse.
- Database:
  - `db/migrations/*create_transactions*.sql`: creates transactions and line items tables.
  - `db/queries/transactions.ts`: read helpers for history, reports, etc.
- Sequencing:
  - Phase 1: support cash only; minimal fields.
  - Phase 2: add additional payment methods.
  - Phase 3: add reporting and optimisations.

Example B: Behavioural change with schema impact
- Change:
  - Introduce a new status or field on a core entity.
- Plan:
  - Database: migration in `db/` with defaults and backfill if needed.
  - Server: update write paths first (`server/actions/...`), then reads.
  - Frontend: surface the new field in `components/...` and `app/...` pages.
  - Testing: add fixtures and tests for both old and new behaviour.
- Notes:
  - Document how the new field changes validation, filters, and permissions.

Example C: Cross-cutting concern (e.g. performance)
- Identify:
  - Slow list or report in `app/...` or `components/...`.
- Plan:
  - Introduce pagination or search parameters.
  - Move heavy computation to server-side utility in `lib/` or `server/`.
  - Add indexes or query optimisations in `db/`.
- Document:
  - New query contracts (inputs/outputs).
  - Any new constraints (max page size, timeouts, etc.).

5. Dependencies & Interactions
------------------------------

When you update this plan, call out how parts of the system depend on each other. Typical interactions include:

- UI ↔ Server
  - Pages in `app/` call server actions in `server/` or inline server actions in route files.
  - Components in `components/` should stay mostly presentational and rely on hooks or props for data.

- Server ↔ Database
  - Utilities in `lib/` and query modules in `db/` encapsulate raw queries and mapping to types.
  - Server actions should not duplicate query logic; prefer calling shared helpers.

- Shared state and utilities
  - Hooks in `hooks/` and shared modules in `lib/` provide reusable logic (auth, validation, formatting).
  - If you see repeated patterns inside `app/` or `components/`, pull them into a shared location and document the new abstraction here.

When documenting interactions, try to:

- Be explicit about ownership.
  - “This module owns transaction creation. Other modules call it instead of writing directly.”
- Call out idiosyncrasies.
  - “Inventory updates must always happen inside a transaction with the sale record.”
  - “This list view only supports filters X and Y; other filters require a new index.”

6. Further Reading / Related Docs
---------------------------------

Use these files to go deeper:

- Product requirements: `docs/prd.md`
- UI breakdowns and design intent: `docs/ui-components-breakdown.md`
- Data design and schema notes: `docs/database-schema.md`
- Delivery phases and timelines: `docs/development-timeline.md`
- Additional product and UX context: files in `documentation/`