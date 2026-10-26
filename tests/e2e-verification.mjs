import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 3487;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'screenshots/replica');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json && json.ok === true && Array.isArray(json.models)) return true;
      }
    } catch {
      // wait
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Tripo3D Server at ${url} did not start within ${timeoutMs}ms`);
}

async function run() {
  console.log('0. Ensuring clean state (0 @tripo3d.local test users)...');
  execSync(
    `npx tsx -e "import { prisma } from './src/lib/prisma'; (async () => { await prisma.asset3D.deleteMany({ where: { owner: { email: { endsWith: '@tripo3d.local' } } } }); await prisma.invitation.deleteMany({}); await prisma.user.deleteMany({ where: { email: { endsWith: '@tripo3d.local' } } }); await prisma.auditLog.deleteMany({ where: { actorEmail: { endsWith: '@tripo3d.local' } } }); })()"`,
    { stdio: 'inherit' }
  );

  console.log('1. Bootstrapping temporary E2E Admin account...');
  const e2eAdminEmail = 'e2e_admin_verify@tripo3d.local';
  const e2eAdminPass = 'E2EAdminVerify!2026';
  const e2eCreatorEmail = 'e2e_creator_verify@tripo3d.local';
  const e2eCreatorPass = 'E2ECreatorVerify!2026';

  execSync(
    `npx tsx scripts/bootstrap-admin.ts --email "${e2eAdminEmail}" --password "${e2eAdminPass}" --name "E2E Admin"`,
    { stdio: 'inherit' }
  );

  console.log(`2. Starting Next.js production server on port ${PORT}...`);
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    stdio: 'pipe',
    detached: true,
    env: { ...process.env, PORT: String(PORT) },
  });

  let browser;
  try {
    await waitForServer(`${BASE_URL}/api/gallery`);
    console.log('   Server is up and responding.');

    browser = await chromium.launch({
      headless: true,
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
      ],
    });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    // 1. Marketing Home
    console.log('3. Verifying Marketing Home (/), Pricing (/pricing), Research (/research), Features (/features/ai-text-to-3d)...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_marketing_home.png') });

    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_marketing_pricing.png') });

    await page.goto(`${BASE_URL}/research`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_marketing_research.png') });

    await page.goto(`${BASE_URL}/features/ai-text-to-3d`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_feature_text_to_3d.png') });

    // 2. Free 3D File Converter & 3D Viewer
    console.log('4. Verifying Free 3D File Converter (/3d-tools/convert) & Online 3D Viewer (/3d-tools/3d-viewer)...');
    await page.goto(`${BASE_URL}/3d-tools/convert`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_tools_3d_converter.png') });

    await page.goto(`${BASE_URL}/3d-tools/3d-viewer`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_tools_3d_viewer.png') });

    // 3. Sign in as Admin & Issue Single-Use Invite Code
    console.log('5. Signing in as Admin at /login and issuing single-use Creator invitation at /admin...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_login_page.png') });

    await page.fill('input[type="email"]', e2eAdminEmail);
    await page.fill('input[type="password"]', e2eAdminPass);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/workspace\/generate|\/studio|\/admin/, { timeout: 15000 });

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Issue single-use invite via API inside page context so we get the exact rawCode
    const inviteData = await page.evaluate(async (creatorEmail) => {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: creatorEmail,
          role: 'Creator',
          expiresInHours: 72,
          note: 'E2E Playwright Verification',
        }),
      });
      return res.json();
    }, e2eCreatorEmail);

    if (!inviteData.rawCode) {
      throw new Error(`Failed to issue invitation code: ${JSON.stringify(inviteData)}`);
    }
    console.log(`   Issued single-use invitation code: ${inviteData.rawCode}`);

    await page.reload({ waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_admin_governance_console.png') });

    // Sign out Admin
    await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST' }));

    // 4. Register Creator via Single-Use Invite Link
    console.log('6. Registering new Creator account via /register?code=...');
    await page.goto(`${BASE_URL}/register?code=${encodeURIComponent(inviteData.rawCode)}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_register_invite_validated.png') });

    const inputs = page.locator('form input');
    await inputs.nth(1).fill('E2E Studio Creator');
    await inputs.nth(2).fill(e2eCreatorEmail);
    await inputs.nth(3).fill(e2eCreatorPass);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/workspace\/generate/, { timeout: 15000 });
    await page.waitForTimeout(600);

    // Capture 2-Step Onboarding Modal on first Studio login
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_studio_onboarding_modal.png') });

    // Complete onboarding via API & reload workspace
    await page.evaluate(async () => {
      await fetch('/api/studio/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryUseCase: 'Game Assets',
          subCategory: 'Character',
          onboardingCompleted: true,
        }),
      });
    });

    await page.goto(`${BASE_URL}/workspace/generate`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_studio_workspace_3d_ide.png') });

    // 5. Generate a new 3D Model in Studio Workspace & test pipeline
    console.log('7. Generating a 3D model and testing Studio pages (/studio, /assets, /creator-hub, /platform)...');
    const genData = await page.evaluate(async () => {
      const res = await fetch('/api/studio/generate-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Armored Cyber Valkyrie Paladin Knight in T-Pose',
          generationMode: 'HD_MODEL',
          aiModelVersion: 'H3.1',
          topology: 'TRIANGLE',
          targetPolycount: 64000,
          hasTexture: true,
          textureQuality: '4K',
          pbrEnabled: true,
          inParts: true,
        }),
      });
      return res.json();
    });
    if (!genData.asset?.id) {
      throw new Error(`3D generation failed: ${JSON.stringify(genData)}`);
    }
    console.log(`   Generated 3D Asset ID: ${genData.asset.id} (${genData.asset.faces} faces)`);

    // Upgrade Creator subscription to Professional (+3,000 credits) so all 13 pipeline stages & sub-stages can run in one continuous session
    await page.evaluate(async () => {
      await fetch('/api/studio/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'PRO' }),
      });
    });

    // Reload /workspace/generate with the newly generated 3D model active and test all 3D Model & Animation stages!
    console.log('7b. Testing all 8 3D Model & Animation stages and viewport render modes in /workspace/generate...');
    await page.goto(`${BASE_URL}/workspace/generate`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // Stage 1: Image Reference Generator
    await page.click('[data-testid="rail-image"]');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Generate 2D Reference")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '18_replica_3d_stage1_image_generator.png') });

    // Stage 2: 3D Model Generator with active 3D mesh in PBR Shaded mode
    await page.click('[data-testid="rail-model"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '19_replica_3d_stage2_hd_model_and_tpose.png') });

    // Stage 3: AI Mesh Segmentation + Exploded Parts Render Mode + Fill Parts Sub-stage
    await page.click('[data-testid="rail-segment"]');
    await page.waitForTimeout(300);
    await page.click('[data-testid="btn-start-segmenting"]');
    await page.waitForTimeout(700);
    await page.click('[data-testid="viewport-mode-segments"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '20_replica_3d_stage3_segment_and_parts_explode.png') });

    // Sub-Stage 3b: Fill Parts
    await page.click('[data-testid="rail-sub-fill_parts"]');
    await page.waitForTimeout(300);
    await page.click('[data-testid="btn-fill-parts"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '30_replica_3d_substage_fill_parts.png') });

    // Test High-Poly Rigging Guard ("Polygon Limit Exceeded" Modal) before Retopology
    await page.evaluate(async (assetId) => {
      await fetch(`/api/studio/assets/${assetId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'retopo',
          topology: 'TRIANGLE',
          targetPolycount: 500000,
        }),
      });
    }, genData.asset.id);
    await page.goto(`${BASE_URL}/workspace/generate`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.click('[data-testid="rail-rig"]');
    await page.waitForTimeout(300);
    await page.click('[data-testid="btn-confirm-rigging"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '31_replica_polygon_limit_exceeded_modal.png') });
    // Click "Go to Retopology" inside Polygon Limit Exceeded Modal
    await page.click('[data-testid="modal-btn-go-to-retopo"]');
    await page.waitForTimeout(400);

    // Stage 4: Smart Retopology + Wireframe & Clay Viewport Modes
    await page.click('[data-testid="viewport-mode-wireframe"]');
    await page.waitForTimeout(400);
    await page.click('[data-testid="btn-confirm-retopo"]');
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '21_replica_3d_stage4_retopo_wireframe.png') });

    await page.click('[data-testid="viewport-mode-clay"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '21b_replica_3d_stage4_clay_mode.png') });

    // Convert back to Triangle low-poly (18,723 faces) for UV, Texture, and Rigging
    await page.evaluate(async (assetId) => {
      await fetch(`/api/studio/assets/${assetId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'retopo',
          topology: 'TRIANGLE',
          targetPolycount: 18723,
        }),
      });
    }, genData.asset.id);
    await page.goto(`${BASE_URL}/workspace/generate`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Stage 5: Smart UV Unwrap + UV Checkerboard Viewport Mode
    await page.click('[data-testid="rail-smart_uv"]');
    await page.waitForTimeout(300);
    await page.click('[data-testid="btn-unwrap-uv"]');
    await page.waitForTimeout(600);
    await page.click('[data-testid="viewport-mode-uv_checker"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '22_replica_3d_stage5_smart_uv_checker.png') });

    // Stage 6: PBR Texture Generator & Dual-Pane Magic Brush + Upscale + PBR Sub-stages
    await page.click('[data-testid="viewport-mode-pbr"]');
    await page.click('[data-testid="rail-texture"]');
    await page.waitForTimeout(300);
    await page.click('[data-testid="btn-generate-texture"]');
    await page.waitForTimeout(700);
    await page.click('[data-testid="rail-sub-texture_edit"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '23_replica_3d_stage6_texture_pbr_and_magic_brush.png') });

    await page.click('[data-testid="rail-sub-texture_upscale"]');
    await page.waitForTimeout(300);
    await page.click('[data-testid="btn-upscale-texture"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '32_replica_3d_substage_texture_upscale.png') });

    await page.click('[data-testid="rail-sub-texture_pbr"]');
    await page.waitForTimeout(300);
    await page.click('[data-testid="btn-generate-pbr"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '33_replica_3d_substage_pbr_generator.png') });

    // Right Sidebar Property & Scene Hierarchy Tree Inspection
    await page.click('[data-testid="right-tab-property"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '34_replica_right_sidebar_property_hierarchy.png') });
    await page.click('[data-testid="right-tab-assets"]');
    await page.waitForTimeout(200);

    // Stage 7a: Auto Rig (Humanoid Mixamo 16-Bone Octahedral Skeleton)
    await page.click('[data-testid="rail-rig"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '24_replica_3d_stage7_rig_mixamo_skeleton.png') });

    // Trigger Auto Rigging -> binds 16-bone octahedral skeleton and opens Animation tab
    await page.click('[data-testid="btn-confirm-rigging"]');
    await page.waitForTimeout(800);

    // Inspect Rig Completed Panel with Skeleton Toggle & "Rigged models can be used for animation ›" link
    await page.click('[data-testid="rail-rig"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '35_replica_rig_completed_octahedral_skeleton.png') });
    await page.click('[data-testid="link-go-to-animation"]');
    await page.waitForTimeout(400);

    // Stage 7b: Live Preset Clips (#2, Afraid, Agree) + Animation Playback Timeline Bar
    await page.click('[data-testid="anim-clip-2"]');
    await page.waitForTimeout(500);
    await page.click('[data-testid="anim-clip-afraid"]');
    await page.waitForTimeout(500);
    await page.click('[data-testid="anim-clip-agree"]');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '36_replica_animate_preset_clips_and_timeline_bar.png') });

    // Stage 7c: Animation Clip - Walk Cycle
    await page.click('[data-testid="anim-clip-walk"]');
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '25_replica_3d_animate_walk_cycle.png') });

    // Stage 7d: Animation Clip - Jump Action
    await page.click('[data-testid="anim-clip-jump"]');
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '26_replica_3d_animate_run_and_jump.png') });

    // Stage 7e: Animation Clip - Dance / Cheer
    await page.click('[data-testid="anim-clip-dance"]');
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '27_replica_3d_animate_dance_and_cheer.png') });

    // Stage 7f: Multi-stage Motion & Text to Motion
    await page.click('[data-testid="animate-tab-multistage"]');
    await page.waitForTimeout(400);
    await page.click('[data-testid="btn-generate-ai-motion"]');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '28_replica_3d_animate_combat_and_ai_motion.png') });

    // Test Top-Right Help ("View Your Model") & "? Guide" Popovers + Matcap Spheres
    await page.click('[data-testid="viewport-mode-matcap_gold"]');
    await page.click('[data-testid="viewport-help-btn"]');
    await page.waitForTimeout(300);
    await page.click('[data-testid="viewport-help-ok"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '37_replica_viewport_guide_popover_and_matcap_dock.png') });
    await page.click('[data-testid="viewport-help-btn"]');
    await page.click('[data-testid="viewport-mode-pbr"]');

    // Test Full Export Modal with Animation & Pivot Options
    await page.click('[data-testid="btn-open-export-modal"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '38_replica_export_modal_with_animation.png') });
    await page.click('[data-testid="modal-btn-confirm-export"]');
    await page.waitForTimeout(400);

    // Stage 8: Stylize Apps & Binary 3D Export (.GLB / .OBJ / .STL / .PLY)
    await page.click('[data-testid="rail-app"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '29_replica_3d_stage8_stylize_apps_and_export.png') });

    // Studio Home
    await page.goto(`${BASE_URL}/studio`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_studio_home.png') });

    // Assets Library
    await page.goto(`${BASE_URL}/assets`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_studio_assets_library.png') });

    // Creator Hub
    await page.goto(`${BASE_URL}/creator-hub`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14_creator_hub_showcase.png') });

    // 3D Model Detail Page
    await page.goto(`${BASE_URL}/3d-model/${genData.asset.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '15_model_detail_inspector.png') });

    // Developer API Platform
    await page.goto(`${BASE_URL}/platform`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '16_api_platform_console.png') });

    // Mobile Responsive Verification (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/workspace/generate`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '17_mobile_studio_workspace.png') });

    console.log('8. Cleaning up temporary E2E verification users so 0 demo/test users remain...');
    execSync(
      `npx tsx -e "import { prisma } from './src/lib/prisma'; (async () => { await prisma.asset3D.deleteMany({ where: { owner: { email: { endsWith: '@tripo3d.local' } } } }); await prisma.invitation.deleteMany({}); await prisma.user.deleteMany({ where: { email: { endsWith: '@tripo3d.local' } } }); await prisma.auditLog.deleteMany({ where: { actorEmail: { endsWith: '@tripo3d.local' } } }); const uCount = await prisma.user.count(); console.log('Remaining users in DB:', uCount); })()"`,
      { stdio: 'inherit' }
    );

    console.log('✔ E2E Playwright Verification Completed Successfully!');
  } finally {
    if (browser) await browser.close();
    if (server && server.pid) {
      try {
        process.kill(-server.pid, 'SIGTERM');
      } catch {
        try {
          process.kill(server.pid, 'SIGTERM');
        } catch {
          // ignore
        }
      }
    }
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
