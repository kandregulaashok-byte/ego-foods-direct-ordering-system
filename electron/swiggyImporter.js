import electron from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

const { app, safeStorage, shell } = electron;

const CSV_COLUMNS = ['scrapeSeenAtIso', 'fullOrderId', 'total', 'itemsDetail'];
const DEFAULT_INTERVAL_MINUTES = 15;
const ORDER_CARD_SELECTOR = 'li[class*="OrderBrief"]';

function extractRestaurantId(value = '') {
  const text = String(value || '').trim();
  const urlMatch = text.match(/\/(?:pastorders|orders)\/(\d+)/i);
  if (urlMatch) return urlMatch[1];
  const swiggyIdMatch = text.match(/swiggy\s*id\D*(\d{4,})/i);
  if (swiggyIdMatch) return swiggyIdMatch[1];
  return /^\d{4,9}$/.test(text) ? text : '';
}

function csvEscape(value = '') {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseQuantity(line) {
  const match = line.match(/\bX\s*(\d+)\b/i);
  return match ? Number(match[1]) : 1;
}

function parseItemName(line) {
  return line
    .replace(/\s+X\s*\d+\b/i, '')
    .replace(/\s+₹\s*[\d,.]+/g, '')
    .trim();
}

function parseImportedOrder(order) {
  const items = String(order.itemsDetail || '')
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      name: parseItemName(line),
      qty: parseQuantity(line),
      price: Number((line.match(/₹\s*([\d,.]+)/)?.[1] || '0').replaceAll(',', '')),
      variant: /half/i.test(line) ? 'half' : 'full'
    }));

  return {
    id: `swiggy-${order.fullOrderId}`,
    customer_name: 'Swiggy Customer',
    customer_phone: '',
    items,
    total_amount: Number(String(order.total || '').replace(/[^\d.]/g, '')) || 0,
    status: 'completed',
    payment_confirmed: true,
    pickup_code: String(order.fullOrderId).slice(-4).padStart(4, '0'),
    source: 'swiggy',
    orderDateIso: order.orderDateIso,
    created_at: order.scrapeSeenAtIso,
    updated_at: order.scrapeSeenAtIso,
    swiggy_order_id: order.fullOrderId
  };
}

function extractFirstOrderFromText(pageText, dateIso) {
  const scrapeSeenAtIso = new Date().toISOString();
  const text = String(pageText || '');
  const fullOrderId = text.match(/#\s*(\d{10,})/)?.[1] || text.match(/\b(\d{10,})\b/)?.[1];
  if (!fullOrderId) return null;

  const currencyMatches = [...text.matchAll(/₹\s*[\d,.]+/g)].map((match) => match[0]);
  const total = text.match(/Total[\s\S]{0,120}(₹\s*[\d,.]+)/i)?.[1] || currencyMatches.at(-1) || '';
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const itemDetails = [];

  for (let index = 0; index < lines.length; index += 1) {
    const name = lines[index];
    const quantity = lines[index + 1];
    const price = lines[index + 2];
    if (/^(Amount|Total|Show|Food|Delivered|Past|Search|More|From|To|You are|EGO FOODS)/i.test(name)) continue;
    if (/^X\s*\d+/i.test(quantity || '') && /₹\s*[\d,.]+/.test(price || '')) {
      itemDetails.push(`${name} ${quantity} ${price}`);
    }
  }

  return {
    scrapeSeenAtIso,
    fullOrderId,
    total,
    itemsDetail: itemDetails.join('; ') || lines.find((line) => /palav|biryani|chicken|single|half|full/i.test(line)) || text.slice(0, 200),
    orderDateIso: dateIso
  };
}

function extractOrdersFromText(pageText, dateIso) {
  const order = extractFirstOrderFromText(pageText, dateIso);
  return order ? [order] : [];
}

export class SwiggyImporter {
  constructor() {
    this.rootDir = path.join(app.getPath('userData'), 'swiggy-import');
    this.exportDir = path.join(this.rootDir, 'exports');
    this.profileDir = path.join(this.rootDir, 'browser-profile');
    this.settingsPath = path.join(this.rootDir, 'settings.json');
    this.statePath = path.join(this.rootDir, 'state.json');
    this.ordersPath = path.join(this.rootDir, 'orders.json');
  }

  async ensureDirs() {
    await fs.mkdir(this.exportDir, { recursive: true });
    await fs.mkdir(this.profileDir, { recursive: true });
  }

  async readJson(filePath, fallback) {
    try {
      return JSON.parse(await fs.readFile(filePath, 'utf8'));
    } catch {
      return fallback;
    }
  }

  async writeJson(filePath, value) {
    await this.ensureDirs();
    await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
  }

  encryptPassword(password) {
    if (!password) return '';
    if (!safeStorage.isEncryptionAvailable()) return Buffer.from(password, 'utf8').toString('base64');
    return safeStorage.encryptString(password).toString('base64');
  }

  decryptPassword(encryptedPassword) {
    if (!encryptedPassword) return '';
    const buffer = Buffer.from(encryptedPassword, 'base64');
    if (!safeStorage.isEncryptionAvailable()) return buffer.toString('utf8');
    return safeStorage.decryptString(buffer);
  }

  async getSettings() {
    await this.ensureDirs();
    const settings = await this.readJson(this.settingsPath, {});
    return {
      mobileOrRestaurantId: settings.mobileOrRestaurantId || '',
      restaurantId: settings.restaurantId || '',
      autoEnabled: Boolean(settings.autoEnabled),
      intervalMinutes: Number(settings.intervalMinutes || DEFAULT_INTERVAL_MINUTES),
      passwordSaved: Boolean(settings.encryptedPassword),
      storageWarning: !safeStorage.isEncryptionAvailable()
    };
  }

  async saveSettings(nextSettings) {
    const current = await this.readJson(this.settingsPath, {});
    const restaurantId = extractRestaurantId(nextSettings.restaurantId) || extractRestaurantId(nextSettings.mobileOrRestaurantId);
    const settings = {
      ...current,
      mobileOrRestaurantId: nextSettings.mobileOrRestaurantId || '',
      restaurantId,
      restaurantUrl: nextSettings.restaurantId || current.restaurantUrl || '',
      autoEnabled: Boolean(nextSettings.autoEnabled),
      intervalMinutes: Number(nextSettings.intervalMinutes || DEFAULT_INTERVAL_MINUTES)
    };
    if (nextSettings.password) settings.encryptedPassword = this.encryptPassword(nextSettings.password);
    await this.writeJson(this.settingsPath, settings);
    return this.getSettings();
  }

  async getState() {
    const state = await this.readJson(this.statePath, {});
    return {
      lastScrapeAtIso: state.lastScrapeAtIso || '',
      lastOrderTimeIso: state.lastOrderTimeIso || '',
      seenOrderIds: Array.isArray(state.seenOrderIds) ? state.seenOrderIds : [],
      lastStatus: state.lastStatus || 'Not imported yet',
      lastResult: state.lastResult || null
    };
  }

  async saveState(statePatch) {
    const state = { ...(await this.getState()), ...statePatch };
    await this.writeJson(this.statePath, state);
    return state;
  }

  async getImportedOrders() {
    const rows = await this.readJson(this.ordersPath, []);
    return rows.map(parseImportedOrder);
  }

  async openExportFolder() {
    await this.ensureDirs();
    await shell.openPath(this.exportDir);
    return { ok: true, exportDir: this.exportDir };
  }

  async importNow({ visible = true, dateIso = new Date().toISOString().slice(0, 10), reason = 'manual', onProgress = () => {} } = {}) {
    const settings = await this.readJson(this.settingsPath, {});
    onProgress({ phase: 'starting', percent: 5, message: 'Starting Swiggy import...' });
    if (!settings.restaurantId) {
      const result = { ok: false, status: 'Swiggy restaurant ID is required.' };
      await this.saveState({ lastStatus: result.status });
      onProgress({ phase: 'error', percent: 100, message: result.status, done: true, ok: false });
      return result;
    }

    try {
      const scrapedOrders = await this.scrapeSwiggy({ settings, visible, dateIso, onProgress });
      onProgress({ phase: 'saving', percent: 82, message: `Saving ${scrapedOrders.length} Swiggy orders...` });
      const result = await this.persistOrders(scrapedOrders, dateIso);
      await this.saveState({
        lastScrapeAtIso: new Date().toISOString(),
        lastStatus: `${reason === 'auto' ? 'Auto import' : 'Manual import'} complete: ${result.newCount} new, ${result.updatedCount} updated`,
        lastResult: result
      });
      onProgress({
        phase: 'done',
        percent: 100,
        message: `Import done. Found ${result.ordersFound}, new ${result.newCount}, updated ${result.updatedCount}.`,
        done: true,
        ok: true
      });
      return { ok: true, ...result, importedOrders: await this.getImportedOrders() };
    } catch (error) {
      const status = error.message || 'Swiggy import failed.';
      await this.saveState({ lastScrapeAtIso: new Date().toISOString(), lastStatus: status });
      onProgress({ phase: 'error', percent: 100, message: status, done: true, ok: false });
      return { ok: false, status };
    }
  }

  async testLogin() {
    return this.importNow({ visible: true, reason: 'login-test' });
  }

  async scrapeSwiggy({ settings, visible, dateIso, onProgress = () => {} }) {
    let chromium;
    try {
      onProgress({ phase: 'browser', percent: 15, message: 'Preparing Swiggy browser session...' });
      ({ chromium } = await import('playwright'));
    } catch {
      throw new Error('Playwright is not installed. Run npm install before importing Swiggy orders.');
    }

    onProgress({ phase: 'browser', percent: 25, message: 'Opening Swiggy Partner session...' });
    const browser = await chromium.launchPersistentContext(this.profileDir, {
      headless: !visible,
      viewport: { width: 1366, height: 768 }
    });

    try {
      const page = browser.pages()[0] || (await browser.newPage());
      const url = `https://partner.swiggy.com/food/pastorders/${settings.restaurantId}`;
      onProgress({ phase: 'navigation', percent: 38, message: 'Opening Swiggy Past Orders...' });
      await page.goto(url, { waitUntil: 'commit', timeout: 30000 });
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1500);
      onProgress({ phase: 'login', percent: 50, message: 'Checking Swiggy login session...' });
      if (!(await this.isLoggedInPastOrdersPage(page))) {
        await this.tryPasswordLogin(page, settings);
      }

      if (visible) {
        await page.waitForTimeout(3000);
      }

      const pageText = await page.locator('body').innerText({ timeout: 15000 });
      if (/otp|captcha|log\s*in|login|password/i.test(pageText) && !/past\s*orders|order\s*id/i.test(pageText)) {
        throw new Error('Swiggy login required. Complete OTP/captcha in the opened browser, then run import again.');
      }

      await this.selectSwiggyDateRange(page, dateIso, onProgress);
      onProgress({ phase: 'scraping', percent: 68, message: 'Reading visible Swiggy orders...' });
      const visibleOrders = await this.scrapeVisibleOrderCards(page, dateIso, onProgress);
      if (visibleOrders.length) return visibleOrders;

      const visibleText = await page.locator('body').innerText({ timeout: 15000 });
      return extractOrdersFromText(visibleText, dateIso);
    } finally {
      await browser.close();
    }
  }

  async selectSwiggyDateRange(page, dateIso, onProgress = () => {}) {
    const match = String(dateIso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return;

    const [, yearText, monthText, dayText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });

    onProgress({ phase: 'date', percent: 60, message: `Setting Swiggy date to ${dateIso}...` });
    const dateInputs = page.locator('input[class*="DateInput"]');
    if (!(await dateInputs.count().catch(() => 0))) return;

    await dateInputs.first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(600);
    await this.clickDayPickerDate(page, monthName, year, day);
    await page.waitForTimeout(500);
    await this.clickDayPickerDate(page, monthName, year, day);
    await page.waitForTimeout(2200);
  }

  async clickDayPickerDate(page, monthName, year, day) {
    const month = page.locator('.DayPicker-Month').filter({ hasText: `${monthName} ${year}` }).first();
    await month.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    const dayLocator = month
      .locator('.DayPicker-Day:not(.DayPicker-Day--disabled)')
      .filter({ hasText: new RegExp(`^\\s*${day}\\s*$`) })
      .first();
    await dayLocator.click({ timeout: 5000 }).catch(() => {});
  }

  async scrapeVisibleOrderCards(page, dateIso, onProgress = () => {}) {
    const cards = page.locator(ORDER_CARD_SELECTOR);
    const count = await cards.count().catch(() => 0);
    if (!count) return [];

    const byId = new Map();
    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      await card.scrollIntoViewIfNeeded().catch(() => {});
      await card.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(850);

      const detailText = await page
        .locator('[class*="OrderDetailsWrapper"]')
        .first()
        .innerText({ timeout: 8000 })
        .catch(() => '');
      const order = extractFirstOrderFromText(detailText, dateIso);
      if (order?.fullOrderId) byId.set(order.fullOrderId, order);

      const percent = 68 + Math.round(((index + 1) / count) * 12);
      onProgress({
        phase: 'scraping',
        percent,
        message: `Reading Swiggy order ${index + 1} of ${count}...`
      });
    }

    return Array.from(byId.values());
  }

  async tryPasswordLogin(page, settings) {
    const password = this.decryptPassword(settings.encryptedPassword || '');
    if (!password || !settings.mobileOrRestaurantId) return;
    try {
      await this.choosePasswordLogin(page);
      await this.fillFirstVisible(page, 'input[type="tel"], input[type="text"], input[type="email"], input:not([type])', settings.mobileOrRestaurantId);
      await this.clickFirstVisible(page, [
        'button:has-text("Continue")',
        'button:has-text("Next")',
        'button:has-text("Proceed")',
        'button:has-text("Submit")'
      ]);
      await page.waitForTimeout(1500);
      await this.choosePasswordLogin(page);

      await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      const passwordFilled = await this.fillFirstVisible(page, 'input[type="password"]', password);
      if (!passwordFilled) return;
      await this.clickFirstVisible(page, [
        'button:has-text("Login")',
        'button:has-text("Log in")',
        'button:has-text("Sign in")',
        'button:has-text("Submit")',
        'button:has-text("Continue")'
      ]);
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    } catch {
      // Keep password failures private; the visible login window handles OTP/captcha.
    }
  }

  async isLoggedInPastOrdersPage(page) {
    const text = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
    return /past\s*orders|search\s*by\s*order\s*id|swiggy\s*id|amount\s*to\s*be\s*collected/i.test(text);
  }

  async choosePasswordLogin(page) {
    await this.clickFirstVisible(page, [
      'text=/login\\s+with\\s+password/i',
      'text=/use\\s+password/i',
      'text=/sign\\s+in\\s+with\\s+password/i',
      'text=/password\\s+login/i',
      'text=/login\\s+using\\s+password/i'
    ], 10000);
  }

  async fillFirstVisible(page, selector, value) {
    const locator = page.locator(selector);
    const count = await locator.count();
    for (let index = 0; index < count; index += 1) {
      const field = locator.nth(index);
      if (await field.isVisible().catch(() => false)) {
        await field.fill(value, { timeout: 5000 });
        return true;
      }
    }
    return false;
  }

  async clickFirstVisible(page, selectors, timeout = 1000) {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      await locator.waitFor({ state: 'visible', timeout }).catch(() => {});
      if ((await locator.count()) && (await locator.isVisible().catch(() => false))) {
        await locator.click({ timeout: 5000 });
        return true;
      }
    }
    return false;
  }

  async persistOrders(scrapedOrders, dateIso) {
    await this.ensureDirs();
    const current = await this.readJson(this.ordersPath, []);
    const byId = new Map(current.map((order) => [order.fullOrderId, order]));
    let newCount = 0;
    let updatedCount = 0;

    for (const order of scrapedOrders) {
      if (byId.has(order.fullOrderId)) updatedCount += 1;
      else newCount += 1;
      byId.set(order.fullOrderId, {
        scrapeSeenAtIso: order.scrapeSeenAtIso,
        fullOrderId: order.fullOrderId,
        total: order.total,
        itemsDetail: order.itemsDetail,
        orderDateIso: dateIso
      });
    }

    const rows = Array.from(byId.values()).sort((a, b) => String(a.fullOrderId).localeCompare(String(b.fullOrderId)));
    await this.writeJson(this.ordersPath, rows);

    const dayRows = rows.filter((row) => row.orderDateIso === dateIso);
    await this.writeOrdersCsv(dateIso, dayRows);
    await this.writeItemCountsCsv(dateIso, dayRows);
    await this.saveState({ seenOrderIds: rows.map((row) => row.fullOrderId) });

    return {
      ordersFound: scrapedOrders.length,
      newCount,
      updatedCount,
      skippedCount: Math.max(0, scrapedOrders.length - newCount - updatedCount),
      exportDir: this.exportDir
    };
  }

  async writeOrdersCsv(dateIso, rows) {
    const csv = [
      CSV_COLUMNS.join(','),
      ...rows.map((row) => CSV_COLUMNS.map((column) => csvEscape(row[column])).join(','))
    ].join('\n');
    await fs.writeFile(path.join(this.exportDir, `orders_${dateIso}.csv`), `\uFEFF${csv}`, 'utf8');
  }

  async writeItemCountsCsv(dateIso, rows) {
    const counts = new Map();
    for (const row of rows) {
      for (const detail of String(row.itemsDetail || '').split(/\n|;/).map((item) => item.trim()).filter(Boolean)) {
        const item = parseItemName(detail);
        if (!item) continue;
        const current = counts.get(item) || { item, quantity: 0, orders: new Set() };
        current.quantity += parseQuantity(detail);
        current.orders.add(row.fullOrderId);
        counts.set(item, current);
      }
    }
    const csv = [
      'item,quantity,orders',
      ...Array.from(counts.values()).map((row) => [row.item, row.quantity, row.orders.size].map(csvEscape).join(','))
    ].join('\n');
    await fs.writeFile(path.join(this.exportDir, `item_counts_${dateIso}.csv`), `\uFEFF${csv}`, 'utf8');
  }
}
