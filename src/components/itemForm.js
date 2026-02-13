import { formatQuantidade, formatCurrencyBRL } from "../utils/format.js";
import { getShoppingCategories } from "../utils/categories.js";

export function renderItemFormModal() {
  const shoppingCategories = getShoppingCategories();
  const generalOptions = shoppingCategories
    .map((cat) => `<option value="${cat}">${cat}</option>`)
    .join("");

  return `
  <div class="modal-backdrop" id="modalBackdrop">
    <div class="card modal">
      <div class="row space-between">
        <div>
          <h2 id="modalTitle">Adicionar item</h2>
          <div class="muted" style="font-size:12px;margin-top:4px" id="modalSubtitle">Informe os dados do item</div>
        </div>
        <button class="btn small" data-action="close-modal">✕</button>
      </div>

      <div class="hr"></div>

      <form id="itemForm" class="grid">
        <div class="full">
          <label class="muted" style="font-size:12px">Item</label>
          <input class="input" name="nome" placeholder="Ex: Cerveja, Carne, Refrigerante..." required />
        </div>

        <div>
          <label class="muted" style="font-size:12px">Quantidade</label>
          <input
            class="input"
            name="quantidade"
            type="text"
            inputmode="decimal"
            placeholder="Ex: 2 ou 1kg, 500g"
            required
          />
        </div>

        <div>
          <label class="muted" style="font-size:12px">Tipo</label>
          <select name="tipo">
            <option value="UNIDADE">Unidade</option>
            <option value="PESO">Peso (kg/g)</option>
          </select>
        </div>

        <div>
          <label class="muted" style="font-size:12px">Categoria</label>
          <select name="categoria">
            ${generalOptions}
            <option value="Churrasco">Churrasco</option>
          </select>
          <div class="muted" style="font-size:11px;margin-top:6px" id="categoryAssist"></div>
        </div>

        <div>
          <label class="muted" style="font-size:12px">Valor unitário (R$)</label>
          <input
            class="input"
            name="valor_unitario"
            type="text"
            inputmode="decimal"
            data-currency="brl"
            value="${formatCurrencyBRL(0)}"
            required
          />
        </div>

        <div class="full">
          <label class="muted" style="font-size:12px">Status</label>
          <select name="status">
            <option value="PENDENTE" selected>Pendente</option>
            <option value="COMPRADO">Comprado</option>
          </select>
        </div>

        <div class="full row space-between" style="margin-top:8px">
          <div class="muted" style="font-size:12px" id="modalHint"></div>
          <div class="row">
            <button type="button" class="btn" data-action="close-modal">Cancelar</button>
            <button type="submit" class="btn primary" id="submitBtn">Salvar</button>
          </div>
        </div>

        <input type="hidden" name="id" />
      </form>
    </div>
  </div>
  `;
}

function ensureOption(selectEl, value) {
  if (!value || !selectEl) return;
  const exists = Array.from(selectEl.options).some((o) => o.value === value);
  if (exists) return;

  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = value;
  selectEl.appendChild(opt);
}

export function openModal({ title, subtitle, hint, data }) {
  const backdrop = document.getElementById("modalBackdrop");
  backdrop.style.display = "flex";
  document.getElementById("modalTitle").textContent = title || "Adicionar item";
  document.getElementById("modalSubtitle").textContent =
    subtitle || "Informe os dados do item";
  document.getElementById("modalHint").textContent = hint || "";

  const form = document.getElementById("itemForm");
  const categoryAssist = document.getElementById("categoryAssist");
  form.reset();
  if (categoryAssist) categoryAssist.textContent = "";

  if (data) {
    form.nome.value = data.nome ?? "";
    form.quantidade.value = formatQuantidade(
      data.quantidade ?? 1,
      data.categoria,
    );
    form.valor_unitario.value = formatCurrencyBRL(data.valor_unitario ?? 0);

    ensureOption(form.categoria, data.categoria);
    form.categoria.value = data.categoria ?? "Geral";
    form.tipo.value = data.categoria === "Churrasco" ? "PESO" : "UNIDADE";

    form.id.value = data.id ?? "";
  } else {
    form.categoria.value = "Geral";
    form.tipo.value = "UNIDADE";
    form.id.value = "";
    form.quantidade.value = "";
    form.valor_unitario.value = formatCurrencyBRL(0);
  }

  const isChurrasco = form.categoria.value === "Churrasco";
  form.quantidade.placeholder = isChurrasco
    ? "Ex: 1kg ou 0.5g"
    : "Ex: 2 ou 2,5";

  form.status.value = data?.status ?? "PENDENTE";

  form.nome.focus();
}

export function closeModal() {
  const backdrop = document.getElementById("modalBackdrop");
  backdrop.style.display = "none";
}
