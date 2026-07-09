import { CheckCircle2, ChevronDown, ChevronUp, Image, XCircle } from 'lucide-react';
import { useState } from 'react';
import dayjs from 'dayjs';
import Modal from './Modal';
import { STATUS_META } from '../lib/business';
import { formatINR, timeLabel } from '../lib/format';
import { useOrderStore } from '../store/orderStore';

const nextAction = {
  new: ['Confirm Payment', 'preparing'],
  payment_pending: ['Confirm Payment', 'preparing'],
  preparing: ['Mark Ready', 'ready'],
  ready: ['Picked Up', 'completed']
};

function Dot({ color }) {
  const map = {
    red: 'bg-danger',
    yellow: 'bg-primary',
    orange: 'bg-primary',
    green: 'bg-success',
    black: 'bg-text-muted'
  };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${map[color]}`} />;
}

export default function OrderCard({
  order,
  muted = false,
  onCompleted,
  selectable = false,
  selected = false,
  onSelectedChange
}) {
  const [expanded, setExpanded] = useState(false);
  const [screenshotOpen, setScreenshotOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const updateOrderStatus = useOrderStore((state) => state.updateOrderStatus);
  const dismissAlarmForOrder = useOrderStore((state) => state.dismissAlarmForOrder);
  const alarmOrderIds = useOrderStore((state) => state.alarmOrderIds);
  const viewedScreenshots = useOrderStore((state) => state.viewedScreenshots);
  const markScreenshotViewed = useOrderStore((state) => state.markScreenshotViewed);
  const meta = STATUS_META[order.status] || STATUS_META.new;
  const action = nextAction[order.status];
  const isPaidNew = (order.status === 'new' || order.status === 'payment_pending') && order.payment_confirmed;
  const primaryLabel = isPaidNew ? 'Accept' : action?.[0];
  const primaryStatus = isPaidNew ? 'preparing' : action?.[1];
  const needsScreenshotView = Boolean(order.payment_screenshot_url) && !viewedScreenshots[order.id] && !order.payment_confirmed;
  const itemLine = (order.items || []).map((item) => `${item.name} ${item.variant || ''} x${item.qty || item.quantity || 1}`.trim()).join(', ');
  const isPulsing = alarmOrderIds.has(order.id) || isPaidNew;
  const sourceLabel = order.source === 'swiggy' ? 'Swiggy' : order.source === 'counter' ? 'Counter' : 'WhatsApp';

  async function handleAction() {
    if (loading || !primaryStatus) return;
    if (primaryStatus === 'preparing' && needsScreenshotView) {
      setMessage('View the payment screenshot before confirming payment.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const extra = primaryStatus === 'preparing' ? { payment_confirmed: true } : {};
      const result = await updateOrderStatus(order.id, primaryStatus, extra);
      if (!result.ok) setMessage(result.message);
      if (result.ok) dismissAlarmForOrder(order.id);
      if (result.ok && primaryStatus === 'completed') onCompleted?.(result.next);
    } finally {
      setLoading(false);
    }
  }

  async function rejectOrder(reason) {
    if (loading) return;
    setLoading(true);
    setMessage('');
    try {
      const result = await updateOrderStatus(order.id, 'rejected', { rejection_reason: reason, refund_pending: true });
      if (!result.ok) setMessage(result.message);
      else {
        dismissAlarmForOrder(order.id);
        setRejectOpen(false);
      }
    } finally {
      setLoading(false);
    }
  }

  function openScreenshot() {
    markScreenshotViewed(order.id);
    setScreenshotOpen(true);
  }

  return (
    <>
      <article
        onClick={() => dismissAlarmForOrder(order.id)}
        className={`relative rounded-sm border border-[#eadfd7] bg-white shadow-card ${isPulsing ? 'pulse-danger' : ''} ${muted ? 'opacity-75' : ''}`}
        style={{ borderTop: `4px solid ${meta.border}` }}
      >
        <div className="p-3">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {selectable ? (
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => {
                    event.stopPropagation();
                    onSelectedChange?.();
                  }}
                  className="h-4 w-4 shrink-0 accent-primary"
                  aria-label={`Select order ${order.pickup_code}`}
                />
              ) : null}
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-black ${meta.badgeClass}`}>
                <Dot color={meta.dot} /> {meta.label}
              </span>
              <span className="truncate text-[13px] font-black text-text-dark">#{order.pickup_code}</span>
            </div>
            <span className="shrink-0 text-[12px] font-semibold text-text-muted">{timeLabel(order.created_at)}</span>
          </div>

          <div className="min-h-[116px]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[16px] font-black text-text-dark">{order.customer_name || 'Walk-in Customer'}</p>
                <p className="mt-1 text-[12px] font-bold text-success">{sourceLabel}</p>
              </div>
              <p className="shrink-0 text-[15px] font-black text-[#6f3513]">{formatINR(order.total_amount || order.total || 0)}</p>
            </div>
            <p className="line-clamp-3 text-[14px] font-semibold leading-5 text-text-dark">{itemLine || 'No items listed'}</p>
            <p className="mt-2 text-[12px] font-semibold italic text-text-muted">
              {order.payment_confirmed ? 'Payment confirmed. Alarm rings until Accept or Reject.' : 'Payment pending.'}
            </p>
          </div>

          <div className="mt-3 border-t border-[#eadfd7] pt-3">
            <div className="mb-3 flex justify-between text-[12px] font-black uppercase text-text-muted">
              <span>Total Amount</span>
              <span className="text-text-dark">{formatINR(order.total_amount || order.total || 0)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {isPaidNew ? (
                <button type="button" disabled={loading} onClick={(event) => { event.stopPropagation(); setRejectOpen((value) => !value); }} className="min-h-10 rounded-sm border border-text-dark text-[12px] font-black text-text-dark disabled:text-text-muted">
                  Reject
                </button>
              ) : (
                <button type="button" onClick={(event) => { event.stopPropagation(); setExpanded((value) => !value); }} className="min-h-10 rounded-sm border border-[#eadfd7] text-[12px] font-black text-text-dark">
                  {expanded ? 'Collapse' : 'Details'}
                </button>
              )}
              {primaryStatus ? (
                <button type="button" disabled={loading} onClick={(event) => { event.stopPropagation(); handleAction(); }} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-sm bg-primary px-3 text-[12px] font-black text-white disabled:bg-text-muted">
                  <CheckCircle2 size={15} /> {loading ? 'Saving...' : primaryLabel}
                </button>
              ) : (
                <button type="button" onClick={(event) => { event.stopPropagation(); setExpanded((value) => !value); }} className="min-h-10 rounded-sm bg-[#f7f1ec] px-3 text-[12px] font-black text-text-dark">
                  View
                </button>
              )}
            </div>
            {rejectOpen ? (
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-sm bg-[#fff6ef] p-2">
                <button type="button" onClick={(event) => { event.stopPropagation(); rejectOrder('Out of stock'); }} className="min-h-9 rounded-sm border border-[#eadfd7] text-[12px] font-bold text-danger">
                  Out of stock
                </button>
                <button type="button" onClick={(event) => { event.stopPropagation(); rejectOrder('Kitchen closed'); }} className="min-h-9 rounded-sm border border-[#eadfd7] text-[12px] font-bold text-danger">
                  Kitchen closed
                </button>
              </div>
            ) : null}
            <button type="button" onClick={(event) => { event.stopPropagation(); setExpanded((value) => !value); }} className="mt-2 flex min-h-9 w-full items-center justify-center gap-1 rounded-sm text-[12px] font-bold text-text-muted">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />} {expanded ? 'Hide full order' : 'Expand full order'}
            </button>
            {message ? <p className="mt-2 text-[12px] font-bold text-danger">{message}</p> : null}
          </div>
        </div>

        {expanded ? (
          <div className="border-t border-[#eadfd7] px-3 pb-3 pt-3">
            <div className="space-y-2">
              <p className="text-[13px] font-black uppercase text-text-muted">Items</p>
              {(order.items || []).map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex justify-between gap-3 text-[14px] text-text-dark">
                  <span>{item.name} {item.variant} x{item.qty || item.quantity || 1}</span>
                  <span className="font-semibold">{formatINR(Number(item.price || 0) * Number(item.qty || item.quantity || 1))}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-[#eadfd7] pt-2 text-base font-bold">
                <span>Total</span>
                <span>{formatINR(order.total_amount || order.total || 0)}</span>
              </div>
              <div className="rounded-sm bg-[#fff6ef] p-3">
                <p className="text-[12px] font-black uppercase text-text-muted">Pickup Code</p>
                <p className="mt-1 text-3xl font-black text-text-dark">{order.pickup_code}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {order.payment_screenshot_url ? (
                <button type="button" onClick={openScreenshot} className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#eadfd7] bg-bg text-base font-bold text-text-dark">
                  <Image size={20} /> View Screenshot
                </button>
              ) : null}
              {primaryStatus ? (
                <button type="button" disabled={loading} onClick={handleAction} className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-text-muted">
                  <CheckCircle2 size={20} /> {loading ? 'Saving...' : primaryLabel}
                </button>
              ) : null}
              {isPaidNew ? (
                <button type="button" disabled={loading} onClick={() => setRejectOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-sm border border-danger px-4 text-base font-bold text-danger disabled:text-text-muted">
                  <XCircle size={20} /> Reject Order
                </button>
              ) : null}
              <p className="text-[14px] font-medium text-text-muted">Created {dayjs(order.created_at).format('D MMM, h:mm A')}</p>
            </div>
          </div>
        ) : null}
      </article>

      {screenshotOpen ? (
        <Modal
          title="Payment Screenshot"
          onClose={() => setScreenshotOpen(false)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setScreenshotOpen(false)} className="rounded-sm border border-border font-bold text-text-dark">
                Close
              </button>
              <button type="button" disabled={loading} onClick={handleAction} className="rounded-sm bg-primary px-3 font-bold text-white disabled:bg-text-muted">
                Confirm Payment
              </button>
            </div>
          }
        >
          <img src={order.payment_screenshot_url} alt="Payment screenshot" className="max-h-[58vh] w-full rounded-sm object-contain" />
        </Modal>
      ) : null}
    </>
  );
}
