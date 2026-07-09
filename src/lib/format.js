import dayjs from 'dayjs';

export function formatINR(amount = 0) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(amount || 0));
}

export function formatKg(value = 0) {
  const number = Number(value || 0);
  if (number < 1 && number > 0) return `${Math.round(number * 1000)} g`;
  return `${number.toFixed(number % 1 === 0 ? 0 : 1)} kg`;
}

export function todayISO() {
  return dayjs().format('YYYY-MM-DD');
}

export function timeLabel(value) {
  return dayjs(value).format('h:mm A');
}

export function dateTitle(value = dayjs()) {
  return dayjs(value).format('dddd, D MMMM YYYY');
}

export function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}
