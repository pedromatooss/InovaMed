(() => {
  "use strict";

  const sessao = Auth.exigir("farmaceutico");
  if (!sessao) return;

  const $ = (id) => document.getElementById(id);
  const POR_PAGINA = 5;
  const TAGS = { grave: "Interação grave", novo: "Remédio novo", orientacao: "Revisão de orientação" };
  const ICONES = { grave: "alert", novo: "pill", orientacao: "clock" };

  $("nome").textContent = "Dr. Carlos Silva"; // TODO: vem da API a partir de sessao.cpf

  const pendente = (c) => c.status === "pendente";
  const FILTROS = {
    todos: () => true,
    pendentes: pendente,
    revisados: (c) => !pendente(c),
    graves: (c) => pendente(c) && c.tipo === "grave",
  };

  /* Pendentes primeiro, graves antes, depois os mais recentes */
  const prioridade = (a, b) =>
    (pendente(b) - pendente(a)) ||
    ((b.tipo === "grave") - (a.tipo === "grave")) ||
    (b.criadoEm - a.criadoEm);

  let db, filtro = "todos", busca = "", pagina = 1, aberto = null;

  function cartao(c) {
    const revisado = !pendente(c);
    const grave = c.tipo === "grave" && !revisado;
    const quando = revisado
      ? `<span>Revisado em ${UI.dataBR(c.revisadoEm || c.criadoEm)}</span>`
      : `<span>${UI.haH(c.criadoEm)}<br>(prazo: ${c.prazoH}h)</span>`;

    return `<li class="caso${grave ? " caso--grave" : ""}">
      <span class="circle${grave ? " circle--red" : revisado ? " circle--ok" : ""}" style="--s:64px">${UI.ico(revisado ? "check" : ICONES[c.tipo])}</span>
      <div class="caso-body">
        <p><span class="tag${grave ? " tag--red" : ""}">${TAGS[c.tipo]}</span></p>
        <p class="caso-nome"><strong>${UI.esc(c.nome)}</strong><span class="role">${UI.ico("user")}${UI.esc(c.papel)}</span></p>
        <p class="caso-rem">${c.remedios.map((r) => UI.esc(r)).join(" + ")}</p>
        ${c.resumo ? `<p class="caso-resumo">${UI.esc(c.resumo)}</p>` : ""}
      </div>
      <div class="caso-side">
        <p class="quando">${UI.ico("clock")}${quando}</p>
        <button class="btn-open${grave ? " btn-open--red" : ""}" type="button" data-id="${c.id}">Abrir caso ${UI.ico("arrow")}</button>
      </div>
    </li>`;
  }

  function desenhar() {
    db = DB.ler();

    const n = {};
    Object.keys(FILTROS).forEach((k) => { n[k] = db.casos.filter(FILTROS[k]).length; });

    document.querySelectorAll(".chip").forEach((b) => {
      const ativo = b.dataset.f === filtro;
      b.classList.toggle("is-active", ativo);
      b.setAttribute("aria-pressed", String(ativo));
      b.querySelector(".count").textContent = n[b.dataset.f];
    });
    Object.keys(n).forEach((k) => { $(`k-${k}`).textContent = n[k]; });
    $("dot").hidden = n.pendentes === 0;

    /* Cartão de caso grave */
    $("grave-card").hidden = n.graves === 0;
    $("grave-titulo").innerHTML = `Você tem <span class="red">${UI.plural(n.graves, "caso grave", "casos graves")}</span>`;

    /* Lista (filtro + busca + paginação) */
    const q = UI.norm(busca);
    const lista = db.casos
      .filter(FILTROS[filtro])
      .filter((c) => !q || UI.norm([c.nome, c.papel, ...c.remedios].join(" ")).includes(q))
      .sort(prioridade);

    const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    pagina = Math.min(pagina, paginas);
    const fatia = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

    $("casos").innerHTML = fatia.map(cartao).join("");
    $("vazio").hidden = lista.length > 0;
    $("contagem").textContent = lista.length ? `Mostrando ${fatia.length} de ${lista.length} casos` : "";

    let pager = "";
    if (paginas > 1) {
      pager += `<button type="button" data-p="${pagina - 1}" aria-label="Página anterior" ${pagina === 1 ? "disabled" : ""}>${UI.ico("chevronLeft")}</button>`;
      for (let i = 1; i <= paginas; i++) {
        pager += `<button type="button" data-p="${i}" class="${i === pagina ? "is-active" : ""}" ${i === pagina ? 'aria-current="page"' : ""}>${i}</button>`;
      }
      pager += `<button type="button" data-p="${pagina + 1}" aria-label="Próxima página" ${pagina === paginas ? "disabled" : ""}>${UI.ico("chevron")}</button>`;
    }
    $("pager").innerHTML = pager;

    /* Histórico: últimas revisões concluídas */
    const hist = db.casos.filter((c) => !pendente(c))
      .sort((a, b) => (b.revisadoEm || b.criadoEm) - (a.revisadoEm || a.criadoEm))
      .slice(0, 4);
    $("historico").innerHTML = hist.map((c) => `<li class="hist">
      <span class="circle circle--ok" style="--s:44px">${UI.ico("check")}</span>
      <div><p class="hist-nome">${UI.esc(c.nome)}</p><p class="hist-sub">Orientação confirmada</p></div>
      <time>${UI.dataBR(c.revisadoEm || c.criadoEm)}</time></li>`).join("");
    $("hist-vazio").hidden = hist.length > 0;
  }

  /* ---------- Eventos ---------- */
  document.querySelector(".filters").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    filtro = b.dataset.f;
    pagina = 1;
    desenhar();
  });

  $("busca").addEventListener("input", (e) => { busca = e.target.value; pagina = 1; desenhar(); });

  $("pager").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-p]");
    if (!b || b.disabled) return;
    pagina = Number(b.dataset.p);
    desenhar();
  });

  $("grave-card").addEventListener("click", (e) => {
    e.preventDefault();
    filtro = "graves";
    pagina = 1;
    desenhar();
    $("casos-titulo").scrollIntoView({ behavior: "smooth" });
  });

  /* ---------- Janela do caso ---------- */
  const dlg = $("dlg");

  $("casos").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-id]");
    if (!b) return;
    aberto = db.casos.find((c) => c.id === Number(b.dataset.id));
    if (!aberto) return;

    $("dlg-titulo").textContent = aberto.nome;
    $("dlg-corpo").innerHTML = `
      <div><dt>Tipo</dt><dd>${TAGS[aberto.tipo]}</dd></div>
      <div><dt>Enviado por</dt><dd>${UI.esc(aberto.papel)}</dd></div>
      <div><dt>Remédios</dt><dd>${aberto.remedios.map((r) => UI.esc(r)).join(" + ")}</dd></div>
      <div><dt>Situação</dt><dd>${aberto.resumo ? UI.esc(aberto.resumo) : "Aguardando análise do farmacêutico."}</dd></div>`;
    $("dlg-revisar").hidden = !pendente(aberto);
    dlg.showModal();
  });

  $("dlg-fechar").addEventListener("click", () => dlg.close());

  $("dlg-revisar").addEventListener("click", () => {
    if (aberto) DB.revisar(aberto.id);
    dlg.close();
    desenhar();
  });

  $("sair-btn").addEventListener("click", () => Auth.sair());
  UI.menuConta();
  desenhar();
})();
