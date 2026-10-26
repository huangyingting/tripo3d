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

async function clickByText(page: any, label: string, maxLeft = 360) {
  const pos = await page.evaluate(
    ({ lbl, ml }: { lbl: string; ml: number }) => {
      const els = Array.from(document.querySelectorAll('div, span, button, p')).filter((e) => {
        const r = e.getBoundingClientRect();
        return (
          e.textContent?.trim() === lbl &&
          r.left >= 0 &&
          r.left < ml &&
          r.top > 50 &&
          r.width > 5 &&
          r.height > 5
        );
      });
      if (els.length > 0) {
        const target = els[els.length - 1] as HTMLElement;
        const r = target.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      }
      return null;
    },
    { lbl: label, ml: maxLeft }
  );
  if (pos) {
    await page.mouse.click(pos.x, pos.y);
    await page.waitForTimeout(2500);
  }
  return pos;
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

    console.log('1. Opening https://studio.tripo3d.ai/workspace/generate ...');
    await page.goto('https://studio.tripo3d.ai/workspace/generate', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await page.waitForTimeout(7000);
    await clearStartupPopups(page);

    // Click the rigged 3D model tile at (1363, 297)
    console.log('2. Selecting rigged 3D model at (1363, 297)...');
    await page.mouse.click(1363, 297);
    await page.waitForTimeout(6000);

    // First click Rig to capture the completed Mixamo skeleton view & Rig controls
    console.log('3. Opening Rig tab on rigged 3D model...');
    await clickByText(page, 'Rig', 80);
    await page.screenshot({ path: path.join(outDir, '79_live_auto_rig_completed_mixamo_skeleton.png') });
    const rigTxt = await page.evaluate(() =>
      document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(15, 75)
    );
    console.log('   Rig tab text on rigged model:', rigTxt.join(' | '));

    // Now click Animate by text!
    console.log('4. Opening Animate tab on rigged 3D model...');
    const animTab = await clickByText(page, 'Animate', 80);
    console.log('   Animate tab click:', JSON.stringify(animTab));
    await page.screenshot({ path: path.join(outDir, '80_live_animate_presets_on_rigged_model.png') });

    const animItems = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('div, span, p')).filter((e) => {
        const r = e.getBoundingClientRect();
        const t = (e.textContent || '').trim();
        return (
          r.left > 70 &&
          r.left < 340 &&
          r.top > 300 &&
          r.top < 850 &&
          r.width >= 20 &&
          r.width <= 130 &&
          r.height >= 12 &&
          r.height <= 40 &&
          /^[a-z0-9_]+$/i.test(t) &&
          !['Preset', 'New', 'Rig', 's'].includes(t)
        );
      });
      // Deduplicate by text
      const seen = new Set<string>();
      const out: Array<{ name: string; x: number; y: number }> = [];
      for (const el of els) {
        const name = (el.textContent || '').trim();
        if (!seen.has(name)) {
          seen.add(name);
          const r = el.getBoundingClientRect();
          out.push({ name, x: Math.round(r.left + r.width / 2), y: Math.round(r.top - 30) });
        }
      }
      return out;
    });
    console.log('   Visible animation preset cards:', JSON.stringify(animItems.slice(0, 12)));

    // Click the first 3 animation preset cards to play animations on the 3D character!
    for (let i = 0; i < Math.min(3, animItems.length); i++) {
      const clip = animItems[i];
      console.log(`   5.${i + 1} Clicking animation preset [${clip.name}] at (${clip.x}, ${clip.y})...`);
      await page.mouse.click(clip.x, clip.y);
      await page.waitForTimeout(7000);
      const shotName = `${81 + i}_live_animated_clip_${clip.name}.png`;
      await page.screenshot({ path: path.join(outDir, shotName) });
      const curTxt = await page.evaluate(() =>
        document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(15, 75)
      );
      console.log(`   Captured ${shotName}:`, curTxt.slice(0, 25).join(' | '));
    }

    // Also test "Multi-stage Motion" toggle and Text-to-Motion prompt inside Animate!
    console.log('6. Testing Create Your Own Animation (Text-to-Motion) & Multi-stage Motion...');
    const motionInput = await page.evaluate(() => {
      const tas = Array.from(document.querySelectorAll('textarea, input[type="text"]')).filter(
        (e) => e.getBoundingClientRect().left < 350 && e.getBoundingClientRect().width > 80
      );
      if (tas.length > 0) {
        const r = tas[0].getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      }
      return null;
    });
    if (motionInput) {
      await page.mouse.click(motionInput.x, motionInput.y);
      await page.keyboard.type('Heroic sword slash followed by victory pose', { delay: 15 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outDir, '84_live_text_to_motion_prompt.png') });
    }

    // 7. Click "Export" on the bottom viewport bar to capture the Export formats panel
    console.log('7. Opening Export panel for rigged/animated 3D model...');
    const exportBtn = await clickByText(page, 'Export', 1150);
    console.log('   Export button:', JSON.stringify(exportBtn));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outDir, '85_live_rigged_3d_export_modal.png') });
    const exportTxt = await page.evaluate(() =>
      document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(15, 95)
    );
    console.log('   Export modal text:', exportTxt.join(' | '));

    console.log('✔ Live rigged & animated 3D model testing complete!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
