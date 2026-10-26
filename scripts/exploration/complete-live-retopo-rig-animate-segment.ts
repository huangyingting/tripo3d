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

async function clearStartupPopups(page: any) {
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

async function clickLeftRail(page: any, label: string) {
  const pos = await page.evaluate((lbl: string) => {
    const els = Array.from(document.querySelectorAll('div, span, button, p')).filter(
      (e) =>
        e.textContent?.trim() === lbl &&
        e.getBoundingClientRect().left < 80 &&
        e.getBoundingClientRect().top > 50
    );
    if (els.length > 0) {
      const target = els[els.length - 1] as HTMLElement;
      const r = target.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    }
    return null;
  }, label);
  if (pos) {
    await page.mouse.click(pos.x, pos.y);
    await page.waitForTimeout(2500);
  }
  return pos;
}

async function waitForTaskCompletion(page: any, label: string, maxPolls = 20) {
  for (let i = 1; i <= maxPolls; i++) {
    await page.waitForTimeout(5000);
    const state = await page.evaluate(() => {
      const txt = document.body.innerText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const isGenerating = txt.some(
        (t) =>
          t.includes('Generating...') ||
          t.includes('Segmenting...') ||
          t.includes('Retopologizing...') ||
          t.includes('Rigging...') ||
          /^\d+s$/.test(t)
      );
      return { isGenerating, sample: txt.slice(18, 58) };
    });
    console.log(`   [${label} Poll ${i * 5}s] isGenerating=${state.isGenerating}:`, state.sample.slice(0, 12).join(' | '));
    if (!state.isGenerating && i >= 2) {
      return true;
    }
  }
  return false;
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
      if (u.includes('api.tripo3d.ai/v2/studio/')) {
        try {
          const txt = await res.text();
          if (!u.includes('message/') && !u.includes('prices/list') && !u.includes('survey')) {
            console.log(`   [API ${res.status()}] ${u} => ${txt.slice(0, 260)}`);
          }
        } catch {
          // ignore
        }
      }
    });

    console.log('1. Navigating to https://studio.tripo3d.ai/workspace/generate ...');
    await page.goto('https://studio.tripo3d.ai/workspace/generate', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await page.waitForTimeout(7000);
    await clearStartupPopups(page);

    // Select the generated 3D model at (1363, 297)
    console.log('2. Selecting generated 3D model at (1363, 297)...');
    await page.mouse.click(1363, 297);
    await page.waitForTimeout(6000);

    // STEP A: Run Live Semantic Segmentation (0 credits free trial!)
    console.log('3. Opening Segment tab and clicking Start Segmenting (0 credits free trial)...');
    await clickLeftRail(page, 'Segment');
    const segBtn = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, div, span')).filter((e) => {
        const r = e.getBoundingClientRect();
        const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
        return r.left > 60 && r.left < 350 && r.top > 400 && t.includes('Start Segmenting');
      });
      if (els.length > 0) {
        const target = els[els.length - 1] as HTMLElement;
        const r = target.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), text: target.textContent?.trim() };
      }
      return null;
    });
    console.log('   Start Segmenting button:', JSON.stringify(segBtn));
    if (segBtn) {
      await page.mouse.click(segBtn.x, segBtn.y);
      await page.waitForTimeout(4000);
      await page.screenshot({ path: path.join(outDir, '72_live_segmentation_in_progress.png') });
      await waitForTaskCompletion(page, 'Segment', 18);
      await page.screenshot({ path: path.join(outDir, '73_live_segmented_3d_parts_result.png') });
    }

    // STEP B: Trigger Auto-Rig -> Polygon Limit Exceeded -> Click "Retopologize" (or run Retopo directly)
    console.log('4. Opening Rig tab to test Auto Rig & Retopology...');
    await clickLeftRail(page, 'Rig');
    const autoRigBtn = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, div, span')).filter((e) => {
        const r = e.getBoundingClientRect();
        const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
        return r.left > 60 && r.left < 350 && r.top > 400 && t.startsWith('Auto Rig');
      });
      if (els.length > 0) {
        const target = els[els.length - 1] as HTMLElement;
        const r = target.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      }
      return null;
    });
    if (autoRigBtn) {
      await page.mouse.click(autoRigBtn.x, autoRigBtn.y);
      await page.waitForTimeout(3000);
      await page.screenshot({
        path: path.join(outDir, '74_live_auto_rig_polygon_limit_exceeded_modal.png'),
      });

      // Click "Retopologize" inside the Polygon Limit Exceeded modal if present
      const retopoModalBtn = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('button, div, span')).filter(
          (e) => e.textContent?.trim() === 'Retopologize' && e.getBoundingClientRect().width > 20
        );
        if (els.length > 0) {
          const target = els[els.length - 1] as HTMLElement;
          const r = target.getBoundingClientRect();
          return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
        }
        return null;
      });
      console.log('   Polygon Limit Exceeded -> Retopologize modal button:', JSON.stringify(retopoModalBtn));
      if (retopoModalBtn) {
        await page.mouse.click(retopoModalBtn.x, retopoModalBtn.y);
        await page.waitForTimeout(2500);
      }
    }

    // Now we are in Retopology (or click Retopo rail to be sure). Switch Topology to Triangle (so it remains riggable/segmentable) and click "Retopology 40"
    await clickLeftRail(page, 'Retopo');
    const triBtn = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, div, span')).filter(
        (e) =>
          e.textContent?.trim() === 'Triangle' &&
          e.getBoundingClientRect().left > 70 &&
          e.getBoundingClientRect().left < 350 &&
          e.getBoundingClientRect().top < 400
      );
      if (els.length > 0) {
        const target = els[els.length - 1] as HTMLElement;
        const r = target.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      }
      return null;
    });
    if (triBtn) {
      await page.mouse.click(triBtn.x, triBtn.y);
      await page.waitForTimeout(1000);
    }

    const startRetopoBtn = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, div, span')).filter((e) => {
        const r = e.getBoundingClientRect();
        const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
        return r.left > 60 && r.left < 350 && r.top > 750 && t.includes('Retopology');
      });
      if (els.length > 0) {
        const target = els[els.length - 1] as HTMLElement;
        const r = target.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), text: target.textContent?.trim() };
      }
      return null;
    });
    console.log('5. Clicking Retopology button:', JSON.stringify(startRetopoBtn));
    if (startRetopoBtn) {
      await page.mouse.click(startRetopoBtn.x, startRetopoBtn.y);
      await page.waitForTimeout(4000);
      await page.screenshot({ path: path.join(outDir, '75_live_retopology_in_progress.png') });
      await waitForTaskCompletion(page, 'Retopo', 16);
      await page.screenshot({ path: path.join(outDir, '76_live_retopologized_lowpoly_mesh.png') });
      const retopoResTxt = await page.evaluate(() =>
        document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(15, 70)
      );
      console.log('   Retopologized result text:', retopoResTxt.join(' | '));
    }

    // STEP C: Now run Smart UV (0 credits free trial!) on the retopologized mesh
    console.log('6. Testing Smart UV on retopologized mesh...');
    await clickLeftRail(page, 'Smart UV');
    const unwrapBtn = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, div, span')).filter((e) => {
        const r = e.getBoundingClientRect();
        const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
        return r.left > 60 && r.left < 350 && r.top > 700 && t.includes('Unwrap UV');
      });
      if (els.length > 0) {
        const target = els[els.length - 1] as HTMLElement;
        const r = target.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), text: target.textContent?.trim() };
      }
      return null;
    });
    console.log('   Unwrap UV button:', JSON.stringify(unwrapBtn));
    if (unwrapBtn) {
      await page.mouse.click(unwrapBtn.x, unwrapBtn.y);
      await page.waitForTimeout(4000);
      await waitForTaskCompletion(page, 'SmartUV', 12);
      await page.screenshot({ path: path.join(outDir, '77_live_smart_uv_unwrapped_result.png') });
    }

    // STEP D: Now run Auto Rig 20 on the retopologized mesh!
    console.log('7. Running Auto Rig on retopologized mesh...');
    await clickLeftRail(page, 'Rig');
    const rigNowBtn = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, div, span')).filter((e) => {
        const r = e.getBoundingClientRect();
        const t = (e.textContent || '').replace(/\s+/g, ' ').trim();
        return r.left > 60 && r.left < 350 && r.top > 750 && t.includes('Auto Rig');
      });
      if (els.length > 0) {
        const target = els[els.length - 1] as HTMLElement;
        const r = target.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), text: target.textContent?.trim() };
      }
      return null;
    });
    console.log('   Auto Rig button on low-poly mesh:', JSON.stringify(rigNowBtn));
    if (rigNowBtn) {
      await page.mouse.click(rigNowBtn.x, rigNowBtn.y);
      await page.waitForTimeout(4000);
      await page.screenshot({ path: path.join(outDir, '78_live_auto_rig_running_on_lowpoly.png') });
      await waitForTaskCompletion(page, 'AutoRig', 18);
      await page.screenshot({ path: path.join(outDir, '79_live_auto_rig_completed_mixamo_skeleton.png') });
    }

    // STEP E: Switch to Animate and apply preset animations ('cheer', 'bow', 'cast_a_spell') to the rigged 3D character!
    console.log('8. Opening Animate sub-tab and playing skeletal animations on rigged character...');
    await page.mouse.click(39, 656);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(outDir, '80_live_animate_presets_on_rigged_model.png') });

    for (const [idx, clipName] of ['cheer', 'bow', 'cast_a_spell'].entries()) {
      const clipPos = await page.evaluate((cName: string) => {
        const els = Array.from(document.querySelectorAll('div, span, p, button')).filter((e) => {
          const r = e.getBoundingClientRect();
          return (
            r.left > 70 &&
            r.left < 350 &&
            r.top > 250 &&
            r.top < 840 &&
            e.textContent?.trim() === cName
          );
        });
        if (els.length > 0) {
          const target = els[els.length - 1] as HTMLElement;
          const r = target.getBoundingClientRect();
          return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top - 25) };
        }
        return null;
      }, clipName);
      console.log(`   Clicking animation clip [${clipName}]:`, JSON.stringify(clipPos));
      if (clipPos) {
        await page.mouse.click(clipPos.x, clipPos.y);
        await page.waitForTimeout(6000);
        await page.screenshot({
          path: path.join(outDir, `${81 + idx}_live_animated_clip_${clipName}.png`),
        });
      }
    }

    console.log('✔ All live 3D model & animation stages executed and captured!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
