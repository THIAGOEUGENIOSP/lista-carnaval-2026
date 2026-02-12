import { sb } from "../config/supabase.js";
import { mustOk } from "./db.js";

let softDeleteAvailable = null;

function isMissingSoftDeleteColumn(err) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("deleted_at") || msg.includes("deleted_by_nome");
}

function canUseSoftDelete() {
  return softDeleteAvailable !== false;
}

function markSoftDeleteAvailable() {
  softDeleteAvailable = true;
}

function markSoftDeleteUnavailable() {
  softDeleteAvailable = false;
}

export async function fetchItems(periodoId) {
  if (!canUseSoftDelete()) {
    const legacy = await sb
      .from("items")
      .select(
        "id,nome,quantidade,valor_unitario,unidade,categoria,status,periodo_id,criado_por_nome,created_at,updated_at",
      )
      .eq("periodo_id", periodoId)
      .order("created_at", { ascending: false });
    return mustOk(legacy) || [];
  }

  const res = await sb
    .from("items")
    .select(
      "id,nome,quantidade,valor_unitario,unidade,categoria,status,periodo_id,criado_por_nome,created_at,updated_at",
    )
    .eq("periodo_id", periodoId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (!res.error) {
    markSoftDeleteAvailable();
    return mustOk(res) || [];
  }
  if (isMissingSoftDeleteColumn(res.error)) {
    markSoftDeleteUnavailable();
  }

  // Fallback total para bancos sem soft delete (ou erro de filtro/coluna)
  const legacy = await sb
    .from("items")
    .select(
      "id,nome,quantidade,valor_unitario,unidade,categoria,status,periodo_id,criado_por_nome,created_at,updated_at",
    )
    .eq("periodo_id", periodoId)
    .order("created_at", { ascending: false });

  return mustOk(legacy) || [];
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
  if (!canUseSoftDelete()) {
    const legacy = await sb
      .from("items")
      .update(patch)
      .eq("id", id)
      .select(
        "id,nome,quantidade,valor_unitario,unidade,categoria,status,periodo_id,criado_por_nome,created_at,updated_at",
      )
      .single();
    return mustOk(legacy);
  }

  const query = () =>
    sb
      .from("items")
      .update(patch)
      .eq("id", id)
      .is("deleted_at", null)
      .select(
        "id,nome,quantidade,valor_unitario,unidade,categoria,status,periodo_id,criado_por_nome,created_at,updated_at",
      )
      .single();

  const res = await query();
  if (!res.error) {
    markSoftDeleteAvailable();
    return mustOk(res);
  }

  if (!isMissingSoftDeleteColumn(res.error)) {
    return mustOk(res);
  }
  markSoftDeleteUnavailable();

  const legacy = await sb
    .from("items")
    .update(patch)
    .eq("id", id)
    .select(
      "id,nome,quantidade,valor_unitario,unidade,categoria,status,periodo_id,criado_por_nome,created_at,updated_at",
    )
    .single();

  return mustOk(legacy);
}

export async function deleteItem(id, deletedByName) {
  if (!canUseSoftDelete()) {
    const legacy = await sb.from("items").delete().eq("id", id);
    mustOk(legacy);
    return true;
  }

  const res = await sb
    .from("items")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by_nome: deletedByName || "Colaborador",
    })
    .eq("id", id)
    .is("deleted_at", null);
  if (!res.error) {
    markSoftDeleteAvailable();
    mustOk(res);
    return true;
  }
  if (res.error && isMissingSoftDeleteColumn(res.error)) {
    markSoftDeleteUnavailable();
    const legacy = await sb.from("items").delete().eq("id", id);
    mustOk(legacy);
    return true;
  }
  mustOk(res);
  return true;
}

export async function bulkZeroPrices(periodoId) {
  if (!canUseSoftDelete()) {
    const legacy = await sb
      .from("items")
      .update({ valor_unitario: 0 })
      .eq("periodo_id", periodoId);
    mustOk(legacy);
    return true;
  }

  const res = await sb
    .from("items")
    .update({ valor_unitario: 0 })
    .eq("periodo_id", periodoId)
    .is("deleted_at", null);
  if (!res.error) {
    markSoftDeleteAvailable();
    mustOk(res);
    return true;
  }

  if (!isMissingSoftDeleteColumn(res.error)) {
    mustOk(res);
  }
  markSoftDeleteUnavailable();

  const legacy = await sb
    .from("items")
    .update({ valor_unitario: 0 })
    .eq("periodo_id", periodoId);
  mustOk(legacy);
  return true;
}

export async function bulkDeleteByPeriod(periodoId, deletedByName) {
  if (!canUseSoftDelete()) {
    const legacy = await sb.from("items").delete().eq("periodo_id", periodoId);
    mustOk(legacy);
    return true;
  }

  const res = await sb
    .from("items")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by_nome: deletedByName || "Colaborador",
      delete_reason: "MONTH_TRASH",
    })
    .eq("periodo_id", periodoId)
    .is("deleted_at", null);
  if (!res.error) {
    markSoftDeleteAvailable();
    mustOk(res);
    return true;
  }
  if (res.error && isMissingSoftDeleteColumn(res.error)) {
    markSoftDeleteUnavailable();
    const legacy = await sb.from("items").delete().eq("periodo_id", periodoId);
    mustOk(legacy);
    return true;
  }
  mustOk(res);
  return true;
}

export async function restoreDeletedByPeriod(periodoId) {
  if (!canUseSoftDelete()) return true;

  const res = await sb
    .from("items")
    .update({
      deleted_at: null,
      deleted_by_nome: null,
      delete_reason: null,
    })
    .eq("periodo_id", periodoId)
    .not("deleted_at", "is", null);
  if (!res.error) {
    markSoftDeleteAvailable();
    mustOk(res);
    return true;
  }
  if (res.error && isMissingSoftDeleteColumn(res.error)) {
    markSoftDeleteUnavailable();
    return true;
  }
  mustOk(res);
  return true;
}

export async function countDeletedByPeriod(periodoId) {
  if (!canUseSoftDelete()) return 0;

  const res = await sb
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("periodo_id", periodoId)
    .not("deleted_at", "is", null);
  if (res.error) {
    if (isMissingSoftDeleteColumn(res.error)) markSoftDeleteUnavailable();
    return 0;
  }
  markSoftDeleteAvailable();
  mustOk(res);
  return Number(res.count || 0);
}

export async function copyItemsToPeriod({
  fromPeriodId,
  toPeriodId,
  createdByName,
}) {
  if (!canUseSoftDelete()) {
    const legacy = await sb
      .from("items")
      .select("nome,quantidade,valor_unitario,unidade,categoria")
      .eq("periodo_id", fromPeriodId);

    const rows = mustOk(legacy) || [];
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

  let src = await sb
    .from("items")
    .select("nome,quantidade,valor_unitario,unidade,categoria")
    .eq("periodo_id", fromPeriodId)
    .is("deleted_at", null);

  if (src.error && isMissingSoftDeleteColumn(src.error)) {
    markSoftDeleteUnavailable();
    src = await sb
      .from("items")
      .select("nome,quantidade,valor_unitario,unidade,categoria")
      .eq("periodo_id", fromPeriodId);
  } else if (!src.error) {
    markSoftDeleteAvailable();
  }

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
