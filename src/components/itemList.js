// src/components/itemList.js
import { brl, formatQuantidade } from "../utils/format.js";
import {
  groupShoppingItemsByCategory,
  getCategoryMeta,
  normalizeShoppingCategory,
  toCategoryAnchor,
} from "../utils/categories.js";

function collabName(it) {
  return (
    it?.criado_por_nome ||
    it?.criado_por ||
    it?.colaborador ||
    it?.usuario_nome ||
    "—"
  );
}

function isChurrasco(it) {
  return String(it?.categoria || "").trim().toLowerCase() === "churrasco";
}

function sortItems(items, sortKey) {
  const arr = [...items];
  switch (sortKey) {
    case "name_asc":
      arr.sort((a, b) =>
        (a.nome || "").localeCompare(b.nome || "", "pt-BR", {
          sensitivity: "base",
        }),
      );
      break;
    case "value_desc":
      arr.sort(
        (a, b) =>
          Number(b.quantidade || 0) * Number(b.valor_unitario || 0) -
          Number(a.quantidade || 0) * Number(a.valor_unitario || 0),
      );
      break;
    case "value_asc":
      arr.sort(
        (a, b) =>
          Number(a.quantidade || 0) * Number(a.valor_unitario || 0) -
          Number(b.quantidade || 0) * Number(b.valor_unitario || 0),
      );
      break;
    case "created_desc":
    default:
      arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
  }
  return arr;
}

function sumTotals(items) {
  return items.reduce(
    (acc, it) => {
      acc.qtd += Number(it.quantidade || 0);
      const total = isChurrasco(it)
        ? Number(it.valor_unitario || 0)
        : Number(it.quantidade || 0) * Number(it.valor_unitario || 0);
      acc.total += total;
      return acc;
    },
    { qtd: 0, total: 0 },
  );
}

function renderSummaryRow(items, forChurrasco) {
  const { qtd, total } = sumTotals(items);
  const qtdLabel = forChurrasco
    ? formatQuantidade(qtd, "Churrasco")
    : `${qtd.toLocaleString("pt-BR")} un`;

  return `
    <tr class="row-summary">
      <td><b>Resumo</b></td>
      <td><b>${qtdLabel}</b></td>
      <td>—</td>
      <td><b>${brl(total)}</b></td>
      <td>—</td>
      <td>—</td>
      <td>—</td>
    </tr>
  `;
}

function renderTableBlock({
  title,
  items,
  categoryClass = "",
  categoryIcon = "",
  categoryAnchor = "",
  forChurrasco = false,
}) {
  return `
  <div
    class="card section only-desktop category-block category-pill-head ${categoryClass}"
    data-category-anchor="${categoryAnchor}"
    style="margin-top:12px"
  >
    <div class="category-head">
      <div class="category-title-wrap">
        <span class="cat-dot">${categoryIcon}</span>
        <h2 class="cat-title">${title}</h2>
      </div>
      <div class="cat-count">${items.length} item(ns)</div>
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
              const total = isChurrasco(it)
                ? Number(it.valor_unitario || 0)
                : Number(it.quantidade || 0) * Number(it.valor_unitario || 0);
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

              const qtdDisplay = isChurrasco(it)
                ? formatQuantidade(it.quantidade, it.categoria)
                : it.quantidade;

              return `
              <tr class="${isBought ? "row-bought" : "row-pending"}">
                <td class="item-cell">
                  <div class="item-name">${it.nome}</div>
                </td>

                <td style="min-width:140px">
                  <div class="editing-cell">
                    <span
                      data-view
                      role="button"
                      data-action="edit-cell"
                      data-field="quantidade"
                      data-id="${it.id}"
                    >${qtdDisplay}</span>
                  </div>
                </td>

                <td style="min-width:180px">
                  <div class="editing-cell">
                    <span
                      data-view
                      role="button"
                      data-action="edit-cell"
                      data-field="valor_unitario"
                      data-id="${it.id}"
                    >${brl(it.valor_unitario)}</span>
                  </div>
                </td>

                <td><b>${brl(total)}</b></td>
                <td class="status-cell">${statusBadge}</td>
                <td class="collab-name-cell"><span class="collab-name">${collabName(it)}</span></td>

                <td>
                  <div class="row actions-row" style="gap:6px">
                    <button class="btn small" data-action="edit" data-id="${it.id}">Editar</button>
                    <button class="btn small danger" data-action="delete" data-id="${it.id}">Excluir</button>
                  </div>
                </td>
              </tr>
            `;
            })
            .join("")}
          ${renderSummaryRow(items, forChurrasco)}
        </tbody>
      </table>
    </div>
  </div>
  `;
}

function buildShortcutCategories(items) {
  const grouped = groupShoppingItemsByCategory(items.filter((it) => !isChurrasco(it)));
  const list = grouped.map((g) => normalizeShoppingCategory(g.category));
  if (items.some(isChurrasco)) list.push("Churrasco");
  return list;
}

export function renderItemListControls(state, items = []) {
  const collaborators = Array.from(
    new Set(items.map((it) => collabName(it)).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

  if (
    state.filterCollaborator !== "ALL" &&
    !collaborators.includes(state.filterCollaborator)
  ) {
    collaborators.unshift(state.filterCollaborator);
  }

  const collaboratorOptions = collaborators
    .map(
      (name) =>
        `<option value="${name}" ${state.filterCollaborator === name ? "selected" : ""}>${name}</option>`,
    )
    .join("");

  const categoriesPresent = buildShortcutCategories(items);
  const shortcutButtons = categoriesPresent
    .map((category) => {
      const meta = getCategoryMeta(category);
      const anchor = toCategoryAnchor(category);
      return `
        <button
          class="btn small category-shortcut ${meta.className}"
          data-action="scroll-category"
          data-category="${anchor}"
          title="${category}"
        >
          <span class="cat-dot">${meta.icon}</span>
          <span class="cat-shortcut-label">${category}</span>
        </button>
      `;
    })
    .join("");

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
        <select id="collaboratorFilter">
          <option value="ALL" ${state.filterCollaborator === "ALL" ? "selected" : ""}>Todos usuários</option>
          ${collaboratorOptions}
        </select>

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
    <div class="row category-shortcuts">
      ${shortcutButtons}
    </div>
  </div>
  `;
}

export function renderItemTable(items, sortKey) {
  const churrasco = sortItems(items.filter(isChurrasco), sortKey);
  const others = items.filter((it) => !isChurrasco(it));
  const grouped = groupShoppingItemsByCategory(others).map((g) => ({
    ...g,
    items: sortItems(g.items, sortKey),
  }));

  return `
    ${grouped
      .map((g) =>
        renderTableBlock({
          title: `Lista de Compras • ${g.category}`,
          items: g.items,
          categoryClass: getCategoryMeta(g.category).className,
          categoryIcon: getCategoryMeta(g.category).icon,
          categoryAnchor: toCategoryAnchor(g.category),
        }),
      )
      .join("")}
    ${renderTableBlock({
      title: "Churrasco",
      items: churrasco,
      categoryIcon: "🔥",
      categoryClass: "cat-churrasco",
      categoryAnchor: toCategoryAnchor("Churrasco"),
      forChurrasco: true,
    })}
  `;
}

export function renderItemMobileList(items, sortKey) {
  const churrasco = sortItems(items.filter(isChurrasco), sortKey);
  const others = items.filter((it) => !isChurrasco(it));
  const grouped = groupShoppingItemsByCategory(others).map((g) => ({
    ...g,
    items: sortItems(g.items, sortKey),
  }));

  const renderMobileBlock = (
    title,
    blockItems,
    categoryClass = "",
    categoryIcon = "",
    categoryAnchor = "",
  ) => {
    const { qtd, total } = sumTotals(blockItems);
    const isShoppingListCategory = categoryAnchor !== toCategoryAnchor("Churrasco");
    const qtdLabel = isShoppingListCategory
      ? `${qtd.toLocaleString("pt-BR")} un`
      : formatQuantidade(qtd, "Churrasco");

    const header = `
      <div
        class="card section only-mobile category-block category-pill-head ${categoryClass}"
        data-category-anchor="${categoryAnchor}"
        style="margin-top:12px"
      >
        <div class="category-head">
          <div class="category-title-wrap">
            <span class="cat-dot">${categoryIcon}</span>
            <h2 class="cat-title">${title}</h2>
          </div>
          <div class="category-head-sub">
            <div class="cat-count">${blockItems.length} item(ns)</div>
            <button class="btn small category-top-btn" data-action="scroll-top">Início</button>
          </div>
        </div>
      </div>
    `;

    return `
      ${header}
      <div class="mobile-list ${categoryClass}" aria-label="Lista mobile ${title}">
        ${blockItems
          .map((it) => {
            const totalItem = isChurrasco(it)
              ? Number(it.valor_unitario || 0)
              : Number(it.quantidade || 0) * Number(it.valor_unitario || 0);
            const isBought = it.status === "COMPRADO";
            const next = isBought ? "PENDENTE" : "COMPRADO";
            const qtdDisplay = isChurrasco(it)
              ? formatQuantidade(it.quantidade, it.categoria)
              : `${Number(it.quantidade || 0).toLocaleString("pt-BR")} un`;

            return `
            <div class="mcard ${isBought ? "row-bought" : "row-pending"}">
              <div class="mcard-inner">
                <div class="mcard-header">
                  <div class="mname">${it.nome}</div>
                  <div class="mtotal">
                    <div class="label">Total</div>
                    <div class="value">${brl(totalItem)}</div>
                    <div class="mstatus ${isBought ? "bought" : "pending"}">
                      ${isBought ? "Comprado" : "Pendente"}
                    </div>
                  </div>
                </div>

                <div class="mmeta">
                  <span>Por: <b>${collabName(it)}</b></span>
                </div>

                <div class="mrow">
                  <div class="mrow-labels">
                    <div class="mfield-label">Preço (unit)</div>
                    <div class="mfield-label">Quantidade</div>
                    <div class="mfield-label mfield-actions-label">Ações</div>
                  </div>
                  <div class="mrow-values">
                    <div class="pill" role="button" data-action="edit-mobile" data-field="valor_unitario" data-id="${it.id}">
                      <div class="pvalue">${brl(it.valor_unitario)}</div>
                    </div>
                    <div class="pill qtybox" role="button" data-action="edit-mobile" data-field="quantidade" data-id="${it.id}">
                      <div class="pvalue">${qtdDisplay}</div>
                    </div>
                    <div class="mactions-inline">
                      <button class="icon-btn-action ${isBought ? "active" : ""}" title="Marcar" data-action="toggle-status" data-id="${it.id}" data-next="${next}">
                        ${isBought ? "↩️" : "✔️"}
                      </button>
                      <button class="icon-btn-action" title="Editar" data-action="edit" data-id="${it.id}">✏️</button>
                      <button class="icon-btn-action danger" title="Excluir" data-action="delete" data-id="${it.id}">🗑️</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `;
          })
          .join("")}

        <div class="mcard summary">
          <div class="mcard-inner">
            <div class="mcard-header">
              <div class="mname">Resumo</div>
              <div class="mtotal">
                <div class="label">Total</div>
                <div class="value">${brl(total)}</div>
              </div>
            </div>
            <div class="mmeta">
              <span>Qtd: <b>${qtdLabel}</b></span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  return `
    ${grouped
      .map((g) =>
        renderMobileBlock(
          `Lista de Compras • ${g.category}`,
          g.items,
          getCategoryMeta(g.category).className,
          getCategoryMeta(g.category).icon,
          toCategoryAnchor(g.category),
        ),
      )
      .join("")}
    ${renderMobileBlock(
      "Churrasco",
      churrasco,
      "cat-churrasco",
      "🔥",
      toCategoryAnchor("Churrasco"),
    )}
  `;
}
