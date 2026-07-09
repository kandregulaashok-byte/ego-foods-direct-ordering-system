import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const app = await electron.launch({ args: ['.'], cwd: process.cwd() });
const page = await app.firstWindow();
await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(2000);

const result = { bridge: false, clicks: [], swiggy: null };

result.bridge = await page.evaluate(() => Boolean(window.kitchenOS?.swiggy));

async function click(label, expect) {
  const started = Date.now();
  const clicked = await page.evaluate(({ label }) => {
    const needle = label.toLowerCase();
    const buttons = [...document.querySelectorAll('button')];
    const button = buttons.find((item) => {
      const text = `${item.innerText || ''} ${item.getAttribute('aria-label') || ''}`.toLowerCase();
      return text.includes(needle);
    });
    if (!button) return false;
    button.click();
    return true;
  }, { label });
  await page.waitForTimeout(80);
  const ok = clicked && (!expect || await page.evaluate((text) => document.body.innerText.includes(text), expect));
  result.clicks.push({ label, ok, ms: Date.now() - started });
}

for (const [label, expect] of [
  ['Orders', 'Order Queue'],
  ['Swiggy Import', 'Swiggy Import'],
  ['Settings', 'Settings & Printing'],
  ['New Counter Sale', 'Counter Sales']
]) await click(label, expect);

if (result.bridge) {
  result.swiggy = await Promise.race([
    page.evaluate(() => window.kitchenOS.swiggy.importNow({ visible: true })),
    new Promise((resolve) => setTimeout(() => resolve({ ok: false, status: 'Timed out after 90 seconds' }), 90_000))
  ]);
}

const statePath = path.join(process.env.APPDATA, 'kitchen-os', 'swiggy-import', 'state.json');
result.state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : null;

console.log(JSON.stringify(result, null, 2));
await app.close();
