import { capitalize } from "./format.js";

export function monthKey(date) {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-11
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

export function periodName(date) {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return capitalize(fmt.format(date)).replace(" de ", "/");
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
