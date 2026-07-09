import { chromium } from 'playwright';

const url = process.env.KITCHEN_OS_URL || 'http://127.0.0.1:5173';
const limitMs = 400;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const results = [];

async function clickAndMeasure(name, locator, waitFor) {
  await locator.waitFor({ state: 'visible', timeout: 10000 });
  const start = performance.now();
  await locator.click();
  if (waitFor) await waitFor();
  else await page.waitForTimeout(60);
  const elapsedMs = Math.round(performance.now() - start);
  results.push({ name, elapsedMs, ok: elapsedMs <= limitMs });
}

async function clickButtonText(name, text, waitFor) {
  await clickAndMeasure(name, page.getByRole('button', { name: text, exact: true }), waitFor);
}

async function clickButtonLike(name, text, waitFor) {
  await clickAndMeasure(name, page.getByRole('button', { name: new RegExp(text, 'i') }), waitFor);
}

async function clickNav(name, text, waitFor) {
  await clickAndMeasure(name, page.locator('aside').getByRole('button', { name: new RegExp(text, 'i') }), waitFor);
}

await page.goto(url);
await page.waitForLoadState('load');

await page.screenshot({ path: 'outputs/redesign-desktop-1366.png', fullPage: false });

await clickButtonText('WhatsApp toggle off', 'WhatsApp ON', async () => {
  await page.getByText('WhatsApp orders are paused', { exact: false }).waitFor({ state: 'visible', timeout: 1000 });
});
await clickButtonText('WhatsApp toggle on', 'WhatsApp OFF');
await clickButtonText('Printer warning toggle', 'Printer OK');
await clickButtonText('Printer ok toggle', 'Printer Warn');
await clickAndMeasure('Notifications button', page.getByLabel('Notifications'));
await clickAndMeasure('Help button', page.getByLabel('Help'));

await clickAndMeasure('Expand order', page.getByRole('button', { name: /Expand full order/i }), async () => {
  await page.getByText('Pickup Code', { exact: true }).waitFor({ state: 'visible', timeout: 1000 });
});
await clickAndMeasure('Reject menu', page.getByRole('button', { name: 'Reject', exact: true }), async () => {
  await page.getByRole('button', { name: 'Out of stock', exact: true }).waitFor({ state: 'visible', timeout: 1000 });
});

for (const nav of ['Menu & Recipes', 'Inventory', 'Swiggy Import', 'Sales', 'Cash', 'Summary', 'Expenses', 'Orders']) {
  await clickNav(`${nav} nav`, nav);
}

await clickNav('Menu nav modal checks', 'Menu & Recipes');
await clickAndMeasure('Edit portions modal', page.getByRole('button', { name: /Edit Portions/i }), async () => {
  await page.getByRole('heading', { name: 'Edit Portions', exact: true }).waitFor({ state: 'visible', timeout: 1000 });
});
await clickButtonText('Cancel portions modal', 'Cancel');
await clickAndMeasure('Edit recipe modal', page.getByRole('button', { name: /Edit Recipe/i }), async () => {
  await page.getByRole('heading', { name: 'Edit Recipe', exact: true }).waitFor({ state: 'visible', timeout: 1000 });
});
await clickButtonText('Cancel recipe modal', 'Cancel');
await clickAndMeasure('Map Swiggy modal', page.getByRole('button', { name: /Map Item/i }), async () => {
  await page.getByRole('heading', { name: 'Map Swiggy Item', exact: true }).waitFor({ state: 'visible', timeout: 1000 });
});
await page.getByPlaceholder('Chicken Fry Piece Palav SINGLE').fill(`Smoke Swiggy ${Date.now()}`);
await page.getByLabel('Kitchen OS portion').selectOption('portion-fry-swiggy-single');
await clickButtonText('Save Swiggy mapping', 'Save', async () => {
  await page.getByText('Swiggy mapping saved', { exact: false }).waitFor({ state: 'visible', timeout: 1000 });
});
await page.evaluate(() => {
  const key = 'kitchen-os.inventory';
  const value = JSON.parse(localStorage.getItem(key) || '{}');
  value.externalMappings = (value.externalMappings || []).filter((row) => !String(row.external_item_name || '').startsWith('Smoke Swiggy'));
  localStorage.setItem(key, JSON.stringify(value));
});

await clickNav('Orders nav before order tabs', 'Orders');
for (const tab of ['Preparing', 'Ready', 'Picked Up', 'Past Orders', 'New']) {
  await clickAndMeasure(`${tab} order tab`, page.locator('main').getByRole('button', { name: new RegExp(`^${tab}`) }));
}

await clickNav('Inventory nav modal', 'Inventory');
await clickAndMeasure('Log batch modal', page.getByRole('button', { name: /Log Today/i }), async () => {
  await page.getByRole('heading', { name: "Log Today's Batch", exact: true }).waitFor({ state: 'visible', timeout: 1000 });
});
await clickButtonText('Cancel batch modal', 'Cancel');

await clickNav('Swiggy nav', 'Swiggy Import');
await clickAndMeasure('Auto import toggle', page.getByText('Every 15 minutes', { exact: false }));
await page.getByRole('button', { name: /Save Settings/i }).waitFor({ state: 'visible', timeout: 10000 });
await page.getByRole('button', { name: /Test Login/i }).waitFor({ state: 'visible', timeout: 10000 });

await clickNav('Sales nav', 'Sales');
for (const filter of ['All', 'WhatsApp', 'Swiggy', 'Counter']) {
  await clickButtonText(`Sales filter ${filter}`, filter);
}

await clickNav('Cash nav', 'Cash');
await clickAndMeasure('Dine-in modal', page.getByRole('button', { name: /Add Dine-in/i }), async () => {
  await page.getByRole('heading', { name: 'Dine-in Sales Entry', exact: true }).waitFor({ state: 'visible', timeout: 1000 });
});
await clickButtonText('Cancel dine-in modal', 'Cancel');

await clickNav('Expenses nav modal checks', 'Expenses');
await clickAndMeasure('Market purchase modal', page.getByRole('button', { name: 'Market', exact: true }), async () => {
  await page.getByRole('heading', { name: 'Market Purchase', exact: true }).waitFor({ state: 'visible', timeout: 1000 });
});
await clickButtonText('Cancel market purchase modal', 'Cancel');
await clickAndMeasure('Other expense modal', page.getByRole('button', { name: 'Other', exact: true }), async () => {
  await page.getByRole('heading', { name: 'Other Expense', exact: true }).waitFor({ state: 'visible', timeout: 1000 });
});
await clickButtonText('Cancel other expense modal', 'Cancel');

await clickNav('Summary nav', 'Summary');
await clickButtonText('This Week summary', 'This Week', async () => {
  await page.getByText('WASTE THIS WEEK', { exact: true }).waitFor({ state: 'visible', timeout: 1000 });
});
await clickButtonText('Today summary', 'Today');

await page.setViewportSize({ width: 900, height: 700 });
await page.screenshot({ path: 'outputs/redesign-narrow-900.png', fullPage: false });

await browser.close();

console.table(results);
const failed = results.filter((result) => !result.ok);
if (failed.length) {
  console.error(`Buttons over ${limitMs}ms: ${failed.map((result) => `${result.name} ${result.elapsedMs}ms`).join(', ')}`);
  process.exit(1);
}
console.log(`All measured interactions responded within ${limitMs}ms.`);
