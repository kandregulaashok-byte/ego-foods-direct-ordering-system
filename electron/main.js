import electron from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import isDev from 'electron-is-dev';
import { SwiggyImporter } from './swiggyImporter.js';

const { app, BrowserWindow, ipcMain } = electron;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
const swiggyImporter = new SwiggyImporter();
let swiggyAutoTimer = null;
const defaultCustomerPrinterName = 'POS-58-Series';

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

function scheduleSwiggyImport(settings) {
  if (swiggyAutoTimer) {
    clearInterval(swiggyAutoTimer);
    swiggyAutoTimer = null;
  }
  if (!settings?.autoEnabled) return;
  const minutes = Math.max(1, Number(settings.intervalMinutes || 15));
  swiggyAutoTimer = setInterval(() => {
    swiggyImporter.importNow({ visible: false, reason: 'auto' }).catch(() => {});
  }, minutes * 60 * 1000);
}

function registerSwiggyIpc() {
  ipcMain.handle('swiggy:get-settings', async () => ({
    settings: await swiggyImporter.getSettings(),
    state: await swiggyImporter.getState(),
    importedOrders: await swiggyImporter.getImportedOrders()
  }));

  ipcMain.handle('swiggy:save-settings', async (_event, settings) => {
    const saved = await swiggyImporter.saveSettings(settings || {});
    scheduleSwiggyImport(saved);
    return { settings: saved, state: await swiggyImporter.getState() };
  });

  ipcMain.handle('swiggy:import-now', async (event, options) =>
    swiggyImporter.importNow({
      visible: true,
      ...(options || {}),
      onProgress: (progress) => event.sender.send('swiggy:progress', progress)
    })
  );
  ipcMain.handle('swiggy:test-login', async (event) =>
    swiggyImporter.importNow({
      visible: true,
      reason: 'login-test',
      onProgress: (progress) => event.sender.send('swiggy:progress', progress)
    })
  );
  ipcMain.handle('swiggy:open-export-folder', async () => swiggyImporter.openExportFolder());
}

function money(value = 0) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function receiptHtml(order) {
  const items = (order.items || []).map((item) => {
    const qty = Number(item.qty || item.quantity || 1);
    const price = Number(item.price || 0);
    return `<tr><td>${escapeHtml(item.name)} ${escapeHtml(item.variant || '')}<br/>x ${qty}</td><td class="right">${money(price * qty)}</td></tr>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    body{font-family:Arial,sans-serif;width:220px;margin:0;padding:8px;color:#000;font-size:12px}
    h1{font-size:16px;margin:0 0 4px;text-align:center} .center{text-align:center}.right{text-align:right}
    table{width:100%;border-collapse:collapse;margin-top:8px}td{border-top:1px dashed #000;padding:5px 0;vertical-align:top}
    .total{font-size:15px;font-weight:700;border-top:1px solid #000;margin-top:8px;padding-top:8px;display:flex;justify-content:space-between}
    .otp{font-size:22px;font-weight:800;text-align:center;border:1px solid #000;margin:8px 0;padding:6px}
  </style></head><body>
    <h1>EGO FOODS</h1>
    <div class="center">Customer Copy</div>
    <div>Order: ${escapeHtml(order.pickup_code || order.id || '')}</div>
    <div>Name: ${escapeHtml(order.customer_name || 'Customer')}</div>
    <div>Phone: ${escapeHtml(order.customer_phone || '')}</div>
    <table>${items}</table>
    <div class="total"><span>Total</span><span>${money(order.total_amount || order.total || 0)}</span></div>
    <div>Pickup OTP</div><div class="otp">${escapeHtml(order.pickup_code || '')}</div>
    <div class="center">Share this OTP with the pickup person.</div>
    <div class="center">Thank you</div>
  </body></html>`;
}

function registerPrinterIpc() {
  ipcMain.handle('printer:list', async () => mainWindow?.webContents.getPrintersAsync() || []);
  ipcMain.handle('printer:print-customer-receipt', async (_event, order, printerName) => {
    const deviceName = printerName || defaultCustomerPrinterName;
    const printWindow = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(receiptHtml(order || {}))}`);
    await new Promise((resolve, reject) => {
      printWindow.webContents.print({ silent: true, printBackground: true, deviceName }, (success, failureReason) => {
        printWindow.close();
        success ? resolve() : reject(new Error(failureReason || 'Receipt print failed.'));
      });
    });
    return { ok: true, printer: deviceName };
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    x: 40,
    y: 30,
    minWidth: 900,
    minHeight: 680,
    title: 'Kitchen OS - Ego Foods',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(async () => {
  registerSwiggyIpc();
  registerPrinterIpc();
  scheduleSwiggyImport(await swiggyImporter.getSettings());
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
