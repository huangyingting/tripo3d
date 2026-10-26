import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { synthesizeProceduralMesh, exportMeshToGlbBuffer } from '../../src/lib/engine3d';

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
fs.mkdirSync(outDir, { recursive: true });

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
  const { meshData } = synthesizeProceduralMesh({
    prompt: 'Cyber Knight Humanoid Character in T-Pose',
    category: 'character',
    generationMode: 'HD_MODEL',
    topology: 'TRIANGLE',
    targetPolycount: 12000,
    textureQuality: '4K',
    hasPbr: true,
    isSegmented: false,
    isRigged: false,
  });

  const glbPath = '/tmp/tripo-humanoid.glb';
  fs.writeFileSync(glbPath, exportMeshToGlbBuffer(meshData, 'TripoHumanoid'));

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

  const apiLog: Array<{ url: string; status: number; preview: string }> = [];
  const stageReport: Array<{ step: string; screenshot: string; text: string[] }> = [];

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
      const url = res.url();
      if (
        url.includes('tripo3d.ai') &&
        !url.endsWith('.js') &&
        !url.endsWith('.css') &&
        !url.endsWith('.png') &&
        !url.endsWith('.webp')
      ) {
        try {
          const ct = res.headers()['content-type'] || '';
          if (ct.includes('json')) {
            const txt = await res.text();
            apiLog.push({ url, status: res.status(), preview: txt.slice(0, 500) });
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
    await clearOverlays(page);
    await page.waitForTimeout(1000);

    // 2. Click all 4 input mode buttons at top=175 (Image: 118, Multi-View: 167, Batch Image: 215, Text: 264)
    const modeCoords = [
      { name: 'image_to_3d', x: 118, y: 188 },
      { name: 'multiview_to_3d', x: 167, y: 188 },
      { name: 'batch_image_to_3d', x: 215, y: 188 },
      { name: 'text_to_3d', x: 264, y: 188 },
    ];

    for (const mc of modeCoords) {
      await page.mouse.click(mc.x, mc.y);
      await page.waitForTimeout(1200);
      await clearOverlays(page);
      const shot = `50_live_mode_${mc.name}.png`;
      await page.screenshot({ path: path.join(outDir, shot) });
      const txt = await page.evaluate(() =>
        document.body.innerText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 75)
      );
      console.log(`   Mode [${mc.name}]:`, txt.slice(15, 38).join(' | '));
      stageReport.push({ step: mc.name, screenshot: shot, text: txt });
    }

    // 3. Now we are on Text-to-3D mode (`x: 264, y: 188`). Enter a prompt and generate a real 3D model!
    console.log('3. Filling Text-to-3D prompt and triggering live 3D model generation...');
    // Switch to Smart Mesh or keep HD Model, and toggle T-Pose on for rigging
    const tPoseClicked = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('div, span, button')).find(
        (e) => e.textContent?.trim() === 'T-Pose' && e.getBoundingClientRect().left < 350
      );
      if (el) {
        (el as HTMLElement).click();
        return true;
      }
      return false;
    });
    console.log('   Toggled T-Pose:', tPoseClicked);

    const textAreaInfo = await page.evaluate(() => {
      const tas = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], input'));
      return tas.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          type: (el as HTMLInputElement).type || '',
          accept: (el as HTMLInputElement).accept || '',
          placeholder: (el as HTMLInputElement).placeholder || '',
          x: Math.round(r.left + r.width / 2),
          y: Math.round(r.top + r.height / 2),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      });
    });
    console.log('   Inputs on Text-to-3D:', JSON.stringify(textAreaInfo));

    const promptBox = textAreaInfo.find((i) => i.tag === 'TEXTAREA' || (i.w > 150 && i.h > 40));
    if (promptBox) {
      await page.mouse.click(promptBox.x, promptBox.y);
      await page.keyboard.type('Armored cyber knight character in T-pose, full body humanoid', {
        delay: 15,
      });
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(outDir, '51_live_text_to_3d_prompt_ready.png'),
      });

      // Find Generate button and click it
      const genBtn = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('button, div')).filter((el) => {
          const r = el.getBoundingClientRect();
          const t = (el.textContent || '').trim();
          return (
            r.left > 65 &&
            r.left < 320 &&
            r.top > 800 &&
            r.width > 120 &&
            r.height >= 32 &&
            r.height <= 65 &&
            t.includes('Generate')
          );
        });
        if (els.length > 0) {
          const target = els[els.length - 1] as HTMLElement;
          const r = target.getBoundingClientRect();
          target.click();
          return { clicked: true, text: target.textContent?.trim(), x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
        return { clicked: false };
      });
      console.log('   Generate button click:', JSON.stringify(genBtn));
      if (genBtn.x && genBtn.y) {
        await page.mouse.click(genBtn.x, genBtn.y);
      }
      await page.waitForTimeout(5000);
      await clearOverlays(page);
      await page.screenshot({
        path: path.join(outDir, '52_live_3d_generation_in_progress.png'),
      });
    }

    // 4. Also upload our GLB via input[accept*=".glb"] and trigger change/input events
    console.log('4. Uploading /tmp/tripo-humanoid.glb via file input...');
    const glbInputs = page.locator('input[type="file"]');
    const inputCount = await glbInputs.count();
    console.log('   Total file inputs found:', inputCount);
    for (let idx = 0; idx < inputCount; idx++) {
      const acc = await glbInputs.nth(idx).getAttribute('accept');
      console.log(`   File input #${idx} accept="${acc}"`);
      if (acc && acc.includes('.glb')) {
        await glbInputs.nth(idx).setInputFiles(glbPath);
        console.log(`   Set /tmp/tripo-humanoid.glb on input #${idx}`);
        await page.waitForTimeout(8000);
        await clearOverlays(page);
        await page.screenshot({
          path: path.join(outDir, '53_live_3d_glb_uploaded_and_loaded.png'),
        });
      }
    }

    // Wait for any generation/upload task to finish & appear in the right Assets panel
    for (let w = 1; w <= 8; w++) {
      await page.waitForTimeout(5000);
      await clearOverlays(page);
      const txt = await page.evaluate(() =>
        document.body.innerText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 90)
      );
      console.log(`   [Poll ${w * 5}s] Visible text:`, txt.slice(18, 48).join(' | '));
    }

    // Inspect and click the asset card in the right Assets panel
    const assetClicked = await page.evaluate(() => {
      const rightEls = Array.from(document.querySelectorAll('div, img, canvas, button')).filter((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.left > 1150 &&
          r.top > 180 &&
          r.top < 800 &&
          r.width >= 50 &&
          r.width <= 260 &&
          r.height >= 50 &&
          r.height <= 260
        );
      });
      const summary = rightEls.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          text: (el.textContent || '').trim().slice(0, 40),
          x: Math.round(r.left + r.width / 2),
          y: Math.round(r.top + r.height / 2),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      });
      const candidate = rightEls.find((el) => {
        const t = (el.textContent || '').trim();
        const r = el.getBoundingClientRect();
        return !t.includes('Upload 3D Model') && r.top > 220 && r.width >= 70 && r.width <= 150;
      });
      if (candidate) {
        (candidate as HTMLElement).click();
        const r = candidate.getBoundingClientRect();
        return {
          clicked: true,
          x: Math.round(r.left + r.width / 2),
          y: Math.round(r.top + r.height / 2),
          summary: summary.slice(0, 15),
        };
      }
      return { clicked: false, summary: summary.slice(0, 15) };
    });
    console.log('   Right panel asset selection:', JSON.stringify(assetClicked));
    if (assetClicked.clicked && assetClicked.x && assetClicked.y) {
      await page.mouse.click(assetClicked.x, assetClicked.y);
    }
    await page.waitForTimeout(5000);
    await clearOverlays(page);
    await page.screenshot({
      path: path.join(outDir, '54_live_3d_model_active_in_viewport.png'),
    });

    // Click Property tab on the right panel (x=1360, y=88) to inspect 3D mesh topology & material properties
    await page.mouse.click(1360, 88);
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(outDir, '55_live_3d_model_property_inspector.png'),
    });
    const propText = await page.evaluate(() =>
      document.body.innerText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 95)
    );
    console.log('   Property inspector text:', propText.slice(18, 60).join(' | '));
    stageReport.push({
      step: 'property_inspector',
      screenshot: '55_live_3d_model_property_inspector.png',
      text: propText,
    });

    // Switch back to Assets tab on right panel (x=1240, y=88)
    await page.mouse.click(1240, 88);
    await page.waitForTimeout(1000);

    // 5. Now test every 3D Model & Animation stage on the left rail WITH the active 3D model!
    const railStages = [
      { label: 'Segment', subTabs: ['Segment', 'Fill Parts'] },
      { label: 'Retopo', subTabs: [] },
      { label: 'Smart UV', subTabs: [] },
      { label: 'Texture', subTabs: ['Texture', 'Edit', 'Upscale', 'PBR'] },
      { label: 'Rig', subTabs: ['Rig', 'Animate'] },
    ];

    let shotNum = 56;
    for (const st of railStages) {
      const clicked = await page.evaluate((label) => {
        const els = Array.from(document.querySelectorAll('div, button, span, p'));
        const el = els.find(
          (e) =>
            e.textContent?.trim() === label &&
            e.getBoundingClientRect().left < 75 &&
            e.getBoundingClientRect().top > 60
        );
        if (el) {
          (el as HTMLElement).click();
          return true;
        }
        return false;
      }, st.label);

      if (clicked) {
        await page.waitForTimeout(2500);
        await clearOverlays(page);
        const safe = st.label.toLowerCase().replace(/\s+/g, '_');
        const shot = `${shotNum++}_live_active_${safe}.png`;
        await page.screenshot({ path: path.join(outDir, shot) });
        const txt = await page.evaluate(() =>
          document.body.innerText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 100)
        );
        console.log(`   Active Stage [${st.label}] (${shot}):`, txt.slice(15, 60).join(' | '));
        stageReport.push({ step: `active_${safe}`, screenshot: shot, text: txt });

        for (const sub of st.subTabs) {
          const subClicked = await page.evaluate((subLabel) => {
            const els = Array.from(document.querySelectorAll('div, button, span'));
            const el = els.find(
              (e) =>
                e.textContent?.trim() === subLabel &&
                e.getBoundingClientRect().left >= 70 &&
                e.getBoundingClientRect().left < 350 &&
                e.getBoundingClientRect().top > 50 &&
                e.getBoundingClientRect().top < 220
            );
            if (el) {
              (el as HTMLElement).click();
              return true;
            }
            return false;
          }, sub);
          if (subClicked) {
            await page.waitForTimeout(2000);
            await clearOverlays(page);
            const safeSub = sub.toLowerCase().replace(/\s+/g, '_');
            const subShot = `${shotNum++}_live_active_${safe}_${safeSub}.png`;
            await page.screenshot({ path: path.join(outDir, subShot) });
            const subTxt = await page.evaluate(() =>
              document.body.innerText
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 100)
            );
            console.log(
              `   Active Sub-Stage [${st.label} -> ${sub}] (${subShot}):`,
              subTxt.slice(15, 65).join(' | ')
            );
            stageReport.push({
              step: `active_${safe}_${safeSub}`,
              screenshot: subShot,
              text: subTxt,
            });
          }
        }
      }
    }

    fs.writeFileSync(
      '/home/azadmin/.copilot/session-state/4f0179cc-55bb-4bb9-922a-71d158f4dc3a/files/live-active-3d-stages.json',
      JSON.stringify({ stageReport, apiLog: apiLog.slice(-40) }, null, 2)
    );
    console.log('✔ Saved live-active-3d-stages.json');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
