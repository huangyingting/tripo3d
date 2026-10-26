# Tripo 3D Studio & AI 3D Platform (`tripo3d`)

A production-grade full-stack replica of **Tripo AI** (`www.tripo3d.ai`, `studio.tripo3d.ai`, and `platform.tripo3d.ai`) built with **Next.js 16 (App Router)**, **Three.js WebGL**, **Auth.js / NextAuth**, and **Prisma 7** supporting **SQLite for local development** and **PostgreSQL for production**.

---

## Key Capabilities

1. **7-Stage 3D Studio Workspace (`/workspace/generate`)**:
   - **Stage 1 (`Image`)**: AI Reference Sheet Generator (`T-Pose Ortho`, `Studio White`, `Isometric Prop`, `1:1` / `16:9` / `9:16`) with 1-click send to Image-to-3D.
   - **Stage 2 (`Model`)**: Dual **HD Model (`Tripo H3.1 / H3.0 / H2.5`)** and **Smart Mesh (`P2.0 / P1.0` Quad Topology with `Free Trial ×2`)** modes; 4 input sub-tabs (`Image`, `Multi-View` Front/Left/Back/Right, `Text` with prompt enhancer, `Sketch` canvas); `Mesh Quality` (`Standard` / `Ultra`), `Generate in Parts` (`AI Complete`), `Texture` (`2K` / `4K` / `8K`, `Remove Lighting`, `PBR`), `Topology` (`Quad` / `Triangle`), `Low Poly` (`500–200,000`), `T-Pose`, and `Batch (1–4)`.
   - **Stage 3 (`Segment`)**: Semantic part decomposition (`Start Segmenting ⚡10`) + `Fill Parts ⚡10` with Tripo's exact guard (`"Models with quad faces or animation are not supported"`).
   - **Stage 4 (`Retopo`)**: Smart Low Poly (`P1.0`), `Quad` vs `Triangle` topology conversion, and polygon count presets (`3k`, `10k`, `20k`, `50k`, `100k`).
   - **Stage 5 (`Smart UV`)**: Distortion-free UV atlas unwrapping (`Auto`, `Organic`, `Hard Surface`) enforcing Tripo's exact polygon threshold (`<= 80,000 tris` or `<= 40,000 quads`).
   - **Stage 6 (`Texture`)**: PBR Texture Generator + `Magic Brush` localized part repainting + `Upscale Ultra 8K Texture ⚡30`.
   - **Stage 7 (`Rig` & `Animate`)**: 16-bone humanoid Biped / Quadruped auto-rigging (`Confirm Rigging ⚡25`) and real-time skeletal motion clips (`Idle`, `Walk`, `Run`, `Jump`, `Dance`, `Combat`).
   - **Real 3D Binary/Text Codec Export**: Download spec-compliant `.GLB` (glTF 2.0 binary), `.OBJ`, `.STL`, and `.PLY` meshes.

2. **Free Online 3D Tools (`/3d-tools/convert` & `/3d-tools/3d-viewer`)**:
   - Browser + server 3D file conversion across `.GLB`, `.OBJ`, `.STL`, `.PLY`, and `.FBX` with live WebGL topology inspection.

3. **Developer API Platform (`/platform` & `/api/v3/*`)**:
   - Issue and revoke `tsk_...` bearer API keys (stored as SHA-256 hashes).
   - OpenAPI v3 endpoints: `POST /api/v3/tasks`, `GET /api/v3/tasks/[taskId]`, and `GET /api/v3/wallet`.

4. **Invite-Only Registration, RBAC, Revocation & Audit Logging (`/login`, `/register`, `/admin`)**:
   - **Zero Pre-Seeded Demo Accounts**: Public self-signup is disabled. Accounts can only be created by redeeming a single-use, expiring cryptographic invitation code or via the host CLI bootstrap script (`npm run bootstrap:admin`).
   - **Roles**: `ADMIN`, `CREATOR`, `VIEWER`.
   - **Immediate Revocation**: Revoking a user immediately sets `status = 'REVOKED'` and deletes all active database sessions.
   - **Immutable Audit Trail**: Every security, admission, role, revocation, API key, and 3D generation action is recorded in `AuditLog`.

---

## Quickstart (Local SQLite Development)

```bash
# 1. Install dependencies
npm install

# 2. Push SQLite schema & generate Prisma client
npm run db:push

# 3. Seed public Community Showcase 3D models (creates ZERO user accounts)
npm run db:seed

# 4. Bootstrap the first Administrator or single-use Admin invitation code
npm run bootstrap:admin -- --email admin@tripo3d.local --password "Admin#Tripo3D!2026" --name "Studio Admin"

# 5. Start Next.js server
npm run dev
```

## Production PostgreSQL Deployment

See `prisma/schema.postgres.prisma`, `prisma/migrations/postgresql/0001_init/migration.sql`, and `docker-compose.postgres.yml`.
