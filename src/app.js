// src/app.js
import { sb } from "./config/supabase.js";
import { getTheme, setTheme, qs, qsa } from "./utils/ui.js";
import {
  num,
  formatQuantidade,
  formatCurrencyBRL,
  parseCurrencyBRL,
  bindCurrencyInputs,
} from "./utils/format.js";
import { addMonths, monthKey, periodName } from "./utils/period.js";

import { mountToast } from "./components/toast.js";
import { renderHeader } from "./components/header.js";
import { renderDashboard } from "./components/dashboard.js";
import { renderCollaboratorsSummary } from "./components/collaborators.js";
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
  filterCollaborator: "ALL",
  searchText: "",
  sortKey: "name_asc",

  charts: null,
  delegatedBound: false,
};

function saveCursor() {
  localStorage.setItem("cursorMonth", monthKey(state.cursorDate));
}

function normalizeItem(it) {
  return {
    ...it,
    quantidade: Number(it.quantidade || 0),
    valor_unitario: num(it.valor_unitario ?? 0),
  };
}

function getCollaboratorName(it) {
  const v =
    it?.criado_por_nome ??
    it?.criado_por ??
    it?.colaborador ??
    it?.usuario_nome ??
    "";

  const name = String(v).trim();
  return name || "—";
}

function normalizeNameKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, "") // remove "(g)", "(kg)", etc.
    .replace(/\b(kg|g|un|und|unidade|unidades)\b/g, "") // remove common units
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function totalOfItem(it) {
  const isChurrasco =
    String(it?.categoria || "").trim().toLowerCase() === "churrasco";
  if (isChurrasco) return num(it.valor_unitario || 0);
  return Number(it.quantidade || 0) * num(it.valor_unitario || 0);
}

function parseQuantidade(raw, categoria) {
  const txt = String(raw ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!txt) return null;

  const cat = String(categoria || "").trim().toLowerCase();
  const isChurrasco = cat === "churrasco";

  const match = isChurrasco
    ? txt.match(/^(\d+(?:[.,]\d+)?)(kg|g)?$/)
    : txt.match(/^(\d+(?:[.,]\d+)?)$/);

  if (!match) return null;

  let value = Number(match[1].replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return null;

  const unit = isChurrasco ? match[2] || "" : "";
  if (unit === "g") value = value / 1000;

  return { value, unit, isChurrasco };
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
    const nome = getCollaboratorName(it);
    const total = totalOfItem(it);
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

  return Array.from(map.values())
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

function applyFilters() {
  let arr = [...state.items];

  if (state.filterStatus !== "ALL") {
    arr = arr.filter((it) => it.status === state.filterStatus);
  }

  if (state.filterCollaborator !== "ALL") {
    arr = arr.filter(
      (it) => getCollaboratorName(it) === state.filterCollaborator,
    );
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

function rerenderListOnly() {
  const list = document.querySelector("#mobileLists");
  if (!list) return;
  const filtered = applyFilters();
  list.outerHTML = `
    <div id="mobileLists">
      ${renderItemMobileList(filtered, state.sortKey)}
    </div>
  `;
}

function rerenderTableOnly() {
  const tableBlock = document.querySelector("#desktopList");
  if (!tableBlock) return;
  const filtered = applyFilters();
  tableBlock.outerHTML = `
    <div id="desktopList">
      ${renderItemTable(filtered, state.sortKey)}
    </div>
  `;
}

async function saveMobileInlineEdit({ id, field, rawValue, item }) {
  const raw = String(rawValue ?? "").trim() || "0";

  const patch = {};
  if (field === "quantidade") {
    const qtdParsed = parseQuantidade(raw, item.categoria);
    if (!qtdParsed) {
      toast.show({
        title: "Validação",
        message:
          item.categoria === "Churrasco"
            ? "Quantidade inválida. Use ex: 1kg ou 0.5g."
            : "Quantidade inválida. Use apenas números (ex: 2 ou 2,5).",
      });
      return false;
    }
    patch.quantidade = qtdParsed.value;
  } else {
    patch.valor_unitario = parseCurrencyBRL(raw);
  }

  const updated = normalizeItem(await updateItem(id, patch));
  state.items = state.items.map((x) => (x.id === id ? updated : x));
  return true;
}

function renderNameGate() {
  root.innerHTML = `
    <div class="container">
      <div class="card section">
        <h1>Lista de Compras - Carnaval 2026</h1>
        <div class="muted" style="margin-top:6px">Aplicação pública. Informe seu nome para colaborar.</div>

        <div class="hr"></div>

        <form id="nameForm" class="grid" style="max-width:420px">
          <input class="input" name="nome" placeholder="Seu nome (ex: João)" required />
          <button class="btn primary" type="submit">Entrar</button>
        </form>

        <div class="muted" style="font-size:12px;margin-top:12px">
          O nome fica salvo apenas no seu navegador (localStorage).
        </div>
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
  const filtered = applyFilters();
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
          ${renderItemListControls(state, state.items)}
          <div id="desktopList">
            ${renderItemTable(filtered, state.sortKey)}
          </div>
          <div id="mobileLists">
            ${renderItemMobileList(filtered, state.sortKey)}
          </div>
        </div>
      </div>

      ${renderAnalytics()}

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

  if (!state.delegatedBound) {
    bindDelegatedEvents();
    state.delegatedBound = true;
  }

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

  // busca (sem travar)
  const s = qs("#searchInput");
  if (s) {
    s.addEventListener("input", () => {
      state.searchText = s.value;
      rerenderTableOnly();
      rerenderListOnly();
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
    const qtdInput = form.querySelector('input[name="quantidade"]');
    const categoriaSelect = form.querySelector('select[name="categoria"]');
    const tipoSelect = form.querySelector('select[name="tipo"]');

    const syncTipo = () => {
      if (!categoriaSelect || !tipoSelect) return;
      const isChurrasco = categoriaSelect.value === "Churrasco";
      tipoSelect.value = isChurrasco ? "PESO" : "UNIDADE";
      if (qtdInput) {
        qtdInput.placeholder = isChurrasco
          ? "Ex: 1kg ou 0.5g"
          : "Ex: 2 ou 2,5";
      }
    };

    if (categoriaSelect) {
      categoriaSelect.addEventListener("change", syncTipo);
      syncTipo();
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const fd = new FormData(form);
        const id = fd.get("id");

        const payload = {
          nome: String(fd.get("nome") || "").trim(),
          quantidade: 0,
          valor_unitario: parseCurrencyBRL(fd.get("valor_unitario") || ""),
          categoria: String(fd.get("categoria") || "Geral").trim() || "Geral",
          status: String(fd.get("status") || "PENDENTE"),
        };

        if (!payload.nome) {
          toast.show({
            title: "Validação",
            message: "Informe o nome do item.",
          });
          return;
        }

        const isChurrasco =
          String(payload.categoria || "").trim().toLowerCase() === "churrasco";
        if (!isChurrasco) {
          const key = normalizeNameKey(payload.nome);
          const exists = state.items.some((it) => {
            if (id && it.id === id) return false;
            const itIsChurrasco =
              String(it.categoria || "").trim().toLowerCase() === "churrasco";
            if (itIsChurrasco) return false;
            return normalizeNameKey(it.nome) === key;
          });

          if (exists) {
            toast.show({
              title: "Duplicado",
              message: "Esse item já existe na Lista de Compras.",
            });
            return;
          }
        }

        const qtdParsed = parseQuantidade(
          fd.get("quantidade"),
          payload.categoria,
        );
        if (!qtdParsed) {
          toast.show({
            title: "Validação",
            message:
              payload.categoria === "Churrasco"
                ? "Quantidade inválida. Use ex: 1kg ou 0.5g."
                : "Quantidade inválida. Use apenas números (ex: 2 ou 2,5).",
          });
          return;
        }
        payload.quantidade = qtdParsed.value;

        if (id) {
          const updated = normalizeItem(await updateItem(id, payload));
          state.items = state.items.map((x) => (x.id === id ? updated : x));
          toast.show({ title: "Salvo", message: "Item atualizado." });
        } else {
          const created = normalizeItem(
            await addItem({
              ...payload,
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

  // colaborador
  const collaboratorFilter = qs("#collaboratorFilter");
  if (collaboratorFilter) {
    collaboratorFilter.addEventListener("change", () => {
      state.filterCollaborator = collaboratorFilter.value;
      rerenderTableOnly();
      rerenderListOnly();
    });
  }

  bindCurrencyInputs(document);

  const backdrop = qs("#modalBackdrop");
  if (backdrop) {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal();
    });
  }
}

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
        return;
      }

      if (action === "edit") {
        const id = el.dataset.id;
        const it = state.items.find((x) => x.id === id);
        if (!it) return;

        openModal({
          title: "Editar item",
          subtitle: `Período: ${state.currentPeriod.nome}`,
          hint: `Criado por: ${getCollaboratorName(it)}`,
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

      // editar célula (lápis)
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
            ? formatQuantidade(it.quantidade ?? 0, it.categoria)
            : formatCurrencyBRL(num(it.valor_unitario || 0));

        cell.innerHTML = `
          <input
            class="input cell-input"
            type="text"
            inputmode="decimal"
            ${field === "valor_unitario" ? 'data-currency="brl"' : ""}
            placeholder="${field === "quantidade" ? "Ex: 1kg ou 0.5g" : "0,00"}"
            value="${currentValue}"
          />
        `;

        const inp = cell.querySelector("input");
        if (!inp) return;
        if (field === "valor_unitario") {
          bindCurrencyInputs(cell);
        }

        const commit = async () => {
          if (inp.dataset.saving === "1") return;
          inp.dataset.saving = "1";
          try {
            const ok = await saveMobileInlineEdit({
              id,
              field,
              rawValue: inp.value,
              item: it,
            });
            if (!ok) {
              rerenderTableOnly();
              return;
            }
            toast.show({ title: "Salvo", message: "Atualizado com sucesso." });
            rerenderTableOnly();
          } catch (err) {
            toast.show({
              title: "Erro",
              message: err.message || "Falha ao salvar.",
            });
            rerenderTableOnly();
          }
        };

        inp.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            inp.blur();
          }
        });
        inp.addEventListener("blur", () => {
          void commit();
        });

        inp.focus();
        inp.select();
        return;
      }

      if (action === "edit-mobile") {
        const id = el.dataset.id;
        const field = el.dataset.field;
        const it = state.items.find((x) => x.id === id);
        if (!it) return;

        const pill = el.closest(".pill");
        if (!pill) return;
        if (pill.querySelector("input")) return;

        const currentValue =
          field === "quantidade"
            ? formatQuantidade(it.quantidade ?? 0, it.categoria)
            : formatCurrencyBRL(num(it.valor_unitario || 0));

        const placeholder =
          field === "quantidade" ? "Ex: 1kg ou 0.5g" : "0,00";

        pill.innerHTML = `
          <input
            type="text"
            inputmode="decimal"
            ${field === "valor_unitario" ? 'data-currency="brl"' : ""}
            placeholder="${placeholder}"
            value="${currentValue}"
          />
        `;

        const input = pill.querySelector("input");
        if (!input) return;
        if (field === "valor_unitario") {
          bindCurrencyInputs(pill);
        }

        const commit = async () => {
          if (input.dataset.saving === "1") return;
          input.dataset.saving = "1";
          try {
            const ok = await saveMobileInlineEdit({
              id,
              field,
              rawValue: input.value,
              item: it,
            });
            if (!ok) {
              rerenderListOnly();
              rerenderTableOnly();
              return;
            }
            toast.show({ title: "Salvo", message: "Atualizado com sucesso." });
            rerenderListOnly();
            rerenderTableOnly();
          } catch (err) {
            toast.show({
              title: "Erro",
              message: err.message || "Falha ao salvar.",
            });
            rerenderListOnly();
            rerenderTableOnly();
          }
        };

        input.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            input.blur();
          }
        });
        input.addEventListener("blur", () => {
          void commit();
        });

        input.focus();
        input.select();
        return;
      }

      if (action === "cancel-cell") {
        renderApp();
        return;
      }

      if (action === "save-cell") {
        const id = el.dataset.id;
        const field = el.dataset.field;

        const cell = el.closest(".editing-cell");
        const inp = cell?.querySelector("input");
        const raw = String(inp?.value ?? "0");
        const it = state.items.find((x) => x.id === id);
        if (!it) return;

        const patch = {};
        if (field === "quantidade") {
          const qtdParsed = parseQuantidade(raw, it.categoria);
          if (!qtdParsed) {
            toast.show({
              title: "Validação",
              message:
                it.categoria === "Churrasco"
                  ? "Quantidade inválida. Use ex: 1kg ou 0.5g."
                  : "Quantidade inválida. Use apenas números (ex: 2 ou 2,5).",
            });
            return;
          }
          patch.quantidade = qtdParsed.value;
        } else {
          patch.valor_unitario = num(raw);
        }

        const updated = normalizeItem(await updateItem(id, patch));
        state.items = state.items.map((x) => (x.id === id ? updated : x));

        toast.show({ title: "Salvo", message: "Atualizado com sucesso." });
        renderApp();
        return;
      }

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
