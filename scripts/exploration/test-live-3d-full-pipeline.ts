import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { synthesizeProceduralMesh, exportMeshToGlbBuffer, exportMeshToObjText } from '../../src/lib/engine3d';

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
  // 1. Create a spec-compliant binary GLB and triangulated OBJ humanoid model
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
  const objPath = '/tmp/tripo-humanoid.obj';
  fs.writeFileSync(glbPath, exportMeshToGlbBuffer(meshData, 'TripoHumanoid'));
  fs.writeFileSync(objPath, exportMeshToObjText(meshData, 'TripoHumanoid'));
  console.log(`Prepared binary GLB (${fs.statSync(glbPath).size} bytes) and OBJ (${fs.statSync(objPath).size} bytes)`);

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

  const apiResponses: Array<{ url: string; status: number; bodyPreview: string }> = [];

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
      if (url.includes('tripo3d.ai') && (url.includes('/api/') || url.includes('task') || url.includes('upload') || url.includes('model'))) {
        try {
          const ct = res.headers()['content-type'] || '';
          if (ct.includes('json')) {
            const txt = await res.text();
            apiResponses.push({ url, status: res.status(), bodyPreview: txt.slice(0, 400) });
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
    await page.waitForTimeout(1000);

    // Inspect all buttons/inputs in the left panel so we know how Text-to-3D and Upload 3D Model are structured
    const domControls = await page.evaluate(() => {
      const interactive = Array.from(
        document.querySelectorAll('button, input, textarea, [role="tab"], [role="button"]')
      ).map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          type: (el as HTMLInputElement).type || '',
          accept: (el as HTMLInputElement).accept || '',
          placeholder: (el as HTMLInputElement).placeholder || '',
          text: (el.textContent || '').trim().slice(0, 50),
          ariaLabel: el.getAttribute('aria-label') || '',
          left: Math.round(r.left),
          top: Math.round(r.top),
          width: Math.round(r.width),
          height: Math.round(r.height),
        };
      });
      return interactive.filter((i) => i.width > 0 || i.tag === 'INPUT');
    });
    console.log('Interactive controls sample:', JSON.stringify(domControls.slice(0, 35), null, 2));

    // Upload our binary GLB into the 3D model file input (`accept=".fbx,.obj,.stl,.glb"`)
    const modelInput = page.locator('input[accept*=".glb"]');
    if ((await modelInput.count()) > 0) {
      console.log('2. Uploading /tmp/tripo-humanoid.glb to live Studio 3D Workspace...');
      await modelInput.first().setInputFiles(glbPath);
      await page.waitForTimeout(8000);
      await clearOverlays(page);
      await page.screenshot({
        path: path.join(outDir, '58_live_workspace_glb_uploaded.png'),
      });
      const afterUploadText = await page.evaluate(() =>
        document.body.innerText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 80)
      );
      console.log('   Visible text after GLB upload:', afterUploadText.slice(15, 45).join(' | '));
    }

    // Also check if there are any 3D model cards in the right panel (`left > 1100`) and click the first one!
    const rightPanelItems = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('div, button, img, canvas')).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.left > 1120 && r.top > 100 && r.top < 750 && r.width > 40 && r.height > 40;
      });
      return els.map((e) => ({
        tag: e.tagName,
        text: (e.textContent || '').trim().slice(0, 40),
        left: Math.round(e.getBoundingClientRect().left),
        top: Math.round(e.getBoundingClientRect().top),
        w: Math.round(e.getBoundingClientRect().width),
        h: Math.round(e.getBoundingClientRect().height),
      }));
    });
    console.log('Right panel items:', JSON.stringify(rightPanelItems.slice(0, 15)));

    // Click on the uploaded model thumbnail in the right panel if it's at left > 1120, top: 130..350
    await page.mouse.click(1220, 210);
    await page.waitForTimeout(4000);
    await clearOverlays(page);
    await page.screenshot({
      path: path.join(outDir, '59_live_workspace_model_selected_in_viewport.png'),
    });

    const viewportText = await page.evaluate(() =>
      document.body.innerText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 90)
    );
    console.log('   Visible text after selecting uploaded model in right panel:', viewportText.slice(15, 55).join(' | '));

    // Now test clicking each left-rail stage WITH the 3D model loaded & selected in the viewport!
    const stages = ['Segment', 'Retopo', 'Smart UV', 'Texture', 'Rig', 'App'];
    let idx = 60;
    for (const stage of stages) {
      const clicked = await page.evaluate((label) => {
        const els = Array.from(document.querySelectorAll('div, button, span, p'));
        const el = els.find(
          (e) =>
            e.textContent?.trim() === label &&
            e.getBoundingClientRect().left < 80 &&
            e.getBoundingClientRect().top > 60
        );
        if (el) {
          (el as HTMLElement).click();
          return true;
        }
        return false;
      }, stage);

      if (clicked) {
        await page.waitForTimeout(2500);
        await clearOverlays(page);
        const safe = stage.toLowerCase().replace(/\s+/g, '_');
        const shot = `${idx++}_live_active_model_${safe}.png`;
        await page.screenshot({ path: path.join(outDir, shot) });
        const txt = await page.evaluate(() =>
          document.body.innerText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 90)
        );
        console.log(`   Stage [${stage}] (${shot}):`, txt.slice(15, 50).join(' | '));

        // If we are on Rig, also click the "Animate" sub-tab in the left panel!
        if (stage === 'Rig') {
          const animClicked = await page.evaluate(() => {
            const els = Array.from(document.querySelectorAll('div, button, span'));
            const el = els.find(
              (e) =>
                e.textContent?.trim() === 'Animate' &&
                e.getBoundingClientRect().left >= 70 &&
                e.getBoundingClientRect().left < 360 &&
                e.getBoundingClientRect().top > 50 &&
                e.getBoundingClientRect().top < 220
            );
            if (el) {
              (el as HTMLElement).click();
              return true;
            }
            return false;
          });
          if (animClicked) {
            await page.waitForTimeout(2500);
            await clearOverlays(page);
            const animShot = `${idx++}_live_active_model_rig_animate_tab.png`;
            await page.screenshot({ path: path.join(outDir, animShot) });
            const animTxt = await page.evaluate(() =>
              document.body.innerText
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 100)
            );
            console.log(`   Stage [Rig -> Animate] (${animShot}):`, animTxt.slice(15, 65).join(' | '));
          }
        }
      }
    }

    fs.writeFileSync(
      '/home/azadmin/.copilot/session-state/4f0179cc-55bb-4bb9-922a-71d158f4dc3a/files/live-api-responses.json',
      JSON.stringify(apiResponses, null, 2)
    );
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
