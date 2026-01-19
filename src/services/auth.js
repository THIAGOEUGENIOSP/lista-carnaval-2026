// src/services/auth.js
import { sb } from "../config/supabase.js";
import { mustOk } from "./db.js";

/**
 * Cadastro
 * - Cria usuário no Supabase Auth
 * - NÃO cria profile em public.usuarios aqui, porque pode não haver sessão/token ainda
 *   (principalmente quando "Confirm email" está ativado) -> evitar 401
 * - Guarda "nome" no user_metadata para usar depois no ensureProfile
 */
export async function signUp({ email, password, nome }) {
  const res = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { nome }, // user_metadata.nome
    },
  });

  // data pode vir com session null se exigir confirmação de email
  const data = mustOk(res);
  return data;
}

/**
 * Login
 * - Cria sessão
 * - Garante profile em public.usuarios (agora já tem token)
 */
export async function signIn({ email, password }) {
  const res = await sb.auth.signInWithPassword({ email, password });
  const data = mustOk(res);

  // garante perfil (agora existe sessão/token)
  await ensureProfile(data.user);

  return data;
}

export async function signOut() {
  const res = await sb.auth.signOut();
  mustOk(res);
}

export async function getSession() {
  const res = await sb.auth.getSession();
  return mustOk(res).session;
}

export function onAuthChange(cb) {
  return sb.auth.onAuthStateChange((_event, session) => cb(session));
}

/**
 * Busca o profile do usuário em public.usuarios
 */
export async function getProfile(userId) {
  const res = await sb
    .from("usuarios")
    .select("id,nome,email,avatar_url,created_at")
    .eq("id", userId)
    .maybeSingle();

  return mustOk(res);
}

/**
 * Upsert do profile
 * - Só deve ser usado quando houver sessão/token
 */
export async function upsertProfile({ id, email, nome, avatar_url = null }) {
  const res = await sb
    .from("usuarios")
    .upsert({ id, email, nome, avatar_url }, { onConflict: "id" })
    .select("id,nome,email,avatar_url,created_at")
    .single();

  return mustOk(res);
}

/**
 * Garante que existe um profile em public.usuarios
 * - Se não existir, cria com nome do metadata (ou fallback)
 */
export async function ensureProfile(user) {
  if (!user) return null;

  // tenta buscar
  const existing = await getProfile(user.id);
  if (existing) return existing;

  // fallback de nome
  const nome =
    user.user_metadata?.nome ||
    user.user_metadata?.full_name ||
    user.email?.split("@")?.[0] ||
    "Colaborador";

  // cria profile (agora já existe sessão/token quando chamado via signIn ou onAuthChange)
  return upsertProfile({
    id: user.id,
    email: user.email,
    nome,
    avatar_url: user.user_metadata?.avatar_url || null,
  });
}
