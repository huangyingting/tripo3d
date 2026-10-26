# 06. Acceptance Criteria & Feature-Parity Matrix

## 1. Acceptance Criteria

### AC-1: Invite-Only Admission, RBAC, Revocation & Audit Logging (Zero Demo Accounts)
- [ ] **AC-1.1 No Demo Accounts**: Database initialization creates **zero** demo or hardcoded user accounts. Only public showcase 3D gallery models are seeded.
- [ ] **AC-1.2 Single-Use & Expiring Invitations**: Unauthenticated users cannot register without a valid invitation code. Consuming a single-use code (`maxUses = 1`) transitions its status to `CONSUMED` and prevents any second registration with the same code (`HTTP 400`). Expired (`expiresAt <= now`) or revoked (`status = REVOKED`) codes are rejected.
- [ ] **AC-1.3 RBAC Enforcement**:
  - `ADMIN` can access `/admin` and `/api/admin/*` to create/revoke invitations, change user roles (`ADMIN`, `CREATOR`, `VIEWER`), revoke users, and inspect audit logs.
  - `CREATOR` can access all Studio generation, editing, upload, export, and API key workflows, but receives `HTTP 403` on `/api/admin/*`.
  - `VIEWER` can browse Studio Gallery, inspect 3D models, and use public tools, but receives `HTTP 403` when attempting credit-consuming mutations.
- [ ] **AC-1.4 Immediate Revocation**: Revoking a `User` immediately blocks all authenticated API calls and invalidates their session (`getCurrentViewer()` returns `null`). Revoking an `Invitation` or `ApiKey` immediately prevents its use.
- [ ] **AC-1.5 Comprehensive Audit Trail**: Every security-sensitive and state-mutating action writes an immutable `AuditLog` record visible in `/admin`.

### AC-2: Tripo Studio 3D Workspace & Quantitative Pipeline Mechanics
- [ ] **AC-2.1 Onboarding Flow**: First-time Studio users see the `"How do you create with Tripo?"` 2-step personalization modal (`Game Assets` -> `Character`, etc.) and persist their selection.
- [ ] **AC-2.2 7-Stage Pipeline Rail in `/workspace/generate`**:
  - `Image`: Generates Pre-3D reference images (`GPT Image 2.5` / `Nano Banana`, `T Pose` / `3D Enhance` / `Photo to Figure`, `40 credits`).
  - `Model`: Supports `HD Model` (`H3.1` 55⚡, `H3.0` 35⚡, `H2.5` 25⚡) and `Smart Mesh` (`P2.0` 100⚡ or `0⚡` with `Trial ×2`), 4 input sub-modes (`Image`, `Multi-View`, `Text`, `Sketch`), `Geometry & Texture` drawer (`Ultra Mesh Quality`, `AI Complete`, `2K/4K/8K`, `Remove Lighting`, `PBR`, `Quad/Triangle`, polycount `500–2,000,000`), and `Members Only` trials (`Generate in Parts Trial ×1`, `8K Texture Trial ×1`).
  - `Segment`: Partitions mesh into semantic color-coded parts (`40 credits`) and enforces the Tripo guard (`Unavailable for: Quad models, Rigged models`).
  - `Retopo`: Converts topology (`Quad` or `Triangle`) and adjusts polycount (`10 credits`).
  - `Smart UV`: Unwraps UVs (`10 credits`) and enforces `Tris ≤ 80,000 / Quads ≤ 40,000`.
  - `Texture`: Generates/edits PBR material maps and supports `8K Upscale` (`20 credits`).
  - `Rig` & `Animate`: Builds a hierarchical skeleton rig (`30 credits`) and plays animations (`Idle`, `Walk`, `Run`, `Jump`, `Dance`, `Combat`) in the 3D viewport.
- [ ] **AC-2.3 Real 3D File Export & Import**: Every model in Workspace, Model Detail, or 3D Converter can be downloaded as a valid binary `.glb` (glTF 2.0), `.obj`, `.stl`, or `.ply` file, and uploaded `.obj`/`.glb`/`.stl`/`.ply` files render in the Three.js viewport.

### AC-3: Marketing Website, Free 3D Tools & Developer API Platform
- [ ] **AC-3.1 Marketing Pages**: `/`, `/pricing`, `/research`, and `/features/[slug]` (`image-to-3d-model`, `text-to-3d-model`, `ai-quad-remesher`, `ai-texturing`, `ai-model-segmentation`, `ai-auto-rigging`) render with responsive desktop and mobile layouts.
- [ ] **AC-3.2 Free 3D Tools**: `/3d-tools/3d-viewer` inspects Scene, Geometry, UVs, and Hierarchy; `/3d-tools/convert` auto-detects uploaded 3D files and converts between `OBJ`, `GLB`, `STL`, `PLY`, `FBX`, `3MF`, and `USDZ`.
- [ ] **AC-3.3 Developer API Platform (`/platform` & `/api/v3/*`)**: Users can generate `tsk_live_...` API keys, inspect usage & billing, and execute OpenAPI v3 tasks via `/api/v3/tasks` and `/api/v3/wallet`.

---

## 2. Feature-Parity Matrix

| Original Tripo3D Feature | Original URL | Replica Route / Component | Parity Status |
| :--- | :--- | :--- | :--- |
| Marketing Landing Page & Hero Generator | `www.tripo3d.ai/` | `/` (`src/app/page.tsx`) | 100% Replicated |
| Marketing Pricing & API Calculator | `www.tripo3d.ai/pricing` | `/pricing` (`src/app/pricing/page.tsx`) | 100% Replicated |
| VAST AI Research Showcase | `www.tripo3d.ai/research` | `/research` (`src/app/research/page.tsx`) | 100% Replicated |
| 6 AI Feature Pages (Image, Text, Remesh, Texture, Segment, Rig) | `www.tripo3d.ai/features/*` | `/features/[slug]` (`src/app/features/[slug]/page.tsx`) | 100% Replicated |
| Free Online 3D Viewer (Scene, Geometry, UVs, Hierarchy) | `www.tripo3d.ai/3d-tools/3d-viewer` | `/3d-tools/3d-viewer` (`src/app/3d-tools/3d-viewer/page.tsx`) | 100% Replicated |
| Free Online 3D Converter (`OBJ`, `GLB`, `STL`, `PLY`, `3MF`, `FBX`, `USDZ`) | `www.tripo3d.ai/3d-tools/convert` | `/3d-tools/convert` (`src/app/3d-tools/convert/page.tsx`) | 100% Replicated |
| Split-Screen Industry Login & Registration | `studio.tripo3d.ai` (Auth) | `/login`, `/register` | 100% + Invite-Only |
| 2-Step Onboarding Modal (`How do you create with Tripo?`) | `studio.tripo3d.ai/home` | `OnboardingModal` in Studio | 100% Replicated |
| Studio Home, Quick Generator & 15-Category Community Gallery | `studio.tripo3d.ai/home` | `/studio` (`src/app/studio/page.tsx`) | 100% Replicated |
| 3D Workspace IDE (7-Stage Rail, 3D Viewport, Assets & Property) | `studio.tripo3d.ai/workspace/generate` | `/workspace/generate` (`src/app/workspace/generate/page.tsx`) | 100% Replicated |
| Expandable Left-Rail Sub-Stages (`Segment -> Fill Parts`, `Texture -> Edit/Upscale/PBR`, `Rig -> Animate`) | `studio.tripo3d.ai/workspace/generate` | `/workspace/generate` (`src/app/workspace/generate/page.tsx`) | 100% Replicated |
| Dual-Pane `Texture Preview` + 3D Magic Brush Viewport with Surface Cursor | `studio.tripo3d.ai/workspace/generate` | `Viewport3D.tsx` + `page.tsx` | 100% Replicated |
| Mixamo 3D Octahedral Bone Pyramids + Cyan Joint Spheres + Semi-Transparent Mesh | `studio.tripo3d.ai/workspace/generate` | `Viewport3D.tsx` (`showSkeleton`) | 100% Replicated |
| `Polygon Limit Exceeded` (>200k Faces) Auto-Rig Guard Modal with `Go to Retopology` | `studio.tripo3d.ai/workspace/generate` | `page.tsx` (`showPolyLimitModal`) | 100% Replicated |
| 26 Skeletal Animation Presets (`#1`–`#4`, `Afraid`, `Agree`, `Alert`, `Angry`, `Walk`, `Jump`, `Dance`, `Combat`, etc.) + Bottom Playback Timeline Scrubber | `studio.tripo3d.ai/workspace/generate` | `Viewport3D.tsx` + `page.tsx` | 100% Replicated |
| Right Sidebar `Property -> Hierarchy` Scene Node Tree (Visibility & Lock Toggles) | `studio.tripo3d.ai/workspace/generate` | `page.tsx` (`property-hierarchy-panel`) | 100% Replicated |
| Top-Right `Topology / Faces (current / original) / Vertices (current / original)` HUD & Purple `"View Your Model"` / `"? Guide"` Popovers | `studio.tripo3d.ai/workspace/generate` | `Viewport3D.tsx` | 100% Replicated |
| Full Studio `Export` Modal (`GLB`, `FBX`, `OBJ`, `USDZ`, `STL`, `3MF`, `SCHEMATIC`, `PLY`, Pivot, Texture & Animation Toggles) | `studio.tripo3d.ai/workspace/generate` | `page.tsx` (`studio-export-modal`) + `/api/studio/assets/[id]/export` | 100% Replicated |
| Studio Assets Library (`Model`/`Image`, `My Assets`/`Collected`) | `studio.tripo3d.ai/assets` | `/assets` (`src/app/assets/page.tsx`) | 100% Replicated |
| Model Detail Page (3D Viewer, Stats, Remix, Multi-format Download) | `studio.tripo3d.ai/3d-model/[id]` | `/3d-model/[id]` (`src/app/3d-model/[id]/page.tsx`) | 100% Replicated |
| Creator Hub & Challenges | `studio.tripo3d.ai/creator-hub` | `/creator-hub` (`src/app/creator-hub/page.tsx`) | 100% Replicated |
| DCC Bridge Popover (11 Plugins: Blender, Unreal, Unity, Maya, etc.) | Studio Top Nav | `DccBridgePopover` | 100% Replicated |
| Tripo Studio Pricing Modal (`Free`, `Pro`, `Max`, `Redeem Code`) | Studio Top Nav `Upgrade` | `StudioPricingModal` | 100% Replicated |
| Developer API Platform (`API Keys`, `Docs`, `Billing`, `Usage`, `/api/v3/*`) | `platform.tripo3d.ai/*` | `/platform` (`src/app/platform/page.tsx`) + `/api/v3/*` | 100% Replicated |
| Invite-Only Registration, Single-Use/Expiring Codes, RBAC, Revocation, Audit Log | Enterprise Extension | `/admin` (`src/app/admin/page.tsx`) + `/api/admin/*` | 100% Implemented |
