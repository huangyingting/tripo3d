import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const credRaw = JSON.parse(fs.readFileSync('/home/azadmin/tripo3d/.cred', 'utf8'));
function normalizeCookies(rawCookies) {
  return rawCookies.map((c) => {
    let sameSite = 'Lax';
    if (c.sameSite) {
      const s = String(c.sameSite).toLowerCase();
      if (s === 'strict') sameSite = 'Strict';
      else if (s === 'none' || s === 'no_restriction') sameSite = 'None';
      else sameSite = 'Lax';
    }
    const cookie = {
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path || '/',
      secure: Boolean(c.secure || sameSite === 'None'),
      httpOnly: Boolean(c.httpOnly),
      sameSite,
    };
    if (c.expirationDate && !c.session) {
      cookie.expires = Math.floor(Number(c.expirationDate));
    }
    return cookie;
  });
}

const outDir = '/home/azadmin/tripo3d/screenshots/reference';
fs.mkdirSync(outDir, { recursive: true });

async function clearOverlays(page) {
  await page.evaluate(() => {
    document
      .querySelectorAll(
        '[role="dialog"], div[data-state="open"].fixed.inset-0, .bg-black-80.inset-0.fixed'
      )
      .forEach((el) => el.remove());
    document.body.style.pointerEvents = 'auto';
    document.body.style.overflow = 'auto';
    document.body.removeAttribute('data-scroll-locked');
  });
}

// Build a clean humanoid OBJ mesh so live Tripo3D Studio can load, segment, retopo, texture, and rig/animate it
function createHumanoidObjFile(filePath) {
  const parts = [
    // Torso
    { cx: 0, cy: 1.2, cz: 0, sx: 0.35, sy: 0.45, sz: 0.2 },
    // Head
    { cx: 0, cy: 1.85, cz: 0, sx: 0.2, sy: 0.2, sz: 0.2 },
    // Left Arm
    { cx: -0.55, cy: 1.25, cz: 0, sx: 0.18, sy: 0.12, sz: 0.12 },
    // Right Arm
    { cx: 0.55, cy: 1.25, cz: 0, sx: 0.18, sy: 0.12, sz: 0.12 },
    // Left Leg
    { cx: -0.18, cy: 0.4, cz: 0, sx: 0.12, sy: 0.4, sz: 0.12 },
    // Right Leg
    { cx: 0.18, cy: 0.4, cz: 0, sx: 0.12, sy: 0.4, sz: 0.12 },
  ];

  const lines = ['# Humanoid Character T-Pose Mesh', 'o HumanoidCharacter'];
  let vOffset = 1;
  for (const p of parts) {
    const { cx, cy, cz, sx, sy, sz } = p;
    const verts = [
      [cx - sx, cy - sy, cz + sz],
      [cx + sx, cy - sy, cz + sz],
      [cx + sx, cy + sy, cz + sz],
      [cx - sx, cy + sy, cz + sz],
      [cx - sx, cy - sy, cz - sz],
      [cx + sx, cy - sy, cz - sz],
      [cx + sx, cy + sy, cz - sz],
      [cx - sx, cy + sy, cz - sz],
    ];
    for (const v of verts) {
      lines.push(`v ${v[0].toFixed(4)} ${v[1].toFixed(4)} ${v[2].toFixed(4)}`);
    }
    const faces = [
      [0, 1, 2, 3],
      [5, 4, 7, 6],
      [3, 2, 6, 7],
      [4, 5, 1, 0],
      [1, 5, 6, 2],
      [4, 0, 3, 7],
    ];
    for (const f of faces) {
      lines.push(
        `f ${vOffset + f[0]} ${vOffset + f[1]} ${vOffset + f[2]} ${vOffset + f[3]}`
      );
    }
    vOffset += 8;
  }
  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

async function run() {
  const report = {
    timestamp: new Date().toISOString(),
    liveGeneration: null,
    activeModelStages: [],
    communityAnimatedModels: [],
  };

  const humanoidObjPath = '/tmp/humanoid-character.obj';
  createHumanoidObjFile(humanoidObjPath);

  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1440,900',
    ],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    await context.addCookies(normalizeCookies(credRaw));
    const page = await context.newPage();

    console.log('1. Navigating to live https://studio.tripo3d.ai/workspace/generate ...');
    await page.goto('https://studio.tripo3d.ai/workspace/generate', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await page.waitForTimeout(7000);
    await clearOverlays(page);
    await page.waitForTimeout(1000);

    // First, check if we can switch to Text-to-3D input mode and trigger a real 3D generation or upload our humanoid OBJ
    console.log('2. Uploading humanoid-character.obj into the right Assets panel / Upload 3D Model...');
    const fileInputs = page.locator('input[type="file"]');
    const inputCount = await fileInputs.count();
    console.log('   Found file inputs in workspace:', inputCount);

    // Find the file input that accepts .obj / .glb / 3d models
    let uploaded3D = false;
    for (let i = 0; i < inputCount; i++) {
      const accept = (await fileInputs.nth(i).getAttribute('accept')) || '';
      console.log(`   File input #${i} accept="${accept}"`);
      if (accept.includes('obj') || accept.includes('glb') || i === inputCount - 1) {
        try {
          await fileInputs.nth(i).setInputFiles(humanoidObjPath);
          uploaded3D = true;
          console.log(`   Uploaded humanoid-character.obj to input #${i}`);
          break;
        } catch (err) {
          console.log(`   Could not upload to input #${i}:`, err.message);
        }
      }
    }

    await page.waitForTimeout(5000);
    await clearOverlays(page);
    await page.screenshot({
      path: path.join(outDir, '46_live_workspace_after_3d_upload.png'),
    });

    // Also test Text-to-3D generation on live studio.tripo3d.ai!
    console.log('3. Testing Text-to-3D prompt & generation on live studio.tripo3d.ai...');
    // Switch to Text sub-tab (3rd icon in the 4-icon bar under HD Model / Smart Mesh)
    await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div'));
      const pillBar = allDivs.find((d) => {
        const children = Array.from(d.children);
        return (
          children.length === 4 &&
          d.getBoundingClientRect().left < 320 &&
          d.getBoundingClientRect().top > 110 &&
          d.getBoundingClientRect().top < 250
        );
      });
      if (pillBar && pillBar.children[1]) {
        pillBar.children[1].click();
      }
    });
    await page.waitForTimeout(1500);

    // Find textarea for prompt
    const textareas = page.locator('textarea');
    if ((await textareas.count()) > 0) {
      await textareas
        .first()
        .fill('Armored cyber knight character in T-pose, game ready 3D model');
      await page.waitForTimeout(800);
      await page.screenshot({
        path: path.join(outDir, '47_live_workspace_text_to_3d_prompt_filled.png'),
      });

      // Click Generate button if available
      const genBtn = page
        .locator('button:has-text("Generate"), div[role="button"]:has-text("Generate")')
        .first();
      if ((await genBtn.count()) > 0) {
        console.log('   Clicking Generate button on live studio.tripo3d.ai...');
        await genBtn.click({ force: true });
        await page.waitForTimeout(5000);
        await clearOverlays(page);
        await page.screenshot({
          path: path.join(outDir, '48_live_workspace_generation_triggered.png'),
        });

        // Wait up to 35s to see generation progress/completion or asset card in right panel
        for (let step = 1; step <= 7; step++) {
          await page.waitForTimeout(5000);
          const bodyText = await page.evaluate(() =>
            document.body.innerText
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 90)
          );
          console.log(`   [Wait ${step * 5}s] Workspace status sample:`, bodyText.slice(20, 35).join(' | '));
        }
        await page.screenshot({
          path: path.join(outDir, '49_live_workspace_generated_3d_model.png'),
        });
      }
    }

    // Click any asset card in the right-hand Assets list if present so it's active in the 3D viewport
    await page.evaluate(() => {
      const rightCards = Array.from(document.querySelectorAll('img, canvas, div')).filter(
        (el) => {
          const r = el.getBoundingClientRect();
          return r.left > 1100 && r.top > 120 && r.top < 500 && r.width > 50 && r.height > 50;
        }
      );
      if (rightCards[0]) rightCards[0].click();
    });
    await page.waitForTimeout(3000);
    await clearOverlays(page);
    await page.screenshot({
      path: path.join(outDir, '50_live_workspace_active_model_viewport.png'),
    });

    // 4. Now step through every 3D Model & Animation rail item and sub-tab on live studio.tripo3d.ai!
    const railItems = [
      { label: 'Segment', subTabs: ['Segment', 'Fill Parts'] },
      { label: 'Retopo', subTabs: ['Quad', 'Triangle'] },
      { label: 'Smart UV', subTabs: [] },
      { label: 'Texture', subTabs: ['Texture', 'Edit', 'Upscale', 'PBR'] },
      { label: 'Rig', subTabs: ['Rig', 'Animate'] },
      { label: 'App', subTabs: [] },
    ];

    let shotIdx = 51;
    for (const item of railItems) {
      const clicked = await page.evaluate((label) => {
        const els = Array.from(document.querySelectorAll('div, button, span, p'));
        const el = els.find(
          (e) =>
            e.textContent?.trim() === label &&
            e.getBoundingClientRect().left < 80 &&
            e.getBoundingClientRect().top > 60
        );
        if (el) {
          el.click();
          return true;
        }
        return false;
      }, item.label);

      if (clicked) {
        await page.waitForTimeout(2000);
        await clearOverlays(page);
        const safeLabel = item.label.toLowerCase().replace(/\s+/g, '_');
        const shotName = `${shotIdx++}_live_stage_${safeLabel}.png`;
        await page.screenshot({ path: path.join(outDir, shotName) });
        const stageText = await page.evaluate(() =>
          document.body.innerText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 100)
        );
        report.activeModelStages.push({
          stage: item.label,
          screenshot: shotName,
          visibleText: stageText,
        });

        for (const sub of item.subTabs) {
          const subClicked = await page.evaluate((subLabel) => {
            const els = Array.from(document.querySelectorAll('div, button, span'));
            const el = els.find(
              (e) =>
                e.textContent?.trim() === subLabel &&
                e.getBoundingClientRect().left >= 65 &&
                e.getBoundingClientRect().left < 360 &&
                e.getBoundingClientRect().top > 55 &&
                e.getBoundingClientRect().top < 240
            );
            if (el) {
              el.click();
              return true;
            }
            return false;
          }, sub);

          if (subClicked) {
            await page.waitForTimeout(1800);
            await clearOverlays(page);
            const safeSub = sub.toLowerCase().replace(/\s+/g, '_');
            const subShot = `${shotIdx++}_live_stage_${safeLabel}_${safeSub}.png`;
            await page.screenshot({ path: path.join(outDir, subShot) });
            const subText = await page.evaluate(() =>
              document.body.innerText
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 100)
            );
            report.activeModelStages.push({
              stage: `${item.label} -> ${sub}`,
              screenshot: subShot,
              visibleText: subText,
            });
          }
        }
      }
    }

    // 5. Explore a live 3D model detail / viewer modal on https://studio.tripo3d.ai/home to inspect live 3D viewport & animation controls
    console.log('5. Exploring live 3D model detail viewer & animation controls on studio.tripo3d.ai/home...');
    await page.goto('https://studio.tripo3d.ai/home', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await page.waitForTimeout(5000);
    await clearOverlays(page);

    // Click the first gallery card on /home to open its 3D interactive preview modal
    const clickedCard = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('img')).filter((img) => {
        const r = img.getBoundingClientRect();
        return r.top > 350 && r.width > 140 && r.height > 140;
      });
      if (cards[0]) {
        cards[0].click();
        return true;
      }
      return false;
    });

    if (clickedCard) {
      await page.waitForTimeout(5000);
      const modalShot = `${shotIdx++}_live_home_3d_model_viewer_modal.png`;
      await page.screenshot({ path: path.join(outDir, modalShot) });
      const modalText = await page.evaluate(() =>
        document.body.innerText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 100)
      );
      report.communityAnimatedModels.push({
        source: 'studio.tripo3d.ai/home modal',
        screenshot: modalShot,
        visibleText: modalText,
      });
    }

    fs.writeFileSync(
      '/home/azadmin/.copilot/session-state/4f0179cc-55bb-4bb9-922a-71d158f4dc3a/files/live-3d-animation-report.json',
      JSON.stringify(report, null, 2)
    );
    console.log('✔ Saved live-3d-animation-report.json');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
