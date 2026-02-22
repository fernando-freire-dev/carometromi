import { supabase } from "./supabaseClient.js";

export async function verificarLogin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) window.location.href = "index.html";
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
}