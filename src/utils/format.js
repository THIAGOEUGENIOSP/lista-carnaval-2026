export function brl(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function num(v) {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function formatCurrencyBRL(value) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseCurrencyBRL(raw) {
  const txt = String(raw ?? "").trim();
  if (!txt) return 0;
  const digits = txt.replace(/\D/g, "");
  if (!digits) return 0;
  const cents = Number(digits);
  if (!Number.isFinite(cents)) return 0;
  return cents / 100;
}

export function bindCurrencyInputs(root) {
  const scope = root || document;
  const inputs = scope.querySelectorAll('[data-currency="brl"]');

  inputs.forEach((input) => {
    if (input.dataset.currencyBound === "1") return;
    input.dataset.currencyBound = "1";

    const normalize = () => {
      const value = parseCurrencyBRL(input.value);
      input.value = formatCurrencyBRL(value);
      const len = input.value.length;
      input.setSelectionRange(len, len);
    };

    input.addEventListener("focus", () => {
      if (!String(input.value || "").trim()) {
        input.value = formatCurrencyBRL(0);
      }
      const len = input.value.length;
      input.setSelectionRange(len, len);
    });

    input.addEventListener("input", () => {
      normalize();
    });

    if (String(input.value || "").trim()) {
      normalize();
    }
  });
}

export function formatQuantidade(kgValue, categoria) {
  const n = Number(kgValue || 0);
  const cat = String(categoria || "").trim().toLowerCase();
  const isChurrasco = cat === "churrasco";

  if (!Number.isFinite(n) || n <= 0) {
    return isChurrasco ? "0g" : "0";
  }

  if (!isChurrasco) {
    return n.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  }

  if (n < 1) {
    const grams = n * 1000;
    const formatted = grams.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
    return `${formatted}g`;
  }

  const formatted = n.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  return `${formatted}kg`;
}

export function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
/**
 * Normaliza um nome de item removendo acentos, convertendo para minúsculas
 * e removendo plurais comuns para comparação
 */
export function normalizeItemName(name) {
  if (!name) return "";
  
  // Remove acentos e parênteses com conteúdo
  let normalized = name
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)/g, "") // Remove tudo entre parênteses
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  
  // Remove plurais comuns em português (ordem importa: padrões maiores primeiro)
  normalized = normalized
    .replace(/ões$/, "ao") // ões -> ão (mas depois remove o til)
    .replace(/aes$/, "ao") // ães -> ão
    .replace(/ais$/, "al") // ais -> al
    .replace(/eis$/, "el") // éis -> el
    .replace(/ois$/, "ol") // ois -> ol
    .replace(/is$/, "il")  // is -> il
    .replace(/s$/, "");    // Remove 's' final por último
  
  return normalized;
}

/**
 * Verifica se existe um item duplicado na lista
 * Retorna o item duplicado ou null se não houver duplicação
 */
export function findDuplicateItem(newItemName, existingItems) {
  const normalizedNew = normalizeItemName(newItemName);
  console.log("Buscando duplicatas para:", newItemName, "normalizado:", normalizedNew);
  console.log("Itens na lista:", existingItems);
  
  for (const item of existingItems) {
    const normalizedExisting = normalizeItemName(item.nome);
    console.log(`Comparando '${normalizedExisting}' com '${normalizedNew}'`, normalizedNew === normalizedExisting);
    if (normalizedNew === normalizedExisting) {
      console.log("DUPLICATA ENCONTRADA:", item.nome);
      return item;
    }
  }
  
  console.log("Nenhuma duplicata encontrada");
  return null;
}
