"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, Pause, Play, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function timeLabel(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function beep() {
  const AudioCtor: typeof window.AudioContext | undefined =
    window.AudioContext || (window as Window & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
  if (!AudioCtor) return;
  const ctx = new AudioCtor();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
}

export function LiveRefresh({ orderIds = [] }: { orderIds?: string[] }) {
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const previousIds = useRef<Set<string> | null>(null);
  const idsKey = useMemo(() => orderIds.join(","), [orderIds]);

  useEffect(() => {
    if (!sound) {
      previousIds.current = new Set(orderIds);
      return;
    }
    if (!previousIds.current) {
      previousIds.current = new Set(orderIds);
      return;
    }
    const hasNewOrder = orderIds.some((id) => !previousIds.current?.has(id));
    previousIds.current = new Set(orderIds);
    if (hasNewOrder) beep();
  }, [idsKey, orderIds, sound]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLSelectElement || active instanceof HTMLTextAreaElement) return;
      setLastUpdated(new Date());
      router.refresh();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [paused, router]);

  return (
    <div className="glass-bar flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 font-medium">
          <span className={paused ? "h-2 w-2 rounded-full bg-amber-500" : "h-2 w-2 rounded-full bg-emerald-500"} />
          Live: {paused ? "Paused" : "On"}
        </span>
        <span className="text-muted-foreground">Last updated {timeLabel(lastUpdated)}</span>
        <span className="text-muted-foreground">Refreshes every 10s</span>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => router.refresh()}>
          <RefreshCw size={15} />
          Refresh
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setPaused((value) => !value)}>
          {paused ? <Play size={15} /> : <Pause size={15} />}
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setSound((value) => !value)}>
          {sound ? <Bell size={15} /> : <BellOff size={15} />}
          {sound ? "Sound on" : "Enable sound"}
        </Button>
      </div>
    </div>
  );
}
