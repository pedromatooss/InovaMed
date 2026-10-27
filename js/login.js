(() => {
  "use strict";

  const form = document.getElementById("login-panel");
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const cpf = document.getElementById("cpf");
  const nascimento = document.getElementById("nascimento");
  const cpfErro = document.getElementById("cpf-erro");
  const nascErro = document.getElementById("nascimento-erro");
  const status = document.getElementById("form-status");

  let perfilAtual = "paciente";

  /* ---------- Abas (com navegação por setas) ---------- */
  function selecionarAba(tab) {
    tabs.forEach((t) => {
      const ativa = t === tab;
      t.classList.toggle("is-active", ativa);
      t.setAttribute("aria-selected", String(ativa));
      t.tabIndex = ativa ? 0 : -1;
    });
    perfilAtual = tab.dataset.perfil;
    form.setAttribute("aria-labelledby", tab.id);
    limparErros();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => selecionarAba(tab));
    tab.addEventListener("keydown", (e) => {
      let destino = null;
      if (e.key === "ArrowRight") destino = tabs[(i + 1) % tabs.length];
      if (e.key === "ArrowLeft") destino = tabs[(i - 1 + tabs.length) % tabs.length];
      if (destino) {
        e.preventDefault();
        destino.focus();
        selecionarAba(destino);
      }
    });
  });

  /* ---------- Máscaras ---------- */
  const soDigitos = (v) => v.replace(/\D/g, "");

  function mascaraCPF(v) {
    return soDigitos(v).slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function mascaraData(v) {
    return soDigitos(v).slice(0, 8)
      .replace(/(\d{2})(\d)/, "$1/$2")
      .replace(/(\d{2})(\d)/, "$1/$2");
  }

  cpf.addEventListener("input", () => { cpf.value = mascaraCPF(cpf.value); });
  nascimento.addEventListener("input", () => { nascimento.value = mascaraData(nascimento.value); });

  /* ---------- Validação ---------- */
  function cpfValido(valor) {
    const n = soDigitos(valor);
    if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;

    const digito = (base) => {
      let soma = 0;
      for (let i = 0; i < base; i++) soma += Number(n[i]) * (base + 1 - i);
      const resto = (soma * 10) % 11;
      return resto === 10 ? 0 : resto;
    };
    return digito(9) === Number(n[9]) && digito(10) === Number(n[10]);
  }

  function dataValida(valor) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
    if (!m) return false;
    const [d, mes, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const data = new Date(a, mes - 1, d);
    return (
      data.getFullYear() === a &&
      data.getMonth() === mes - 1 &&
      data.getDate() === d &&
      data <= new Date() &&
      a >= 1900
    );
  }

  function mostrarErro(input, el, msg) {
    input.setAttribute("aria-invalid", "true");
    el.textContent = msg;
    el.hidden = false;
  }

  function limparErro(input, el) {
    input.removeAttribute("aria-invalid");
    el.textContent = "";
    el.hidden = true;
  }

  function limparErros() {
    limparErro(cpf, cpfErro);
    limparErro(nascimento, nascErro);
    status.hidden = true;
    status.textContent = "";
  }

  cpf.addEventListener("input", () => limparErro(cpf, cpfErro));
  nascimento.addEventListener("input", () => limparErro(nascimento, nascErro));

  /* ---------- Envio ---------- */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    limparErros();

    let primeiroInvalido = null;

    if (!cpfValido(cpf.value)) {
      mostrarErro(cpf, cpfErro, "Informe um CPF válido.");
      primeiroInvalido = cpf;
    }
    if (!dataValida(nascimento.value)) {
      mostrarErro(nascimento, nascErro, "Informe uma data válida (dd/mm/aaaa).");
      primeiroInvalido = primeiroInvalido || nascimento;
    }
    if (primeiroInvalido) {
      primeiroInvalido.focus();
      return;
    }

    const payload = {
      perfil: perfilAtual,
      cpf: soDigitos(cpf.value),
      nascimento: nascimento.value, // dd/mm/aaaa
    };

    // TODO: validar na API de autenticação (CPF + data de nascimento + perfil)
    const destino = Auth.rotas[payload.perfil];

    if (!destino) {
      status.textContent = "O acesso para este perfil ainda não está disponível.";
      status.hidden = false;
      return;
    }

    Auth.salvar({ perfil: payload.perfil, cpf: payload.cpf });
    location.href = destino;
  });
})();