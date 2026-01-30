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
          <input class="input" name="quantidade" type="number" min="0" step="1" value="1" required />
        </div>

        <div>
          <label class="muted" style="font-size:12px">Tipo</label>
          <select name="unidade">
            <option value="UN" selected>Unidade</option>
            <option value="KG">Kg</option>
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
    form.quantidade.value = data.quantidade ?? 1;
    form.valor_unitario.value = data.valor_unitario ?? 0;
    form.unidade.value = (data.unidade || "UN").toUpperCase();
    form.id.value = data.id ?? "";
  } else {
    form.id.value = "";
    if (form.unidade) form.unidade.value = "UN";
  }
  if (form.unidade) {
    form.unidade.dispatchEvent(new Event("change", { bubbles: true }));
  }

  form.nome.focus();
}

export function closeModal() {
  const backdrop = document.getElementById("modalBackdrop");
  backdrop.style.display = "none";
}
