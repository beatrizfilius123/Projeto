
const $ = (id) => document.getElementById(id);

const hoje = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

// Demonstração: os dados ficam salvos neste navegador.
const carregar = (chave, padrao) => {
  try {
    const dados = localStorage.getItem(chave);
    return dados ? JSON.parse(dados) : padrao;
  } catch {
    return padrao;
  }
};

let epis = carregar("safework_epis", []);
let funcionarios = carregar("safework_funcionarios", []);
let entregas = carregar("safework_entregas", []);

function salvar() {
  localStorage.setItem("safework_epis", JSON.stringify(epis));
  localStorage.setItem(
    "safework_funcionarios",
    JSON.stringify(funcionarios)
  );
  localStorage.setItem("safework_entregas", JSON.stringify(entregas));
}

function escapar(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function formatarData(data) {
  if (!data) return "Não informada";
  const partes = data.split("-");
  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : data;
}

function statusEpi(epi) {
  const vencido = epi.validade && epi.validade < hoje();
  if (vencido) {
    return '<span class="status expired">CA vencido</span>';
  }

  if (epi.quantidade <= epi.minimo) {
    return '<span class="status low">Estoque baixo</span>';
  }

  return '<span class="status">Disponível</span>';
}

function renderizar() {
  $("total-epis").textContent = epis.length;
  $("total-estoque").textContent = epis.reduce(
    (total, epi) => total + epi.quantidade, 0
  );
  $("total-entregas").textContent = entregas.length;
  $("total-baixo").textContent = epis.filter(
    (epi) => epi.quantidade <= epi.minimo
  ).length;

  $("lista-epis").innerHTML = epis.length
    ? epis.map((epi) => `
      <tr>
        <td>${escapar(epi.nome)}</td>
        <td>${escapar(epi.ca || "—")}</td>
        <td>${epi.quantidade}</td>
        <td>${formatarData(epi.validade)}</td>
        <td>${statusEpi(epi)}</td>
        <td>
          <button class="action" data-remover="${epi.id}">
            Excluir
          </button>
        </td>
      </tr>
    `).join("")
    : '<tr><td colspan="6">Nenhum EPI cadastrado.</td></tr>';

  const busca = $("busca-epi").value.toLowerCase();
  $("lista-epis").querySelectorAll("tr").forEach((linha) => {
    linha.hidden = !linha.textContent.toLowerCase().includes(busca);
  });

  $("alertas").innerHTML = epis.filter(
    (epi) => epi.quantidade <= epi.minimo ||
      (epi.validade && epi.validade < hoje())
  ).map((epi) => {
    const avisos = [];
    if (epi.quantidade <= epi.minimo) avisos.push("estoque baixo");
    if (epi.validade && epi.validade < hoje()) avisos.push("CA vencido");

    return `<div class="alert">
      <strong>${escapar(epi.nome)}</strong>:
      ${avisos.join(" e ")}.
    </div>`;
  }).join("") || '<p class="empty">Nenhum alerta de estoque ou validade.</p>';

  $("lista-funcionarios").innerHTML = funcionarios.map((f) => `
    <tr>
      <td>${escapar(f.nome)}</td>
      <td>${escapar(f.setor)}</td>
      <td>${escapar(f.funcao)}</td>
    </tr>
  `).join("") || '<tr><td colspan="3">Nenhum funcionário cadastrado.</td></tr>';

  $("entrega-funcionario").innerHTML =
    '<option value="">Selecione o funcionário</option>' +
    funcionarios.map((f) => `
      <option value="${f.id}">${escapar(f.nome)}</option>
    `).join("");

  $("entrega-epi").innerHTML =
    '<option value="">Selecione o EPI</option>' +
    epis.map((epi) => `
      <option value="${epi.id}" ${epi.quantidade < 1 ? "disabled" : ""}>
        ${escapar(epi.nome)} — estoque: ${epi.quantidade}
      </option>
    `).join("");

  $("lista-entregas").innerHTML = entregas.slice().reverse().map((e) => `
    <tr>
      <td>${formatarData(e.data)}</td>
      <td>${escapar(e.funcionario)}</td>
      <td>${escapar(e.epi)}</td>
      <td>${e.quantidade}</td>
      <td>${escapar(e.responsavel)}</td>
    </tr>
  `).join("") || '<tr><td colspan="5">Nenhuma entrega registrada.</td></tr>';

  $("recentes").innerHTML = entregas.slice(-5).reverse().map((e) => `
    <tr>
      <td>${escapar(e.funcionario)}</td>
      <td>${escapar(e.epi)}</td>
      <td>${e.quantidade}</td>
      <td>${formatarData(e.data)}</td>
    </tr>
  `).join("") || '<tr><td colspan="4">Sem movimentações recentes.</td></tr>';
}

// Navegação entre as páginas
document.querySelectorAll(".nav").forEach((botao) => {
  botao.addEventListener("click", () => {
    document.querySelectorAll(".nav").forEach((b) =>
      b.classList.remove("active")
    );
    botao.classList.add("active");

    document.querySelectorAll(".page").forEach((pagina) =>
      pagina.classList.add("hidden")
    );

    $(botao.dataset.page).classList.remove("hidden");
    $("page-title").textContent = botao.textContent.trim();
  });
});

// Cadastro de EPI
$("form-epi").addEventListener("submit", (event) => {
  event.preventDefault();

  const nome = $("epi-nome").value.trim();
  const ca = $("epi-ca").value.trim();
  const quantidade = Number($("epi-qtd").value);
  const minimo = Number($("epi-min").value);
  const validade = $("epi-validade").value;

  if (!nome || quantidade < 0 || minimo < 0) {
    alert("Confira os dados informados.");
    return;
  }

  epis.push({
    id: crypto.randomUUID(),
    nome,
    ca,
    quantidade,
    minimo,
    validade
  });

  salvar();
  event.target.reset();
  $("epi-qtd").value = 0;
  $("epi-min").value = 5;
  renderizar();
});

// Excluir EPI
$("lista-epis").addEventListener("click", (event) => {
  const botao = event.target.closest("[data-remover]");
  if (!botao) return;

  const id = botao.dataset.remover;
  const epi = epis.find((item) => item.id === id);

  if (!epi) return;

  if (entregas.some((e) => e.epiId === id)) {
    alert("Este EPI possui histórico de entregas e não pode ser excluído.");
    return;
  }

  if (confirm(`Deseja excluir ${epi.nome}?`)) {
    epis = epis.filter((item) => item.id !== id);
    salvar();
    renderizar();
  }
});

$("busca-epi").addEventListener("input", renderizar);

// Cadastro de funcionário
$("form-funcionario").addEventListener("submit", (event) => {
  event.preventDefault();

  funcionarios.push({
    id: crypto.randomUUID(),
    nome: $("func-nome").value.trim(),
    setor: $("func-setor").value.trim(),
    funcao: $("func-funcao").value.trim()
  });

  salvar();
  event.target.reset();
  renderizar();
});

// Registro de entrega e baixa automática no estoque
$("form-entrega").addEventListener("submit", (event) => {
  event.preventDefault();

  const funcionario = funcionarios.find(
    (f) => f.id === $("entrega-funcionario").value
  );
  const epi = epis.find((e) => e.id === $("entrega-epi").value);
  const quantidade = Number($("entrega-qtd").value);
  const data = $("entrega-data").value;
  const responsavel = $("entrega-responsavel").value.trim();

  if (!funcionario || !epi || !Number.isInteger(quantidade) ||
      quantidade < 1 || quantidade > epi.quantidade || !data ||
      !responsavel) {
    alert("Confira os dados e a quantidade disponível em estoque.");
    return;
  }

  if (epi.validade && epi.validade < data) {
    alert("O CA deste EPI está vencido na data informada.");
    return;
  }

  epi.quantidade -= quantidade;

  entregas.push({
    id: crypto.randomUUID(),
    epiId: epi.id,
    funcionario: funcionario.nome,
    epi: epi.nome,
    quantidade,
    data,
    responsavel
  });

  salvar();
  event.target.reset();
  $("entrega-data").value = hoje();
  $("entrega-qtd").value = 1;
  renderizar();

  alert("Entrega registrada e estoque atualizado!");
});

// Exportação de CSV compatível com Excel
function baixarCSV(nome, linhas) {
  const csv = "\uFEFF" + linhas.map((linha) =>
    linha.map((valor) =>
      '"' + String(valor ?? "").replace(/"/g, '""') + '"'
    ).join(";")
  ).join("\r\n");

  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" })
  );

  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$("exportar").addEventListener("click", () => {
  baixarCSV("relatorio-entregas.csv", [
    ["Data", "Funcionário", "EPI", "Quantidade", "Responsável"],
    ...entregas.map((e) => [
      e.data, e.funcionario, e.epi, e.quantidade, e.responsavel
    ])
  ]);
});

$("exportar-estoque").addEventListener("click", () => {
  baixarCSV("relatorio-estoque.csv", [
    ["Equipamento", "CA", "Quantidade", "Estoque mínimo", "Validade do CA"],
    ...epis.map((e) => [
      e.nome, e.ca, e.quantidade, e.minimo, e.validade
    ])
  ]);
});

$("entrega-data").value = hoje();
renderizar();
