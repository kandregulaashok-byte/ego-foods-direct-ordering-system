import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const report = [];

async function add(screen, buttons) {
  report.push({ screen, buttons });
}

async function visibleButtons() {
  return page.getByRole('button').evaluateAll((buttons) =>
    buttons
      .filter((button) => {
        const style = window.getComputedStyle(button);
        const rect = button.getBoundingClientRect();
        return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
      })
      .map((button) => ({
        text: (button.innerText || button.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' '),
        disabled: button.disabled
      }))
  );
}

await page.goto('http://127.0.0.1:5173');
await page.waitForLoadState('load');

for (const nav of ['Orders', 'Menu & Recipes', 'Inventory', 'Swiggy Import', 'Sales', 'Cash', 'Summary', 'Expenses', 'Settings']) {
  const locator = page.locator('aside').getByRole('button', { name: new RegExp(nav, 'i') });
  await locator.click();
  await page.waitForTimeout(100);
  await add(nav, await visibleButtons());
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
