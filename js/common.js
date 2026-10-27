/* Utilitários compartilhados: ícones, formatadores e dados simulados.
   TODO: trocar o DB (localStorage) por chamadas à API real. */
const UI = (() => {
  "use strict";

  const P = {
    pill: '<path d="M10.5 20.5a5 5 0 0 1-7-7l9-9a5 5 0 0 1 7 7z"/><path d="m8.5 8.5 7 7"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v5M12 18v.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.7 0 4.5 1.8 4.5 4.5"/>',
    doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7M9 8h3"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    chevronLeft: '<path d="m15 5-7 7 7 7"/>',
    chevronUp: '<path d="m6 15 6-6 6 6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    logout: '<path d="M9 4H5v16h4"/><path d="m16 8 4 4-4 4M20 12H10"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    medkit: '<rect x="5" y="7" width="14" height="14" rx="3"/><path d="M9 7V4h6v3M12 11v6M9 14h6"/>',
  };

  const ico = (nome, cls = "") =>
    `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[nome]}</svg>`;

  /* Troca <i data-ico="nome"></i> do HTML estático pelo SVG correspondente */
  const hidratar = () =>
    document.querySelectorAll("[data-ico]").forEach((el) => {
      el.outerHTML = ico(el.dataset.ico, el.className);
    });

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* minúsculas e sem acento, para comparar textos */
  const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const dataBR = (ts) => new Date(ts).toLocaleDateString("pt-BR");
  const haH = (ts) => `${Math.max(1, Math.round((Date.now() - ts) / 36e5))}h atrás`;
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

  /* Menu da conta (avatar → Sair) */
  function menuConta() {
    const btn = document.getElementById("profile-btn");
    const menu = document.getElementById("profile-menu");
    const sair = document.getElementById("logout-btn");
    if (!btn || !menu) return;
    const alternar = (abrir) => {
      btn.setAttribute("aria-expanded", String(abrir));
      menu.hidden = !abrir;
    };
    btn.addEventListener("click", (e) => { e.stopPropagation(); alternar(menu.hidden); });
    document.addEventListener("click", (e) => { if (!menu.hidden && !menu.contains(e.target)) alternar(false); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !menu.hidden) { alternar(false); btn.focus(); }
    });
    if (sair) sair.addEventListener("click", () => Auth.sair());
  }

  document.addEventListener("DOMContentLoaded", hidratar);
  return { ico, hidratar, esc, norm, dataBR, haH, plural, menuConta };
})();

/* Dados simulados, compartilhados entre os perfis (mesmo navegador). */
const DB = (() => {
  "use strict";
  const KEY = "sm.db.v1";
  const hAtras = (n) => Date.now() - n * 36e5;
  const R = (nome, dose, uso) => ({ nome, dose, uso });

  const semente = () => ({
    dependentes: ["antonio", "raimunda"], // dependentes do cuidador logado
    pessoas: {
      raimunda: {
        nome: "Dona Raimunda",
        remedios: [R("Losartana", "50mg", "1x ao dia"), R("Metformina", "850mg", "2x ao dia"), R("Atenolol", "50mg", "1x ao dia")],
      },
      antonio: {
        nome: "Seu Antônio",
        remedios: [
          R("Atorvastatina", "20mg", "1x ao dia"), R("Losartana", "50mg", "1x ao dia"),
          R("Metformina", "850mg", "2x ao dia"), R("AAS", "100mg", "1x ao dia"),
          R("Hidroclorotiazida", "25mg", "1x ao dia"),
        ],
      },
    },
    casos: [
      { id: 1, pessoa: "raimunda", nome: "Dona Raimunda", papel: "Paciente", tipo: "grave", remedios: ["Losartana", "Ibuprofeno"], resumo: "Risco de aumento da pressão arterial e lesão renal.", criadoEm: hAtras(2), prazoH: 24, status: "pendente" },
      { id: 2, pessoa: "antonio", nome: "Seu Antônio", papel: "Cuidador", tipo: "novo", remedios: ["Atorvastatina", "Omeprazol"], criadoEm: hAtras(5), prazoH: 48, status: "pendente" },
      { id: 3, pessoa: null, nome: "Maria José", papel: "Paciente", tipo: "novo", remedios: ["Metformina", "AAS"], criadoEm: hAtras(7), prazoH: 48, status: "pendente" },
      { id: 4, pessoa: null, nome: "Carlos Eduardo", papel: "Paciente", tipo: "orientacao", remedios: ["Amoxicilina", "Prednisona"], criadoEm: hAtras(9), prazoH: 72, status: "pendente" },
      { id: 5, pessoa: null, nome: "Lívia Santos", papel: "Paciente", tipo: "novo", remedios: ["Sertralina", "Dipirona"], criadoEm: hAtras(12), prazoH: 72, status: "pendente" },
      { id: 6, pessoa: "antonio", nome: "Seu Antônio", papel: "Cuidador", tipo: "novo", remedios: ["Losartana"], criadoEm: new Date("2026-10-20T10:00:00").getTime(), revisadoEm: new Date("2026-10-21T09:00:00").getTime(), prazoH: 48, status: "revisado" },
      { id: 7, pessoa: null, nome: "Ana Paula", papel: "Paciente", tipo: "grave", remedios: ["Fluoxetina", "Tramadol"], criadoEm: new Date("2026-10-16T10:00:00").getTime(), revisadoEm: new Date("2026-10-16T15:00:00").getTime(), prazoH: 24, status: "revisado" },
    ],
  });

  function gravar(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (_) {} }

  function ler() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && d.casos) return d;
    } catch (_) {}
    const s = semente();
    gravar(s);
    return s;
  }

  function novoCaso(caso) {
    const d = ler();
    const id = Math.max(0, ...d.casos.map((c) => c.id)) + 1;
    d.casos.push({ id, status: "pendente", criadoEm: Date.now(), prazoH: caso.tipo === "grave" ? 24 : 48, ...caso });
    gravar(d);
    return id;
  }

  function revisar(id) {
    const d = ler();
    const c = d.casos.find((x) => x.id === id);
    if (c) { c.status = "revisado"; c.revisadoEm = Date.now(); gravar(d); }
  }

  return { ler, gravar, novoCaso, revisar };
})();
