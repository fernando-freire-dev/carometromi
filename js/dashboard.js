import { supabase } from "./supabaseClient.js";
import { verificarLogin, logout } from "./auth.js";

await verificarLogin();

// Logout
document.getElementById("btnLogout").addEventListener("click", logout);

// 🎓 Turmas
const turmas = {
  "Fundamental": ["6ºA","6ºB","6ºC","7ºA","7ºB","7ºC","8ºA","8ºB","9ºA","9ºB","9ºC"],
  "Médio": ["1ºA","1ºB","1ºC","2ºA","2ºB","2ºC","3ºA","3ºB","3ºC"]
};

const selectEnsino = document.getElementById("filtroEnsino");
const selectTurma = document.getElementById("filtroTurma");
const selectStatus = document.getElementById("filtroStatus");
const campoBusca = document.getElementById("buscaNome");

selectEnsino.addEventListener("change", () => {
  selectTurma.innerHTML = '<option value="">Todas as Turmas</option>';

  if (turmas[selectEnsino.value]) {
    turmas[selectEnsino.value].forEach(turma => {
      selectTurma.innerHTML += `<option value="${turma}">${turma}</option>`;
    });
  }

  carregarAlunos();
});

selectTurma.addEventListener("change", carregarAlunos);

selectStatus.addEventListener("change", carregarAlunos);

let timeoutBusca;
campoBusca.addEventListener("input", () => {
  clearTimeout(timeoutBusca);
  timeoutBusca = setTimeout(() => carregarAlunos(), 300);
});

async function carregarAlunos() {

  let query = supabase
    .from("alunos")
    .select("*")
    .order("nome", { ascending: true });

  if (selectEnsino.value)
    query = query.eq("ensino", selectEnsino.value);

  if (selectTurma.value)
    query = query.eq("turma", selectTurma.value);

  if (selectStatus.value)
    query = query.eq("status", selectStatus.value);

  if (campoBusca.value.trim())
    query = query.or(
      `nome.ilike.%${campoBusca.value.trim()}%,ra.ilike.%${campoBusca.value.trim()}%`
    );

  const { data, error } = await query;

  if (error) {
    console.error(error);
    return;
  }

  let html = `
    <table>
      <tr>
        <th>Foto</th>
        <th class="col-ra" style="display:none;">RA</th>
        <th>Nome</th>
        <th>Turma</th>       
        <th>Status</th>
        <th>Ensino</th> 
        <th>Ação</th>
      </tr>
  `;

  data.forEach(aluno => {

    const statusNormalizado = aluno.status.toLowerCase();

    const { data: fotoData } = supabase
      .storage
      .from('fotos-alunos')
      .getPublicUrl(`${aluno.ra}.jpg`);

    const fotoUrl = fotoData.publicUrl + '?t=' + new Date().getTime();

    html += `
      <tr>
        <td>
          <img 
            src="${fotoUrl}" 
            class="foto-mini"
            data-src="${fotoUrl}"
            onerror="this.src='https://via.placeholder.com/60'">
        </td>
        <td class="col-ra" style="display:none;">${aluno.ra}</td>
        <td>${aluno.nome}</td>        
        <td>${aluno.turma}</td>
        <td>
          <span class="badge ${statusNormalizado === 'ativo' ? 'badge-ativo' : 'badge-inativo'}">
            ${aluno.status}
          </span>
        </td>
        <td>${aluno.ensino}</td>
        <td>
          <div class="acoes">

            <button 
              class="btn-sm ${statusNormalizado === 'ativo' ? 'btn-danger' : 'btn-success'} btn-status"
              data-ra="${aluno.ra}"
              data-status="${aluno.status}">
              ${statusNormalizado === 'ativo' ? 'Inativar' : 'Ativar'}
            </button>

            <button 
              class="btn-sm btn-warning btn-turma"
              data-ra="${aluno.ra}"
              data-nome="${aluno.nome}"
              data-ensino="${aluno.ensino}"
              data-turma="${aluno.turma}">
              Alterar Turma
            </button>

            <label class="btn-sm btn-info" style="cursor:pointer;">
              Foto
              <input type="file" accept="image/*"
                style="display:none;"
                data-ra="${aluno.ra}">
            </label>

          </div>
        </td>
      </tr>
    `;
  });

  html += "</table>";
  document.getElementById("tabelaAlunos").innerHTML = html;

  ativarEventos();
}

function ativarEventos() {

  // Alterar status
  document.querySelectorAll(".btn-status").forEach(btn => {
    btn.addEventListener("click", async () => {

      const ra = btn.dataset.ra;
      const statusAtual = btn.dataset.status.toLowerCase();
      const novoStatus = statusAtual === "ativo" ? "Inativo" : "Ativo";

      await supabase
        .from("alunos")
        .update({ status: novoStatus })
        .eq("ra", ra);

      carregarAlunos();
    });
  });

  // Alterar turma
  document.querySelectorAll(".btn-turma").forEach(btn => {
    btn.addEventListener("click", () => {
      iniciarMudancaTurma(
        btn.dataset.ra,
        btn.dataset.nome,
        btn.dataset.ensino,
        btn.dataset.turma
      );
    });
  });

  // Upload foto
  document.querySelectorAll("input[type='file']").forEach(input => {
    input.addEventListener("change", async (event) => {

      const file = event.target.files[0];
      const ra = input.dataset.ra;
      if (!file) return;

      await supabase.storage
        .from('fotos-alunos')
        .upload(`${ra}.jpg`, file, { upsert: true });

      carregarAlunos();
    });
  });

  // Visualizar foto
  document.querySelectorAll(".foto-mini").forEach(img => {
    img.addEventListener("click", () => {
      document.getElementById("fotoAmpliada").src = img.dataset.src;
      document.getElementById("visualizadorFoto").style.display = "flex";
    });
  });
}

// Modal turma
let alunoSelecionado = null;

function iniciarMudancaTurma(ra, nome, ensino, turmaAtual) {

  alunoSelecionado = { ra, turmaAtual };

  const modal = document.getElementById("modalTurma");
  const info = document.getElementById("modalInfo");
  const select = document.getElementById("selectNovaTurma");

  info.innerHTML = `
    Aluno: <strong>${nome}</strong><br>
    Turma atual: <strong>${turmaAtual}</strong>
  `;

  select.innerHTML = "";

  turmas[ensino].forEach(turma => {
    const option = document.createElement("option");
    option.value = turma;
    option.textContent = turma;
    if (turma === turmaAtual) option.selected = true;
    select.appendChild(option);
  });

  modal.style.display = "flex";
}

document.getElementById("btnCancelar").addEventListener("click", () => {
  document.getElementById("modalTurma").style.display = "none";
});

document.getElementById("btnConfirmarTurma").addEventListener("click", async () => {

  const novaTurma = document.getElementById("selectNovaTurma").value;

  if (novaTurma === alunoSelecionado.turmaAtual) {
    document.getElementById("modalTurma").style.display = "none";
    return;
  }

  await supabase
    .from("alunos")
    .update({ turma: novaTurma })
    .eq("ra", alunoSelecionado.ra);

  document.getElementById("modalTurma").style.display = "none";
  carregarAlunos();
});

// Fechar visualizador
document.getElementById("visualizadorFoto").addEventListener("click", (e) => {
  if (e.target.id === "visualizadorFoto") {
    e.currentTarget.style.display = "none";
  }
});

// Esconde a coluna RA
let raVisivel = false;

document.getElementById("toggleRA").addEventListener("click", () => {

  raVisivel = !raVisivel;

  document.querySelectorAll(".col-ra").forEach(col => {
    col.style.display = raVisivel ? "table-cell" : "none";
  });
});
carregarAlunos();


