import { Download, FolderOpen, RefreshCw, Save, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getSwiggySettings,
  hasSwiggyBridge,
  importSwiggyNow,
  openSwiggyExportFolder,
  onSwiggyProgress,
  saveSwiggySettings,
  testSwiggyLogin
} from '../lib/swiggyBridge';
import { timeLabel, todayISO } from '../lib/format';
import { applyExternalMappingsToOrders } from '../lib/business';
import { useInventoryStore } from '../store/inventoryStore';
import { useOrderStore } from '../store/orderStore';

const defaultSettings = {
  mobileOrRestaurantId: '',
  password: '',
  restaurantId: '',
  autoEnabled: false,
  intervalMinutes: 15
};

export default function SwiggyImportPanel() {
  const mergeImportedOrders = useOrderStore((state) => state.mergeImportedOrders);
  const inventory = useInventoryStore((state) => ({
    externalMappings: state.externalMappings,
    portions: state.portions,
    menuItems: state.menuItems
  }));
  const [settings, setSettings] = useState(defaultSettings);
  const [state, setState] = useState({ lastStatus: 'Not imported yet', lastScrapeAtIso: '' });
  const [loading, setLoading] = useState('');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(null);
  const [importDate, setImportDate] = useState(todayISO());
  const bridgeAvailable = hasSwiggyBridge();

  useEffect(() => {
    async function load() {
      const payload = await getSwiggySettings();
      if (!payload) return;
      setSettings({ ...defaultSettings, ...payload.settings, password: '' });
      setState(payload.state || {});
      mergeImportedOrders(applyExternalMappingsToOrders(payload.importedOrders || [], inventory));
    }
    load();
  }, [mergeImportedOrders]);

  useEffect(() => onSwiggyProgress((nextProgress) => {
    setProgress(nextProgress);
    if (nextProgress.done) setMessage(nextProgress.message);
  }), []);

  async function save() {
    if (loading) return;
    setLoading('save');
    setMessage('');
    try {
      const payload = await saveSwiggySettings(settings);
      setSettings({ ...settings, ...payload.settings, password: '' });
      setState(payload.state || {});
      setMessage('Swiggy import settings saved.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading('');
    }
  }

  async function testLogin() {
    if (loading) return;
    setLoading('test');
    setProgress({ percent: 3, message: 'Testing Swiggy session...' });
    setMessage('');
    try {
      const result = await testSwiggyLogin();
      setState((current) => ({ ...current, lastStatus: result.status || 'Login test complete.' }));
      if (result.importedOrders) mergeImportedOrders(applyExternalMappingsToOrders(result.importedOrders, inventory));
      setMessage(result.ok ? 'Swiggy session is reachable.' : result.status);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading('');
    }
  }

  async function importNow() {
    if (loading) return;
    setLoading('import');
    setProgress({ percent: 3, message: 'Starting Swiggy import...' });
    setMessage('');
    try {
      const result = await importSwiggyNow({ visible: true, dateIso: importDate });
      if (result.importedOrders) mergeImportedOrders(applyExternalMappingsToOrders(result.importedOrders, inventory));
      setState((current) => ({
        ...current,
        lastScrapeAtIso: new Date().toISOString(),
        lastStatus: result.ok ? `Found ${result.ordersFound}. New ${result.newCount}, updated ${result.updatedCount}.` : result.status
      }));
      setMessage(result.ok ? 'Swiggy import complete. CSV files updated.' : result.status);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading('');
    }
  }

  return (
    <section className="h-full overflow-y-auto bg-[#f7f1ec] p-5 scrollbar-none">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-dark">Swiggy Import</h1>
          <p className="mt-1 text-[13px] font-semibold text-text-muted">
            Import current-day Swiggy Partner orders incrementally. Kitchen OS does not send status updates back to Swiggy.
          </p>
        </div>
        <button
          type="button"
          disabled={!bridgeAvailable || loading === 'import'}
          onClick={importNow}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm bg-primary px-5 text-[13px] font-black text-white disabled:bg-text-muted"
        >
          <Download size={20} /> {loading === 'import' ? 'Importing...' : 'Import from Swiggy'}
        </button>
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-sm border border-[#eadfd7] bg-white p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-black uppercase text-text-muted">Live Import Status</p>
              <p className="mt-1 text-lg font-black text-text-dark">{message || state.lastStatus || 'Not imported yet'}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-[12px] font-black ${loading ? 'bg-orange-50 text-primary' : 'bg-green-50 text-success'}`}>
              {loading ? 'Running' : 'Ready'}
            </span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#eadfd7]">
            <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${Math.min(100, Math.max(0, progress?.percent || 0))}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[13px] font-bold text-text-muted">
            <span>Last import: {state.lastScrapeAtIso ? timeLabel(state.lastScrapeAtIso) : 'Never'}</span>
            <span>Import date: {importDate}</span>
          </div>
        </div>

        <div className="rounded-sm border border-[#eadfd7] bg-white p-4 shadow-card">
          <p className="text-[13px] font-black uppercase text-text-muted">Auto Import</p>
          <label className="mt-3 flex min-h-12 items-center justify-between gap-3 rounded-sm bg-[#fff6ef] px-3 text-[14px] font-black text-text-dark">
            Every {settings.intervalMinutes} minutes
            <input
              type="checkbox"
              checked={settings.autoEnabled}
              onChange={(event) => setSettings({ ...settings, autoEnabled: event.target.checked })}
              className="h-5 w-5 accent-primary"
            />
          </label>
          <p className="mt-3 text-[12px] font-semibold text-text-muted">Auto import is import-only and deduplicates by full Swiggy order ID.</p>
        </div>
      </div>

      <div className="rounded-sm border border-[#eadfd7] bg-white p-5 shadow-card">
      {!bridgeAvailable ? (
        <div className="mb-4 flex items-start gap-3 rounded-sm bg-red-50 p-3 text-[15px] font-bold text-danger">
          <ShieldAlert size={20} /> Run this inside the Electron desktop app to use Swiggy import.
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Field label="Mobile number / login ID">
          <input
            value={settings.mobileOrRestaurantId}
            onChange={(event) => setSettings({ ...settings, mobileOrRestaurantId: event.target.value })}
            className="h-11 w-full rounded-sm border border-[#eadfd7] px-3 text-[14px] font-bold"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            value={settings.password}
            placeholder={settings.passwordSaved ? 'Saved locally' : ''}
            onChange={(event) => setSettings({ ...settings, password: event.target.value })}
            className="h-11 w-full rounded-sm border border-[#eadfd7] px-3 text-[14px] font-bold"
          />
        </Field>
        <Field label="Swiggy past-orders link or Restaurant ID">
          <input
            value={settings.restaurantId}
            onChange={(event) => setSettings({ ...settings, restaurantId: event.target.value })}
            placeholder="Example: 1374292 or https://partner.swiggy.com/food/pastorders/1374292"
            className="h-11 w-full rounded-sm border border-[#eadfd7] px-3 text-[14px] font-bold"
          />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="flex h-11 items-center gap-3 rounded-sm border border-[#eadfd7] px-4 text-[14px] font-bold text-text-dark">
          Import date
          <input
            type="date"
            value={importDate}
            onChange={(event) => setImportDate(event.target.value)}
            className="h-8 rounded-sm border border-[#eadfd7] px-2 font-bold"
          />
        </label>
        <label className="flex h-11 items-center gap-3 rounded-sm border border-[#eadfd7] px-4 text-[14px] font-bold text-text-dark">
          <input
            type="checkbox"
            checked={settings.autoEnabled}
            onChange={(event) => setSettings({ ...settings, autoEnabled: event.target.checked })}
            className="h-5 w-5 accent-primary"
          />
          Enable automatic Swiggy import
        </label>
        <label className="flex h-11 items-center gap-3 rounded-sm border border-[#eadfd7] px-4 text-[14px] font-bold text-text-dark">
          Interval
          <select
            value={settings.intervalMinutes}
            onChange={(event) => setSettings({ ...settings, intervalMinutes: Number(event.target.value) })}
            className="h-8 rounded-sm border border-[#eadfd7] px-2 font-bold"
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <button type="button" disabled={!bridgeAvailable || loading === 'save'} onClick={save} className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#eadfd7] bg-bg px-4 text-[13px] font-black text-text-dark disabled:text-text-muted">
          <Save size={19} /> {loading === 'save' ? 'Saving...' : 'Save Settings'}
        </button>
        <button type="button" disabled={!bridgeAvailable || loading === 'test'} onClick={testLogin} className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#eadfd7] bg-bg px-4 text-[13px] font-black text-text-dark disabled:text-text-muted">
          <RefreshCw size={19} /> {loading === 'test' ? 'Testing...' : 'Test Login'}
        </button>
        <button type="button" disabled={!bridgeAvailable} onClick={openSwiggyExportFolder} className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#eadfd7] bg-bg px-4 text-[13px] font-black text-text-dark disabled:text-text-muted">
          <FolderOpen size={19} /> Open Export Folder
        </button>
        <div className="rounded-sm bg-[#fff6ef] px-4 py-3 text-[13px] font-bold text-text-dark">
          Last import: {state.lastScrapeAtIso ? timeLabel(state.lastScrapeAtIso) : 'Never'}
        </div>
      </div>

      <div className="mt-4 rounded-sm bg-[#fff6ef] p-3 text-[14px] font-bold text-text-dark">
        Status: {message || state.lastStatus || 'Not imported yet'}
      </div>
      {progress ? (
        <div className="mt-4 rounded-sm border border-[#eadfd7] bg-bg p-3">
          <div className="flex items-center justify-between gap-3 text-[15px] font-black text-text-dark">
            <span>{progress.message || 'Importing...'}</span>
            <span>{Math.round(progress.percent || 0)}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#eadfd7]">
            <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${Math.min(100, Math.max(0, progress.percent || 0))}%` }} />
          </div>
        </div>
      ) : null}
      {settings.storageWarning ? (
        <p className="mt-3 text-[14px] font-bold text-danger">Password encryption is unavailable on this Windows profile. Credentials are stored locally with basic encoding.</p>
      ) : null}
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-base font-bold text-text-dark">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}
