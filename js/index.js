import { supabase } from "./supabaseClient.js";

document.getElementById("btnLogin").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    document.getElementById("mensagem").innerText = "Erro: " + error.message;
  } else {
    window.location.href = "dashboard.html";
  }
});