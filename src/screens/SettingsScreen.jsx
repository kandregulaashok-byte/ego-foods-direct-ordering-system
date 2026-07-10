import { KeyRound, Printer, Store, ToggleLeft } from 'lucide-react';
import { fetchKitchenSettings, hasKitchenApi, updateKitchenSettings } from '../lib/kitchenApi';
import { useAppStore } from '../store/appStore';
import { useEffect, useState } from 'react';

const closedMessage = 'Orders are currently not being taken. If we resume in some time, we will update you.';

export default function SettingsScreen() {
  const whatsappOpen = useAppStore((state) => state.whatsappOpen);
  const setWhatsappOpen = useAppStore((state) => state.setWhatsappOpen);
  const printerOnline = useAppStore((state) => state.printerOnline);
  const setPrinterOnline = useAppStore((state) => state.setPrinterOnline);
  const customerPrinterName = useAppStore((state) => state.customerPrinterName);
  const setCustomerPrinterName = useAppStore((state) => state.setCustomerPrinterName);
  const [whatsappToken, setWhatsappToken] = useState('');
  const [tokenSaved, setTokenSaved] = useState(false);
  const [printers, setPrinters] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!hasKitchenApi) return;
    fetchKitchenSettings()
      .then((settings) => setTokenSaved(Boolean(settings.whatsapp_token_set)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    window.kitchenOS?.printer?.list?.()
      .then((rows) => setPrinters(rows || []))
      .catch(() => setPrinters([]));
  }, []);

  async function toggleWhatsappOpen() {
    const next = !whatsappOpen;
    setWhatsappOpen(next);
    if (!hasKitchenApi) return;
    try {
      const settings = await updateKitchenSettings({ is_open: next, closed_message: closedMessage });
      setWhatsappOpen(Boolean(settings.is_open));
    } catch {
      setWhatsappOpen(!next);
    }
  }

  async function saveWhatsappToken() {
    if (!whatsappToken.trim()) return;
    try {
      const settings = await updateKitchenSettings({ whatsapp_access_token: whatsappToken.trim() });
      setTokenSaved(Boolean(settings.whatsapp_token_set));
      setWhatsappToken('');
      setMessage('WhatsApp token saved. New bot replies will use it.');
    } catch {
      setMessage('Could not save WhatsApp token.');
    }
  }

  return (
    <section className="h-full overflow-y-auto bg-[#f7f1ec] p-5 scrollbar-none">
      <header className="mb-5">
        <h1 className="text-xl font-black text-text-dark">Settings & Printing</h1>
        <p className="mt-1 text-[13px] font-semibold text-text-muted">Operational settings used by the dashboard.</p>
      </header>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel icon={Store} title="WhatsApp Orders">
          <p className="text-[14px] font-semibold text-text-muted">When off, the bot replies that orders are currently not being taken.</p>
          <button type="button" onClick={toggleWhatsappOpen} className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-sm px-4 text-[13px] font-black text-white ${whatsappOpen ? 'bg-success' : 'bg-danger'}`}>
            <ToggleLeft size={18} /> WhatsApp {whatsappOpen ? 'ON' : 'OFF'}
          </button>
        </Panel>
        <Panel icon={Printer} title="Printer Status">
          <p className="text-[14px] font-semibold text-text-muted">Ready actions should not be blocked by printer issues. This flag controls the dashboard warning.</p>
          <label className="mt-4 block text-[12px] font-black uppercase text-text-muted">Customer copy printer</label>
          <select
            value={customerPrinterName}
            onChange={(event) => setCustomerPrinterName(event.target.value)}
            className="mt-2 h-11 w-full rounded-sm border border-[#eadfd7] bg-white px-3 text-[14px] font-bold text-text-dark"
          >
            {printers.length ? printers.map((printer) => (
              <option key={printer.name} value={printer.name}>{printer.name}</option>
            )) : <option value={customerPrinterName}>{customerPrinterName}</option>}
          </select>
          <button type="button" onClick={() => setPrinterOnline(!printerOnline)} className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-sm px-4 text-[13px] font-black text-white ${printerOnline ? 'bg-success' : 'bg-danger'}`}>
            <Printer size={18} /> Printer {printerOnline ? 'OK' : 'ISSUE'}
          </button>
        </Panel>
        <Panel icon={KeyRound} title="Temporary WhatsApp Token">
          <p className="text-[14px] font-semibold text-text-muted">
            For test number tokens. Paste the new Meta token when the old one expires.
          </p>
          <div className="mt-4 grid gap-2">
            <input
              type="password"
              value={whatsappToken}
              onChange={(event) => setWhatsappToken(event.target.value)}
              placeholder={tokenSaved ? 'Token saved' : 'Paste Meta access token'}
              className="h-11 rounded-sm border border-[#eadfd7] px-3 text-[14px] font-bold"
            />
            <button type="button" disabled={!hasKitchenApi || !whatsappToken.trim()} onClick={saveWhatsappToken} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-4 text-[13px] font-black text-white disabled:bg-text-muted">
              Save WhatsApp Token
            </button>
          </div>
        </Panel>
      </div>
      {message ? <div className="mt-4 rounded-sm border border-[#eadfd7] bg-white p-3 text-[15px] font-bold text-text-dark">{message}</div> : null}
      <div className="mt-4 rounded-sm border border-[#eadfd7] bg-white p-4 shadow-card">
        <p className="text-[13px] font-black uppercase text-text-muted">Gateway</p>
        <p className="mt-2 text-[15px] font-bold text-text-dark">Payment gateway secrets stay only in backend .env.</p>
      </div>
    </section>
  );
}

function Panel({ icon: Icon, title, children }) {
  return (
    <div className="rounded-sm border border-[#eadfd7] bg-white p-4 shadow-card">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-primary" />
        <h2 className="text-lg font-black text-text-dark">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
