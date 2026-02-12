import { sb } from "../config/supabase.js";

export async function logAudit({
  action,
  collaboratorName,
  periodId = null,
  itemId = null,
  details = {},
}) {
  try {
    await sb.from("audit_log").insert({
      action,
      collaborator_name: collaboratorName || "Colaborador",
      period_id: periodId,
      item_id: itemId,
      details,
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    });
  } catch {
    // auditoria nunca deve bloquear a operação principal
  }
}
