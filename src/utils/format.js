export function brl(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function num(v) {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
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
  
  // Remove acentos primeiro
  let normalized = name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
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