import { supabase } from "./supabaseClient.js";

export async function verificarLogin() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    window.location.href = "index.html";
    return null;
  }

  return session;
}

export async function obterUsuarioLogado() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return null;
  }

  const user = session.user;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, nome, email, role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Erro ao buscar profile:", profileError);
    return {
      id: user.id,
      email: user.email,
      nome: user.email,
      role: "professor"
    };
  }

  return {
    id: user.id,
    email: user.email,
    nome: profile?.nome || user.email,
    role: profile?.role || "professor"
  };
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
}
