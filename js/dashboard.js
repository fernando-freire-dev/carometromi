import { supabase } from "./supabaseClient.js";
import { verificarLogin, logout, obterUsuarioLogado } from "./auth.js";

await verificarLogin();

const usuarioAtual = await obterUsuarioLogado();

// Logout
document.getElementById("btnLogout")?.addEventListener("click", logout);

// 🎓 Turmas
const turmas = {
  Fundamental: ["6ºA", "6ºB", "6ºC", "7ºA", "7ºB", "7ºC", "8ºA", "8ºB", "9ºA", "9ºB", "9ºC"],
  Médio: ["1ºA", "1ºB", "1ºC", "2ºA", "2ºB", "2ºC", "3ºA", "3ºB", "3ºC"]
};

const selectEnsino = document.getElementById("filtroEnsino");
const selectTurma = document.getElementById("filtroTurma");
const selectStatus = document.getElementById("filtroStatus");
const campoBusca = document.getElementById("buscaNome");
const tabelaAlunos = document.getElementById("tabelaAlunos");
const visualizadorFoto = document.getElementById("visualizadorFoto");
const fotoAmpliada = document.getElementById("fotoAmpliada");
const modalTurma = document.getElementById("modalTurma");
const modalInfo = document.getElementById("modalInfo");
const selectNovaTurma = document.getElementById("selectNovaTurma");
const btnCancelar = document.getElementById("btnCancelar");
const btnConfirmarTurma = document.getElementById("btnConfirmarTurma");
const toggleRA = document.getElementById("toggleRA");
const infoUsuario = document.getElementById("infoUsuario");

const btnInserirAluno = document.getElementById("btnInserirAluno");
const modalInserirAluno = document.getElementById("modalInserirAluno");
const btnCancelarInsercao = document.getElementById("btnCancelarInsercao");
const btnSalvarAluno = document.getElementById("btnSalvarAluno");
const novoRa = document.getElementById("novoRa");
const novoNome = document.getElementById("novoNome");
const novoEnsino = document.getElementById("novoEnsino");
const novaTurma = document.getElementById("novaTurma");

let timeoutBusca;
let raVisivel = false;
let alunoSelecionado = null;

const ehCoordenador = usuarioAtual?.role === "coordenador";

// =========================
// Utilidades
// =========================
function escaparHtml(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function obterStatusNormalizado(status) {
  return (status || "").toString().trim().toLowerCase();
}

function obterFotoUrl(ra) {
  const { data } = supabase
    .storage
    .from("fotos-alunos")
    .getPublicUrl(`${ra}.jpg`);

  return data.publicUrl;
  //return `${data.publicUrl}?t=${Date.now()}`;
}

function mostrarMensagem(texto) {
  alert(texto);
}

//Função de Loading para escolher a turma que deseja visualizar
function mostrarLoading() {
  tabelaAlunos.innerHTML = `
    <div style="text-align:center; padding:30px;">
      <div class="spinner"></div>
      <p>Carregando alunos...</p>
    </div>
  `;
}

function preencherSelectTurmas() {
  selectTurma.innerHTML = '<option value="">Todas as Turmas</option>';

  if (turmas[selectEnsino.value]) {
    turmas[selectEnsino.value].forEach((turma) => {
      selectTurma.innerHTML += `<option value="${escaparHtml(turma)}">${escaparHtml(turma)}</option>`;
    });
  }
}

function preencherTurmasDoModalInsercao(ensino) {
  novaTurma.innerHTML = '<option value="">Selecione</option>';

  if (!turmas[ensino]) return;

  turmas[ensino].forEach((turma) => {
    const option = document.createElement("option");
    option.value = turma;
    option.textContent = turma;
    novaTurma.appendChild(option);
  });
}

function atualizarUIUsuario() {
  if (infoUsuario && usuarioAtual) {
    infoUsuario.textContent = `Usuário: ${usuarioAtual.nome || usuarioAtual.email} | Perfil: ${usuarioAtual.role}`;
  }

  if (btnInserirAluno) {
    btnInserirAluno.style.display = ehCoordenador ? "inline-block" : "none";
  }
}

function limparFormularioNovoAluno() {
  novoRa.value = "";
  novoNome.value = "";
  novoEnsino.value = "";
  novaTurma.innerHTML = '<option value="">Selecione o ensino primeiro</option>';
}

// =========================
// Eventos de filtro
// =========================
selectEnsino?.addEventListener("change", () => {
  preencherSelectTurmas();
  carregarAlunos();
});

selectTurma?.addEventListener("change", carregarAlunos);
selectStatus?.addEventListener("change", carregarAlunos);

campoBusca?.addEventListener("input", () => {
  clearTimeout(timeoutBusca);
  timeoutBusca = setTimeout(() => carregarAlunos(), 300);
});

novoEnsino?.addEventListener("change", () => {
  preencherTurmasDoModalInsercao(novoEnsino.value);
});

// =========================
// Carregar alunos
// =========================
async function carregarAlunos() {
  //Forçar escolher a turma
  if (!selectEnsino?.value || !selectTurma?.value) {
    tabelaAlunos.innerHTML = "<p>Selecione o ensino e a turma para visualizar os alunos.</p>";
    return;
  }
  mostrarLoading(); // 👈 AQUI
  //Código antigo
  let query = supabase
    .from("alunos")
    .select("ra, nome, turma, status, ensino")
    .order("nome", { ascending: true });

  if (selectEnsino?.value) {
    query = query.eq("ensino", selectEnsino.value);
  }

  if (selectTurma?.value) {
    query = query.eq("turma", selectTurma.value);
  }

  if (selectStatus?.value) {
    query = query.eq("status", selectStatus.value);
  }

  const busca = campoBusca?.value?.trim();
  if (busca) {
    query = query.or(`nome.ilike.%${busca}%,ra.ilike.%${busca}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao carregar alunos:", error);
    tabelaAlunos.innerHTML = `<p>Erro ao carregar alunos.</p>`;
    return;
  }

  renderizarTabela(data || []);
}

function renderizarTabela(alunos) {
  if (!alunos.length) {
    tabelaAlunos.innerHTML = `<p>Nenhum aluno encontrado.</p>`;
    return;
  }

  let html = `
    <table>
      <tr>
        <th>Foto</th>
        <th class="col-ra" style="display:${raVisivel ? "table-cell" : "none"};">RA</th>
        <th>Nome</th>
        <th>Turma</th>
        <th>Status</th>
        <th>Ensino</th>
        ${ehCoordenador ? "<th>Ação</th>" : ""}
      </tr>
  `;

  alunos.forEach((aluno) => {
    const statusNormalizado = obterStatusNormalizado(aluno.status);
    const fotoUrl = obterFotoUrl(aluno.ra);

    html += `
      <tr>
        <td>
          <img
            data-src="${fotoUrl}"
            class="foto-mini lazy"
            data-ra="${escaparHtml(aluno.ra)}"
            loading="lazy"
            onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23dbeafe%22/><circle cx=%2230%22 cy=%2222%22 r=%2210%22 fill=%22%232563eb%22/><rect x=%2212%22 y=%2235%22 width=%2236%22 height=%2216%22 rx=%228%22 fill=%22%232563eb%22/></svg>'"
            style="cursor:pointer;"
          >
        </td>
        <td class="col-ra" style="display:${raVisivel ? "table-cell" : "none"};">
          ${escaparHtml(aluno.ra)}
        </td>
        <td>${escaparHtml(aluno.nome)}</td>
        <td>${escaparHtml(aluno.turma)}</td>
        <td>
          <span class="badge ${statusNormalizado === "ativo" ? "badge-ativo" : "badge-inativo"}">
            ${escaparHtml(aluno.status)}
          </span>
        </td>
        <td>${escaparHtml(aluno.ensino)}</td>
        ${
          ehCoordenador
            ? `
        <td>
          <div class="acoes">
            <button
              class="btn-sm ${statusNormalizado === "ativo" ? "btn-danger" : "btn-success"} btn-status"
              data-ra="${escaparHtml(aluno.ra)}"
              data-status="${escaparHtml(aluno.status)}">
              ${statusNormalizado === "ativo" ? "Inativar" : "Ativar"}
            </button>

            <button
              class="btn-sm btn-warning btn-turma"
              data-ra="${escaparHtml(aluno.ra)}"
              data-nome="${escaparHtml(aluno.nome)}"
              data-ensino="${escaparHtml(aluno.ensino)}"
              data-turma="${escaparHtml(aluno.turma)}">
              Alterar Turma
            </button>

            <label class="btn-sm btn-info" style="cursor:pointer;">
              Foto
              <input
                type="file"
                accept="image/*"
                style="display:none;"
                class="input-foto"
                data-ra="${escaparHtml(aluno.ra)}">
            </label>
          </div>
        </td>
        `
            : ""
        }
      </tr>
    `;
  });

  html += "</table>";
  tabelaAlunos.innerHTML = html;
  ativarLazyLoading(); // 👈 ESSENCIAL
}

// =========================
// Delegação de eventos
// =========================
tabelaAlunos?.addEventListener("click", async (event) => {
  const btnStatus = event.target.closest(".btn-status");
  const btnTurma = event.target.closest(".btn-turma");
  const fotoMini = event.target.closest(".foto-mini");

  if (btnStatus && ehCoordenador) {
    const ra = btnStatus.dataset.ra;
    const statusAtual = obterStatusNormalizado(btnStatus.dataset.status);
    const novoStatus = statusAtual === "ativo" ? "Inativo" : "Ativo";

    btnStatus.disabled = true;

    const { error } = await supabase
      .from("alunos")
      .update({ status: novoStatus })
      .eq("ra", ra);

    btnStatus.disabled = false;

    if (error) {
      console.error("Erro ao alterar status:", error);
      mostrarMensagem("Não foi possível alterar o status do aluno.");
      return;
    }

    carregarAlunos();
    return;
  }

  if (btnTurma && ehCoordenador) {
    iniciarMudancaTurma(
      btnTurma.dataset.ra,
      btnTurma.dataset.nome,
      btnTurma.dataset.ensino,
      btnTurma.dataset.turma
    );
    return;
  }

  if (fotoMini) {
    fotoAmpliada.src = fotoMini.dataset.src;
    visualizadorFoto.style.display = "flex";
  }
});

tabelaAlunos?.addEventListener("change", async (event) => {
  const inputFoto = event.target.closest(".input-foto");
  if (!inputFoto || !ehCoordenador) return;

  const file = inputFoto.files?.[0];
  const ra = inputFoto.dataset.ra;

  if (!file) return;

  const { error } = await supabase.storage
    .from("fotos-alunos")
    .upload(`${ra}.jpg`, file, { upsert: true });

  if (error) {
    console.error("Erro ao enviar foto:", error);
    mostrarMensagem("Não foi possível enviar a foto.");
    return;
  }

  mostrarMensagem("Foto enviada com sucesso.");
  carregarAlunos();
});

// =========================
// Modal turma
// =========================
function iniciarMudancaTurma(ra, nome, ensino, turmaAtual) {
  alunoSelecionado = { ra, turmaAtual };

  modalInfo.innerHTML = `
    Aluno: <strong>${escaparHtml(nome)}</strong><br>
    Turma atual: <strong>${escaparHtml(turmaAtual)}</strong>
  `;

  selectNovaTurma.innerHTML = "";

  if (!turmas[ensino]) {
    mostrarMensagem("Ensino não encontrado para este aluno.");
    return;
  }

  turmas[ensino].forEach((turma) => {
    const option = document.createElement("option");
    option.value = turma;
    option.textContent = turma;
    if (turma === turmaAtual) option.selected = true;
    selectNovaTurma.appendChild(option);
  });

  modalTurma.style.display = "flex";
}

btnCancelar?.addEventListener("click", () => {
  modalTurma.style.display = "none";
});

btnConfirmarTurma?.addEventListener("click", async () => {
  if (!alunoSelecionado || !ehCoordenador) return;

  const novaTurmaSelecionada = selectNovaTurma.value;

  if (novaTurmaSelecionada === alunoSelecionado.turmaAtual) {
    modalTurma.style.display = "none";
    return;
  }

  btnConfirmarTurma.disabled = true;

  const { error } = await supabase
    .from("alunos")
    .update({ turma: novaTurmaSelecionada })
    .eq("ra", alunoSelecionado.ra);

  btnConfirmarTurma.disabled = false;

  if (error) {
    console.error("Erro ao alterar turma:", error);
    mostrarMensagem("Não foi possível alterar a turma.");
    return;
  }

  modalTurma.style.display = "none";
  mostrarMensagem("Turma alterada com sucesso.");
  carregarAlunos();
});

// =========================
// Inserir aluno
// =========================
btnInserirAluno?.addEventListener("click", () => {
  if (!ehCoordenador) return;
  limparFormularioNovoAluno();
  modalInserirAluno.style.display = "flex";
});

btnCancelarInsercao?.addEventListener("click", () => {
  modalInserirAluno.style.display = "none";
});

btnSalvarAluno?.addEventListener("click", async () => {
  if (!ehCoordenador) return;

  const ra = novoRa.value.trim();
  const nome = novoNome.value.trim();
  const ensino = novoEnsino.value;
  const turma = novaTurma.value;
  const status = "Ativo";

  if (!ra || !nome || !ensino || !turma) {
    mostrarMensagem("Preencha todos os campos.");
    return;
  }

  btnSalvarAluno.disabled = true;

  const { data: alunoExistente, error: erroBusca } = await supabase
    .from("alunos")
    .select("ra")
    .eq("ra", ra)
    .maybeSingle();

  if (erroBusca) {
    btnSalvarAluno.disabled = false;
    console.error("Erro ao verificar RA:", erroBusca);
    mostrarMensagem("Erro ao verificar se o RA já existe.");
    return;
  }

  if (alunoExistente) {
    btnSalvarAluno.disabled = false;
    mostrarMensagem("Já existe um aluno com esse RA.");
    return;
  }

  const { error } = await supabase
    .from("alunos")
    .insert([
      {
        ra,
        nome,
        ensino,
        turma,
        status
      }
    ]);

  btnSalvarAluno.disabled = false;

  if (error) {
    console.error("Erro ao inserir aluno:", error);
    mostrarMensagem("Não foi possível inserir o aluno.");
    return;
  }

  modalInserirAluno.style.display = "none";
  mostrarMensagem("Aluno inserido com sucesso.");
  carregarAlunos();
});

// =========================
// Visualizador de foto
// =========================
visualizadorFoto?.addEventListener("click", (e) => {
  if (e.target.id === "visualizadorFoto") {
    e.currentTarget.style.display = "none";
  }
});

// =========================
// Mostrar/ocultar RA
// =========================
toggleRA?.addEventListener("click", () => {
  raVisivel = !raVisivel;

  document.querySelectorAll(".col-ra").forEach((col) => {
    col.style.display = raVisivel ? "table-cell" : "none";
  });

  toggleRA.textContent = raVisivel ? "Ocultar RA" : "Mostrar RA";
});

//==========================
// Carrega as fotos de forma gradual
//==========================
function ativarLazyLoading() {
  const imagens = document.querySelectorAll("img.lazy");

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        obs.unobserve(img);
      }
    });
  });

  imagens.forEach(img => observer.observe(img));
}

// =========================
// Inicialização
// =========================
atualizarUIUsuario();
carregarAlunos();
toggleRA.textContent = "Mostrar RA";
