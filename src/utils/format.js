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
  
  // Remove acentos
  let normalized = name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  // Remove plurais comuns em português
  normalized = normalized
    .replace(/s$/, "") // Remove 's' final (plural)
    .replace(/ões$/, "ão") // ões -> ão
    .replace(/ães$/, "ão") // ães -> ão
    .replace(/ais$/, "al") // ais -> al
    .replace(/éis$/, "el") // éis -> el
    .replace(/eis$/, "el") // eis -> el
    .replace(/ois$/, "ol") // ois -> ol
    .replace(/is$/, "il"); // is -> il
  
  return normalized;
}

/**
 * Verifica se existe um item duplicado na lista
 * Retorna o item duplicado ou null se não houver duplicação
 */
export function findDuplicateItem(newItemName, existingItems) {
  const normalizedNew = normalizeItemName(newItemName);
  
  for (const item of existingItems) {
    const normalizedExisting = normalizeItemName(item.nome);
    if (normalizedNew === normalizedExisting) {
      return item;
    }
  }
  
  return null;
}