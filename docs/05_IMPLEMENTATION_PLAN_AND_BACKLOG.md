# 05. Implementation Plan & Prioritized Task Backlog

## 1. Phased Implementation Plan

### Phase 1: Project Scaffolding, Dual Prisma 7 Setup & Invite-Only Security (`scaffold-db-auth`)
1. Initialize Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 in `/home/azadmin/tripo3d`.
2. Configure `.gitignore` to strictly exclude `.cred`, `.env*`, `node_modules/`, `.next/`, and SQLite `*.db` files.
3. Author `prisma/schema.prisma` (SQLite dev) and `prisma/schema.postgres.prisma` (PostgreSQL prod) with initial SQL migrations.
4. Implement password hashing (`scrypt`), atomic single-use/expiring invitation code creation & consumption, user role/status verification, revocation, and `AuditLog` writer (`src/lib/account-admission/`).
5. Configure Auth.js / NextAuth v5 (`src/auth.ts`) with Credentials provider and role/status session hydration.
6. Create `scripts/bootstrap-admin.mjs` for zero-demo-account administrator & invite provisioning, plus public showcase gallery seeding (3D models only — **zero demo user accounts**).

### Phase 2: 3D Procedural Engine, Binary Codecs & Backend APIs (`implement-backend-engine`)
1. Build `src/lib/engine3d/`:
   - Parametric multi-part 3D mesh generator producing real vertices, normals, UVs, vertex colors, semantic segments (`head`, `torso`, `left_arm`, `right_arm`, `left_leg`, `right_leg`, `weapon/accessory`, `base`), and bone rig hierarchies across all 14 Tripo categories (`character`, `vehicle`, `animal`, `architecture`, `furniture`, `props`, `weapon`, `clothing`, `machine`, `food`, `nature`, `abstract`, `3d_printing`, `featured`).
   - Spec-compliant binary `.glb` (glTF 2.0), `.obj`, `.stl`, and `.ply` exporters and parsers (`src/lib/engine3d/codecs.ts`).
   - Pipeline processors: `segmentMesh()`, `fillMeshParts()`, `retopologizeMesh()`, `unwrapSmartUv()`, `generatePbrTexture()`, `rigAndAnimateMesh()`.
2. Implement all REST & OpenAPI v3 routes:
   - `/api/auth/register`, `/api/auth/invite-check`, `/api/studio/onboarding`
   - `/api/studio/generate-image`, `/api/studio/generate-model`, `/api/studio/upload-model`
   - `/api/studio/assets`, `/api/studio/assets/[id]`, `/api/studio/assets/[id]/process`, `/api/studio/assets/[id]/export`
   - `/api/gallery`, `/api/gallery/[id]`, `/api/gallery/[id]/like`, `/api/gallery/[id]/remix`
   - `/api/studio/subscription`, `/api/ studio/dcc-bridge`, `/api/tools/convert`
   - `/api/platform/keys`, `/api/v3/tasks`, `/api/v3/tasks/[taskId]`, `/api/v3/wallet`
   - `/api/admin/invitations`, `/api/admin/invitations/[id]`, `/api/admin/users`, `/api/admin/audit-logs`

### Phase 3: Frontend Surfaces & Interactive Three.js 3D Workspace (`implement-frontend`)
1. Build Reusable **Three.js Interactive 3D Viewport (`src/components/three/Viewport3D.tsx`)**:
   - Real WebGL rendering of procedural/uploaded meshes, wireframe overlay, vertex/face normals, semantic part color mode, UV checker preview, skeletal bone helper & real-time procedural keyframe animation (`Idle`, `Walk`, `Run`, `Jump`, `Dance`, `Combat`), XYZ orientation gizmo, lighting controls, and camera presets.
2. Build **Marketing & Public Tools (`www.tripo3d.ai` replica)**:
   - `/` (Landing page), `/pricing`, `/research`, `/features/[slug]` (all 6 AI feature pages), `/3d-tools/3d-viewer`, `/3d-tools/convert`.
3. Build **Tripo Studio (`studio.tripo3d.ai` replica)**:
   - Split-screen `/login` and `/register` (with invite code badge & validation).
   - 2-step `"How do you create with Tripo?"` onboarding modal.
   - `/studio` Home (personalized greeting, Quick Image/Text Generator, filterable Community Gallery, DCC Bridge popover, Pricing Upgrade modal, Referral/Redeem modal).
   - `/workspace/generate` (Full 7-stage left rail `Image`, `Model`, `Segment`, `Retopo`, `Smart UV`, `Texture`, `Rig/Animate` + `App`, left parameter inspector, center WebGL viewport, right `Assets` & `Property` inspector).
   - `/assets` (Model & Image library with filters and batch management), `/3d-model/[id]` (Detail viewer, stats, remix, multi-format download), `/creator-hub`.
4. Build **Developer API Platform (`/platform`) & Admin Governance Console (`/admin`)**:
   - `/platform` (OpenAPI v3 interactive playground, `API Keys`, `Billing`, `Usage Stats`).
   - `/admin` (Invite generator with role/expiry/maxUses, active/consumed/revoked invite table, user RBAC & revocation table, credit adjustment, and searchable `AuditLog` viewer).

### Phase 4: Verification, Testing & Production Readiness (`verify-and-test`)
1. Run unit & integration tests (Vitest) covering invite-only admission, single-use/expiring/revoked codes, RBAC, 3D mesh generation, GLB/OBJ/STL/PLY binary codecs, credit/trial math, and pipeline guards.
2. Run Playwright E2E test suite verifying every user journey and responsive layout.
3. Verify `npm run build` production compilation and PostgreSQL schema validation.

---

## 2. Prioritized Task Backlog

| ID | Priority | Component | Task Description | Status |
| :--- | :--- | :--- | :--- | :--- |
| `T-01` | P0 | Exploration | Playwright exploration of `www.tripo3d.ai`, `studio.tripo3d.ai`, and `platform.tripo3d.ai` (74 screenshots + DOM/API reports). | Done |
| `T-02` | P0 | Documentation | Complete ADR, PRD, Technical Spec, Architecture/Data Model, Backlog, and Feature Parity docs. | Done |
| `T-03` | P0 | Data & Auth | Setup Prisma 7 (SQLite + PostgreSQL), Auth.js v5, invite-only admission, RBAC, revocation, and `AuditLog`. | Pending |
| `T-04` | P0 | 3D Engine | Implement procedural 3D generator, GLB/OBJ/STL/PLY codecs, and Segment/Retopo/UV/Texture/Rig processors. | Pending |
| `T-05` | P0 | Studio IDE | Implement `/workspace/generate`, `/studio`, `/assets`, `/3d-model/[id]`, onboarding modal, DCC Bridge, and Upgrade modal. | Pending |
| `T-06` | P1 | Public Site & Tools | Implement `/`, `/pricing`, `/research`, `/features/[slug]`, `/3d-tools/3d-viewer`, and `/3d-tools/convert`. | Pending |
| `T-07` | P1 | API & Admin | Implement `/platform` (API Keys, Docs, Billing, Usage, `/api/v3/*`) and `/admin` (Invites, Users, AuditLog). | Pending |
| `T-08` | P0 | QA & Build | Execute Vitest unit tests, Playwright E2E tests, and `next build` verification. | Pending |
