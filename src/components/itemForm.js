import { formatQuantidade } from "../utils/format.js";

export function renderItemFormModal() {
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
            <option value="Geral">Geral</option>
            <option value="Churrasco">Churrasco</option>
          </select>
        </div>

        <div>
          <label class="muted" style="font-size:12px">Valor unitário (R$)</label>
          <input class="input" name="valor_unitario" type="number" min="0" step="0.01" value="0" required />
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
  form.reset();

  if (data) {
    form.nome.value = data.nome ?? "";
    form.quantidade.value = formatQuantidade(
      data.quantidade ?? 1,
      data.categoria,
    );
    form.valor_unitario.value = data.valor_unitario ?? 0;

    ensureOption(form.categoria, data.categoria);
    form.categoria.value = data.categoria ?? "Geral";
    form.tipo.value = data.categoria === "Churrasco" ? "PESO" : "UNIDADE";

    form.id.value = data.id ?? "";
  } else {
    form.categoria.value = "Geral";
    form.tipo.value = "UNIDADE";
    form.id.value = "";
    form.quantidade.value = "";
  }

  const isChurrasco = form.categoria.value === "Churrasco";
  form.quantidade.placeholder = isChurrasco
    ? "Ex: 1kg ou 0.5g"
    : "Ex: 2 ou 2,5";

  form.nome.focus();
}

export function closeModal() {
  const backdrop = document.getElementById("modalBackdrop");
  backdrop.style.display = "none";
}
