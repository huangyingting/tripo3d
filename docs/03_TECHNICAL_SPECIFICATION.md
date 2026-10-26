# 03. Technical & API Specification

## 1. System Technology Stack

- **Runtime & Framework**: Node.js 22+, Next.js 16 (App Router), React 19, TypeScript 5
- **Styling & UI**: Tailwind CSS 4, Lucide Icons, custom Tripo3D dark/gold design tokens (`#070709` surface, `#121318` panel, `#1c1e26` card, `#f5c518` primary gold accent)
- **3D Rendering & Geometry Engine**: Three.js (`three`) WebGL renderer + custom procedural mesh/GLB/OBJ/STL/PLY synthesizer & parser (`src/lib/engine3d/`)
- **Authentication**: Auth.js / NextAuth v5 (`next-auth@5.0.0-beta.30`) with Credentials provider, invite-only admission enforcement, and per-request database status validation
- **ORM & Databases**: Prisma 7 (`@prisma/client` + `@prisma/adapter-better-sqlite3` for local dev/test SQLite; PostgreSQL schema in `prisma/schema.postgres.prisma` for production)

---

## 2. REST & OpenAPI v3 Endpoint Specification

### 2.1 Authentication & Invite-Only Admission Endpoints

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public (Requires Invite Code) | Validates single-use/expiring `inviteCode`, hashes password (`scrypt`), creates `User` with initial `200` credits and trial counters, marks `Invitation` consumed, and writes `AuditLog`. |
| `GET` | `/api/auth/invite-check?code=...` | Public | Validates whether an invitation code is active, unexpired, and has remaining uses, returning its assigned role (`ADMIN`, `CREATOR`, `VIEWER`). |
| `GET/POST` | `/api/auth/[...nextauth]` | Public/Auth | NextAuth v5 session & credentials sign-in/sign-out handlers. |
| `POST` | `/api/studio/onboarding` | Authenticated | Saves the user's 2-step onboarding preferences (`primaryCategory`, `subCategory`) and records an `AuditLog` event. |

### 2.2 Studio Workspace & 3D Asset Pipeline Endpoints

| Method | Path | Role | Credit Cost | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/studio/assets` | Any Admitted | `0` | Lists user's generated/uploaded 3D models & Pre-3D images (`filter`: `all`, `smart_mesh`, `untextured`, `textured`, `rigged`, `collected`). |
| `POST` | `/api/studio/generate-image` | `CREATOR`/`ADMIN` | `40` | Generates Pre-3D reference image(s) from prompt + template (`T Pose`, `3D Enhance`, `Photo to Figure`) + aspect ratio (`1:1`, `16:9`, `9:16`, `4:3`, `3:4`). |
| `POST` | `/api/studio/generate-model` | `CREATOR`/`ADMIN` | `55` / `35` / `25` / `100` (or `0` with Trial) | Synthesizes a new 3D model (`HD Model` or `Smart Mesh`) from `text`, `image`, `multiview`, or `sketch` with configurable `aiModel` (`H3.1`, `H3.0`, `H2.5`, `P2.0`), `topology` (`Triangle`/`Quad`), `polycount` (`500–2,000,000`), `textureQuality` (`2K`/`4K`/`8K`), `pbr`, and `generateInParts`. |
| `POST` | `/api/studio/upload-model` | `CREATOR`/`ADMIN` | `0` | Parses and stores an uploaded `.obj`, `.glb`, `.stl`, or `.ply` 3D file (`≤ 150MB`) into the user's workspace assets. |
| `POST` | `/api/studio/assets/[id]/process` | `CREATOR`/`ADMIN` | `10`–`40` | Executes a pipeline stage on an existing 3D model: `segment` (`40⚡`), `fill_parts` (`20⚡`), `retopo` (`10⚡`), `smart_uv` (`10⚡`), `texture` (`20⚡`), `upscale_8k` (`20⚡`), `rig` (`30⚡`), or `animate` (`0⚡` on rigged model). |
| `GET` | `/api/studio/assets/[id]/export` | Any Admitted | `0` | Streams the 3D asset serialized on-the-fly in the requested format (`?format=glb|obj|stl|ply`) with appropriate `Content-Disposition` filename. |
| `PATCH` | `/api/studio/assets/[id]` | `CREATOR`/`ADMIN` | `0` | Updates model name, privacy (`PUBLIC`/`PRIVATE`), or favorite/collected status. |
| `DELETE` | `/api/studio/assets/[id]` | `CREATOR`/`ADMIN` | `0` | Deletes a user's asset and records an `AuditLog` event. |

### 2.3 Community Gallery, Subscription & Free 3D Tools Endpoints

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/gallery` | Public | Returns public community 3D models filtered by `category` (`all`, `3d_printing`, `featured`, `character`, `vehicle`, `animal`, `architecture`, `furniture`, `props`, `weapon`, `clothing`, `machine`, `food`, `nature`, `abstract`) and `search` query. |
| `GET` | `/api/gallery/[id]` | Public | Returns full 3D model details, geometry buffers, parts, rig metadata, and creator info. |
| `POST` | `/api/gallery/[id]/like` | Authenticated | Toggles like/collect on a community model. |
| `POST` | `/api/gallery/[id]/remix` | `CREATOR`/`ADMIN` | Clones a community model into the user's Workspace `Assets` for further editing. |
| `POST` | `/api/studio/subscription` | `CREATOR`/`ADMIN` | Upgrades plan (`FREE`, `PRO`, `MAX`), redeems promo/credit codes, and writes `CreditTransaction` + `AuditLog`. |
| `POST` | `/api/tools/convert` | Public | Accepts an uploaded 3D model (`.obj`, `.stl`, `.ply`, `.glb`) and target format (`glb`, `obj`, `stl`, `ply`), repairs normals/topology, and returns converted binary/ASCII output + geometry inspection report. |

### 2.4 Developer Platform & OpenAPI v3 Endpoints (`/api/v3/*`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET/POST/DELETE` | `/api/platform/keys` | Authenticated | Lists, creates (`tsk_live_...`), or revokes Developer API keys. |
| `POST` | `/api/v3/tasks` | Bearer `tsk_...` or Session | OpenAPI v3 compatible task creation (`type`: `text_to_model`, `image_to_model`, `multiview_to_model`, `texture_model`, `refine_model`, `animate_rig`, `convert_model`). |
| `GET` | `/api/v3/tasks/[taskId]` | Bearer `tsk_...` or Session | Queries task status (`queued`, `running`, `success`, `failed`), progress (`0–100`), and downloadable `.glb`/`.obj` output URLs. |
| `GET` | `/api/v3/wallet` | Bearer `tsk_...` or Session | Returns current credit balance, plan tier, and recent API usage statistics. |

### 2.5 Admin Governance, Invitations & Audit Log Endpoints (`/api/admin/*`)

| Method | Path | Role | Description |
| :--- | :--- | :--- | :--- |
| `GET/POST` | `/api/admin/invitations` | `ADMIN` | Lists all invitations or creates new single-use/multi-use expiring invitation codes with role assignment (`ADMIN`, `CREATOR`, `VIEWER`). |
| `PATCH` | `/api/admin/invitations/[id]` | `ADMIN` | Revokes an active invitation code (`status = REVOKED`) and writes an `AuditLog` entry. |
| `GET/PATCH` | `/api/admin/users` | `ADMIN` | Lists all registered users or updates a user's `role`, `status` (`ACTIVE` / `REVOKED`), or credit balance, recording an `AuditLog` entry. |
| `GET` | `/api/admin/audit-logs` | `ADMIN` | Queries immutable `AuditLog` entries filtered by `action`, `actorEmail`, or `targetType`. |

---

## 3. Pipeline Validation & Business Rules

1. **Segmentation Constraint**: Attempting to run `segment` on a model where `topology === 'QUAD'` or `isRigged === true` returns `HTTP 400` with code `SEGMENTATION_UNAVAILABLE_FOR_QUAD_OR_RIGGED` (`"Part Segmentation is unavailable for Quad models and Rigged models. Convert topology to Triangle first."`), matching Tripo Studio's exact rule.
2. **Smart UV Ceiling**: Attempting to run `smart_uv` on a model where `(topology === 'TRIANGLE' && faces > 80000)` or `(topology === 'QUAD' && faces > 40000)` returns `HTTP 400` with code `SMART_UV_POLYCOUNT_EXCEEDED` (`"Smart UV requires Tris ≤ 80,000 / Quads ≤ 40,000. Run Retopology first to reduce polycount."`).
3. **Credit & Trial Deduction**:
   - In `Smart Mesh` mode (`P2.0`), if `user.smartMeshTrials > 0`, `smartMeshTrials` is decremented by `1` and `0` credits are charged; otherwise `100` credits are deducted.
   - If `generateInParts` is enabled and `user.partGenTrials > 0`, `partGenTrials` is decremented by `1`; otherwise `+20` credits are added.
   - If `textureQuality === '8K'` and `user.texture8kTrials > 0`, `texture8kTrials` is decremented by `1`; otherwise `+20` credits are added.
   - If `user.credits < cost`, the request is rejected with `HTTP 402 Payment Required` (`INSUFFICIENT_CREDITS`).
