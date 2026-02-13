export function renderHeader({ periodLabel, userName, theme, deletedCount = 0 }) {
  return `
  <div class="card section">
    <div class="row space-between">
      <div class="row">
        <div>
          <h1>Lista de Compras - Carnaval 2026</h1>
          <div class="muted" style="margin-top:4px">Colaborativa • Mensal • Analytics</div>
        </div>
      </div>

      <div class="row" style="gap:10px">
        <button class="btn small" data-action="scroll-top">Início</button>
        <button class="btn small" data-action="prev-month">◀</button>
        <div class="badge" title="Período atual"><span>📅</span><span><b>${periodLabel}</b></span></div>
        <button class="btn small" data-action="next-month">▶</button>

        <span class="hr" style="width:1px;height:28px;margin:0 6px"></span>

        <button class="btn small" data-action="toggle-theme">${theme === "dark" ? "🌙" : "☀️"} Tema</button>

        <span class="hr" style="width:1px;height:28px;margin:0 6px"></span>

        <div class="badge" title="Usuário logado"><span>👤</span><span>${userName || "—"}</span></div>
        <button class="btn small" data-action="logout">Sair</button>
      </div>
    </div>

    <div class="hr"></div>

    <div class="row">
      <button class="btn only-mobile" data-action="scroll-top">Início</button>
      <button class="btn warn" data-action="zero-prices">Zerar preços do mês</button>
      <button class="btn primary" data-action="copy-next">Copiar lista p/ próximo mês</button>
      <button class="btn danger" data-action="delete-month">Mover lista do mês p/ lixeira</button>
      <button class="btn small" data-action="restore-month" ${deletedCount > 0 ? "" : "disabled"}>Restaurar lista do mês (${deletedCount})</button>
      <span class="muted" style="font-size:12px">* Operações afetam apenas o período selecionado. A lixeira permite restauração.</span>
    </div>
  </div>
  `;
}
