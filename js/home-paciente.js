(() => {
  "use strict";

  /* Bloqueio de acesso (a página já redireciona no <head>; isto é só um reforço) */
  const sessao = Auth.exigir("paciente");
  if (!sessao) return;

  const $ = (id) => document.getElementById(id);
  const MAX_INICIAL = 3;

  /* TODO: o id da pessoa vem da API a partir de sessao.cpf
     (a tela de verificar remédio usa o mesmo valor). */
  const PACIENTE_ID = "raimunda";

  const db = DB.ler();
  const pessoa = db.pessoas[PACIENTE_ID];
  const casos = db.casos
    .filter((c) => c.pessoa === PACIENTE_ID)
    .sort((a, b) => b.criadoEm - a.criadoEm);

  let verTodas = false;

  const nomeCaso = (c) => c.remedios.join(" + ");
  const tipoDe = (c) => (c.status === "revisado" ? "revisado" : c.tipo === "grave" ? "grave" : "aguardando");
  const BADGE = {
    revisado:   { icone: "check", texto: "Revisado" },
    grave:      { icone: "alert", texto: "Interação grave" },
    aguardando: { icone: "clock", texto: "Aguardando farmacêutico" },
  };

  /* ---------- Cabeçalho e resumo ---------- */
  $("nome-paciente").textContent = pessoa.nome;
  $("stat-remedios").textContent = UI.plural(pessoa.remedios.length, "cadastrado", "cadastrados");
  $("stat-revisoes").textContent = UI.plural(casos.length, "caso", "casos");

  /* ---------- Avisos: revisão concluída e interação grave pendente ---------- */
  const concluida = casos
    .filter((c) => c.status === "revisado")
    .sort((a, b) => (b.revisadoEm || 0) - (a.revisadoEm || 0))[0];

  $("banner").hidden = !concluida;
  if (concluida) {
    $("banner").dataset.id = concluida.id;
    $("banner-desc").textContent = `Seu caso de “${nomeCaso(concluida)}” foi revisado pelo farmacêutico.`;
  }

  const grave = casos.find((c) => c.status === "pendente" && c.tipo === "grave");
  $("alerta").hidden = !grave;
  if (grave) $("alerta").dataset.id = grave.id;

  /* Volta da tela "Verificar remédio novo" */
  const params = new URLSearchParams(location.search);
  if (params.get("enviado") === "1") {
    $("enviado").hidden = false;
    history.replaceState(null, "", location.pathname);
  }

  /* ---------- Remédios em uso (abre ao tocar no cartão) ---------- */
  $("uso-lista").innerHTML = pessoa.remedios.length
    ? pessoa.remedios.map((r) => `<li>
        <span class="review-icon">${UI.ico("pill")}</span>
        <span><b>${UI.esc(r.nome)} ${UI.esc(r.dose)}</b><small>${UI.esc(r.uso)}</small></span></li>`).join("")
    : `<li class="empty-li">Nenhum remédio cadastrado.</li>`;

  $("stat-uso").addEventListener("click", () => {
    const abrir = $("uso-painel").hidden;
    $("uso-painel").hidden = !abrir;
    $("stat-uso").setAttribute("aria-expanded", String(abrir));
  });

  /* ---------- Minhas revisões ---------- */
  function desenharRevisoes() {
    const visiveis = verTodas ? casos : casos.slice(0, MAX_INICIAL);

    $("review-list").innerHTML = visiveis.map((c) => {
      const t = tipoDe(c);
      const b = BADGE[t];
      const nome = nomeCaso(c);
      return `<li><button class="review" type="button" data-id="${c.id}"
          aria-label="${UI.esc(nome)}, enviado em ${UI.dataBR(c.criadoEm)}, ${b.texto}">
        <span class="review-icon">${UI.ico("clock")}</span>
        <span class="review-info">
          <span class="review-name">${UI.esc(nome)}</span>
          <span class="review-date">Enviado em ${UI.dataBR(c.criadoEm)}</span>
        </span>
        <span class="badge badge--${t}">${UI.ico(b.icone)}${b.texto}</span>
        <span class="review-chevron">${UI.ico("chevron")}</span>
      </button></li>`;
    }).join("");

    $("review-empty").hidden = casos.length > 0;
    $("review-list").hidden = casos.length === 0;
    $("ver-todas").hidden = casos.length <= MAX_INICIAL;
    $("ver-todas").firstChild.textContent = verTodas ? "Ver menos " : "Ver todas ";
  }

  $("ver-todas").addEventListener("click", () => { verTodas = !verTodas; desenharRevisoes(); });

  $("stat-rev").addEventListener("click", () => {
    verTodas = true;
    desenharRevisoes();
    $("revisoes-titulo").scrollIntoView({ behavior: "smooth" });
    $("revisoes-titulo").focus({ preventScroll: true });
  });

  /* ---------- Janela com os detalhes do caso ---------- */
  const dlg = $("dlg");

  function abrirCaso(id) {
    const c = casos.find((x) => x.id === Number(id));
    if (!c) return;
    const revisado = c.status === "revisado";
    const urgente = !revisado && c.tipo === "grave";

    $("dlg-titulo").textContent = nomeCaso(c);
    $("dlg-corpo").innerHTML = `
      <div><dt>Situação</dt><dd>${revisado
        ? `Revisado pelo farmacêutico em ${UI.dataBR(c.revisadoEm || c.criadoEm)}.`
        : `Aguardando o farmacêutico (prazo: ${c.prazoH}h).`}</dd></div>
      <div><dt>Enviado em</dt><dd>${UI.dataBR(c.criadoEm)}</dd></div>
      <div><dt>Remédios</dt><dd>${c.remedios.map((r) => UI.esc(r)).join(" + ")}</dd></div>
      ${c.resumo ? `<div><dt>Possível problema</dt><dd>${UI.esc(c.resumo)}</dd></div>` : ""}
      ${urgente ? `<div><dd><strong class="red">Procure atendimento médico sem esperar a revisão.</strong></dd></div>` : ""}
      <div><dd class="dlg-aviso">Análise preliminar. Não substitui o médico nem o farmacêutico.</dd></div>`;
    dlg.showModal();
  }

  $("review-list").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-id]");
    if (b) abrirCaso(b.dataset.id);
  });
  $("banner").addEventListener("click", () => abrirCaso($("banner").dataset.id));
  $("alerta").addEventListener("click", () => abrirCaso($("alerta").dataset.id));
  $("dlg-fechar").addEventListener("click", () => dlg.close());

  UI.menuConta();
  desenharRevisoes();
})();