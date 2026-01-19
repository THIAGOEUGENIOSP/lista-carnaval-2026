// src/components/itemList.js
import { brl } from "../utils/format.js";

export function renderItemListControls(state) {
  return `
  <div class="card section">
    <div class="row space-between">
      <div class="row" style="gap:10px">
        <button class="btn primary" data-action="open-add">+ Adicionar item</button>

        <div class="row" style="gap:6px">
          <button class="btn small ${state.filterStatus === "ALL" ? "primary" : ""}" data-filter="ALL">Todos</button>
          <button class="btn small ${state.filterStatus === "PENDENTE" ? "primary" : ""}" data-filter="PENDENTE">Pendentes</button>
          <button class="btn small ${state.filterStatus === "COMPRADO" ? "primary" : ""}" data-filter="COMPRADO">Comprados</button>
        </div>
      </div>

      <div class="row">
        <input
          class="input"
          id="searchInput"
          placeholder="Buscar item..."
          value="${state.searchText || ""}"
        />

        <select id="sortSelect">
          <option value="created_desc" ${state.sortKey === "created_desc" ? "selected" : ""}>Mais recentes</option>
          <option value="name_asc" ${state.sortKey === "name_asc" ? "selected" : ""}>Nome (A-Z)</option>
          <option value="value_desc" ${state.sortKey === "value_desc" ? "selected" : ""}>Maior total</option>
          <option value="value_asc" ${state.sortKey === "value_asc" ? "selected" : ""}>Menor total</option>
        </select>
      </div>
    </div>
  </div>
  `;
}

export function renderItemTable(items) {
  return `
  <div class="card section" style="margin-top:12px">
    <div class="row space-between">
      <h2>Lista de Compras</h2>
      <div class="muted" style="font-size:12px">${items.length} item(ns)</div>
    </div>

    <div class="table-wrap" style="margin-top:10px">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qtd</th>
            <th>V. Unit.</th>
            <th>Total</th>
            <th>Status</th>
            <th>Colaborador</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          ${items
            .map((it) => {
              const total =
                Number(it.quantidade || 0) * Number(it.valor_unitario || 0);
              const isBought = it.status === "COMPRADO";

              const statusBadge = isBought
                ? `<span class="badge ok" role="button"
                    data-action="toggle-status"
                    data-id="${it.id}"
                    data-next="PENDENTE">✔ Comprado</span>`
                : `<span class="badge pending" role="button"
                    data-action="toggle-status"
                    data-id="${it.id}"
                    data-next="COMPRADO">⏳ Pendente</span>`;

              return `
              <tr class="${isBought ? "row-bought" : ""}">
                <td>
                  <div style="font-weight:700">${it.nome}</div>
                  <div class="muted" style="font-size:12px;margin-top:2px">
                    ${it.categoria || "Geral"}
                  </div>
                </td>

                <!-- Quantidade -->
                <td style="min-width:140px">
                  <div class="editing-cell">
                    <span data-view>${it.quantidade}</span>
                    <button
                      class="icon-btn"
                      title="Editar quantidade"
                      data-action="edit-cell"
                      data-field="quantidade"
                      data-id="${it.id}"
                    >✏️</button>
                  </div>
                </td>

                <!-- Valor Unitário -->
                <td style="min-width:180px">
                  <div class="editing-cell">
                    <span data-view>${brl(it.valor_unitario)}</span>
                    <button
                      class="icon-btn"
                      title="Editar valor unitário"
                      data-action="edit-cell"
                      data-field="valor_unitario"
                      data-id="${it.id}"
                    >✏️</button>
                  </div>
                </td>

                <!-- Total -->
                <td><b>${brl(total)}</b></td>

                <!-- Status -->
                <td>${statusBadge}</td>

                <!-- Colaborador -->
                <td>${it.criado_por_nome || "—"}</td>

                <!-- Ações -->
                <td>
                  <div class="row" style="gap:6px">
                    <button class="btn small" data-action="edit" data-id="${it.id}">
                      Editar
                    </button>
                    <button class="btn small danger" data-action="delete" data-id="${it.id}">
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  </div>
  `;
}
