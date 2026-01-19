import { sb } from "../config/supabase.js";
import { mustOk } from "./db.js";
import {
  periodName,
  startOfMonth,
  endOfMonth,
  toISODate,
} from "../utils/period.js";

export async function ensurePeriod(date) {
  const nome = periodName(date);
  const di = toISODate(startOfMonth(date));
  const df = toISODate(endOfMonth(date));

  // tenta buscar
  const found = await sb
    .from("periodos")
    .select("*")
    .eq("nome", nome)
    .maybeSingle();
  const dataFound = mustOk(found);
  if (dataFound) return dataFound;

  // cria
  const created = await sb
    .from("periodos")
    .insert({ nome, data_inicio: di, data_fim: df })
    .select("*")
    .single();
  return mustOk(created);
}

export async function listRecentPeriods(limit = 12) {
  const res = await sb
    .from("periodos")
    .select("*")
    .order("data_inicio", { ascending: false })
    .limit(limit);
  return mustOk(res);
}
