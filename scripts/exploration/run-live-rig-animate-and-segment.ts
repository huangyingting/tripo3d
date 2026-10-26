import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const credRaw = JSON.parse(fs.readFileSync('/home/azadmin/tripo3d/.cred', 'utf8'));
function normalizeCookies(rawCookies: any[]) {
  return rawCookies.map((c) => {
    let sameSite: 'Lax' | 'Strict' | 'None' = 'Lax';
    if (c.sameSite) {
      const s = String(c.sameSite).toLowerCase();
      if (s === 'strict') sameSite = 'Strict';
      else if (s === 'none' || s === 'no_restriction') sameSite = 'None';
      else sameSite = 'Lax';
    }
    const cookie: any = {
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

async function clearOverlays(page: any) {
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

async function run() {
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

    page.on('response', async (res) => {
      const u = res.url();
      if (u.includes('api.tripo3d.ai') || u.includes('msapi.tripo3d.ai')) {
        try {
          const txt = await res.text();
          if (!u.includes('message/query') && !u.includes('accepted')) {
            console.log(`   [API ${res.status()}] ${u} => ${txt.slice(0, 300)}`);
          }
        } catch {
          // ignore
        }
      }
    });

    console.log('1. Opening https://studio.tripo3d.ai/workspace/generate ...');
    await page.goto('https://studio.tripo3d.ai/workspace/generate', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await page.waitForTimeout(7000);
    await clearOverlays(page);

    // Click the generated 3D model tile at (1363, 297)
    console.log('2. Selecting generated 3D model at (1363, 297)...');
    await page.mouse.click(1363, 297);
    await page.waitForTimeout(7000);
    await clearOverlays(page);

    // Click "Rig" on the left rail using mouse.click
    const rigRail = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('div, span, button, p')).filter(
        (e) => e.textContent?.trim() === 'Rig' && e.getBoundingClientRect().left < 80 && e.getBoundingClientRect().top > 50
      );
      if (els.length > 0) {
        const target = els[els.length - 1] as HTMLElement;
        const r = target.getBoundingClientRect();
        target.click();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      }
      return null;
    });
    if (rigRail) {
      await page.mouse.click(rigRail.x, rigRail.y);
    }
    await page.waitForTimeout(3500);
    await clearOverlays(page);

    // Find and click the "Auto Rig" button (no coordinate restriction)
    const autoRigClicked = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, div, span')).filter((e) => {
        const r = e.getBoundingClientRect();
        const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
        return r.width > 0 && r.height > 0 && (t === 'Auto Rig' || t.startsWith('Auto Rig '));
      });
      const matches = els.map((e) => {
        const r = e.getBoundingClientRect();
        return {
          tag: e.tagName,
          text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30),
          x: Math.round(r.left + r.width / 2),
          y: Math.round(r.top + r.height / 2),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      });
      if (els.length > 0) {
        const target = els[els.length - 1] as HTMLElement;
        const r = target.getBoundingClientRect();
        return {
          clicked: true,
          matches,
          x: Math.round(r.left + r.width / 2),
          y: Math.round(r.top + r.height / 2),
        };
      }
      return { clicked: false, matches };
    });
    console.log('3. Auto Rig button:', JSON.stringify(autoRigClicked));
    if (autoRigClicked.clicked && autoRigClicked.x && autoRigClicked.y) {
      await page.mouse.click(autoRigClicked.x, autoRigClicked.y);
    }

    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(outDir, '72_live_auto_rig_in_progress.png') });

    // Poll until Auto Rig completes (up to 75 seconds)
    for (let i = 1; i <= 15; i++) {
      await page.waitForTimeout(5000);
      const state = await page.evaluate(() => {
        const txt = document.body.innerText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        const busy = txt.some(
          (t) =>
            t.includes('Generating...') ||
            t.includes('Rigging...') ||
            t.includes('Cancel') ||
            /\d+s$/.test(t)
        );
        return { busy, sample: txt.slice(18, 60) };
      });
      console.log(`   [Auto Rig Poll ${i * 5}s] busy=${state.busy}:`, state.sample.join(' | '));
      if (!state.busy && i >= 3) {
        break;
      }
    }

    // Select the newest asset at (1363, 297) in case Auto Rig created a new rigged asset version
    await page.mouse.click(1363, 297);
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(outDir, '74_live_auto_rig_completed_skeleton.png') });

    // 4. Switch to Animate sub-tab (x=39, y=656)
    console.log('4. Opening Animate sub-tab on rigged 3D model...');
    await page.mouse.click(39, 656);
    await page.waitForTimeout(3000);
    await clearOverlays(page);
    await page.screenshot({ path: path.join(outDir, '75_live_animate_presets_unlocked.png') });

    // Find and click an animation preset card (e.g., 'cheer', 'bow', 'cast_a_spell', 'agree', 'afraid')
    const animClipClicked = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('div, span, p, button')).filter((e) => {
        const r = e.getBoundingClientRect();
        const t = (e.textContent || '').trim();
        return (
          r.left > 75 &&
          r.left < 340 &&
          r.top > 300 &&
          r.top < 820 &&
          r.width >= 40 &&
          r.width <= 140 &&
          ['cheer', 'bow', 'cast_a_spell', 'agree', 'afraid', 'basketball_shot'].includes(t)
        );
      });
      if (els.length > 0) {
        const target = els[0] as HTMLElement;
        const r = target.getBoundingClientRect();
        target.click();
        return {
          clicked: true,
          clip: target.textContent?.trim(),
          x: Math.round(r.left + r.width / 2),
          y: Math.round(r.top - 20),
        };
      }
      return { clicked: false };
    });
    console.log('5. Clicked animation preset clip:', JSON.stringify(animClipClicked));
    if (animClipClicked.clicked && animClipClicked.x && animClipClicked.y) {
      await page.mouse.click(animClipClicked.x, animClipClicked.y);
      await page.waitForTimeout(6000);
      await clearOverlays(page);
    }
    await page.screenshot({ path: path.join(outDir, '76_live_animated_3d_character_playback.png') });
    const animPlayText = await page.evaluate(() =>
      document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 100)
    );
    console.log('   Animated 3D playback text:', animPlayText.slice(15, 75).join(' | '));

    // Also click "AI Animation" sub-tab inside Animate panel to capture AI Text-to-Motion
    const aiAnimClicked = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('div, span, button')).find(
        (e) =>
          e.textContent?.trim() === 'AI Animation' &&
          e.getBoundingClientRect().left > 70 &&
          e.getBoundingClientRect().left < 350
      );
      if (el) {
        const r = el.getBoundingClientRect();
        (el as HTMLElement).click();
        return { clicked: true, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      }
      return { clicked: false };
    });
    console.log('6. AI Animation tab:', JSON.stringify(aiAnimClicked));
    if (aiAnimClicked.clicked && aiAnimClicked.x && aiAnimClicked.y) {
      await page.mouse.click(aiAnimClicked.x, aiAnimClicked.y);
      await page.waitForTimeout(2500);
      await clearOverlays(page);
      await page.screenshot({ path: path.join(outDir, '77_live_ai_animation_text_to_motion.png') });
      const aiTxt = await page.evaluate(() =>
        document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 100)
      );
      console.log('   AI Animation text:', aiTxt.slice(15, 70).join(' | '));
    }

    // Also click "Export" button on the bottom viewport bar to capture the 3D Export modal (GLB, FBX, OBJ, STL, USDZ, Blender, Unity, Unreal)
    const exportClicked = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('button, div, span')).find(
        (e) =>
          e.textContent?.trim() === 'Export' &&
          e.getBoundingClientRect().top > 750 &&
          e.getBoundingClientRect().left > 350 &&
          e.getBoundingClientRect().left < 1150
      );
      if (el) {
        const r = el.getBoundingClientRect();
        (el as HTMLElement).click();
        return { clicked: true, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      }
      return { clicked: false };
    });
    console.log('7. Export button on viewport:', JSON.stringify(exportClicked));
    if (exportClicked.clicked && exportClicked.x && exportClicked.y) {
      await page.mouse.click(exportClicked.x, exportClicked.y);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(outDir, '78_live_3d_model_export_panel.png') });
      const expTxt = await page.evaluate(() =>
        document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 110)
      );
      console.log('   Export panel text:', expTxt.slice(15, 80).join(' | '));
    }

    console.log('✔ Completed live Auto Rig, Animate playback, AI Animation, and Export inspection.');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
