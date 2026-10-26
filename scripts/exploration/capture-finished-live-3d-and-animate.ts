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

  const report: any[] = [];

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

    console.log('1. Opening https://studio.tripo3d.ai/workspace/generate ...');
    await page.goto('https://studio.tripo3d.ai/workspace/generate', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await page.waitForTimeout(7000);
    await clearOverlays(page);

    // Wait until "Generating..." finishes in the right Assets panel (up to 90s)
    for (let i = 1; i <= 18; i++) {
      await clearOverlays(page);
      const status = await page.evaluate(() => {
        const rightText = Array.from(document.querySelectorAll('div, span, p'))
          .filter((el) => el.getBoundingClientRect().left > 1180)
          .map((el) => (el.textContent || '').trim())
          .filter(Boolean);
        const isGenerating = rightText.some((t) => t.includes('Generating...'));
        return { isGenerating, sample: rightText.slice(0, 18) };
      });
      console.log(`   [Check ${i * 5}s] isGenerating=${status.isGenerating}:`, status.sample.join(' | '));
      if (!status.isGenerating) {
        break;
      }
      await page.waitForTimeout(5000);
    }

    // Click the generated 3D model tile at (1363, 297) in the right Assets panel!
    console.log('2. Clicking generated 3D model tile at (1363, 297)...');
    await page.mouse.click(1363, 297);
    await page.waitForTimeout(8000);
    await clearOverlays(page);

    await page.screenshot({
      path: path.join(outDir, '61_live_generated_3d_model_in_viewport.png'),
    });
    const viewportText = await page.evaluate(() =>
      document.body.innerText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 100)
    );
    console.log('   61_live_generated_3d_model_in_viewport.png text:', viewportText.slice(15, 65).join(' | '));
    report.push({ step: '61_live_generated_3d_model_in_viewport', text: viewportText });

    // Click Property tab at (1360, 88)
    await page.mouse.click(1360, 88);
    await page.waitForTimeout(2500);
    await clearOverlays(page);
    await page.screenshot({
      path: path.join(outDir, '62_live_generated_3d_property_hierarchy.png'),
    });
    const propText = await page.evaluate(() =>
      document.body.innerText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 100)
    );
    console.log('   62_live_generated_3d_property_hierarchy.png text:', propText.slice(15, 70).join(' | '));
    report.push({ step: '62_live_generated_3d_property_hierarchy', text: propText });

    // Switch back to Assets tab at (1240, 88)
    await page.mouse.click(1240, 88);
    await page.waitForTimeout(1500);

    // Helper to click a left-rail item or sub-tab by exact text and return its coordinates
    async function clickByText(label: string, maxLeft = 360) {
      const box = await page.evaluate(
        ({ lbl, ml }) => {
          const els = Array.from(document.querySelectorAll('div, button, span, p, a')).filter(
            (e) => {
              const r = e.getBoundingClientRect();
              return (
                e.textContent?.trim() === lbl &&
                r.width > 5 &&
                r.height > 5 &&
                r.left >= 0 &&
                r.left < ml &&
                r.top > 50
              );
            }
          );
          if (els.length > 0) {
            // pick the innermost element
            const target = els[els.length - 1] as HTMLElement;
            const r = target.getBoundingClientRect();
            target.click();
            return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), count: els.length };
          }
          return null;
        },
        { lbl: label, ml: maxLeft }
      );
      if (box) {
        await page.mouse.click(box.x, box.y);
      }
      return box;
    }

    // 3. Segment & Fill Parts with active 3D model
    console.log('3. Testing Segment & Fill Parts with active 3D model...');
    await clickByText('Segment', 80);
    await page.waitForTimeout(2500);
    await clearOverlays(page);
    await page.screenshot({ path: path.join(outDir, '63_live_active_segment_controls.png') });
    const segText = await page.evaluate(() =>
      document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 100)
    );
    console.log('   Segment text:', segText.slice(15, 65).join(' | '));
    report.push({ step: '63_live_active_segment_controls', text: segText });

    // Inspect all tabs/buttons inside Segment panel
    const segSub = await clickByText('Fill Parts', 360);
    console.log('   Fill Parts click:', JSON.stringify(segSub));
    await page.waitForTimeout(2000);
    await clearOverlays(page);
    await page.screenshot({ path: path.join(outDir, '64_live_active_fill_parts.png') });
    const fillText = await page.evaluate(() =>
      document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 100)
    );
    console.log('   Fill Parts text:', fillText.slice(15, 65).join(' | '));
    report.push({ step: '64_live_active_fill_parts', text: fillText });

    // 4. Retopo with active 3D model
    console.log('4. Testing Retopo with active 3D model...');
    await clickByText('Retopo', 80);
    await page.waitForTimeout(2500);
    await clearOverlays(page);
    await page.screenshot({ path: path.join(outDir, '65_live_active_retopo_controls.png') });
    const retopoText = await page.evaluate(() =>
      document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 100)
    );
    console.log('   Retopo text:', retopoText.slice(15, 65).join(' | '));
    report.push({ step: '65_live_active_retopo_controls', text: retopoText });

    // 5. Smart UV with active 3D model
    console.log('5. Testing Smart UV with active 3D model...');
    await clickByText('Smart UV', 80);
    await page.waitForTimeout(2500);
    await clearOverlays(page);
    await page.screenshot({ path: path.join(outDir, '66_live_active_smart_uv_controls.png') });
    const uvText = await page.evaluate(() =>
      document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 100)
    );
    console.log('   Smart UV text:', uvText.slice(15, 65).join(' | '));
    report.push({ step: '66_live_active_smart_uv_controls', text: uvText });

    // 6. Texture (Generator, Edit/Magic Brush, Upscale, PBR) with active 3D model
    console.log('6. Testing Texture & sub-tabs with active 3D model...');
    await clickByText('Texture', 80);
    await page.waitForTimeout(2500);
    await clearOverlays(page);
    await page.screenshot({ path: path.join(outDir, '67_live_active_texture_generator.png') });
    const texText = await page.evaluate(() =>
      document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 100)
    );
    console.log('   Texture Gen text:', texText.slice(15, 65).join(' | '));
    report.push({ step: '67_live_active_texture_generator', text: texText });

    for (const [subName, fileName] of [
      ['Edit', '68_live_active_texture_edit_magic_brush.png'],
      ['Upscale', '69_live_active_texture_upscale.png'],
      ['PBR', '70_live_active_texture_pbr.png'],
    ]) {
      const clickedSub = await clickByText(subName, 360);
      console.log(`   Texture -> ${subName} click:`, JSON.stringify(clickedSub));
      await page.waitForTimeout(2000);
      await clearOverlays(page);
      await page.screenshot({ path: path.join(outDir, fileName) });
      const stxt = await page.evaluate(() =>
        document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 100)
      );
      console.log(`   Texture -> ${subName} text:`, stxt.slice(15, 65).join(' | '));
      report.push({ step: fileName, text: stxt });
    }

    // 7. Rig & Animate with active 3D model!
    console.log('7. Testing Rig & Animate with active 3D model...');
    await clickByText('Rig', 80);
    await page.waitForTimeout(2500);
    await clearOverlays(page);
    await page.screenshot({ path: path.join(outDir, '71_live_active_rig_humanoid_mixamo.png') });
    const rigText = await page.evaluate(() =>
      document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 100)
    );
    console.log('   Rig text:', rigText.slice(15, 65).join(' | '));
    report.push({ step: '71_live_active_rig_humanoid_mixamo', text: rigText });

    // Trigger Auto Rig (20 credits) on the active T-pose humanoid 3D model!
    const autoRigBtn = await clickByText('Auto Rig', 360);
    console.log('   Clicked Auto Rig button:', JSON.stringify(autoRigBtn));
    await page.waitForTimeout(4000);
    await clearOverlays(page);
    await page.screenshot({ path: path.join(outDir, '72_live_auto_rig_triggered.png') });

    // Click Animate sub-tab to inspect the animation library & presets!
    const animSub = await clickByText('Animate', 360);
    console.log('   Clicked Animate sub-tab:', JSON.stringify(animSub));
    await page.waitForTimeout(3000);
    await clearOverlays(page);
    await page.screenshot({ path: path.join(outDir, '73_live_active_animate_library.png') });
    const animText = await page.evaluate(() =>
      document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 120)
    );
    console.log('   Animate library text:', animText.slice(15, 85).join(' | '));
    report.push({ step: '73_live_active_animate_library', text: animText });

    // If Auto Rig is running, poll up to 45s to see it complete and test clicking an animation preset!
    for (let r = 1; r <= 9; r++) {
      await page.waitForTimeout(5000);
      await clearOverlays(page);
      const curTxt = await page.evaluate(() =>
        document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 100)
      );
      const stillGen = curTxt.some((t) => t.includes('Generating...') || t.includes('Rigging...'));
      console.log(`   [Rig Poll ${r * 5}s] stillRunning=${stillGen}:`, curTxt.slice(18, 55).join(' | '));
      if (!stillGen) {
        break;
      }
    }

    await page.screenshot({ path: path.join(outDir, '74_live_rigged_and_animated_model.png') });

    fs.writeFileSync(
      '/home/azadmin/.copilot/session-state/4f0179cc-55bb-4bb9-922a-71d158f4dc3a/files/live-finished-3d-and-animate.json',
      JSON.stringify(report, null, 2)
    );
    console.log('✔ Saved live-finished-3d-and-animate.json');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
