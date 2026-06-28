import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(paise / 100);
}

export function formatDateTime(value: string | Date) {
  return format(new Date(value), "dd MMM yyyy, h:mm a");
}

export function makeOrderCode(date = new Date()) {
  const stamp = format(date, "yyyyMMdd-HHmmss");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EGO-${stamp}-${suffix}`;
}

export function normalizeWhatsappNumber(input: string) {
  return input.replace(/[^\d]/g, "");
}

export function csvEscape(value: string | number | null | undefined) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}
