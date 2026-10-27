(() => {
  "use strict";

  const sessao = Auth.exigir("cuidador");
  if (!sessao) return;

  const $ = (id) => document.getElementById(id);
  const MAX_INICIAL = 3;

  /* TODO: substituir por chamadas à API usando sessao.cpf */
  const db = DB.ler();

  let dep = null;
  try { dep = sessionStorage.getItem("sm.dep"); } catch (_) {}
  if (!db.dependentes.includes(dep)) dep = db.dependentes[0];

  let verTodas = false;

  const BADGE = {
    revisado: () => `<span class="badge badge--ok">${UI.ico("check")}Revisado</span>`,
    grave: () => `<span class="badge badge--grave">${UI.ico("alert")}Interação grave</span>`,
    aguardando: () => `<span class="badge badge--wait">${UI.ico("clock")}Aguardando farmacêutico</span>`,
  };

  function desenhar() {
    const p = db.pessoas[dep];
    try { sessionStorage.setItem("sm.dep", dep); } catch (_) {}

    /* Abas de dependentes */
    $("dep-tabs").innerHTML = db.dependentes.map((id) => {
      const ativo = id === dep;
      return `<button class="pill${ativo ? " is-active" : ""}" type="button" data-id="${id}" aria-pressed="${ativo}">
        ${UI.ico("user")}<span>${UI.esc(db.pessoas[id].nome)}</span></button>`;
    }).join("");

    $("titulo").innerHTML = `Cuidando de <strong>${UI.esc(p.nome)}</strong>`;
    $("stat-remedios").textContent = UI.plural(p.remedios.length, "cadastrado", "cadastrados");
    $("rev-titulo").textContent = `Revisões de ${p.nome}`;

    const casos = db.casos.filter((c) => c.pessoa === dep).sort((a, b) => b.criadoEm - a.criadoEm);
    $("stat-revisoes").textContent = UI.plural(casos.length, "caso", "casos");

    /* Lista de revisões */
    const visiveis = verTodas ? casos : casos.slice(0, MAX_INICIAL);
    $("rev-lista").innerHTML = visiveis.map((c) => {
      const tipo = c.status === "revisado" ? "revisado" : c.tipo === "grave" ? "grave" : "aguardando";
      const nome = c.remedios.join(" + ");
      return `<li><a class="rev" href="#" aria-label="${UI.esc(nome)}, enviado em ${UI.dataBR(c.criadoEm)}">
        <span class="circle" style="--s:56px">${UI.ico("clock")}</span>
        <div><p class="rev-nome">${UI.esc(nome)}</p><p class="rev-data">Enviado em ${UI.dataBR(c.criadoEm)}</p></div>
        ${BADGE[tipo]()}${UI.ico("chevron")}</a></li>`;
    }).join("");
    $("rev-vazio").hidden = casos.length > 0;
    $("ver-todas").hidden = casos.length <= MAX_INICIAL;
    $("ver-todas").firstChild.textContent = verTodas ? "Ver menos " : "Ver todas ";

    /* Aviso: revisão mais recente concluída */
    const concluida = casos.filter((c) => c.status === "revisado")
      .sort((a, b) => (b.revisadoEm || 0) - (a.revisadoEm || 0))[0];
    $("banner").hidden = !concluida;
    if (concluida) {
      $("banner-desc").textContent =
        `O farmacêutico devolveu o caso de ${p.nome}: ${concluida.remedios.join(" + ")}.`;
    }

    /* Alerta: interação grave ainda aguardando revisão */
    const grave = casos.find((c) => c.status === "pendente" && c.tipo === "grave");
    $("alerta").hidden = !grave;
    if (grave) {
      $("alerta-desc").innerHTML =
        `Foi identificada uma interação grave entre os remédios de ${UI.esc(p.nome)}. ` +
        `<b>Procure atendimento médico sem esperar a revisão.</b>`;
    }

    $("dot").hidden = !concluida && !grave;
  }

  $("dep-tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-id]");
    if (!b) return;
    dep = b.dataset.id;
    verTodas = false;
    desenhar();
    $("dep-tabs").querySelector(`[data-id="${dep}"]`).focus();
  });

  $("ver-todas").addEventListener("click", () => { verTodas = !verTodas; desenhar(); });

  UI.menuConta();
  desenhar();
})();
