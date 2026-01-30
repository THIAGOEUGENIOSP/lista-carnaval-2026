// src/components/itemList.js
import { brl } from "../utils/format.js";
function collabName(it) {
 return String(it?.criado_por_nome || it?.criado_por || "—").trim() || "—";
}
function fmtMoney(n) {
 const v = Number(n || 0);
 return `R$ ${v.toFixed(2).replace(".", ",")}`;
}
function fmtQtyTotal(n) {
 const v = Number(n || 0);
 const hasDecimal = Math.abs(v % 1) > 0.000001;
 return v.toLocaleString("pt-BR", {
   minimumFractionDigits: hasDecimal ? 2 : 0,
   maximumFractionDigits: 2,
 });
}
function fmtQty(it) {
 const unit = String(it?.unidade || "UN").toUpperCase();
 const n = Number(it?.quantidade || 0);
 if (unit === "KG") {
   const v = Number(n.toFixed(2));
   const str = v.toLocaleString("pt-BR", {
     minimumFractionDigits: v % 1 ? 2 : 0,
     maximumFractionDigits: 2,
   });
   return `${str} kg`;
 }
 return `${Math.round(n)} un`;
}
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
export function renderItemTable(items, opts = {}) {
 const title = opts.title || "Lista de Compras";
 const countLabel = opts.countLabel || "item(ns)";
 const totalQty = items.reduce((a, it) => a + Number(it.quantidade || 0), 0);
 const totalBought = items.reduce((a, it) => {
   if (it.status !== "COMPRADO") return a;
   return a + Number(it.quantidade || 0) * Number(it.valor_unitario || 0);
 }, 0);
 const summaryRow = items.length
   ? `
<tr class="row-summary">
<td><b>Resumo</b></td>
<td>${fmtQtyTotal(totalQty)}</td>
<td></td>
<td><b>${brl(totalBought)}</b></td>
<td colspan="3"></td>
</tr>`
   : "";
 return `
<div class="card section" style="margin-top:12px">
<div class="row space-between">
<h2>${title}</h2>
<div class="muted" style="font-size:12px">${items.length} ${countLabel}</div>
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
             const total = Number(it.quantidade || 0) * Number(it.valor_unitario || 0);
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
<td style="font-weight:700">${it.nome}</td>
<td style="min-width:140px">
<div class="editing-cell">
<span data-view>${fmtQty(it)}</span>
<button
                       class="icon-btn"
                       title="Editar quantidade"
                       data-action="edit-cell"
                       data-field="quantidade"
                       data-id="${it.id}"
>✏️</button>
</div>
</td>
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
<td><b>${brl(total)}</b></td>
<td>${statusBadge}</td>
<td>${collabName(it)}</td>
<td>
<div class="row" style="gap:6px">
<button class="btn small" data-action="edit" data-id="${it.id}">Editar</button>
<button class="btn small danger" data-action="delete" data-id="${it.id}">Excluir</button>
</div>
</td>
</tr>
             `;
           })
           .join("")}
         ${summaryRow}
</tbody>
</table>
</div>
</div>
 `;
}
/**
* ✅ MOBILE: layout tipo suas referências:
* - topo: nome + Total
* - meio: preço unit (com lápis) + quantidade com -/+
* - baixo: ações (editar/excluir/comprado)
*
* Observação: o lápis do preço usa o MESMO mecanismo edit-cell do app.js.
* O -/+ chama data-action="qty-step" (você precisa tratar isso no app.js).
*/
export function renderItemMobileList(items) {
 const totalQty = items.reduce((a, it) => a + Number(it.quantidade || 0), 0);
 const totalBought = items.reduce((a, it) => {
   if (it.status !== "COMPRADO") return a;
   return a + Number(it.quantidade || 0) * Number(it.valor_unitario || 0);
 }, 0);
 const summaryCard = items.length
   ? `
<div class="mcard summary">
<div class="mcard-inner">
<div class="row space-between">
<div>
<div class="mname">Resumo</div>
<div class="mmeta">Qtd total: ${fmtQtyTotal(totalQty)}</div>
</div>
<div class="mtotal">
<div class="label">Total comprado</div>
<div class="value">${fmtMoney(totalBought)}</div>
</div>
</div>
</div>
</div>`
   : "";
 return `
<div class="mobile-list" aria-label="Lista mobile">
     ${items
       .map((it) => {
         const qtd = Number(it.quantidade || 0);
         const unit = Number(it.valor_unitario || 0);
         const total = qtd * unit;
         const isBought = it.status === "COMPRADO";
         const next = isBought ? "PENDENTE" : "COMPRADO";
         return `
<div class="mcard ${isBought ? "row-bought" : ""}">
<div class="mcard-inner">
<div class="mcard-header">
<div class="mname">${it.nome}</div>
<div class="mtotal">
<div class="label">Total</div>
<div class="value">${fmtMoney(total)}</div>
</div>
</div>
<div class="mmeta">Por: ${collabName(it)}</div>
<div class="mrow">
<div class="mrow-labels">
<div class="mfield-label">Preço (unit)</div>
<div class="mfield-label">Quantidade</div>
</div>
<div class="mrow-values">
<div class="mfield">
<div class="price-edit-wrapper editing-cell">
<span class="price-value" data-view>${fmtMoney(unit)}</span>
<button
  class="price-edit-btn"
  title="Editar preço"
  data-action="edit-cell"
  data-field="valor_unitario"
  data-id="${it.id}"
>✏️</button>
</div>
</div>
<div class="mfield">
<div class="qty-edit-wrapper">
<div class="qtynum-simple">${fmtQty(it)}</div>
<div class="qty-controls">
<button class="qtybtn-compact" title="Diminuir" data-action="qty-step" data-id="${it.id}" data-delta="-1">−</button>
<button class="qtybtn-compact" title="Aumentar" data-action="qty-step" data-id="${it.id}" data-delta="1">+</button>
</div>
</div>
</div>
<div class="mactions-inline">
<button class="icon-btn-action" data-action="edit" data-id="${it.id}" title="Editar">✏️</button>
<button class="icon-btn-action danger" data-action="delete" data-id="${it.id}" title="Excluir">✕</button>
<button
  class="icon-btn-action ${isBought ? "active" : ""}"
  data-action="toggle-status"
  data-id="${it.id}"
  data-next="${next}"
  title="Marcar como ${isBought ? "pendente" : "comprado"}"
>✔</button>
</div>
</div>
</div>
</div>
</div>
         `;
       })
       .join("")}
     ${summaryCard}
</div>
 `;
}
