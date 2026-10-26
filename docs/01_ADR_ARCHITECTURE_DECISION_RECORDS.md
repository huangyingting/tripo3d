# 01. Architecture Decision Records (ADR)

## ADR-001: Full-Stack Framework — Next.js 16 (App Router) with TypeScript

- **Status**: Accepted
- **Context**: Tripo3D comprises three tightly integrated experiences: a rich marketing & public tools site (`www.tripo3d.ai`), a low-latency interactive 3D WebGL Studio (`studio.tripo3d.ai`), and an OpenAPI v3 developer console (`platform.tripo3d.ai`), plus an enterprise Admin & Invite-Only Admission console.
- **Decision**: Consolidate all surfaces into a single Next.js 16 App Router monorepo using React 19 and strict TypeScript. Route groups cleanly separate Marketing & Tools (`/`), Studio Workspace (`/studio`, `/workspace`, `/assets`, `/3d-model/[id]`), Developer API Portal (`/platform`), Authentication (`/login`, `/register`), and Administration (`/admin`).
- **Consequences**: Unified session state, shared Prisma 7 data layer, zero CORS friction between the Studio UI and backend generation/conversion endpoints, and single-command production deployment.

---

## ADR-002: Dual-Database Prisma 7 Strategy (SQLite for Local Dev, PostgreSQL for Production)

- **Status**: Accepted
- **Context**: The system must run out-of-the-box in local development and CI using SQLite while supporting high-concurrency production deployments on PostgreSQL without code changes.
- **Decision**: Follow the battle-tested `../Arcade` Prisma 7 architecture:
  - `prisma/schema.prisma` targets `sqlite` via `@prisma/adapter-better-sqlite3` (`better-sqlite3`) for local development and automated test suites.
  - `prisma/schema.postgres.prisma` targets `postgresql` for production deployments.
  - All JSON metadata (mesh stats, PBR texture maps, bone hierarchies, audit payloads) is stored as serialized JSON strings with typed helper parsers in `src/lib/db/` so queries behave identically across SQLite and PostgreSQL.
- **Consequences**: Instant local setup (`npm run db:setup`), deterministic E2E testing, and zero-downtime migration path to PostgreSQL (`npm run prisma:generate:postgres` & `prisma:migrate:deploy:postgres`).

---

## ADR-003: Invite-Only Registration, Single-Use/Expiring Codes, RBAC, Revocation & Audit Logging (No Demo Accounts)

- **Status**: Accepted
- **Context**: Production security requirements mandate strict invite-only registration with single-use/expiring invitation codes, role-based access control (`ADMIN`, `CREATOR`, `VIEWER`), immediate session/account revocation, comprehensive audit logging, and **zero hardcoded demo user accounts**.
- **Decision**:
  - Use **Auth.js / NextAuth v5** (`next-auth@5.0.0-beta.30`) with JWT session strategy paired with per-request database admission verification (`getCurrentViewer()`).
  - **No Demo Users**: Neither the application code nor database seeds create demo users. Initial administrator onboarding uses an explicit CLI bootstrap utility (`scripts/bootstrap-admin.mjs`) or environment-configured bootstrap invite code when the database has zero users.
  - **Atomic Single-Use Invitations**: Registration requires a valid, unrevoked, unexpired (`expiresAt > now`), unconsumed (`usedCount < maxUses`, default `maxUses = 1`) invitation code. Consuming an invite atomically increments `usedCount`, transitions status to `CONSUMED`, links `consumedByUserId`, and writes an immutable `AuditLog` entry inside a single Prisma transaction.
  - **Roles & Revocation**: Every user has `role` (`ADMIN` | `CREATOR` | `VIEWER`) and `status` (`ACTIVE` | `REVOKED`). Admins can revoke any user, invitation, or API key at any time, immediately invalidating access and recording an `AuditLog` event.

---

## ADR-004: Real Procedural & Parametric 3D Mesh Generation, Processing, and Format Conversion Engine

- **Status**: Accepted
- **Context**: A production-grade Tripo3D replica must not merely return static placeholder strings; when a user generates a 3D model from text/image/multi-view, runs Quad/Triangle Retopology, performs Part Segmentation, applies AI PBR Texturing, Auto-Rigs & Animates, or converts between `.glb`, `.obj`, `.stl`, and `.ply`, the application must produce real, valid, downloadable, inspectable 3D geometry and binary GLTF/GLB assets that render interactively in Three.js.
- **Decision**: Build a deterministic, self-contained 3D Geometry & Asset Pipeline Engine (`src/lib/engine3d/`):
  - **Prompt/Image-to-3D Procedural Synthesizer**: Parses semantic tokens and image characteristics (e.g., character/biped, creature/dragon, vehicle/spaceship, sword/weapon, architecture/castle, furniture, crystal/abstract) to synthesize multi-part 3D meshes with vertex colors, UV coordinates, surface normals, and PBR material definitions.
  - **Real Binary GLB (glTF 2.0) & OBJ / STL / PLY Serializer & Parser**: Generates spec-compliant binary `.glb` files (magic `0x46546C67` / `glTF`, JSON chunk + BIN buffer chunk with `POSITION`, `NORMAL`, `TEXCOORD_0`, `COLOR_0`, and PBR `metallicRoughness`), ASCII Wavefront `.obj`, binary/ASCII `.stl`, and Stanford `.ply`.
  - **Mesh Processing Operations**:
    - **Retopology (`Retopo` / `Smart Mesh`)**: Subdivides or decimates mesh geometry to match target polycount (`500` to `2,000,000`) and topology mode (`Quad` vs `Triangle`).
    - **Semantic Part Segmentation (`Segment`)**: Partitions mesh primitives into distinct named semantic sub-meshes (`head`, `torso`, `limbs`, `base`, `accessories`) with distinct segment color IDs and enforces the original Tripo3D guard (rejecting already-rigged or quad-locked models if applicable).
    - **Smart UV Unwrapping (`Smart UV`)**: Computes box/cylindrical/spherical UV projections while enforcing the `Tris ≤ 80,000 / Quads ≤ 40,000` ceiling.
    - **AI Texturing & PBR Generator (`Texture`)**: Synthesizes procedural 2K/4K/8K SVG/PNG data-URI texture maps (Albedo, Normal, Roughness, Metallic) and updates the model's PBR material properties.
    - **Auto-Rigging & Animation (`Rig` / `Animate`)**: Builds a hierarchical humanoid/creature bone rig (`Hips`, `Spine`, `Head`, `LeftArm`, `RightArm`, `LeftLeg`, `RightLeg`) with animation clips (`Idle`, `Walk`, `Run`, `Jump`, `Dance`, `Combat`).

---

## ADR-005: Credit Ledger & OpenAPI v3 Developer Platform

- **Status**: Accepted
- **Context**: Both Studio UI actions and external Developer API (`/api/v3/tasks`) requests consume credits according to Tripo3D's pricing rules (`HD Model: 55`, `Smart Mesh: 100` or free trial, `Image: 40`, `Segment: 40`, `Retopo: 10`, `Smart UV: 10`, `Texture: 20`, `Rig: 30`).
- **Decision**: Store user credit balance, free trial counters (`smartMeshTrials`, `partGenTrials`, `texture8kTrials`), and an immutable `CreditTransaction` ledger in Prisma. External developers can generate `tsk_...` Bearer API keys in `/platform/api-keys` and invoke `/api/v3/tasks` and `/api/v3/wallet` using the exact Tripo OpenAPI v3 contract.
