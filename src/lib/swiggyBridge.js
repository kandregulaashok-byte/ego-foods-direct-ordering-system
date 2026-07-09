export function hasSwiggyBridge() {
  return Boolean(window.kitchenOS?.swiggy);
}

export async function getSwiggySettings() {
  if (!hasSwiggyBridge()) return null;
  return window.kitchenOS.swiggy.getSettings();
}

export async function saveSwiggySettings(settings) {
  if (!hasSwiggyBridge()) throw new Error('Run the desktop app to save Swiggy settings.');
  return window.kitchenOS.swiggy.saveSettings(settings);
}

export async function importSwiggyNow(options) {
  if (!hasSwiggyBridge()) throw new Error('Run the desktop app to import Swiggy orders.');
  return window.kitchenOS.swiggy.importNow(options);
}

export async function testSwiggyLogin() {
  if (!hasSwiggyBridge()) throw new Error('Run the desktop app to test Swiggy login.');
  return window.kitchenOS.swiggy.testLogin();
}

export async function openSwiggyExportFolder() {
  if (!hasSwiggyBridge()) throw new Error('Run the desktop app to open exports.');
  return window.kitchenOS.swiggy.openExportFolder();
}

export function onSwiggyProgress(callback) {
  if (!hasSwiggyBridge() || !window.kitchenOS.swiggy.onProgress) return () => {};
  return window.kitchenOS.swiggy.onProgress(callback);
}
