export default function InventoryBar({ value, max, color = '#60B246' }) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (Number(value) / Number(max)) * 100)) : 0;
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-border">
      <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: color }} />
    </div>
  );
}
