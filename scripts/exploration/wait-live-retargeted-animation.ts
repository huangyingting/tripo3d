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

    let latestProjectDetail: any = null;
    let retargetDone = false;
    page.on('response', async (res) => {
      const u = res.url();
      if (u.includes('api.tripo3d.ai/v2/studio/progress')) {
        try {
          const raw = await res.text();
          console.log(`   [PROGRESS] ${raw}`);
          const parsed = JSON.parse(raw);
          if (
            Array.isArray(parsed.data) &&
            (parsed.data.length === 0 || parsed.data.every((d: any) => d.status === 'success'))
          ) {
            retargetDone = true;
          }
        } catch {
          // ignore
        }
      }
      if (u.includes('api.tripo3d.ai/v2/studio/project/detail/v3/')) {
        try {
          latestProjectDetail = await res.json();
          console.log(
            `   [PROJECT DETAIL]`,
            JSON.stringify(latestProjectDetail?.data?.operator?.retarget || latestProjectDetail?.data?.running_operator).slice(0, 500)
          );
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

    // Select the model at (1363, 297) first
    console.log('2. Selecting animated 3D model at (1363, 297)...');
    await page.mouse.click(1363, 297);
    await page.waitForTimeout(5000);

    // Wait until retargetDone is true (up to 90s)
    for (let i = 1; i <= 18; i++) {
      if (retargetDone) break;
      await page.waitForTimeout(5000);
      console.log(`   [Wait ${i * 5}s] retargetDone=${retargetDone}`);
    }

    // Dismiss the "View Your Model ... OK" tutorial overlay if present so the 3D viewport is completely clean!
    const okClicked = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('button, div, span')).find(
        (e) => e.textContent?.trim() === 'OK' && e.getBoundingClientRect().left > 350
      );
      if (el) {
        const r = el.getBoundingClientRect();
        (el as HTMLElement).click();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      }
      return null;
    });
    if (okClicked) {
      await page.mouse.click(okClicked.x, okClicked.y);
      await page.waitForTimeout(1500);
    }

    // Click Animate on left rail (x=39, y=656)
    await page.mouse.click(39, 656);
    await page.waitForTimeout(4000);
    await page.screenshot({
      path: path.join(outDir, '86_live_retargeted_animation_playback_timeline.png'),
    });
    const animViewportTxt = await page.evaluate(() =>
      document.body.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(15, 95)
    );
    console.log('   86_live_retargeted_animation_playback_timeline.png text:', animViewportTxt.join(' | '));

    // Wait 2.5 seconds and capture a second frame of the animated 3D character to prove live skeletal motion!
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: path.join(outDir, '87_live_retargeted_animation_frame_2.png'),
    });

    if (latestProjectDetail) {
      fs.writeFileSync(
        '/home/azadmin/.copilot/session-state/4f0179cc-55bb-4bb9-922a-71d158f4dc3a/files/live-project-detail-v3.json',
        JSON.stringify(latestProjectDetail, null, 2)
      );
      console.log('✔ Saved live-project-detail-v3.json');
    }
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
