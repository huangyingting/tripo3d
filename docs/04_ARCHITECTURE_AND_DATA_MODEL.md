# 04. System Architecture & Data Model

## 1. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              Next.js 16 App Router (React 19)                          │
├──────────────────────┬──────────────────────────┬──────────────────┬───────────────────┤
│   Marketing & Tools  │     Tripo Studio IDE     │  API Platform    │  Admin Governance │
│  • / (Home)          │  • /studio (Home/Gallery)│  • /platform     │  • /admin         │
│  • /pricing          │  • /workspace/generate   │  • /platform/keys│    - Invitations  │
│  • /research         │  • /assets               │  • /platform/docs│    - Users/RBAC   │
│  • /features/[slug]  │  • /3d-model/[id]        │  • /platform/    │    - Revocation   │
│  • /3d-tools/viewer  │  • /creator-hub          │    billing       │    - Audit Logs   │
│  • /3d-tools/convert │  • Three.js WebGL Canvas │  • /platform/    │                   │
│                      │  • DCC Bridge Popover    │    usage         │                   │
└──────────┬───────────┴─────────────┬────────────┴────────┬─────────┴─────────┬─────────┘
           │                         │                     │                   │
           ▼                         ▼                     ▼                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                            Application Service & Engine Layer                          │
│  • Admission & RBAC Guard (`src/lib/auth/`)  • 3D Geometry Engine (`src/lib/engine3d/`)│
│  • Credit & Trial Ledger (`src/lib/credits/`)• GLB/OBJ/STL/PLY Codec (`src/lib/codec/`)│
│  • Audit Logger (`src/lib/audit/`)           • OpenAPI v3 Task Runner (`/api/v3/*`)    │
└────────────────────────────────────────────┬───────────────────────────────────────────┘
                                             │
                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                 Prisma 7 Data Layer (`sqlite` Dev / `postgresql` Prod)                 │
│  User │ Invitation │ AuditLog │ Asset3D │ Pre3DImage │ ApiKey │ CreditTransaction      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Prisma Data Model Specification

### 2.1 Enums
- `UserRole`: `ADMIN`, `CREATOR`, `VIEWER`
- `UserStatus`: `ACTIVE`, `REVOKED`
- `InvitationStatus`: `ACTIVE`, `CONSUMED`, `REVOKED`, `EXPIRED`
- `SubscriptionPlan`: `FREE`, `PRO`, `MAX`
- `TopologyType`: `TRIANGLE`, `QUAD`
- `AssetPrivacy`: `PUBLIC`, `PRIVATE`

### 2.2 Core Entities

#### `User`
- `id` (`String @id @default(cuid())`)
- `email` (`String @unique`)
- `displayName` (`String`)
- `passwordHash` (`String`)
- `role` (`UserRole @default(CREATOR)`)
- `status` (`UserStatus @default(ACTIVE)`)
- `level` (`Int @default(0)`)
- `plan` (`SubscriptionPlan @default(FREE)`)
- `credits` (`Int @default(200)`)
- `smartMeshTrials` (`Int @default(2)`)
- `partGenTrials` (`Int @default(1)`)
- `texture8kTrials` (`Int @default(1)`)
- `onboardingCompleted` (`Boolean @default(false)`)
- `onboardingCategory` (`String?`) — e.g., `"Game Assets"`
- `onboardingSubCategory` (`String?`) — e.g., `"Character"`
- `dccConnectionsJson` (`String @default("{}")`) — JSON map of enabled DCC bridges (`Blender`, `Unreal`, `Unity`, etc.)
- `revokedAt` (`DateTime?`)
- `createdAt`, `updatedAt`

#### `Invitation`
- `id` (`String @id @default(cuid())`)
- `code` (`String @unique`) — Single-use or expiring invitation token
- `emailHint` (`String?`) — Optional email restriction
- `role` (`UserRole @default(CREATOR)`)
- `status` (`InvitationStatus @default(ACTIVE)`)
- `maxUses` (`Int @default(1)`)
- `usedCount` (`Int @default(0)`)
- `note` (`String?`)
- `expiresAt` (`DateTime`)
- `consumedAt` (`DateTime?`)
- `revokedAt` (`DateTime?`)
- `createdByUserId` (`String?`)
- `consumedByUserId` (`String? @unique`)
- `createdAt`, `updatedAt`

#### `AuditLog`
- `id` (`String @id @default(cuid())`)
- `actorUserId` (`String?`)
- `actorEmail` (`String?`)
- `action` (`String`) — e.g., `INVITE_CREATED`, `INVITE_CONSUMED`, `INVITE_REVOKED`, `USER_REGISTERED`, `USER_LOGIN`, `USER_REVOKED`, `ROLE_UPDATED`, `MODEL_GENERATED`, `MODEL_PROCESSED`, `API_KEY_CREATED`, `API_KEY_REVOKED`, `PLAN_UPGRADED`
- `targetType` (`String`) — `USER`, `INVITATION`, `ASSET_3D`, `API_KEY`, `SUBSCRIPTION`
- `targetId` (`String?`)
- `ipAddress` (`String?`)
- `detailsJson` (`String @default("{}")`)
- `createdAt` (`DateTime @default(now())`)

#### `Asset3D`
- `id` (`String @id @default(cuid())`)
- `ownerId` (`String?`) — Nullable for public system showcase gallery models
- `ownerName` (`String @default("Tripo Creator")`)
- `name` (`String`)
- `prompt` (`String`)
- `category` (`String @default("character")`) — `character`, `vehicle`, `animal`, `architecture`, `furniture`, `props`, `weapon`, `clothing`, `machine`, `food`, `nature`, `abstract`, `3d_printing`
- `generationMode` (`String @default("HD_MODEL")`) — `HD_MODEL`, `SMART_MESH`, `UPLOAD`, `REMIX`
- `inputMode` (`String @default("TEXT")`) — `IMAGE`, `MULTIVIEW`, `TEXT`, `SKETCH`, `UPLOAD`
- `aiModel` (`String @default("H3.1")`) — `H3.1`, `H3.0`, `H2.5`, `P2.0`
- `topology` (`TopologyType @default(TRIANGLE)`)
- `vertices` (`Int`)
- `faces` (`Int`)
- `targetPolycount` (`Int @default(50000)`)
- `hasTexture` (`Boolean @default(true)`)
- `textureQuality` (`String @default("4K")`) — `NONE`, `2K`, `4K`, `8K`
- `hasPbr` (`Boolean @default(true)`)
- `hasSmartUv` (`Boolean @default(false)`)
- `isSegmented` (`Boolean @default(false)`)
- `isRigged` (`Boolean @default(false)`)
- `activeAnimation` (`String?`) — `Idle`, `Walk`, `Run`, `Jump`, `Dance`, `Combat`
- `privacy` (`AssetPrivacy @default(PUBLIC)`)
- `featured` (`Boolean @default(false)`)
- `likesCount` (`Int @default(0)`)
- `viewsCount` (`Int @default(1)`)
- `meshDataJson` (`String`) — Procedural/parametric 3D mesh definition (primitives, parts/segments, materials, PBR roughness/metallic, bone hierarchy, bounding box) used by both the Three.js WebGL viewport and the binary `.glb`/`.obj`/`.stl`/`.ply` exporter
- `createdAt`, `updatedAt`

#### `Pre3DImage`
- `id` (`String @id @default(cuid())`)
- `ownerId` (`String`)
- `prompt` (`String`)
- `template` (`String @default("T Pose")`)
- `modelName` (`String @default("GPT Image 2.5")`)
- `aspectRatio` (`String @default("1:1")`)
- `resolution4k` (`Boolean @default(false)`)
- `svgDataUri` (`String`)
- `createdAt` (`DateTime @default(now())`)

#### `ApiKey`
- `id` (`String @id @default(cuid())`)
- `userId` (`String`)
- `name` (`String`)
- `keyPrefix` (`String`) — e.g., `tsk_live_8f92...`
- `keyHash` (`String @unique`)
- `status` (`String @default("ACTIVE")`) — `ACTIVE`, `REVOKED`
- `lastUsedAt` (`DateTime?`)
- `createdAt`, `updatedAt`

#### `ApiTask`
- `id` (`String @id @default(cuid())`)
- `userId` (`String`)
- `apiKeyId` (`String?`)
- `type` (`String`) — `text_to_model`, `image_to_model`, `multiview_to_model`, `texture_model`, `refine_model`, `animate_rig`, `convert_model`
- `status` (`String @default("success")`) — `queued`, `running`, `success`, `failed`
- `progress` (`Int @default(100)`)
- `creditCost` (`Int @default(55)`)
- `inputJson` (`String`)
- `outputAssetId` (`String?`)
- `createdAt`, `updatedAt`

#### `CreditTransaction`
- `id` (`String @id @default(cuid())`)
- `userId` (`String`)
- `delta` (`Int`) — Negative for consumption, positive for plan recharge/redeem
- `balanceAfter` (`Int`)
- `reason` (`String`) — e.g., `HD_MODEL_GENERATION`, `SMART_MESH_TRIAL`, `SEGMENTATION`, `RETOPOLOGY`, `SMART_UV`, `TEXTURE_PBR`, `AUTO_RIGGING`, `PLAN_UPGRADE`
- `metadataJson` (`String @default("{}")`)
- `createdAt` (`DateTime @default(now())`)
