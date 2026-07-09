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
  scheduleSwiggyImport(await swiggyImporter.getSettings());
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
