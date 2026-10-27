/* Sessão simulada (sem backend). Trocar por autenticação real da API. */
const Auth = (() => {
  "use strict";
  const KEY = "sm.sessao";

  const rotas = {
    paciente: "home-paciente.html",
    cuidador: "home-cuidador.html",
    farmaceutico: "home-farmaceutico.html",
  };

  function salvar(sessao) {
    try { sessionStorage.setItem(KEY, JSON.stringify(sessao)); } catch (_) {}
  }

  function obter() {
    try { return JSON.parse(sessionStorage.getItem(KEY)); } catch (_) { return null; }
  }

  function sair() {
    try { sessionStorage.removeItem(KEY); } catch (_) {}
    location.replace("index.html");
  }

  /* Bloqueia a página se não houver sessão do perfil exigido (aceita um perfil ou uma lista). */
  function exigir(perfil) {
    const s = obter();
    if (s && [].concat(perfil).includes(s.perfil)) return s;
    document.documentElement.hidden = true;
    location.replace("index.html");
    return null;
  }

  return { salvar, obter, sair, exigir, rotas };
})();