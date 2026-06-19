# EduJunction / "Edmit" — Complete Feature Build Guide

> **Purpose of this document.** This is a complete, implementation-level specification of every feature in the EduJunction student portal (branded **"Edmit"**, built for MLR Institute of Technology), written so the features can be **rebuilt and migrated into a new college ERP**. Course registration is the flagship feature of that ERP, so it is documented in the most depth (see [§5](#5-course-registration--electives)).
>
> Each feature section covers: purpose, data model, exact flows (with `file:line` references and pseudocode), edge cases / known bugs, and **ERP migration notes** describing how to re-implement the feature cleanly. Read the [Migration Roadmap](#migration-roadmap) last — it sequences the rebuild.
>
> **A blunt summary up front:** the current app is a client-trusting Single-Page App that talks directly to Supabase from the browser using a hardcoded anon key, with **plaintext passwords, fully permissive RLS on the most sensitive tables, no server-side authorization, and several parallel/abandoned data layers**. The *feature designs* are mostly sound and worth keeping; the *implementation* should be re-built server-authoritative. Treat this guide as "what the system does and should do," not "copy this code."

---

## Table of Contents

1. [System Overview & Architecture](#1-system-overview--architecture)
2. [Technology Stack](#2-technology-stack)
3. [Database & Storage Reference](#3-database--storage-reference)
4. [Authentication, Users & Access Control](#4-authentication-users--access-control)
5. [Course Registration & Electives](#5-course-registration--electives)
6. [Fees: Receipts, Approval & Academic Year](#6-fees-receipts-approval--academic-year)
7. [Requests, Gate Pass, Notifications, Events & Support](#7-requests-gate-pass-notifications-events--support)
8. [Admin Dashboard, Profile, App Shell & Build/Deploy](#8-admin-dashboard-profile-app-shell--builddeploy)
9. [Cross-Cutting Issues & Security Defects](#9-cross-cutting-issues--security-defects)
10. [Migration Roadmap](#migration-roadmap)

---

## 1. System Overview & Architecture

EduJunction is a **course-registration + fee-receipt portal** with two user classes — **students** and **admins** (where "admin" splits into *department admin / HOD* and *super admin*). Students log in, upload fee receipts, get them approved by their HOD, and then register for courses and electives. Admins review fee receipts, manage students (block/unblock), publish notifications, respond to support issues, and view analytics.

**Current architecture (as deployed):**

```
┌─────────────────────────────────────────────┐
│  React 19 SPA (Vite) — runs entirely in the  │
│  browser. All business logic + authorization │
│  lives client-side.                          │
│                                              │
│   pages/  components/  services/  contexts/  │
└───────────────┬──────────────────────────────┘
                │  supabase-js (hardcoded anon key)
                ▼
┌─────────────────────────────────────────────┐
│  Supabase                                    │
│   • Postgres (tables + RLS)                  │
│   • Supabase Auth (students only)            │
│   • Storage (2 public buckets)               │
│   • Edge Function: send-email (UNUSED)       │
└─────────────────────────────────────────────┘
```

**Key architectural facts (and traps):**
- There is **no application backend** in this repo. A `/api → localhost:3000` Vite proxy and Sequelize/MySQL/axios code exist but target a Node backend that is **not present and not deployed** — those code paths are dead and 404 in production.
- Authorization is **client-side only**: role is read from an editable `localStorage.currentUser`. RLS is the only real gate, and it is mostly permissive.
- Three coexisting data-access patterns: (a) direct `supabase.*` calls inside components, (b) a `services/` layer (`api.ts`, `adminSupabaseService.ts`), and (c) dead REST/MySQL stubs. The ERP should consolidate on **one server-authoritative data layer.**

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Build tool | **Vite 7.x** (`@vitejs/plugin-react-swc`), dev port 5173 |
| Language | **TypeScript 5.5** (app compiles with `strict:false`, `noImplicitAny:false`) |
| UI framework | **React 19** + React DOM 19, `react-router-dom` (BrowserRouter) |
| UI kit | **shadcn/ui** (~50 components) on **Radix UI** primitives |
| Styling | **Tailwind CSS** + `tailwindcss-animate` + `@tailwindcss/typography`; `cn()` = `clsx` + `tailwind-merge`; custom `edu` color palette |
| Icons | **lucide-react** |
| Forms / validation | **react-hook-form** + `@hookform/resolvers` + **zod** |
| Data fetching | **@tanstack/react-query** (provider mounted; light usage), plus direct supabase-js calls |
| Charts | **recharts** (admin analytics) |
| Toasts | **sonner** *and* Radix **toast** (both mounted — consolidate) |
| Excel export | **xlsx** |
| Email | **EmailJS** (browser, in use) + a Supabase **send-email** edge function (Deno + Gmail SMTP, unused) |
| Backend-as-a-service | **Supabase** (Postgres, Auth, Storage, Edge Functions) |
| **Legacy / unused deps (prune)** | `mysql2`, `sequelize`, `sequelize-cli`, `nodemailer`, `axios`, `bcryptjs`, `lovable-tagger`; a stale second `vite.config.js`; `cdn.gpteng.co/gptengineer.js` in `index.html` |

**Environment variables actually used** (only three, all EmailJS, all in `StudentRequests.tsx`): `VITE_EMAILJS_PUBLIC_KEY`, `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`. Supabase URL + anon key are **hardcoded** in `frontend/src/lib/supabase.ts` (must move to env + rotate).

---

## 3. Database & Storage Reference

Supabase Postgres, schema `public`. Row counts are approximate (captured during analysis).

| Table | RLS | Purpose |
|---|---|---|
| `users` | **ON** (permissive) | Canonical app identity: profile, role, department, fee_status mirror, block status. `id` = Supabase Auth `auth.uid()` for students. |
| `students25` | OFF | Master roster of the current intake (seed/source of truth for who *may* register). |
| `students` | OFF | Older roster table (prior intake). |
| `fee_receipts` | **ON** (permissive UPDATE) | Per-academic-year **main fee** receipt ledger. |
| `admin_fee_receipts` | **ON** | Per-academic-year **administrative office fee (₹4500)** ledger. |
| `courses` | OFF | Intended normalized course catalog (largely unused by live code — see §5). |
| `student_electives` | OFF | Intended per-student elective ledger (unused by live code; selections live in `users.selected_electives` jsonb). |
| `student_issues` | **ON** | Support tickets (the one fully-working Supabase feature). |
| `requests` | OFF | Generic request table (gatepass/feeslip/elective). **0 rows — effectively abandoned.** |
| `notifications` | OFF | Dept-targeted announcements. **0 rows.** |
| `departments` | OFF | Department list (id, name, dept_code). |

### `users` columns (the most important table)
`id uuid` (= `auth.uid()`), `username`, `name`, `password` **(PLAINTEXT — defect)**, `department`, `role ('student'|'admin')`, `email`, `roll_no`, `semester`, `mobile_number`, `position`, `profile_picture`, `department_id`, `year`, `fee_status` (mirror of current-year main fee), `approved_semester`, `payment_mode`, `transaction_number`, `bank_name`, `fee_receipt_url`, `selected_electives` (jsonb), `rejection_comment`, `reviewed_at`, `blocked`, `blocked_by`, `blocked_at`, `block_reason`, `created_at`, `updated_at`.

### `fee_receipts` / `admin_fee_receipts` columns (identical shape)
`id uuid` (PK — **this is the id approvals update**), `user_id uuid`, `semester`, `file_path`, `file_url`, `payment_mode`, `transaction_number`, `bank_name`, `status` (default `'pending'`; `pending|approved|rejected|on_hold`), `uploaded_at`, `reviewed_at`, `reviewed_by uuid`, `review_notes`, `academic_year` (default `'2026-27'`).

### `courses` columns
`id int`, `name`, `code` (unique), `department`, `semester`, `credits`, `is_elective bool`, `category ('PE'|'OE'|null)`, `pe_group_id (1..7)`, `oe_group_id (1..3)`, `offering_department`.

### `student_electives` columns
`id`, `student_id uuid`, `semester int`, `elective_type ('PE'|'OE')`, `slot`, `course_id`.

### `student_issues` columns
`id uuid`, `student_id`, `student_name`, `student_roll_no`, `student_email`, `department`, `issue_type ('technical'|'academic'|'administrative'|'fee'|'other')`, `subject`, `description`, `status ('pending'|'in_progress'|'resolved'|'closed')`, `priority ('low'|'normal'|'high'|'urgent')`, `admin_response`, `responded_by`, `responded_at`, `created_at`, `updated_at`.

### Storage buckets
- `fee-receipt-files` — **PUBLIC**. Main fee PDFs.
- `admin-fee-receipt-files` — **PUBLIC**. Admin fee PDFs.
- Path convention: `${auth.uid()}/${academicYear}_${semester}_${Date.now()}.${ext}`.
- Storage RLS: INSERT/SELECT/DELETE allowed to `authenticated` where `foldername[1] == auth.uid()` (a user only touches their own folder).

### RLS reality check (must fix)
- `users`, `fee_receipts`, `admin_fee_receipts` have RLS **enabled but fully permissive** — there are `Allow anon to read/insert/update` (`USING true`) and `Allow all updates` (`public`, `USING true`) policies. **Anyone with the public anon key can read every student's data and modify `role`, `blocked`, `fee_status`, `password`, or any receipt status.**
- `courses`, `departments`, `notifications`, `requests`, `student_electives`, `students`, `students25` have RLS **disabled entirely** → fully exposed to anon read/write.

> The full content below (§4–§8) was produced by deep reads of the codebase. Where it says "**flag**" or "**defect**," that item is on the migration checklist in §9–§10.

---

## 4. Authentication, Users & Access Control

This portal has **no real backend auth server**. All identity logic runs client-side in the React app, talking directly to Supabase (Postgres + Supabase Auth + Storage) using a hardcoded **anon** key. There are two parallel notions of "logged in" that are loosely coupled: a Supabase Auth session and a `currentUser` object in `localStorage`. Understanding their relationship is the key to the whole system.

### 4.1 Purpose & roles

There are three effective roles, but only **one** of them (`role`) is a real column. The other two are derived heuristically — and inconsistently — in code.

| Role | How it is stored | How code distinguishes it |
|------|------------------|---------------------------|
| **Student** | `users.role = 'student'` | `roll_no` / `username` = the student's roll number; has a matching row in `students25` roster. |
| **Department admin / HOD** | `users.role = 'admin'`, `username` + `roll_no` prefixed `ADMIN_<DEPT>` (e.g. `ADMIN_IT`), `department` = a real dept like `IT` | Two different checks exist (see below). |
| **Super admin** | `users.role = 'admin'`, `roll_no` **without** the `ADMIN_` prefix | `currentUser.role === 'admin' && !roll_no.startsWith('ADMIN_')` |

Critical inconsistency to flag for migration — the codebase uses **two incompatible definitions** of "department admin vs super admin":

- `frontend/src/services/api.ts:200` `authService.isDepartmentAdmin()` → `user.role === 'admin' && user.department !== 'Administration'`. Here the super admin is expected to have `department === 'Administration'`.
- `frontend/src/services/api.ts:206` `getAdminDepartment()` uses the same `department !== 'Administration'` rule, returning `null` for super admin (meaning "all departments").
- `frontend/src/pages/dashboard/AdminDashboard.tsx:173-175` defines `isSuperAdmin` differently: `role === 'admin' && !roll_no.startsWith('ADMIN_')`.

So whether an admin is "super" depends on which file is asking. `RegisterDeptAdmin.tsx` creates dept admins with `roll_no = 'ADMIN_<dept>'` and a real department (never `'Administration'`), which satisfies *both* rules for "dept admin." But a super admin must simultaneously have `department === 'Administration'` (for `getAdminDepartment` to return `null`) **and** lack the `ADMIN_` prefix (for `AdminDashboard` to show the all-departments UI). This dual contract is fragile and must be collapsed into a single role model during migration.

Role gating consumers:
- `getAdminDepartment()` (api.ts:206) returns the dept string for a dept admin, or `null` for super admin → used everywhere to scope queries (e.g. `AdminDashboard.tsx:260`, `BlockedStudentsSection.tsx:51,77`, `adminService.getRequestsByStatus` api.ts:1344).
- `isAdmin()` (api.ts:195) → `user.role === 'admin'`.

### 4.2 Data model

Tables/columns actually used by auth code:

**`users`** (primary identity table; `id uuid` = the Supabase Auth `auth.uid()`):
`id, username, name, password (PLAINTEXT), department, role ('student'|'admin'), email, roll_no, semester, mobile_number, position, profile_picture, year, fee_status, blocked, blocked_by, blocked_at, block_reason`. Also referenced elsewhere: `selected_electives` (jsonb), `approved_semester`, `payment_mode`, `transaction_number`, `bank_name`, `fee_receipt_url`, `created_at`, `updated_at`.

**`students25`** (roster/seed for current intake; queried at api.ts:45-49 by `roll_number`):
`roll_number, name, department, semester, year, email, section`. Note the login code reads `student.branch` (api.ts:84,136) with a fallback to `student.department` — the roster column is referred to as both `branch` and `department` in code, so confirm the real column name during migration.

**`students`** — older roster/seed table (same purpose, prior intake).

**The dual identity.** Every logged-in student has **two** records that must stay in sync:
1. A **Supabase Auth user** (in `auth.users`), created via `signInWithPassword` / `signUp`, keyed by `email`, password = roll number. This is what produces a JWT session.
2. A **`users` table row**, with `users.id` deliberately set equal to the Auth user's `id` (api.ts:123,131). This holds all app-level profile/role/fee/block data.

The Auth user gives you a session token; the `users` row gives you identity/role. `ProtectedRoute` checks #1; all role/permission logic reads #2 from `localStorage`. **Department admins have only a `users` row and NO Supabase Auth user** (see §4.4), which breaks `ProtectedRoute` for them (see §4.5).

### 4.3 Login flow

Entry point: `LoginForm.onSubmit` (`LoginForm.tsx:39`). Two distinct paths.

**Admin path** (checked first, `LoginForm.tsx:42-58`):
```
row = users.select('*').eq('username', data.username).eq('role','admin').single()
if (row && row.password === data.password):   // PLAINTEXT comparison
    localStorage.currentUser = row
    navigate('/dashboard')                     // NO Supabase Auth session created
```
Admins authenticate purely by a plaintext password match against `users`. No Supabase session is established.

**Student path** (`LoginForm.tsx:60` onward → `services/auth.ts:login` → `api.ts:authService.login`):

There are also two client-side feature flags at the top of `LoginForm.tsx` — `STUDENT_LOGINS_DISABLED` (line 9) and `DISABLE_LOGINS_FOR_22_23` (line 12) — that can block student logins by roll-number prefix.

`services/auth.ts:login` first runs a **detained** check (`isDetained`, auth.ts:5) against a hardcoded comma-separated list `DETAINED_STUDENTS` from `db/models`; detained roll numbers are rejected before any network call.

Then `api.ts:authService.login(username, password)` (api.ts:35):
```
1. Enforce username === password (the "roll number as password" rule). api.ts:40
2. student = students25.select().eq('roll_number', username).single()   // roster check, api.ts:45
   - not found → "Invalid roll number"
3. blockRow = users.select('blocked, block_reason').eq('username', username).single()  // api.ts:56
   - if blockRow.blocked → throw "BLOCKED_USER"        // login enforcement of block
4. signInWithPassword({ email: student.email, password: username })   // api.ts:67
5. IF sign-in fails:                                    // api.ts:74 (first-ever login)
     signUp({ email: student.email, password: username, options:{ data:{roll_number,name,department,semester,year}, emailRedirectTo:'/auth/callback' }})
     wait 1000ms
     signInWithPassword(...) again
       - if still fails → throw "Check your student email and confirm
         the mail from supabase to continue"          // EMAIL-CONFIRMATION CAVEAT
6. existingUser = users.select().eq('id', session.user.id).single()    // api.ts:120
     IF none → INSERT new users row with id = auth user id, role='student',
               password = roll_number, fee_status='not_uploaded', etc.  // api.ts:128-156
     ELSE → verify existingUser.password === username, else "Invalid roll number"  // api.ts:159
7. localStorage.setItem('currentUser', JSON.stringify(user))           // api.ts:166
```

**Email-confirmation caveat (a real operational bug):** if the Supabase project has "Confirm email" enabled, the very first login triggers `signUp`, but the immediate re-`signInWithPassword` fails because the email is unconfirmed → the student sees the "confirm the mail from supabase" error and cannot log in until they click the confirmation link in their student inbox. This is brittle and depends on a project-level Supabase setting.

`LoginForm.tsx:93` redundantly re-sets `currentUser` from `result.user` (api.ts:166 already set it). `BLOCKED_USER` is translated to a friendly "meet the HOD" toast at `LoginForm.tsx:102-105`.

### 4.4 Signup / registration

**Students never self-register.** There is no signup form. Account creation is implicit, inside the login flow (step 5 above): the roster (`students25`) is the source of truth, and the Auth user + `users` row are lazily created on first login. `validation.ts` defines a `signupSchema`, but no component uses it for student signup.

**Department admins** are created by `RegisterDeptAdmin.tsx` (mounted in `pages/admin/ManageDeptAdmins.jsx:168`). `handleRegister` (RegisterDeptAdmin.tsx:35):
```
1. Reject if users.username already exists.                  // line 51
2. INSERT into users:                                        // line 69
     { username, name, email, password (PLAINTEXT),
       department: selectedDept, role: 'admin',
       roll_no: `ADMIN_${selectedDept}`, semester:'',
       fee_status:'approved', created_at, updated_at }
```
Note the inline comments at lines 67-68 and 75: *"Skip Supabase auth and directly create the user… never store plain passwords."* So dept admins get **no Supabase Auth user and no `users.id` tied to `auth.uid()`** — the `id` is whatever default Postgres assigns. Their password is stored in plaintext and checked directly in `LoginForm.tsx:50`. There is no UI in this set of files for creating the **super admin** — it is presumably seeded manually in the DB (role `admin`, no `ADMIN_` prefix, department `Administration`).

`DEPARTMENTS` allowed for dept admins is a hardcoded list in `RegisterDeptAdmin.tsx:9-20` (IT, CSE, MECH, EEE, ECE, CSD, CSC, CSM, AERO, HSM).

### 4.5 Session model

Two stores, used inconsistently:

- **Supabase session** — JWT persisted by the Supabase client in `localStorage` under key `supabase.auth.token` (config in `lib/supabase.ts:7-15`: `persistSession`, `autoRefreshToken`, `detectSessionInUrl`). This is what `signInWithPassword` produces and what file uploads require (`uploadFeeReceipt` checks `getSession()`, api.ts:488).
- **`currentUser`** — a plain JSON snapshot of the `users` row in `localStorage` (set at api.ts:166 / LoginForm.tsx:52,93). All role logic (`getCurrentUser`, `isAdmin`, `isDepartmentAdmin`, `getAdminDepartment`) reads only this; it is never re-validated against the DB and is fully editable by the user in devtools.

**`ProtectedRoute`** (`ProtectedRoute.tsx:8-16`):
```
isAuthenticated = authService.isAuthenticated()   // returns a Promise!
if (!isAuthenticated) redirect /login
```
Two bugs here:
1. `authService.isAuthenticated()` (api.ts:183) is **async** and returns a `Promise`, which is always truthy. So `if (!isAuthenticated)` is never true and the gate effectively **always passes** — it does not actually protect routes.
2. Even if awaited, it only checks the **Supabase session**. Department admins (who have no Supabase session, §4.4) would fail it, while a user who only cleared `currentUser` but kept a stale Supabase token would pass. Role gating (admin vs student dashboards) is done separately inside the dashboard components by reading `currentUser`, not in routing.

**Role-gated rendering** happens inside components: `AdminDashboard.tsx:171-175` computes `adminDepartment / isDeptAdmin / isSuperAdmin` from `currentUser` and conditionally renders department pickers (line 742), the Blocked Students tab (line 822, 1401), and scopes every Supabase query by department.

### 4.6 Blocked students feature

Managed in `BlockedStudentsSection.tsx` (rendered as the "blocked" tab in `AdminDashboard.tsx:1401`).

- **Listing** (`fetchStudents`, line 67): `users.select('*').eq('role','student')`, additionally `.eq('department', adminDepartment)` when `isDeptAdmin` (line 77) so a HOD only sees/manages their own department.
- **Block** (`handleBlockStudent`, line 94): requires a non-empty `blockReason`; updates the `users` row → `{ blocked:true, blocked_by: currentUser.id, blocked_at: now, block_reason }` (lines 103-110).
- **Unblock** (`handleUnblockStudent`, line 128): sets `{ blocked:false, blocked_by:null, blocked_at:null, block_reason:null }`.
- `block_reason` is surfaced via "View Reason" (line 288) and shown in the unblock dialog (line 387).
- **Login enforcement** is in `authService.login` (api.ts:56-64): before `signInWithPassword`, it reads `blocked` for the username and throws `"BLOCKED_USER"` if true. `LoginForm.tsx:102` turns that into the "meet the HOD" message. **Caveat:** the block check is only in the *student* login path. The admin login path does not check `blocked`, and the check is purely client-side — anyone hitting Supabase directly with the anon key bypasses it entirely.

### 4.7 Security issues to FIX during migration

These are severe and must all be remediated:

1. **Plaintext passwords.** `users.password` stores the literal password. Students' is their roll number (api.ts:135); dept admins' is whatever was typed (`RegisterDeptAdmin.tsx:72`); comparisons are string equality (api.ts:159, LoginForm.tsx:50). → Never store passwords. Use the auth provider's hashed credential store (bcrypt/argon2 if rolling your own). Drop the `password` column entirely.
2. **Roll number used as the password** (api.ts:71,135). Roll numbers are public, sequential, and printed on ID cards — every student's password is effectively known. The username===password rule (api.ts:40) makes it worse. → Issue real credentials; force a first-login password set; never derive a secret from a public identifier.
3. **Fully permissive RLS.** The `users` table allows anon read/update of all rows. Combined with the public anon key, **any visitor can read every student's email/roll/profile and flip `blocked`, `role`, `fee_status`, or `password` on any account.** → Enable strict RLS: a user may read/update only their own row; role/`blocked`/`fee_status` mutations restricted to admin service-role calls executed server-side.
4. **Anon key hardcoded in source** (`lib/supabase.ts:3-5`). The URL + anon JWT are committed to the repo and shipped to every browser. With permissive RLS this is a full data-exfiltration vector. → Keep only the publishable/anon key client-side *with* enforced RLS; do all privileged operations through a backend using the service-role key that is never exposed.
5. **Client-side-only authorization.** All role checks read an editable `localStorage.currentUser`; `ProtectedRoute` is a no-op (§4.5). A user can set `role:'admin'` in devtools and access admin views, and (with permissive RLS) the queries will succeed. → Enforce authorization server-side on every request; never trust client-held role claims.
6. **Admins have no real session / block bypass.** Dept-admin login sets no JWT and skips the blocked check; the student blocked check is client-side only. → Put all accounts behind the same real auth + server-side policy.
7. **Inconsistent role definitions** (`department === 'Administration'` vs `ADMIN_` prefix) invite privilege-boundary bugs. → Single canonical role field.
8. **Lazy `signUp` + email-confirm dependence** (api.ts:74-112) couples auth correctness to a Supabase project toggle and leaves a 1-second race. → Provision accounts deterministically, not on first login.

### 4.8 ERP migration notes (clean re-implementation)

- **Single source of identity.** One canonical identity record per human, joined 1:1 to a `profiles`/`users` row by a stable id. Eliminate the "roster row → lazily created Auth user → mirrored `users` row" triangle. Seed roster data (`students25`/`students`) into the identity store at intake via an admin/import job, not at login time.
- **Proper hashed auth.** Use the IdP's password hashing (or bcrypt/argon2). First login forces the user to set a private password; roll number becomes a non-secret username/lookup key only. Support SSO if the institution has it.
- **RBAC, server-enforced.** Replace the derived-role guesswork with an explicit enum and (ideally) a join table for scope: `role ∈ {student, dept_admin, super_admin}` plus a `department` claim for `dept_admin`. Encode role + department in the signed token (Supabase custom JWT claims, or your backend's session). Every data access goes through RLS / API authorization that reads the *token's* claims, never a client value:
  - student → only own rows; dept_admin → rows where `department = token.department`; super_admin → all.
- **Real route + API guards.** `ProtectedRoute` must `await` a verified session and check role from the verified token, not `localStorage`. All mutations (block/unblock, fee approval, admin registration, role assignment) move behind backend endpoints using the service role; the browser only ever holds the publishable key.
- **Block/detain as first-class server logic.** Make `blocked`/detained a server-enforced check inside the auth/session-issuance step for *all* roles, so a blocked user cannot get a token regardless of client behavior. Keep the audit fields (`blocked_by`, `blocked_at`, `block_reason`).
- **Remove dead/duplicated paths.** Collapse the duplicate `currentUser` writes, remove the localStorage `token`/`getAuthHeaders` REST stubs that target a non-existent `/api/*` backend, and drop the hardcoded detained list in favor of a DB-backed status.

---

## 5. Course Registration & Electives

> This is the flagship workflow for the ERP rebuild, documented in depth including a critical production bug. **Read §5.6 (the bug) and §5.7 (migration) carefully — the current design encodes data into Postgres schema/table names and must not be carried forward.**

### 5.1 Purpose & overview

The portal shows a student the set of courses for their current semester and lets them pick their elective slots. Two kinds of courses:

- **Regular / mandatory courses** — fixed core courses for the student's department + semester. The student does not choose these; they are simply displayed.
- **Electives** — courses the student must choose, in two families:
  - **Professional Electives (PE)** — chosen from a pool *within* the student's own department. Grouped into **PE groups 1..7** (`pe_group_id`), surfaced as Roman-numeral "slots" like `PE-III`, `PE-IV`, plus lab variants like `PE-III-LAB`.
  - **Open Electives (OE)** — chosen from courses *offered by other departments* (a student may NOT pick an OE offered by their own department). Grouped into **OE groups 1..3** (`oe_group_id`), surfaced as `OE-I`, `OE-II`, `OE-III`.

A "slot" is one elective the student must fill; the student selects exactly one course per slot. Three relevant files:

- **`pages/dashboard/Courses.tsx`** — the production "My Courses" page (fee-gated, Mandatory / Electives tabs, confirm dialog).
- **`pages/dashboard/Electives.tsx`** — in-progress/debug elective picker (console.logs, "Debug Information" panels, "Create Test Open Elective Card" / "Force Re-render Cards" buttons, a fake hardcoded course). **Developer scaffolding — do not migrate.**
- **`components/Courses.tsx`** — dead/legacy Ant Design component using a REST `/api/electives/*` backend that no longer exists. **Dead code.**

### 5.2 Data model

**Authoritative Supabase tables:**
- **`courses`** — `id int`, `name`, `code` (unique), `department`, `semester`, `credits`, `is_elective bool`, `category ['PE'|'OE'|null]`, `pe_group_id 1..7`, `oe_group_id 1..3`, `offering_department`. The *intended* normalized catalog.
- **`student_electives`** — `id`, `student_id uuid`, `semester int`, `elective_type ['PE'|'OE']`, `slot`, `course_id`. The *intended* per-student ledger.
- **`users.selected_electives`** — a **jsonb map** like `{"PE-III": "<course_code>", "OE-I": "<course_code>"}`. **This is what the live code actually reads and writes.** It stores the **course_code**, not `course_id`.

**Important mismatch:** Although `courses` and `student_electives` exist as proper relational tables, the live frontend in `services/api.ts` does **not** query them. Instead it queries **per-department Postgres schemas** with **per-slot tables** (e.g. schema `it_courses`, table `PE-IV` or `III-II`) and persists selections into `users.selected_electives` jsonb. This schema-per-department / table-per-slot design is the source of the §5.6 bug.

**TypeScript interfaces — `db/models.ts`:**
- `Course` (lines 26-45): live shape uses `course_name` / `course_code`, plus derived UI flags `isElective`, `isAvailable`, `unavailableReason`, `enrolled_out`, `fromUserDepartment`, `peGroupId`, `oeGroupId`. Seed code in `db/database.ts` uses a different shape (`name`/`code`) — the `Course` type is internally inconsistent.
- `OpenElective` (lines 92-99): `id`, `course_code`, `course_name`, `department`.
- `UserCourse` (lines 72-78): a many-to-many join — **defined but unused.**
- `DETAINED_STUDENTS` (lines 102-103): hardcoded comma-separated string of ~30 roll numbers. See §5.5.

**Static seed data — `data/electiveCourses.ts`:** exports `openElectives` (`OE1`/`OE2`/`OE3`) and `professionalElectives` (`PE1`..`PE6` + `PE2LAB`), plus `getRelevantElectivesForSemester(semester)` mapping semester → applicable groups (sem 6 → PE2/PE3/PE2LAB + OE1; sem 7 → PE4/PE5 + OE2; sem 8 → PE6 + OE3; ≤5 → none). **Orphaned** — nothing in the live flow imports it, but it is the cleanest human-readable description of the real PE/OE group structure and credits (PE = 3 cr, PE labs = 1.5 cr, OE = 3 cr). Useful as a migration reference, not runtime data.

### 5.3 Course listing flow

Entry point: **`pages/dashboard/Courses.tsx`**.

1. **Determine the semester** (`useEffect`, lines 129-159): on mount / academic-year / `refreshKey` change, calls `studentService.getFeeReceiptStatus(academicYear)` and `getAdminFeeReceiptStatus(academicYear)`. Displayed semester = receipt's `semester` if present, else derived from roll number via `getSemesterForRoll(roll_no, academicYear)`. Numeric semester → `"III-II"` format by `convertSemesterNumberToFormat` (lines 81-92): `year = ceil(n/2)`, sem `n` odd→`I`/even→`II`, year→Roman.
2. **Fetch courses** (`fetchCourses`, lines 162-182 → `studentService.getCourses(selectedSemester)`).
3. **`studentService.getCourses(semester)` — `services/api.ts:253-380`** is the core query:
   ```ts
   const schema = `${user.department.toLowerCase()}_courses`;   // e.g. "it_courses"
   const { data } = await supabase
     .schema(schema)
     .from(semester)        // e.g. "III-II"  -> relation it_courses."III-II"
     .select("*");
   ```
   The semester course list lives in a **table named after the semester** inside a **schema named after the department**. No `WHERE department/semester` filter — they're encoded in the schema/table name.
4. **Elective derivation:** each row gets `isElective` from heuristics — `course_code === "OEC"`, or `course_name` containing `"professional elective"` / `"open elective"` (api.ts:283-305). Does **not** trust a stored `is_elective` column.
5. **Selected-electives map:** parses slot from course name (`"Professional Elective - III"` → `PE-III`), looks it up in `user.selected_electives` jsonb (api.ts:314-375).
6. **Client-side split** (`Courses.tsx:201-227`): `mandatoryCourses` vs `electiveCourses` recomputed with the same string heuristics.
7. **Enrollment limit (`enrolled_out`):** there is **no numeric capacity**. `enrolled_out` is a **boolean** per elective-option row; if true the option is disabled and selection rejected client-side (`Courses.tsx:311-314`, `865-904`). No count, no server-side decrement — an admin flips the boolean manually.
8. **Cross-department offerings:** OE option rows carry `offering_department`; UI marks unavailable (`fromUserDepartment`) when `offering_department === user.department`.

### 5.4 Elective selection flow

Dispatched by whether the slot name contains "open elective":

**Loading options (PE):** `studentService.getElectiveOptions(courseName)` — `api.ts:846-890`:
```ts
const schemaName = `${department.toLowerCase()}_courses`;
const electiveGroup = normalizedName.includes("Lab")
  ? normalizedName.split(" - ")[1].replace("Lab", "LAB")   // -> "III-LAB"
  : `PE-${normalizedName.split(" - ")[1]}`;                // -> "PE-III"
await supabase.schema(schemaName).from(electiveGroup).select("*");  // it_courses."PE-III"
```
Each PE slot is its **own table** inside the department schema. (See §5.6 — this string-built relation name is exactly what breaks.)

**Loading options (OE):** `getOpenElectiveOptions(courseName)` — `api.ts:1012-1160`. Builds `electiveGroup = "OE-<Roman>"`, queries `<dept>_courses."OE-I"`, maps each row with `isAvailable = !isFromUserDepartment && !isEnrolledOut`.

**Saving a PE selection:** `selectElective(courseId, electiveGroup)` — `api.ts:892-961`: read current `users.selected_electives` → re-derive `finalElectiveGroup` → look up chosen row by id in `<dept>_courses.<PE-slot>` to get its `course_code` → write `selectedElectives[finalElectiveGroup] = course_code` → `update users.set selected_electives`.

**Saving an OE selection:** `selectOpenElective(courseName, courseId)` — `api.ts:1162-1335`: because OE courses belong to other departments, it does a **linear scan across a hardcoded list of department schemas** (`it_courses, cse_courses, ece_courses, mech_courses, hsm_courses, aero_courses, csd_courses, csc_courses, eee_courses, csm_courses`), querying each `<schema>.<OE-slot>` until found; re-validates, then writes `selectedElectives["OE-I"] = course_code`.

**Conflict / availability rules (all client-enforced):** `enrolled_out` true → cannot select; OE from own department → cannot select; the confirm dialog says "cannot be changed later" but there is **no server-side immutability** (re-selecting overwrites the jsonb key); **no cross-slot uniqueness check** (same course can fill two slots).

### 5.5 Access gating

Three independent gates:

1. **Fee approval gate** (the visible course gate) — `Courses.tsx:511-519`:
   ```ts
   const adminFeeRequired = requiresAdminFee(academicYear);   // true for AY >= 2026-27
   const coursesUnlocked =
     feeStatus === "approved" &&
     (!adminFeeRequired || adminFeeStatus === "approved");
   ```
   Main fee from latest `fee_receipts` row for `(user_id, academic_year)`; admin office fee (₹4500) from `admin_fee_receipts`, required only for AY ≥ 2026-27. Until both required fees are `approved`, both tabs show "Fee Approval Pending."
2. **Semester gate** — if no semester resolvable, page shows "No approved semester found" and fetches nothing.
3. **Detained gate** — `services/auth.ts`: `isDetained(rollNo)` checks membership in `DETAINED_STUDENTS`; `login()` **blocks login entirely** for detained roll numbers. Login-time gate, hardcoded constant.

**Net:** courses unlock when the student is not detained, a semester is resolvable, the main fee for the selected academic year is `approved`, and — for AY ≥ 2026-27 — the admin office fee is also `approved`.

### 5.6 THE BUG — `csm_courses.PE-1` / `it_courses.PE-IV)` dynamic-relation errors

**Symptom (Postgres/PostgREST logs, actively firing):**
```
relation "csm_courses.PE-1" does not exist
relation "it_courses.PE-IV)" does not exist     <- note the stray ")"
```

**Root cause — the elective "slot" is used as a dynamically-built relation (table) name.** The PE path builds a table name by string-interpolating a fragment parsed from the course **name**, then passes it to PostgREST's `.from()`:

- **`services/api.ts:868-878`** (`getElectiveOptions`):
  ```ts
  const electiveGroup = normalizedName.includes("Lab")
    ? normalizedName.split(" - ")[1].replace("Lab", "LAB")
    : `PE-${normalizedName.split(" - ")[1]}`;        // builds "PE-IV", "PE-1", etc.
  await supabase.schema(`${schemaName}`).from(`${electiveGroup}`).select("*");
  ```
- **`services/api.ts:926-933`** (`selectElective`) — identical construction.
- OE path has the same shape at **`api.ts:1083-1088`** and **`api.ts:1244-1251`**.

`supabase.schema(X).from(Y)` resolves to relation `X.Y`. Two failure modes produce the two log lines:

1. **`csm_courses.PE-1`** — the Roman-numeral parse produced a numeric/garbled token (`PE-1` instead of `PE-I`), or that schema has no `PE-1` table. The slot is derived from `course_name.split(" - ")[1]`, which is brittle.
2. **`it_courses.PE-IV)`** — the **stray `)`** is the tell: a course name like `"Professional Elective - IV (Data Science)"` made `split(" - ")[1]` capture `IV)`, building table name `PE-IV)`. The parser never strips parenthetical/trailing text.

**Why it's fundamentally wrong:** the design encodes data (department, semester, slot) into **schema/relation identifiers** built from free-text names at runtime. Every malformed name becomes a different failing table lookup; `.from()` takes an identifier (not a bind parameter), so data-derived strings flow straight into relation names (injection-shaped risk); it requires N tables per department per slot plus the cross-schema scan.

**Correct fix — replace interpolated relations with a single table filtered by a parameterized column.** Store electives as rows in normalized `courses` (which already has `department`, `category`, `pe_group_id`, `oe_group_id`, `semester`, `offering_department`) and query by column filter, never table name:

```ts
// PE options:
const peGroupId = romanToInt(slotRoman);   // "IV" -> 4, validated 1..7, no parens
const { data } = await supabase.from("courses")
  .select("id, code, name, credits, enrolled_out, offering_department")
  .eq("department", user.department).eq("category", "PE").eq("pe_group_id", peGroupId);

// OE options (any department except own):
const { data } = await supabase.from("courses").select("*")
  .eq("category", "OE").eq("oe_group_id", oeGroupId).neq("offering_department", user.department);
```
Parse the slot into a **validated integer** (strict regex `/^(?:PE|OE)-(I|II|III|IV|V|VI|VII)(?:-LAB)?$/` + Roman→int, rejecting anything else) before it touches a query, and put it into `.eq(column, value)` — never `.from(name)`. This eliminates both errors and the cross-schema scan.

### 5.7 ERP migration notes — model course registration as a first-class, server-authoritative subsystem

**Normalized schema (replace schema-per-department / table-per-slot):**
```sql
courses(
  id uuid pk, code text unique, name text, credits numeric,
  department text, owning_department text,            -- offering dept (for OE)
  is_elective bool, elective_type text check (in ('PE','OE')),
  group_no int                                          -- PE 1..7 / OE 1..3
);
course_offerings(                                       -- a course offered in a term
  id uuid pk, course_id uuid fk, academic_year text, semester int,
  registration_window_id uuid fk
);
sections(                                                -- physical class instances
  id uuid pk, offering_id uuid fk, capacity int not null,
  seats_taken int not null default 0,
  check (seats_taken between 0 and capacity)
);
prerequisites(course_id uuid, requires_course_id uuid);
registration_windows(id uuid pk, opens_at timestamptz, closes_at timestamptz);
enrollments(
  id uuid pk, student_id uuid, section_id uuid fk,
  status text check (in ('enrolled','dropped','waitlisted')),
  created_at timestamptz,
  unique (student_id, section_id)                       -- idempotency / no double-enroll
);
enrollment_audit(id, student_id, section_id, action, actor, at, reason);
```

**Atomic seat allocation (prevents overbooking — the current `enrolled_out` boolean cannot):**
```sql
-- inside a single transaction / stored proc, run server-side:
UPDATE sections SET seats_taken = seats_taken + 1
 WHERE id = $section_id AND seats_taken < capacity
RETURNING id;                       -- 0 rows => full => return 409, do not enroll
INSERT INTO enrollments(student_id, section_id, status)
VALUES ($student, $section, 'enrolled')
ON CONFLICT (student_id, section_id) DO NOTHING;   -- idempotent
```
The conditional `UPDATE ... WHERE seats_taken < capacity` is the seat lock; concurrent requests serialize on the row, so capacity can never be exceeded. Optionally support waitlisting when full.

**Server-side validation (move every check out of the React client):** registration window open; prerequisites satisfied; fee approval (main + admin office fee per academic year) verified server-side; not detained; one course per elective slot; no duplicate course across slots; OE not from own department; section belongs to the student's department/semester.

**Idempotent enrollment & audit:** unique `(student_id, section_id)` + `ON CONFLICT DO NOTHING` makes retries safe. Every enroll/drop/swap writes an `enrollment_audit` row (who/what/when/why).

**What the current implementation does NOT handle (call-outs for the rebuild):**
- **No real capacity** — `enrolled_out` is a manually-flipped boolean, not a seat counter.
- **No transactions / no atomicity** — selection is a read-then-write on `users.selected_electives` jsonb; concurrent selections race, last-write-wins.
- **No server-side authorization** — all gating is client-side and bypassable; writes go directly to Supabase from the browser.
- **No prerequisites, no registration windows.**
- **No audit trail / immutability** — re-selecting silently overwrites the jsonb key despite the "cannot be changed" UI text.
- **No referential integrity** — `selected_electives` stores `course_code` strings in jsonb, not FKs; `student_electives` and `UserCourse` exist but are ignored.
- **Brittle data-in-identifiers design** — the direct cause of §5.6.
- **Inconsistent course shape** (`name`/`code` vs `course_name`/`course_code`).
- **Debug/dead code** — `Electives.tsx` and `components/Courses.tsx` must not be migrated.

---

## 6. Fees: Receipts, Approval & Academic Year

### 6.1 Purpose

The portal collects **two distinct fees per student per academic year**, each tracked by an independent uploaded receipt and approval workflow:

1. **Main fee** — primary tuition/semester fee. `fee_receipts` table, uploaded via the Fee Slip page.
2. **Administrative office fee (₹4500)** — a second fee introduced from AY **2026-27**. `admin_fee_receipts` table, uploaded via a dedicated card.

Key design points:
- **Per-academic-year ledger.** Receipts keyed by `(user_id, academic_year)`; latest row per year (by `uploaded_at` desc) is active. Older years are read-only history.
- **Gates course access.** For years ≥ 2026-27, **both** main fee **and** admin fee must be `approved`. Before 2026-27, only the main fee. Gating logic, `Courses.tsx:511-519` (see §5.5).

### 6.2 Academic-year system

All logic in `frontend/src/lib/academicYear.ts`.

- `CURRENT_ACADEMIC_YEAR = "2026-27"` (`:10`) — year students upload for; also the **DB default** for both receipt tables' `academic_year`, and the only year mirrored into `users`.
- `SELECTABLE_ACADEMIC_YEARS = ["2026-27", "2025-26"]` (`:13`) — newest-first; drives picker + validates selection.
- `ADMIN_FEE_INTRODUCED_ACADEMIC_YEAR = "2026-27"` (`:18`).
- `requiresAdminFee(academicYear)` (`:21-26`) — true when `academicStartYear(year) >= academicStartYear(2026-27)`. 2025-26 → false; 2026-27+ → true.
- `academicStartYear(year)` (`:29-31`) — `parseInt(year.slice(0,4))`.
- `getSemesterForRoll(rollNo, academicYear)` (`:39-54`) — derives the student's expected **odd (first) semester** from the roll's joining year:
  ```
  joinYY    = parseInt(rollNo.slice(0,2))             // "23R21A1285" -> 23
  startYear = academicStartYear(academicYear)          // "2026-27"   -> 2026
  studyYear = startYear - (2000 + joinYY) + 1          // 2026-2023+1 = 4
  semester  = (studyYear - 1) * 2 + 1                  // (4-1)*2+1 = 7
  ```
  Returns `null` outside 1–8 (callers fall back to manual pick). Examples for 2026-27: `23R2…`→7, `24R2…`→5, `25R2…`→3. When non-null, the semester `<select>` is auto-set and **disabled**.

**Context + persistence** (`contexts/AcademicYearContext.tsx`): `AcademicYearProvider` holds `academicYear`; `getInitialYear()` reads `localStorage["selectedAcademicYear"]` if in `SELECTABLE_ACADEMIC_YEARS`, else `CURRENT_ACADEMIC_YEAR`; a `useEffect` persists changes; `setAcademicYear` ignores invalid values; `useAcademicYear()` throws outside the provider. **Picker** (`AcademicYearPicker.tsx`) — shadcn `Select` bound to context; mounted on Fee Slip, Student Requests, Fee Reports.

### 6.3 Data model

`fee_receipts` and `admin_fee_receipts` are identical (see §3 for columns). Key points:
- `id` (uuid) PK — **this id is what the HOD review flow updates** (request.id == receipt.id).
- `status` default `'pending'`; UI treats absence of a row as `not_uploaded`.
- Two **PUBLIC** storage buckets: `fee-receipt-files`, `admin-fee-receipt-files`. Path: `${session.user.id}/${academicYear}_${semester}_${Date.now()}.${ext}` (api.ts:521-523, :674-676). Storage RLS requires `foldername[1] == auth.uid()`.
- **`users.fee_status` mirror** — `users` carries denormalized `fee_status`, `approved_semester`, `payment_mode`, `transaction_number`, `bank_name`, `fee_receipt_url`, `rejection_comment`, `reviewed_at`. These mirror the **main fee** for the **current academic year only**. The admin fee is **never** mirrored. Older years never mirrored (previous-year state never overwritten).

### 6.4 Student upload flow

**Main fee** — `pages/dashboard/FeeSlip.tsx` (renders `<AdminFeeSlipCard />` at the bottom, `:590`).
- Status load: `getFeeReceiptStatus(academicYear)` (`:64-84`), re-runs on `currentUser?.id` / `academicYear` change. A separate `useEffect` checks `supabase.auth.getSession()`.
- **Mobile-number gate** (`:466-498`): upload UI hidden until a 10-digit mobile is saved to `users.mobile_number`.
- Client validation (`:138-222`): **PDF only**, **≤ 1 MB**, required `semester` + `paymentMode`, and (Online / Offline bank-to-bank) `transactionNumber` + `bankName`. Re-checks session before upload.
- Delegates to `studentService.uploadFeeReceipt(...)` (`api.ts:474-603`):
  ```
  session = getSession()  -> error if none
  # service-layer validation is LOOSER than UI: allows PDF|JPEG|PNG, <= 5MB
  fileName = `${uid}/${academicYear}_${semester}_${Date.now()}.${ext}`
  upload to bucket "fee-receipt-files" (upsert:false)
  publicUrl = getPublicUrl(fileName)
  insert into fee_receipts { user_id, semester, file_path, file_url, payment_mode,
                             transaction_number, bank_name, status:'pending',
                             academic_year, uploaded_at }
  if dbError: storage.remove([fileName]); throw   # rollback orphaned file
  if academicYear == CURRENT_ACADEMIC_YEAR:
     update users {approved_semester, payment_mode, transaction_number, bank_name,
                   fee_receipt_url, fee_status:'pending'} where id=uid
  ```

**Admin fee** — `components/dashboard/AdminFeeSlipCard.tsx`. The whole card **returns null when `!requiresAdminFee(academicYear)`** (`:67`), so it only appears for 2026-27+. No mobile gate. Loads via `getAdminFeeReceiptStatus(academicYear)` (captures `review_notes`). Uploads via `uploadAdminFeeReceipt(...)` (`api.ts:638-721`) into bucket `admin-fee-receipt-files` / table `admin_fee_receipts`, **with no users mirror**. Also surfaces an `on_hold` state (the main FeeSlip page does not).

### 6.5 HOD / admin review flow

UI: `pages/dashboard/StudentRequests.tsx`. A `receiptType` toggle (`"main"|"admin"`) selects `receiptTable` (`:104-106`).

**Load query** (`fetchRequests`, `:135-307`):
1. Students from `users` where `role='student'`, scoped to the admin's department (dept-admins pinned; super-admins one-or-all), optional year filter (handles Roman + numeric).
2. All `receiptTable` rows where `academic_year == academicYear`, ordered `uploaded_at` desc.
3. `latestReceiptByUser` Map keeps the latest receipt per `user_id`.
4. Merge: `id = receipt?.id || user.id`, `status = receipt?.status || "not_uploaded"`. **request id = receipt id** so approval updates the correct row.
5. Also computes an "Unregistered Students" list (`students25` rows not in `users.roll_no`).

**Approve** (`handleUpdateStatus`, `:417-460`):
```
adminSupabaseService.updateFeeReceiptStatus(requestId, "approved", academicYear,
   { userId: request.user.id, reviewedBy: currentUser.id, table: receiptTable })
then sendEmailNotification(request, "approved")
```
**Reject / On-hold** (`:372-415`) open a dialog requiring a comment (confirm disabled until non-empty), then `updateFeeReceiptStatus(id, "rejected"|"on_hold", academicYear, { comment, userId, reviewedBy, table })` + email.

**`updateFeeReceiptStatus`** (`adminSupabaseService.ts:225-276`):
```
table = options.table || "fee_receipts"
receiptUpdate = { status, reviewed_at: now }
if reviewedBy: receiptUpdate.reviewed_by = reviewedBy
if (status in {rejected,on_hold}) and comment: receiptUpdate.review_notes = comment
update <table> set receiptUpdate where id = receiptId
# mirror — main fee + current year only:
if table=="fee_receipts" and academicYear==CURRENT_ACADEMIC_YEAR and userId:
   userUpdate = { fee_status: status, reviewed_at: now }
   if (status in {rejected,on_hold}) and comment: userUpdate.rejection_comment = comment
   update users set userUpdate where id = userId
```

**EmailJS notification** (`sendEmailNotification`, `:315-370`) — `emailjs.send(SERVICE_ID, TEMPLATE_ID, {to_email,to_name,subject,message})`, body hardcoded ("Your fee receipt has been {Status}…", signed "Edmit Team"). **Best-effort**: a failure only toasts; the status update has already committed, so a failed email does not roll back the approval. Body always says "fee receipt" even for admin-fee actions.

> **This is the flow you asked me to test earlier — it passes.** Production data confirms uploads succeed (storage logs) and approvals persist with `reviewed_by` + `reviewed_at` + the `users.fee_status` mirror.

### 6.6 Fee reports & analytics

`pages/dashboard/FeeReports.tsx` guards on `isAdmin()`, loads departments for super-admins, renders `FeeReportsSection`.

`components/admin/FeeReportsSection.tsx`:
- Filters: academic-year, department (super-admin only), year I–IV.
- Data build (`:97-274`): students from `users` → their `fee_receipts` for the year fetched **in chunks of 150 ids** → latest per user → tally `approved/pending/rejected/on_hold` + a `not_uploaded` bucket. **Reads only `fee_receipts` (main fee) — no admin-fee analytics.**
- Unregistered count = scoped `students25` − registered `users`.
- Summary tab: Total Students, Pending, Approved, recharts pie. Detailed tab: per-student table (status, name, roll, dept, payment mode, UTR + bank, date).

`StudentRequests.tsx` also offers **Excel export** (`xlsx`) of the filtered list + unregistered list, plus per-receipt PDF preview/download.

### 6.7 Known issues / gotchas

- **Dead localStorage stub.** `studentService.approveFeeReceipt(userId, approve)` (`api.ts:1421-1448`) mutates `localStorage["feeReceipts"]`, touches no real table, unused. Remove.
- **Validation mismatch.** UI enforces PDF-only ≤ 1 MB; service layer allows PDF/JPEG/PNG ≤ 5 MB (`api.ts:507-516`, `:664-669`). Non-UI callers could store images; previews use `<embed type="application/pdf">` and break on images.
- **Hardcoded year config** — rolling over a year requires a code change + redeploy; the DB column default `'2026-27'` is separate and must be kept in sync.
- **Best-effort email** — no retry, no audit log, body hardcoded to "fee receipt" even for admin fee.
- **Public buckets** — `file_url` is a permanent public URL; no signed-URL expiry.
- **Client-trusted approval** — approval is a direct browser→Supabase update; authorization enforced only in UI + permissive RLS.
- **Reports omit the admin fee.**

### 6.8 ERP migration notes

- **Generalize fee types.** Replace the two hardcoded tables/buckets with a `fee_types` table (id, name, amount, `applicable_from_academic_year`, `is_required`, `mirrors_to_user`) + one `fee_receipts` table with a `fee_type_id` FK. `requiresAdminFee` becomes a query; one upload path and one review path parameterized by `fee_type_id` instead of branching on `receiptTable`.
- **Server-side approval & authorization.** Move `updateFeeReceiptStatus` into a server endpoint / RPC / edge function that verifies the reviewer is authorized for the student's department, sets `reviewed_by`/`reviewed_at`, writes an immutable audit record, and triggers notification transactionally.
- **Signed URLs instead of public buckets.** One private bucket; serve receipts via short-lived signed URLs gated on reviewer authorization.
- **Course-access gating as data** — express "all required fee types for this year approved" as a derived query over `fee_types` × `fee_receipts`.
- **Drop the `users` mirror** — read status from the per-year ledger everywhere.
- **Validate once, server-side** — single file type/size check.
- **Year configuration in DB** — store academic years (current/selectable flags) in a table; rollover is an admin action, not a redeploy.

---

## 7. Requests, Gate Pass, Notifications, Events & Support

A recurring theme: the original design used a generic `requests` table served by a REST API (`/api/requests`), but the live app migrated almost everything to direct Supabase queries against `users` and `fee_receipts`. The result is a large amount of dead/stale code an ERP rebuild should not carry forward.

### 7.1 Requests system (generic request model)

**Intended data model** — `db/models.ts:59-69`: `Request { id, userId, type: "gatepass"|"feeslip"|"elective", status: "pending"|"approved"|"rejected"|"on_hold", details, holdStartDate?, ... }`, matching DB `requests` (id, user_id, type, status default `pending`, `details` jsonb, `hold_start_date`, `department_id`, timestamps). `on_hold` pairs with `hold_start_date`.

**Status lifecycle (as designed):** `pending` → `approved` | `rejected` | `on_hold`.

**Two competing service layers exist for the same operations:**
- REST/axios — `services/requestService.js` (`.d.ts` typed): `getMyRequests()`→`GET /api/requests/my`, `getDepartmentRequests()`→`GET /api/requests/department`, `createRequest()`→`POST /api/requests`, `updateRequestStatus()`→`PATCH /api/requests/:id`. A second axios `updateRequestStatus` is also in `adminService` (`api.ts:1450-1456`), plus `submitGatePassRequest` (`:749-777`), `submitFeeSlipRequest` (`:723-747`), `getRequests` (`:779-791`), `getRequestsByStatus` (`:1340-1361`), `getAllRequests` (`:1363-1382`) all `fetch("/api/requests...")`.
- MySQL — `services/database.ts` (`updateRequestStatus` line 116 + `requests` INSERT/SELECT) via `pool.execute`. The original Node/MySQL design, now unused.

**INCONSISTENCY / STALE ENDPOINT (flag):** `/api/requests` no longer exists. Every call against it 404s. `Requests.tsx` still imports `requestService.getMyRequests()` (`:29,48`) — it fails, the `catch` swallows it (`:50-51`), `requests` stays `[]`. The DB `requests` table has **0 rows and RLS DISABLED**.

**What `Requests.tsx` actually does today** — despite the name, the routed student page (`App.tsx:72`, `path="requests"`) is titled "My Fee Receipt Status": calls the dead `getMyRequests()` (→ `[]`), loads per-year main + admin fee via `getFeeReceiptStatus` / `getAdminFeeReceiptStatus` (`:61-79`), mixes those into pending/approved/rejected counts (`:93-104`), renders `renderFeeStatusCard` incl. `review_notes` for rejected/on_hold (`:305-358`), uses `AcademicYearPicker` + `requiresAdminFee`, and shows a 10-second "log out/in to refresh" toast (`:82-89`). **So "requests" is effectively fee-receipt review only.**

**Admin review surfaces — two:**
- `components/admin/RequestList.tsx` — "Pending Fee Slip Approvals." Queries `users` (`fee_status='pending'`, `role='student'`) directly (`:59-88`), synthesizes `type:"feeslip"` rows, approve/reject/hold via `adminSupabaseService.updateRequestStatus` (`:139`) → updates `users.fee_status`. **STALE & not imported in `App.tsx`** → dead code.
- `pages/dashboard/StudentRequests.tsx` — the live admin page (`App.tsx:77`, "Student Management"). Joins `users` with per-year `fee_receipts`/`admin_fee_receipts` (see §6.5). The current source of truth.

**ELECTIVE type — dead.** `type:"elective"` exists only in the model; no code creates/reviews one (electives are handled in `Electives.tsx`).

### 7.2 Gate Pass

`pages/dashboard/GatePass.tsx` — fields `reason` (Textarea) + `date`, validated by `gatePassSchema` (`validation.ts:27-30`). `onSubmit` → `submitGatePassRequest(reason, date)` → `POST /api/requests` `{type:"gatepass", status:"pending", details:{reason,date,studentName,rollNo}}`.

**STUB / NON-FUNCTIONAL.** `GatePass.tsx` is **not imported or routed in `App.tsx`** (no `path="gatepass"`) → unreachable. Submit hits the dead `/api/requests`. **No admin-side gate-pass review UI** exists. Effectively abandoned.

### 7.3 Notifications

**Model** (`models.ts:81-89`): `Notification { id, title, description, department, deadline?, readBy?, createdAt }`. DB `notifications`: `read_by` jsonb, `department` (name or `'All'`), `deadline`, `created_at`. **0 rows, RLS DISABLED.**

**Reads (student):** `getNotifications()` (`api.ts:793-808`) → `.or(department.eq.${user.department}, department.eq.All)`. Two near-duplicate components render these:
- `pages/dashboard/Notifications.tsx` — read-state in **localStorage** `readNotifications` (global, not per-user) + `unreadNotificationsCount`.
- `components/dashboard/NotificationList.tsx` — **per-user** localStorage `read-notifications-${userId}` + `unreadNotificationsCount-${userId}`; polls every 30s.

**INCONSISTENCY (read tracking):** three mechanisms that don't agree — global localStorage, per-user localStorage, and a server-side `markNotificationAsRead` (`api.ts:810-839`) writing the `read_by` jsonb column **that is never called**. So the `read_by` column is dead in practice.

**NotificationBadge** (`NotificationBadge.tsx`) — bell + count from per-user localStorage `unreadNotificationsCount-${userId}`, re-polls every 5s, listens to cross-tab `storage` events, caps at `99+`. In sync with `NotificationList`, **not** with `Notifications.tsx`.

**Who creates** — `adminService.createNotification` (`api.ts:1384-1400`) requires `role==="admin"`, then `db.createNotification` (MySQL `INSERT`, unused backend).

### 7.4 Events

`pages/dashboard/Events.tsx` (`App.tsx:78`, `path="events"`, "Events & Notifications") is the **admin** notification-authoring page.
- **Create tab:** form (`title`, `description`, optional `deadline`, hidden `department` force-set to the admin's own dept) validated by `notificationSchema` (`validation.ts:33-37`); `onSubmit` → `createNotification(...)`.
- **History tab:** **DATA SOURCE INCONSISTENCY** — `fetchNotifications()` reads from **localStorage** key `notifications` (`:39`), not Supabase. Meanwhile create targets the MySQL backend. So created notifications + history + what students read are three different stores that never reconcile. **In the Supabase-only deployment this flow is broken** — admins cannot reliably publish a notification students will see.

### 7.5 Support / Student Issues

**The only feature in this scope fully wired to Supabase and working end to end.** Backed by `student_issues` (see §3 for columns). **RLS ENABLED.**

**Student side** — `pages/dashboard/SupportIssues.tsx` (`App.tsx:73`, `path="support"`):
- Submit: `issue_type` (`technical|academic|administrative|fee|other`), `subject` (≤200), `description` (≤2000); department read-only. `handleSubmit` inserts with `status:"pending"` (`:119-129`).
- "My Issues" tab: `student_issues` where `student_id = currentUser.id` ordered `created_at desc` (`:91-95`); RLS scopes a student to their own rows. View dialog shows `admin_response` + `responded_at`.

**Admin/HOD side** — `components/admin/StudentIssuesSection.tsx`:
- `fetchIssues()` selects **all** then filters client-side by `adminDepartment` (`:102-133`). **Flag:** admins lack a Supabase auth session so they bypass RLS and filter in the browser (security-sensitive).
- Search + type filter; tabs All/Pending/In Progress/Resolved. `handleRespond()` (`:135-175`) sets `admin_response`, new `status`, `responded_by`, `responded_at`, optional `priority`. Transitions are free-form. **No email is sent** on response.

### 7.6 Email notifications

**Edge function** — `supabase/functions/send-email/index.ts`: Deno `serve` handler, `POST {to,subject,html,from}`, TLS SMTP to `smtp.gmail.com:465` using `SMTP_USERNAME`/`SMTP_PASSWORD`, default from `noreply@edmit.com`, handles CORS. A generic SMTP relay. **INCONSISTENCY: no frontend code invokes it** (no `functions.invoke`/`send-email` reference in `frontend/src`).

**EmailJS** — `StudentRequests.tsx` (only file importing `@emailjs/browser`): init with `VITE_EMAILJS_PUBLIC_KEY`; `sendEmailNotification` (`:315-370`) → `emailjs.send(SERVICE_ID, TEMPLATE_ID, {...})`. Triggered on fee-receipt approve/reject/hold only. Sent from the browser; failures non-blocking. **So: fee-receipt status → EmailJS (browser) → student.** The edge function is unused dead infrastructure. No emails for gate pass, notifications, or support responses.

### 7.7 ERP migration notes

- **Unify into one generic workflow/approval engine.** At least three parallel "request" implementations exist (generic `requests` via REST, `users.fee_status` via `updateRequestStatus`, per-year receipts via `updateFeeReceiptStatus`). Rebuild around a single `requests`/`approvals` table keyed by `(type, subject_id, academic_year)` with a typed status enum + `hold_started_at`. Fee slips, gate passes, electives, support issues are all the same shape: submitter, reviewer, status timeline, reviewer note. Per-type metadata in JSON.
- **Delete the stale REST + MySQL layers.** `requestService.js/.d.ts`, `database.ts`, every `fetch("/api/requests…")` / `axios.patch("/api/requests/:id")`. `RequestList.tsx` and `GatePass.tsx` are unrouted dead components.
- **Proper RLS everywhere.** `requests`/`notifications` have RLS DISABLED; `StudentIssuesSection` admins bypass RLS and filter in-browser. Enable RLS; enforce dept/role scoping server-side; give admins real authenticated roles.
- **Server-side read tracking for notifications.** Replace the three localStorage schemes + unused `read_by` with a `notification_reads(notification_id, user_id, read_at)` join table; compute unread counts from the DB.
- **Reconcile notification authoring** — point create + history + student reads at one `notifications` table; add real `'All'`/multi-dept targeting.
- **Centralize email through the edge function** (or a queue), invoked server-side, templated HTML; stop sending from the browser via EmailJS.
- **Real ticketing for support** — generalize `student_issues` into threaded comments (not one `admin_response` field), assignment, SLA via `priority`, notifications on response. Make gate pass a first-class request type with an admin queue.

---

## 8. Admin Dashboard, Profile, App Shell & Build/Deploy

The product ships as **"Edmit"** (repo dir `EduJunction`), the portal for **MLR Institute of Technology (MLRIT)**, deployed at `edmit.mlrit.ac.in`. Bootstrapped by **Lovable** (`index.html:35` still loads `cdn.gpteng.co/gptengineer.js`).

### 8.1 App shell & routing

**Entry** — `main.tsx`: `createRoot(...).render(<App />)`. No `StrictMode`.

**`App.tsx`** wraps (outer→inner): `QueryClientProvider` → `TooltipProvider` → `<Toaster/>` (Radix) + `<Sonner/>` → `BrowserRouter` → `Routes`. (Both toast systems mounted.)

**Route table** (`App.tsx:50-84`):

| Path | Element | Access |
|------|---------|--------|
| `/` | `Home` | Public |
| `/login` | `Login` | Public |
| `/about`, `/features`, `/help`, `/contact` | static pages | Public |
| `/dashboard` | `ProtectedRoute > DashboardLayout` (with `<Outlet/>`) | Protected |
| `/dashboard` (index) | `DashboardIndex` | Role-based landing |
| `/dashboard/profile` | `Profile` | Protected |
| `/dashboard/courses` | `Courses` | student |
| `/dashboard/services/feeslip` | `FeeSlip` | student |
| `/dashboard/requests` | `Requests` | student |
| `/dashboard/support` | `SupportIssues` | student |
| `/dashboard/admin` | `AdminDashboard` | admin (not in sidebar) |
| `/dashboard/student-requests` | `StudentRequests` | admin |
| `/dashboard/events` | `Events` | admin |
| `/dashboard/fee-reports` | `FeeReports` | admin |
| `*` | `NotFound` | Catch-all |

**Routing is NOT role-enforced** — all `/dashboard/*` sit behind one `ProtectedRoute` that only (incorrectly) checks authentication. Admin pages are reachable by any logged-in user who knows the URL; the only role gating is which links the sidebar renders.

**Role-based landing** — `DashboardIndex` (`:39-42`): `isAdmin() ? <AdminDashboard/> : <Courses/>`.

**`ProtectedRoute`** — calls `authService.isAuthenticated()` (async, api.ts:183) and `<Navigate to="/login"/>` if falsy. **Bug:** the function is `async` (returns a Promise = always truthy), so the gate always passes. The real redirect happens inside `DashboardLayout`'s `useEffect` (same caveat).

**`DashboardLayout`** — top bar (brand "Edmit" + `BookUser`) + hamburger opening a `Sheet` drawer holding `SidebarContent` (no persistent desktop sidebar). `menuItems` role-based (`:59-113`): **admin** → Dashboard, Profile, Student Requests, Events & Notifications, Fee Reports; **student** → My Courses, Fee Slip, My Requests, Support & Issues, Profile. Wraps `<Outlet/>` in `AcademicYearProvider` (`:275-277`) so academic-year context is available to dashboard pages.

### 8.2 Admin dashboard

`pages/dashboard/AdminDashboard.tsx` — "Detailed Reports Dashboard" (a fee-receipt analytics dashboard).
- **Role model** (`:170-176`): super admin = `role==='admin'` & `roll_no` not starting `ADMIN_` & dept `Administration`; dept admin = `role==='admin'` w/ specific dept; data locked to `adminDepartment`.
- **Filters:** academic year (context), `selectedYear` (I–IV/all), `selectedDepartment` (super-admin). `useEffect` (`:177-615`) refetches on any change. Handles Roman + numeric year formats.
- **Data flow** (direct `supabase` queries): students from `users`; **academic-year aware** (`:288-330`) — per user fetch latest receipt for selected `academic_year` (chunked 150/query) and **override** `fee_status` etc.; unregistered via `students25` diff (`:333-419`).
- **Overview metrics** (`:835-994`): Total Students, Total Requests, fee-status counts (Approved/Pending/Rejected/On Hold/Not Uploaded).
- **Tabs** (`:783-1408`): Overview, Yearly Reports, Department Reports, Charts & Analytics (recharts Pie + Bar), Detailed View, Blocked Students (`BlockedStudentsSection`), Student Issues (`StudentIssuesSection`).
- **Excel export** — `handleDownloadExcel` (`:617-653`) via `xlsx`.

**`adminSupabaseService` methods** (`services/adminSupabaseService.ts`):

| Method | Description | Tables |
|---|---|---|
| `getAllDepartments()` | Distinct non-null departments | `users` |
| `getAllRequestsSupabase(year?)` | All fee requests → `AdminRequest[]`; Roman/numeric year filter | `users` |
| `getPendingFeeSlipRequests()` | `fee_status='pending'` rows | `users` |
| `updateRequestStatus(id, status, comment?)` | **Legacy** `users.fee_status` + `reviewed_at` (+`rejection_comment`) | `users` |
| `updateFeeReceiptStatus(receiptId, status, academicYear, options?)` | Year-aware approval; mirrors to `users` for current-year main fee | `fee_receipts`/`admin_fee_receipts`, `users` |
| `getUnregisteredStudents(department, year?)` | `students25` roll not in `users.roll_no` | `students25`, `users` |
| `updateAdminPassword(userId, newPassword)` | **Plaintext** password write | `users` |

### 8.3 Profile

`pages/dashboard/Profile.tsx` — `getProfile()` (works for students + admins). Read-only fields: Name, Roll No, Email, Mobile, Department; students see Semester, admins see Position. An edit flow exists but **the Edit button is never rendered** and the real API call is commented out → **dead/mock code**. **Password change** (admin-only, `:159-215`) → `updateAdminPassword` (plaintext).

**Profile picture** (`components/profile/ProfilePicture.tsx`) — **not backed by storage.** Reads/writes a base64 data-URL in `localStorage` `profilePicture-${userId}` (max 5 MB, image-only), falls back to initials. Device-local, never persisted server-side.

### 8.4 Department admin management

- `getUnregisteredStudents(department, year?)` (`adminSupabaseService.ts:278-327`) — `students25` vs registered `users.roll_no` diff. (AdminDashboard reimplements this inline.)
- **No dedicated register/manage dept-admins UI** in the reviewed files (besides `RegisterDeptAdmin.tsx`, §4.4). Dept admins distinguished by data convention (`department !== "Administration"` / `roll_no` prefix `ADMIN_`); accounts appear seeded directly in `users`.
- `updateAdminPassword` (plaintext) surfaced via Profile only.

### 8.5 Public / marketing pages

- **`Home.tsx`** — landing hero, "EDMIT - COURSE REGISTRATION", Login + "Get Started" CTAs, MLRIT logo (`/MLRIT.png`), two feature cards, footer (About/Contact/Help).
- **`about.tsx`** — static MLRIT/EDMIT copy (history, Vision, Mission). Dark theme.
- **`features.tsx`** — **stub** (one placeholder sentence).
- **`help.tsx`** — embedded YouTube walkthrough + FAQ (username/password = roll number; wait for HOD fee approval; UTR explanation).
- **`contact.tsx`** — support contacts (mailto links).
- **`Login.tsx`** — `LoginForm` over `/background.jpg`; login-issues support email **24R21A05HG@mlrit.ac.in**.
- **`NotFound.tsx`** — 404; logs path, links to `/`.

### 8.6 UI kit & styling

Standard **shadcn/ui** (`components.json`: style "default", baseColor "slate", aliases `@/components`, `@/lib`, `@/hooks`) on **Radix UI**, **Tailwind** + `tailwindcss-animate` + `@tailwindcss/typography`, `cn()` util, **lucide-react**. ~50 components in `components/ui/`. Notes:
- **`Modal.tsx`** — hand-rolled (non-shadcn) overlay+card; prefer `dialog.tsx`/`drawer.tsx`.
- **`sidebar.tsx`** — shadcn sidebar primitive, **not used** (DashboardLayout rolls its own Sheet nav).
- Both **sonner** and Radix **toast** are mounted (consolidate). **react-hook-form** + **zod**, **@tanstack/react-query** (light usage), **recharts**, **date-fns**, **embla-carousel**, **vaul**, **next-themes**, **cmdk**, **input-otp**.
- **Theme** (`tailwind.config.ts`): `darkMode: class`, HSL CSS-variable tokens + custom `edu` palette (`edu-primary #3b82f6`, `edu-secondary #f97316`, `edu-dark #1e40af`); keyframes `accordion-down/up`, `fade-in`, `spin-slow`.

### 8.7 Build, config & tooling

- **Stack:** Vite 7.x (`plugin-react-swc`), React 19, TS 5.5 (`frontend/package.json` name = Lovable default `vite_react_shadcn_ts`).
- **Scripts:** `dev: vite --host`, `build: vite build`, `build:dev`, `lint: eslint .`, `preview`.
- **`vite.config.ts`:** `@`→`src` alias; dev port 5173; `allowedHosts: ['edmit.mlrit.ac.in']`; proxy `/api → http://localhost:3000` (expects a Node backend not in this repo). A **second conflicting `vite.config.js`** exists — stale, remove.
- **TS:** `tsconfig.json` strict; `tsconfig.app.json` **strict:false / noImplicitAny:false** (the app compiles loosely).
- **ESLint** flat config; `@typescript-eslint/no-unused-vars: "off"`.
- **`index.html`:** title "Edmit"; OG/Twitter meta point at `lovable.dev`; includes `cdn.gpteng.co/gptengineer.js` (remove).
- **Env vars used:** only `VITE_EMAILJS_PUBLIC_KEY`, `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID` (all in `StudentRequests.tsx`). No `.env` present. No Supabase env vars — **hardcoded** in `lib/supabase.ts:3-5` (URL + full anon JWT, committed). Rotate + move to env.
- **Edge function:** `supabase/functions/send-email/index.ts` (Deno, Gmail SMTP, `SMTP_USERNAME`/`SMTP_PASSWORD` secrets). Deploy: `supabase functions deploy send-email`. Unused by the frontend.
- **Legacy deps to prune:** root `package.json` → `bcryptjs` (unused; passwords are plaintext), `xlsx`. `frontend/package.json` → `mysql2`, `sequelize`, `sequelize-cli`, `nodemailer`, `axios` (don't belong in a browser bundle), `lovable-tagger`.

### 8.8 ERP migration notes

**Keep:** the shadcn/ui + Radix + Tailwind kit and `edu` tokens; `DashboardLayout`'s role-driven menu pattern; the `AcademicYearProvider` per-year, receipt-as-source-of-truth model; Vite + React 19 + TS; recharts; the Excel-export helper.

**Replace / fix:** hardcoded Supabase URL+key → env + rotate (add `.env.example`); plaintext passwords → real hashed auth; add **role-based route guards** (any logged-in user can currently hit admin pages); consolidate the three data layers onto one server-authoritative service; pick one email path (prefer the edge function); profile pictures → real Storage bucket; finish/remove dead profile-edit + dual toasts; strip Lovable artifacts; normalize magic-string role/department + dual year formats.

**Recommended project structure:** `src/{components/ui, components/<feature>, pages/{public, dashboard}, services (one typed layer), contexts, lib, hooks}`; centralized env config; route-level role guards; one toast lib; Supabase migrations + edge functions under `supabase/`.

---

## 9. Cross-Cutting Issues & Security Defects

A consolidated checklist (every item appears in a feature section above). **Treat these as blocking for any ERP migration.**

| # | Severity | Issue | Fix |
|---|---|---|---|
| 1 | 🔴 Critical | **Plaintext passwords** in `users.password`; roll number used as password | Real hashed auth (Supabase Auth / argon2); drop `password` column |
| 2 | 🔴 Critical | **Permissive RLS** on `users`/`fee_receipts`/`admin_fee_receipts`; **RLS disabled** on 7 tables | Strict per-row RLS keyed to verified JWT claims; privileged writes via service role only |
| 3 | 🔴 Critical | **Anon key + Supabase URL hardcoded** in source, committed | Env vars; rotate key; never ship service role to browser |
| 4 | 🔴 Critical | **No server-side authorization**; role read from editable `localStorage`; `ProtectedRoute` is a no-op (async-as-truthy) | Verify session + role server-side on every request; real route guards |
| 5 | 🟠 High | **Course-registration bug** — dynamic relation names (`csm_courses.PE-1`, `it_courses.PE-IV)`) from free-text parsing | Normalize to `courses` table; `.eq(column, validatedValue)`; never `.from(dataDerivedName)` |
| 6 | 🟠 High | **No transactional seat allocation / capacity** for electives | Atomic `UPDATE … WHERE seats_taken < capacity` + unique enrollment constraint |
| 7 | 🟡 Med | **Dead/stale code & data layers** — `/api/requests` REST, MySQL/Sequelize, `RequestList`, `GatePass`, `Electives` debug page, `components/Courses.tsx`, `approveFeeReceipt` stub | Delete; consolidate on one service layer |
| 8 | 🟡 Med | **Notification read-tracking** split across 3 stores; authoring writes a different store than students read | Single `notification_reads` join table; one `notifications` source |
| 9 | 🟡 Med | **Email** sent from browser (EmailJS, leaks ids, no audit); edge function unused; best-effort with no retry | Route all email server-side via the edge function/queue with audit |
| 10 | 🟡 Med | **Public storage buckets** — permanent public receipt URLs | Private bucket + short-lived signed URLs |
| 11 | 🟢 Low | UI/service validation mismatch (PDF/1 MB vs PDF-JPEG-PNG/5 MB); hardcoded year config; dual toasts; Lovable artifacts; profile-pic in localStorage; loose TS | Validate once server-side; year config in DB; cleanup |

---

## Migration Roadmap

A suggested sequence for folding these features into your ERP, given course registration is the headline feature.

**Phase 0 — Foundation (do first; everything depends on it).**
1. Stand up the ERP's **identity + RBAC**: single canonical user record, hashed auth, explicit `role` enum + `department` scope, JWT claims. Import the `students25`/`students` rosters as seed data.
2. Define **strict RLS / API authorization** patterns: student → own rows; dept_admin → their department; super_admin → all. No client-trusted roles.
3. Centralize **config** (env-based Supabase/DB creds; academic-year config in a DB table, not constants).

**Phase 1 — Course Registration (the flagship; build it right).**
4. Build the **normalized course schema** from §5.7 (`courses`, `course_offerings`, `sections` with capacity, `prerequisites`, `registration_windows`, `enrollments` with unique constraint, `enrollment_audit`).
5. Implement **server-side enrollment** with atomic seat allocation, prerequisite + window + fee-approval checks, idempotency, and audit. Port the PE/OE group/slot concept as `elective_type` + `group_no` columns (NOT table names). Use `data/electiveCourses.ts` only as a reference for real group/credit structure.
6. Build the student registration UI (reuse the shadcn kit + `DashboardLayout` pattern).

**Phase 2 — Fees (gates registration).**
7. Build the **generalized fee model** (`fee_types` + one `fee_receipts` table, §6.8), private storage + signed URLs, server-side approval with audit, and the per-year academic-year system (keep the `AcademicYearProvider` design).
8. Wire **course-access gating** to a derived "all required fee types approved for this year" query.

**Phase 3 — Workflows & Comms.**
9. Build the **generic request/approval engine** (§7.7) and migrate gate pass + fee slips onto it; build the missing admin gate-pass queue.
10. Build **notifications** (single source + `notification_reads`), **support ticketing** (generalize `student_issues`), and **server-side email** via the edge function.

**Phase 4 — Admin & polish.**
11. Admin dashboard/analytics (reuse recharts + Excel export), profile (real storage-backed avatars), blocked-students (server-enforced), department-admin management UI.
12. Strip all dead code (§9 #7), Lovable artifacts, and legacy deps; one toast lib; tighten TS.

**Things to delete outright, not migrate:** `services/database.ts` (MySQL), `services/requestService.*`, all `/api/requests` REST calls, `components/admin/RequestList.tsx`, `pages/dashboard/GatePass.tsx`, `pages/dashboard/Electives.tsx`, `components/Courses.tsx`, `studentService.approveFeeReceipt` (localStorage stub), the second `vite.config.js`, the `cdn.gpteng.co` script, and the `bcryptjs`/`mysql2`/`sequelize`/`nodemailer`/`axios`/`lovable-tagger` deps.

---

*Generated from a full read of the EduJunction codebase (frontend/src, supabase/) and the live Supabase schema/RLS/storage configuration. File:line references point at the current `keedev` branch.*
