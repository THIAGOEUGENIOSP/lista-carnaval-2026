import { sb } from "../config/supabase.js";
import { mustOk } from "./db.js";

export async function fetchItems(periodoId) {
  const res = await sb
    .from("items")
    .select(
      "id,nome,quantidade,valor_unitario,unidade,categoria,status,periodo_id,criado_por_nome,created_at,updated_at",
    )
    .eq("periodo_id", periodoId)
    .order("created_at", { ascending: false });

  return mustOk(res) || [];
}

export async function addItem(payload) {
  const res = await sb
    .from("items")
    .insert(payload)
    .select(
      "id,nome,quantidade,valor_unitario,unidade,categoria,status,periodo_id,criado_por_nome,created_at,updated_at",
    )
    .single();

  return mustOk(res);
}

export async function updateItem(id, patch) {
  const res = await sb
    .from("items")
    .update(patch)
    .eq("id", id)
    .select(
      "id,nome,quantidade,valor_unitario,unidade,categoria,status,periodo_id,criado_por_nome,created_at,updated_at",
    )
    .single();

  return mustOk(res);
}

export async function deleteItem(id) {
  const res = await sb.from("items").delete().eq("id", id);
  mustOk(res);
  return true;
}

export async function bulkZeroPrices(periodoId) {
  const res = await sb
    .from("items")
    .update({ valor_unitario: 0 })
    .eq("periodo_id", periodoId);
  mustOk(res);
  return true;
}

export async function bulkDeleteByPeriod(periodoId) {
  const res = await sb.from("items").delete().eq("periodo_id", periodoId);
  mustOk(res);
  return true;
}

export async function copyItemsToPeriod({
  fromPeriodId,
  toPeriodId,
  createdByName,
}) {
  const src = await sb
    .from("items")
    .select("nome,quantidade,valor_unitario,unidade,categoria")
    .eq("periodo_id", fromPeriodId);

  const rows = mustOk(src) || [];
  if (rows.length === 0) return 0;

  const payload = rows.map((r) => ({
    ...r,
    status: "PENDENTE",
    periodo_id: toPeriodId,
    criado_por_nome: createdByName || "Colaborador",
  }));

  const ins = await sb.from("items").insert(payload);
  mustOk(ins);
  return payload.length;
}
