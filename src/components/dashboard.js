import { brl } from "../utils/format.js";

export function renderDashboard(kpis) {
  return `
  <div class="grid kpis">
    <div class="card kpi">
      <div class="label">Total de itens</div>
      <div class="value">${kpis.totalItems}</div>
    </div>
    <div class="card kpi">
      <div class="label">Valor total</div>
      <div class="value">${brl(kpis.totalValue)}</div>
    </div>
    <div class="card kpi">
      <div class="label">Valor comprado</div>
      <div class="value">${brl(kpis.boughtValue)}</div>
    </div>
    <div class="card kpi">
      <div class="label">Valor pendente</div>
      <div class="value">${brl(kpis.pendingValue)}</div>
    </div>
    <div class="card kpi">
      <div class="label">Preço médio (total/item)</div>
      <div class="value">${brl(kpis.avgItemTotal)}</div>
    </div>
  </div>

  <div class="card section" style="margin-top:12px">
    <div class="row space-between">
      <div>
        <h2>Resumo e Progresso</h2>
        <div class="muted" style="margin-top:4px;font-size:12px">Itens comprados vs pendentes (por quantidade)</div>
      </div>
      <div class="badge ${kpis.progressPct >= 70 ? "ok" : "pending"}">
        <span>📈</span><span><b>${kpis.progressPct}%</b> comprado</span>
      </div>
    </div>

    <div style="margin-top:12px">
      <div class="muted" style="font-size:12px;margin-bottom:6px">Progresso</div>
      <div style="height:10px;border:1px solid var(--border);border-radius:999px;overflow:hidden">
        <div style="height:100%;width:${kpis.progressPct}%;background:var(--primary)"></div>
      </div>
    </div>
  </div>
  `;
}
