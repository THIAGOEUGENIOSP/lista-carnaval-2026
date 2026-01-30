// src/app.js
import { sb } from "./config/supabase.js";
import { getTheme, setTheme, qs, qsa } from "./utils/ui.js";
import { num, findDuplicateItem } from "./utils/format.js";
import { addMonths, monthKey, periodName } from "./utils/period.js";
import { renderCollaboratorsSummary } from "./components/collaborators.js";


import { mountToast } from "./components/toast.js";
import { renderHeader } from "./components/header.js";
import { renderDashboard } from "./components/dashboard.js";
import {
  renderItemFormModal,
  openModal,
  closeModal,
} from "./components/itemForm.js";
import {
  renderItemListControls,
  renderItemTable,
  renderItemMobileList,
} from "./components/itemList.js";
import {
  renderAnalytics,
  buildCharts,
  updateCharts,
} from "./components/analytics.js";

import { ensurePeriod, listRecentPeriods } from "./services/periods.js";
import {
  fetchItems,
  addItem,
  updateItem,
  deleteItem,
  bulkZeroPrices,
  bulkDeleteByPeriod,
  copyItemsToPeriod,
} from "./services/items.js";

const root = document.getElementById("app");
const toast = mountToast(document.body);

const state = {
  theme: getTheme(),
  collaboratorName: localStorage.getItem("collaboratorName") || "",

  cursorDate: (() => {
    const saved = localStorage.getItem("cursorMonth");
    if (saved) {
      const [y, m] = saved.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  })(),

  currentPeriod: null,
  items: [],

  filterStatus: "ALL",
  searchText: "",
  sortKey: "name_asc",

  charts: null,
  delegatedBound: false,
};

function saveCursor() {
  localStorage.setItem("cursorMonth", monthKey(state.cursorDate));
}

function normalizeItem(it) {
  // Supabase pode retornar numeric como string -> normaliza aqui
  return {
    ...it,
    quantidade: Number(it.quantidade || 0),
    valor_unitario: num(it.valor_unitario ?? 0),
    unidade: String(it.unidade || "UN").toUpperCase(),
  };
}

function totalOfItem(it) {
  return Number(it.quantidade || 0) * num(it.valor_unitario || 0);
}

function computeKPIs(items) {
  const totalItems = items.length;
  const totalValue = items.reduce((a, it) => a + totalOfItem(it), 0);

  const pendingItems = items.filter((it) => it.status === "PENDENTE");
  const boughtItems = items.filter((it) => it.status === "COMPRADO");

  const pendingValue = pendingItems.reduce((a, it) => a + totalOfItem(it), 0);
  const boughtValue = boughtItems.reduce((a, it) => a + totalOfItem(it), 0);

  const progressPct =
    totalItems === 0 ? 0 : Math.round((boughtItems.length / totalItems) * 100);
  const avgItemTotal = totalItems === 0 ? 0 : totalValue / totalItems;

  return {
    totalItems,
    totalValue,
    pendingValue,
    boughtValue,
    progressPct,
    avgItemTotal,
  };
}

function computeByCollaborator(items) {
  const map = new Map();

  for (const it of items) {
    const nome = (it.criado_por_nome || "—").trim() || "—";
    const total = Number(it.quantidade || 0) * num(it.valor_unitario || 0);
    const bought = it.status === "COMPRADO";

    if (!map.has(nome)) {
      map.set(nome, {
        nome,
        itens_adicionados: 0,
        itens_comprados: 0,
        gasto_comprado: 0,
      });
    }

    const row = map.get(nome);
    row.itens_adicionados += 1;
    if (bought) {
      row.itens_comprados += 1;
      row.gasto_comprado += total;
    }
  }

  return [...map.values()]
    .map((r) => ({ ...r, gasto_comprado: Number(r.gasto_comprado.toFixed(2)) }))
    .sort((a, b) => b.gasto_comprado - a.gasto_comprado);
}


function computePriceBuckets(items) {
  const buckets = { at10: 0, between10and50: 0, above50: 0 };
  for (const it of items) {
    const v = num(it.valor_unitario || 0);
    if (v <= 10) buckets.at10++;
    else if (v <= 50) buckets.between10and50++;
    else buckets.above50++;
  }
  return buckets;
}

function computeStatusCounts(items) {
  const pending = items.filter((i) => i.status === "PENDENTE").length;
  const bought = items.filter((i) => i.status === "COMPRADO").length;
  return { pending, bought };
}

function applyFilters(items = state.items) {
  let arr = [...items];

  if (state.filterStatus !== "ALL") {
    arr = arr.filter((it) => it.status === state.filterStatus);
  }

  const q = (state.searchText || "").trim().toLowerCase();
  if (q) {
    arr = arr.filter((it) => (it.nome || "").toLowerCase().includes(q));
  }

  switch (state.sortKey) {
    case "name_asc":
      arr.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
      break;
    case "value_desc":
      arr.sort((a, b) => totalOfItem(b) - totalOfItem(a));
      break;
    case "value_asc":
      arr.sort((a, b) => totalOfItem(a) - totalOfItem(b));
      break;
    case "created_desc":
    default:
      arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
  }

  return arr;
}

function rerenderTableOnly() {
  renderApp();
}


function renderNameGate() {
  root.innerHTML = `
    <div class="container">
      <div class="card section">
        <h1>Lista de Compras - Carnaval 2026</h1>
        <div class="muted" style="margin-top:6px">Informe seu nome para colaborar.</div>

        <div class="hr"></div>

        <form id="nameForm" class="grid" style="max-width:420px">
          <input class="input" name="nome" placeholder="Seu nome (ex: João)" required />
          <button class="btn primary" type="submit">Entrar</button>
        </form>
      </div>
    </div>
  `;

  const form = qs("#nameForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const nome = String(fd.get("nome") || "").trim();
    if (!nome) return;

    state.collaboratorName = nome;
    localStorage.setItem("collaboratorName", nome);

    await loadDataForPeriod();
    renderApp();
  });
}

async function loadDataForPeriod() {
  state.currentPeriod = await ensurePeriod(state.cursorDate);
  const raw = await fetchItems(state.currentPeriod.id);
  state.items = (raw || []).map(normalizeItem);
}

async function computeMonthlySeries() {
  const periods = await listRecentPeriods(12);
  const sorted = [...periods].sort(
    (a, b) => new Date(a.data_inicio) - new Date(b.data_inicio),
  );
  const last = sorted.slice(-6);
  const ids = last.map((p) => p.id);

  const res = await sb
    .from("items")
    .select("periodo_id,quantidade,valor_unitario")
    .in("periodo_id", ids);
  if (res.error) throw res.error;

  const items = (res.data || []).map(normalizeItem);
  const map = new Map(ids.map((id) => [id, 0]));

  for (const it of items) {
    map.set(it.periodo_id, (map.get(it.periodo_id) || 0) + totalOfItem(it));
  }

  return {
    labels: last.map((p) => p.nome),
    values: last.map((p) => Number((map.get(p.id) || 0).toFixed(2))),
  };
}

function renderApp() {
  const periodLabel = state.currentPeriod?.nome || periodName(state.cursorDate);
  const userName = state.collaboratorName || "—";
  const itemsMain = state.items.filter((it) => (it.categoria || "Geral") !== "Churrasco");
  const itemsChurrasco = state.items.filter((it) => (it.categoria || "Geral") === "Churrasco");
  const filteredMain = applyFilters(itemsMain);
  const filteredChurrasco = applyFilters(itemsChurrasco);
  const kpis = computeKPIs(state.items);
  const byCollab = computeByCollaborator(state.items);


  root.innerHTML = `
    <div class="container">
      ${renderHeader({ periodLabel, userName, theme: state.theme })}

      <div style="margin-top:12px">
  ${renderDashboard(kpis)}
  ${renderCollaboratorsSummary(byCollab)}
</div>


      <div class="grid main" style="margin-top:12px">
        <div>
           ${renderItemListControls(state)}
          ${renderItemTable(filteredMain, { title: "Lista de Compras", summaryMode: "UN_WITH_KG" })}
          ${renderItemMobileList(filteredMain, { summaryMode: "UN_WITH_KG" })}
          ${filteredChurrasco.length ? `<div class="card section only-mobile" style="margin-top:12px"><div class="row space-between"><h2>Churrasco</h2><div class="muted" style="font-size:12px">${filteredChurrasco.length} item(ns)</div></div></div>` : ""}
          ${renderItemTable(filteredChurrasco, { title: "Churrasco", summaryMode: "KG_ONLY" })}
          ${renderItemMobileList(filteredChurrasco, { summaryMode: "KG_ONLY" })}
        </div>
        <div>
          ${renderAnalytics()}
        </div>
      </div>

      ${renderItemFormModal()}
    </div>
  `;

 
  // Troca "Sair" por "Trocar nome"
  const logoutBtn = qs('[data-action="logout"]');
  if (logoutBtn) {
    logoutBtn.textContent = "Trocar nome";
    logoutBtn.dataset.action = "change-name";
  }

  // Charts
  if (!state.charts) {
    state.charts = buildCharts();
  } else {
    try {
      state.charts.priceChart.destroy();
      state.charts.monthlyChart.destroy();
      state.charts.statusChart.destroy();
    } catch {}
    state.charts = buildCharts();
  }

  // Se os gráficos foram criados com sucesso
  if (state.charts) {
    (async () => {
      try {
        const priceBuckets = computePriceBuckets(state.items);
        const statusCounts = computeStatusCounts(state.items);
        const monthlySeries = await computeMonthlySeries();
        updateCharts({
          charts: state.charts,
          priceBuckets,
          monthlySeries,
          statusCounts,
        });
      } catch (err) {
        toast.show({
          title: "Charts",
          message: err.message || "Falha ao montar gráficos",
        });
      }
    })();
  }

  // Delegation só precisa ser ligado 1 vez
  if (!state.delegatedBound) {
    bindDelegatedEvents();
    state.delegatedBound = true;
  }

  // Inputs (busca e sort) precisam listener por render
  bindPerRenderInputs();
}

function bindPerRenderInputs() {
  // filtros
  qsa("[data-filter]").forEach((b) => {
    b.addEventListener("click", () => {
      state.filterStatus = b.dataset.filter;
      renderApp();
    });
  });

  // busca
  const s = qs("#searchInput");
  if (s) {
    s.addEventListener("input", () => {
      state.searchText = s.value;
      renderApp();
    });
  }

  // sort
  const sort = qs("#sortSelect");
  if (sort) {
    sort.addEventListener("change", () => {
      state.sortKey = sort.value;
      renderApp();
    });
  }

  // submit modal form
  const form = qs("#itemForm");
  if (form) {
    const unitSelect = form.querySelector('select[name="unidade"]');
    const qtyInput = form.querySelector('input[name="quantidade"]');
    const applyQtyMode = () => {
      if (!unitSelect || !qtyInput) return;
      const isKg = unitSelect.value === "KG";
      qtyInput.step = isKg ? "0.1" : "1";
      qtyInput.inputMode = isKg ? "decimal" : "numeric";
      qtyInput.placeholder = isKg ? "0,0" : "1";
    };
    if (unitSelect && qtyInput) {
      unitSelect.addEventListener("change", applyQtyMode);
      applyQtyMode();
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const fd = new FormData(form);
        const id = fd.get("id");
        const unidade = String(fd.get("unidade") || "UN").toUpperCase();
        const rawQtd = String(fd.get("quantidade") || "0");

        // 🔥 IMPORTANTe: valor_unitario com vírgula funciona porque parseamos com num()
        const payload = {
          nome: String(fd.get("nome") || "").trim(),
          quantidade: Math.max(
            0,
            unidade === "KG"
              ? num(rawQtd)
              : parseInt(rawQtd, 10) || 0,
          ),
          valor_unitario: num(fd.get("valor_unitario") || 0),
          categoria: String(fd.get("categoria") || "Geral").trim() || "Geral",
          unidade,
        };

        if (!payload.nome) {
          toast.show({
            title: "Validação",
            message: "Informe o nome do item.",
          });
          return;
        }

        if (id) {
          const updated = normalizeItem(await updateItem(id, payload));
          state.items = state.items.map((x) => (x.id === id ? updated : x));
          toast.show({ title: "Salvo", message: "Item atualizado." });
        } else {
          // Verifica se existe item duplicado (mesmo nome ignorando acentos e plurais)
          if (payload.categoria !== "Churrasco") {
            const duplicate = findDuplicateItem(payload.nome, state.items);
            if (duplicate) {
              toast.show({
                title: "Item Duplicado",
                message: `"${duplicate.nome}" já existe na lista. Deseja aumentar a quantidade?`,
              });
              return;
            }
          }

          const created = normalizeItem(
            await addItem({
              ...payload,
              status: "PENDENTE",
              periodo_id: state.currentPeriod.id,
              criado_por_nome: state.collaboratorName || "Colaborador",
            }),
          );
          state.items = [created, ...state.items];
          toast.show({ title: "Adicionado", message: "Item criado." });
        }

        closeModal();
        renderApp();
      } catch (err) {
        toast.show({
          title: "Erro",
          message: err.message || "Falha ao salvar item.",
        });
      }
    });
  }

  // clicar fora do modal fecha
  const backdrop = qs("#modalBackdrop");
  if (backdrop) {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal();
    });
  }
}

// ✅ EVENT DELEGATION: pega cliques inclusive de botões criados dinamicamente (Salvar/Cancelar)
function bindDelegatedEvents() {
  root.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;

    const action = el.dataset.action;

    try {
      if (action === "change-name") {
        localStorage.removeItem("collaboratorName");
        state.collaboratorName = "";
        state.charts = null;
        renderNameGate();
        return;
      }

      if (action === "qty-step") {
        const id = el.dataset.id;
        const it = state.items.find((x) => x.id === id);
        if (!it) return;
        const step = it.unidade === "KG" ? 0.1 : 1;
        const delta = Number(el.dataset.delta || "0") * step;
        const nextQtd = Math.max(
          0,
          Number((Number(it.quantidade || 0) + delta).toFixed(2)),
        );
        const updated = normalizeItem(
          await updateItem(id, { quantidade: nextQtd }),
        );
        state.items = state.items.map((x) => (x.id === id ? updated : x));
        renderApp();
        return;
       }

      if (action === "toggle-theme") {
        state.theme = state.theme === "dark" ? "light" : "dark";
        setTheme(state.theme);
        renderApp();
        return;
      }

      if (action === "prev-month") {
        state.cursorDate = addMonths(state.cursorDate, -1);
        saveCursor();
        await loadDataForPeriod();
        renderApp();
        return;
      }

      if (action === "next-month") {
        state.cursorDate = addMonths(state.cursorDate, +1);
        saveCursor();
        await loadDataForPeriod();
        renderApp();
        return;
      }

      if (action === "open-add") {
        openModal({
          title: "Adicionar item",
          subtitle: `Período: ${state.currentPeriod.nome}`,
          hint: `Colaborador: ${state.collaboratorName}`,
          data: null,
        });

        // 💡 se você quiser aceitar vírgula no modal, troque no itemForm.js o input de valor_unitario pra text (te passo se quiser)
        return;
      }

      if (action === "edit") {
        const id = el.dataset.id;
        const it = state.items.find((x) => x.id === id);
        if (!it) return;

        openModal({
          title: "Editar item",
          subtitle: `Período: ${state.currentPeriod.nome}`,
          hint: `Criado por: ${it.criado_por_nome || "—"}`,
          data: it,
        });
        return;
      }

      if (action === "delete") {
        const id = el.dataset.id;
        if (!confirm("Excluir este item?")) return;

        await deleteItem(id);
        state.items = state.items.filter((x) => x.id !== id);
        toast.show({ title: "Excluído", message: "Item removido." });
        renderApp();
        return;
      }

      if (action === "toggle-status") {
        const id = el.dataset.id;
        const next = el.dataset.next;

        const updated = normalizeItem(await updateItem(id, { status: next }));
        state.items = state.items.map((x) => (x.id === id ? updated : x));
        renderApp();
        return;
      }

      // ====== EDITAR CÉLULA (LÁPIS) ======
      if (action === "edit-cell") {
        const id = el.dataset.id;
        const field = el.dataset.field; // quantidade | valor_unitario
        const it = state.items.find((x) => x.id === id);
        if (!it) return;

        const cell = el.closest(".editing-cell");
        if (!cell) return;
        if (cell.querySelector("input")) return;

        const currentValue =
          field === "quantidade"
            ? Number(it.quantidade || 0)
            : num(it.valor_unitario || 0);
        const isKg = field === "quantidade" && it.unidade === "KG";

        // 🔥 usando type="text" + inputmode="decimal" para aceitar vírgula
        cell.innerHTML = `
          <input
            class="input cell-input"
            type="text"
            inputmode="decimal"
            placeholder="${
              field === "quantidade" ? (isKg ? "0,0" : "0") : "0,00"
            }"
            value="${currentValue}"
          />
          <div class="cell-actions">
            <button class="btn small primary" data-action="save-cell" data-id="${id}" data-field="${field}">Salvar</button>
            <button class="btn small" data-action="cancel-cell">Cancelar</button>
          </div>
        `;

        const inp = cell.querySelector("input");
        inp.focus();
        inp.select();
        return;
      }

      if (action === "cancel-cell") {
        renderApp();
        return;
      }

      if (action === "save-cell") {
        const id = el.dataset.id;
        const field = el.dataset.field;
        const it = state.items.find((x) => x.id === id);

        const cell = el.closest(".editing-cell");
        const inp = cell?.querySelector("input");
        const raw = String(inp?.value ?? "0");

        const patch = {};
        if (field === "quantidade") {
          const isKg = (it?.unidade || "UN") === "KG";
          patch.quantidade = Math.max(
            0,
            isKg
              ? num(raw)
              : parseInt(raw.replace(/[^\d]/g, ""), 10) || 0,
          );
        } else {
          patch.valor_unitario = num(raw);
        }

        const updated = normalizeItem(await updateItem(id, patch));
        state.items = state.items.map((x) => (x.id === id ? updated : x));

        toast.show({ title: "Salvo", message: "Atualizado com sucesso." });
        renderApp();
        return;
      }
      // ================================

      if (action === "zero-prices") {
        if (!confirm(`Zerar preços de ${state.currentPeriod.nome}?`)) return;

        await bulkZeroPrices(state.currentPeriod.id);
        state.items = state.items.map((it) =>
          normalizeItem({ ...it, valor_unitario: 0 }),
        );
        toast.show({ title: "Ok", message: "Preços zerados no mês." });
        renderApp();
        return;
      }

      if (action === "delete-month") {
        if (!confirm(`Apagar TODOS os itens de ${state.currentPeriod.nome}?`))
          return;

        await bulkDeleteByPeriod(state.currentPeriod.id);
        state.items = [];
        toast.show({ title: "Ok", message: "Lista do mês apagada." });
        renderApp();
        return;
      }

      if (action === "copy-next") {
        const nextDate = addMonths(state.cursorDate, +1);
        const nextPeriod = await ensurePeriod(nextDate);

        const qtd = await copyItemsToPeriod({
          fromPeriodId: state.currentPeriod.id,
          toPeriodId: nextPeriod.id,
          createdByName: state.collaboratorName,
        });

        toast.show({
          title: "Copiado",
          message: `${qtd} item(ns) copiado(s) para ${nextPeriod.nome}.`,
        });
        return;
      }

      if (action === "close-modal") {
        closeModal();
        return;
      }
    } catch (err) {
      toast.show({ title: "Erro", message: err.message || "Algo deu errado." });
    }
  });
}

async function boot() {
  setTheme(state.theme);

  if (!state.collaboratorName) {
    renderNameGate();
    return;
  }

  await loadDataForPeriod();
  renderApp();
}

boot().catch((err) => {
  root.innerHTML = `<div class="container"><div class="card section">
    <h1>Erro ao iniciar</h1><div class="muted" style="margin-top:8px">${err.message || err}</div>
  </div></div>`;
});
