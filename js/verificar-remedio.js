(() => {
  "use strict";

  const sessao = Auth.exigir(["paciente", "cuidador"]);
  if (!sessao) return;

  const $ = (id) => document.getElementById(id);
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- Base simulada ----------
     TODO: trocar por consulta à API (catálogo de remédios e interações). */
  const CATALOGO = [
    "AAS", "Amoxicilina", "Anlodipino", "Atenolol", "Atorvastatina", "Azitromicina", "Captopril",
    "Clonazepam", "Diclofenaco", "Dipirona", "Enalapril", "Fluoxetina", "Furosemida", "Glibenclamida",
    "Hidroclorotiazida", "Ibuprofeno", "Ibuprofeno + codeína", "Ibuprofeno + paracetamol", "Ibuprofeno 600mg",
    "Levotiroxina", "Losartana", "Losartana + hidroclorotiazida", "Metformina", "Naproxeno", "Omeprazol",
    "Pantoprazol", "Paracetamol", "Prednisona", "Sertralina", "Sinvastatina", "Tramadol", "Varfarina",
  ];

  /* [remédio A, remédio B, motivo] — nomes sem acento, em minúsculas */
  const INTERACOES = [
    ["ibuprofeno", "losartana", "Risco de aumento da pressão arterial e lesão renal."],
    ["ibuprofeno", "enalapril", "Risco de lesão renal e queda do efeito do remédio para pressão."],
    ["ibuprofeno", "atenolol", "Pode reduzir o efeito do remédio para pressão."],
    ["ibuprofeno", "aas", "Risco maior de sangramento no estômago."],
    ["diclofenaco", "losartana", "Risco de lesão renal."],
    ["sertralina", "tramadol", "Risco de reação grave por excesso de serotonina."],
    ["fluoxetina", "tramadol", "Risco de reação grave por excesso de serotonina."],
    ["varfarina", "aas", "Risco maior de sangramento."],
  ];

  /* ---------- Contexto: quem está usando ---------- */
  const db = DB.ler();
  const ehCuidador = sessao.perfil === "cuidador";
  const PACIENTE_ID = "raimunda"; // TODO: vem da API a partir de sessao.cpf

  let pessoaId = PACIENTE_ID;
  if (ehCuidador) {
    let salvo = null;
    try { salvo = sessionStorage.getItem("sm.dep"); } catch (_) {}
    pessoaId = db.dependentes.includes(salvo) ? salvo : db.dependentes[0];
  }

  $("perfil-nome").textContent = ehCuidador ? "Cuidador" : "Paciente";
  $("voltar").href = Auth.rotas[sessao.perfil];
  $("sair").addEventListener("click", () => Auth.sair());

  /* ---------- Cabeçalho e lista "em uso" ---------- */
  const input = $("remedio");
  const lista = $("uso-lista");
  const btnUso = $("uso-btn");

  function desenharPessoa() {
    const p = db.pessoas[pessoaId];
    const n = p.remedios.length;
    const quem = ehCuidador ? p.nome : "você";

    $("sub").textContent = n === 1
      ? `Vamos conferir contra o remédio que ${quem} já usa.`
      : `Vamos conferir contra os ${n} remédios que ${quem} já usa.`;
    $("uso-titulo").textContent = ehCuidador ? "Remédios em uso" : "Seus remédios em uso";
    $("uso-sub").textContent = UI.plural(n, "cadastrado", "cadastrados");

    lista.innerHTML = p.remedios.map((r) => `<li>
      <span class="circle">${UI.ico("pill")}</span>
      <span><b>${UI.esc(r.nome)} ${UI.esc(r.dose)}</b><small>${UI.esc(r.uso)}</small></span></li>`).join("");
    alternarUso(false);
  }

  function alternarUso(abrir) {
    btnUso.setAttribute("aria-expanded", String(abrir));
    lista.hidden = !abrir;
    $("uso-ver").innerHTML = `${abrir ? "Ocultar" : "Ver quais"} ${UI.ico(abrir ? "chevronUp" : "chevron")}`;
  }
  btnUso.addEventListener("click", () => alternarUso(lista.hidden));

  /* Seletor de dependente (só cuidador) */
  if (ehCuidador) {
    $("dep-pick").hidden = false;
    const sel = $("dep");
    sel.innerHTML = db.dependentes
      .map((id) => `<option value="${id}"${id === pessoaId ? " selected" : ""}>${UI.esc(db.pessoas[id].nome)}</option>`)
      .join("");
    sel.addEventListener("change", () => {
      pessoaId = sel.value;
      try { sessionStorage.setItem("sm.dep", pessoaId); } catch (_) {}
      limparEstado();
      desenharPessoa();
    });
  }

  /* ---------- Estados do formulário ---------- */
  const erro = $("erro");
  const aviso = $("aviso");

  function limparEstado() {
    input.removeAttribute("aria-invalid");
    erro.hidden = true;
    aviso.hidden = true;
    aviso.innerHTML = "";
  }

  function mostrarErroCampo(msg) {
    input.setAttribute("aria-invalid", "true");
    erro.querySelector("span").textContent = msg;
    erro.hidden = false;
    input.focus();
  }

  function mostrarAviso(tipo, html) {
    aviso.className = `notice notice--${tipo}`;
    aviso.innerHTML = `${UI.ico("alert")}<p>${html}</p>`;
    aviso.hidden = false;
  }

  function ocupado(sim) {
    const b = $("enviar");
    b.disabled = sim;
    b.querySelector("span").textContent = sim ? "Conferindo…" : "Verificar";
  }

  /* ---------- Sugestões (combobox) ---------- */
  const caixa = $("sugestoes");
  let opcoes = [];
  let ativo = -1;

  function fecharSugestoes() {
    caixa.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    ativo = -1;
  }

  function marcarAtivo(i) {
    ativo = i;
    caixa.querySelectorAll("li").forEach((li, k) => li.setAttribute("aria-selected", String(k === i)));
    if (i >= 0) input.setAttribute("aria-activedescendant", `op-${i}`);
    else input.removeAttribute("aria-activedescendant");
  }

  function sugerir() {
    const q = UI.norm(input.value);
    opcoes = q.length < 2 ? [] : CATALOGO
      .filter((n) => UI.norm(n).includes(q))
      .sort((a, b) => UI.norm(b).startsWith(q) - UI.norm(a).startsWith(q))
      .slice(0, 5);

    if (!opcoes.length || (opcoes.length === 1 && UI.norm(opcoes[0]) === q)) { fecharSugestoes(); return; }

    caixa.innerHTML = opcoes
      .map((n, i) => `<li role="option" id="op-${i}" aria-selected="false">${UI.esc(n)}${UI.ico("chevron")}</li>`)
      .join("");
    caixa.hidden = false;
    input.setAttribute("aria-expanded", "true");
    ativo = -1;
  }

  function escolher(nome) {
    input.value = nome;
    $("limpar").hidden = false;
    fecharSugestoes();
    input.focus();
  }

  input.addEventListener("input", () => {
    limparEstado();
    $("limpar").hidden = input.value === "";
    sugerir();
  });

  input.addEventListener("keydown", (e) => {
    if (caixa.hidden) return;
    if (e.key === "ArrowDown") { e.preventDefault(); marcarAtivo((ativo + 1) % opcoes.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); marcarAtivo((ativo - 1 + opcoes.length) % opcoes.length); }
    else if (e.key === "Enter" && ativo >= 0) { e.preventDefault(); escolher(opcoes[ativo]); }
    else if (e.key === "Escape") { fecharSugestoes(); }
  });

  input.addEventListener("blur", () => setTimeout(fecharSugestoes, 120));

  /* mousedown (e não click) evita que o campo perca o foco antes da escolha */
  caixa.addEventListener("mousedown", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    e.preventDefault();
    escolher(opcoes[Number(li.id.replace("op-", ""))]);
  });

  $("limpar").addEventListener("click", () => {
    input.value = "";
    $("limpar").hidden = true;
    limparEstado();
    fecharSugestoes();
    input.focus();
  });

  /* ---------- Análise ---------- */
  function analisar(nome, pessoa) {
    const componentes = nome.split("+").map((x) => UI.norm(x).split(/\s+/)[0]);
    const emUso = pessoa.remedios.map((r) => UI.norm(r.nome));

    const duplicado = componentes.some((c) => emUso.includes(c));
    const interacoes = INTERACOES.flatMap(([a, b, motivo]) => {
      const outro = componentes.includes(a) ? b : componentes.includes(b) ? a : null;
      if (!outro || !emUso.includes(outro)) return [];
      const real = pessoa.remedios.find((r) => UI.norm(r.nome) === outro).nome;
      return [{ remedio: real, motivo }];
    });
    return { duplicado, interacoes };
  }

  $("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    fecharSugestoes();
    limparEstado();

    const texto = input.value.trim();
    if (!texto) { mostrarErroCampo("Digite o nome do remédio."); return; }

    const p = db.pessoas[pessoaId];
    ocupado(true);
    await esperar(800); // TODO: consulta real à base de remédios

    const oficial = CATALOGO.find((n) => UI.norm(n) === UI.norm(texto));
    if (!oficial) {
      ocupado(false);
      mostrarAviso("erro", `<strong>Não encontramos “${UI.esc(texto)}” na base.</strong><br>Confira a grafia ou pergunte a um farmacêutico.`);
      return;
    }

    const { duplicado, interacoes } = analisar(oficial, p);
    if (duplicado) {
      ocupado(false);
      const onde = ehCuidador ? `na lista de remédios de ${UI.esc(p.nome)}` : "na sua lista de remédios";
      mostrarAviso("alerta", `<strong>${UI.esc(oficial)}</strong> já está ${onde}.`);
      return;
    }

    /* Tela de transição → cria o caso para o farmacêutico → volta ao início */
    $("tela").hidden = true;
    $("transicao").hidden = false;
    await esperar(1800);

    const grave = interacoes.length > 0;
    DB.novoCaso({
      pessoa: pessoaId,
      nome: p.nome,
      papel: ehCuidador ? "Cuidador" : "Paciente",
      tipo: grave ? "grave" : "novo",
      remedios: [oficial, ...interacoes.map((i) => i.remedio)],
      resumo: grave ? interacoes.map((i) => i.motivo).join(" ") : "",
    });

    $("trans-titulo").textContent = "Pronto!";
    $("trans-sub").textContent = grave
      ? "Encontramos uma possível interação grave. Procure atendimento médico sem esperar a revisão."
      : "Enviamos o remédio para a revisão do farmacêutico.";
    await esperar(grave ? 3200 : 1500);
    location.href = `${Auth.rotas[sessao.perfil]}?enviado=1`;
  });

  desenharPessoa();
})();
