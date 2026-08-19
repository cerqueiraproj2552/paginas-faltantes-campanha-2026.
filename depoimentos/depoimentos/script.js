/* =========================================================
   Ricardinho 55550 · site de campanha
   ========================================================= */
(function () {
  'use strict';

  /* =======================================================
     1. CONFIGURAÇÃO
     Estas quatro linhas são as únicas que precisam ser trocadas
     quando a coordenação mandar os dados.
     ======================================================= */
  var CONFIG = {
    LINK_GRUPO: 'https://chat.whatsapp.com/COLE_AQUI_O_LINK_DO_GRUPO',
    PIXEL_ID: '',
    ENDPOINT_FORM: '',
    TEXTO_COMPARTILHAR: 'Conheça a história do Ricardinho, candidato a deputado estadual. A nossa caminhada já começou: '
  };

  var grupoConfigurado = CONFIG.LINK_GRUPO.indexOf('COLE_AQUI') === -1;

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =======================================================
     2. META PIXEL
     Regra da casa: "Lead" que conta todo clique de WhatsApp mente.
     Clique em WhatsApp entra como evento próprio; Lead só no cadastro.
     ======================================================= */
  function iniciaPixel() {
    if (!CONFIG.PIXEL_ID) return;
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', CONFIG.PIXEL_ID);
    window.fbq('track', 'PageView');
  }
  function evento(nome, dados) { if (window.fbq) window.fbq('trackCustom', nome, dados || {}); }

  /* =======================================================
     3. BOTÕES DE WHATSAPP
     ======================================================= */
  function ligaWhatsApp() {
    $$('[data-wa]').forEach(function (a) {
      a.setAttribute('href', CONFIG.LINK_GRUPO);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
      a.addEventListener('click', function () {
        evento('CliqueWhatsApp', { origem: a.getAttribute('data-evento') || 'sem-origem' });
      });
    });
    if (!grupoConfigurado) {
      console.warn('[Ricardinho] Link do grupo de WhatsApp não configurado. ' +
                   'Troque CONFIG.LINK_GRUPO no início de script.js antes de publicar.');
    }
  }

  /* =======================================================
     3b. ABERTURA · interação com o cursor
     ======================================================= */
  function economizandoDados() {
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c) return false;
    if (c.saveData) return true;
    return /^(slow-)?2g$/.test(c.effectiveType || '');
  }

  /* O vídeo saiu em 16/08: a imagem estática rende mais nitidez, pesa 242 KB
     contra 7,4 MB, e o movimento passou a ser do CSS. Sem vídeo não existe mais
     problema de codec, de autoplay bloqueado nem de economia de dados. */

  function ligaInteracaoAbertura() {
    var hero = $('#topo');
    var figura = $('#heroFigura');
    if (!hero || semMovimento) return;
    if (!window.matchMedia('(pointer:fine)').matches) return;

    var alvoX = 0, alvoY = 0, x = 0, y = 0, rodando = false;

    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      hero.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      hero.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      /* inclinação em vez de deslocamento: ele fica colado no rodapé e só
         gira levemente, com o pivô na base. Ângulos pequenos de propósito. */
      alvoX = (px - 0.5) * 5.0;    /* giro no eixo vertical */
      alvoY = (py - 0.5) * -3.0;   /* giro no eixo horizontal */
      if (!rodando) { rodando = true; window.requestAnimationFrame(passo); }
    }, { passive: true });

    hero.addEventListener('pointerleave', function () {
      alvoX = 0; alvoY = 0;
      hero.style.setProperty('--mx', '68%');
      hero.style.setProperty('--my', '26%');
      if (!rodando) { rodando = true; window.requestAnimationFrame(passo); }
    });

    function passo() {
      x += (alvoX - x) * 0.08;    /* amortecimento: o movimento chega atrasado e suave */
      y += (alvoY - y) * 0.08;
      /* Três planos de profundidade: a cidade se move pouco e em sentido
         contrário; o número ocupa o plano intermediário; a figura inclina. */
      hero.style.setProperty('--bg-x', (-x * 2.4).toFixed(2) + 'px');
      hero.style.setProperty('--bg-y', (-y * 2.7).toFixed(2) + 'px');
      hero.style.setProperty('--num-x', (-x * 4).toFixed(2) + 'px');
      hero.style.setProperty('--num-y', (-y * 4).toFixed(2) + 'px');
      if (figura) figura.style.transform =
        'perspective(1400px) rotateY(' + x.toFixed(2) + 'deg) rotateX(' + y.toFixed(2) + 'deg)';
      if (Math.abs(alvoX - x) > 0.1 || Math.abs(alvoY - y) > 0.1) window.requestAnimationFrame(passo);
      else rodando = false;
    }
  }

  /* =======================================================
     4. CENAS · a camada de fundo que nunca recarrega
     A seção que estiver cruzando o meio da tela manda na cena.
     Seção sem cena própria (mosaico, linha do tempo) mantém a anterior,
     porque o conteúdo dela já cobre o fundo inteiro.
     ======================================================= */
  function ligaCenas() {
    var cenas   = $$('.fundo__cena');
    var secoes  = $$('.palco .tela, .palco .cam');
    var varrida = $('.varrida');
    if (!cenas.length || !secoes.length || !('IntersectionObserver' in window)) return;

    var atual = 'abertura';
    var primeira = true;

    /* As cinco cenas vivem numa camada `fixed` que cobre a tela, então todas
       contam como visíveis e `loading="lazy"` não segura nenhuma: as quatro de
       dentro do palco desciam junto com a abertura, 470 KB medidos. Elas nascem
       em data-src e só viram src aqui. */
    function carregaCena(c) {
      if (c.getAttribute('data-carregada')) return;
      c.setAttribute('data-carregada', '1');
      var s = c.querySelector('source[data-srcset]');
      if (s) { s.srcset = s.getAttribute('data-srcset'); s.removeAttribute('data-srcset'); }
      var i = c.querySelector('img[data-src]');
      if (i) { i.src = i.getAttribute('data-src'); i.removeAttribute('data-src'); }
    }

    function mostra(nome) {
      if (!nome || nome === atual) return;
      atual = nome;
      cenas.forEach(function (c) {
        var minha = c.getAttribute('data-cena') === nome;
        if (minha) carregaCena(c);
        c.classList.toggle('on', minha);
      });
    }

    /* Aquecimento: depois que o essencial já desceu, as cenas restantes entram
       em silêncio, uma de cada vez. Sem isso, quem rola rápido pegaria a cena
       ainda em branco na primeira dissolução. */
    function aquece() {
      var fila = cenas.filter(function (c) { return !c.getAttribute('data-carregada'); });
      (function proxima() {
        var c = fila.shift();
        if (!c) return;
        carregaCena(c);
        var i = c.querySelector('img');
        if (i && !i.complete) i.addEventListener('load', function () { setTimeout(proxima, 120); }, { once: true });
        else setTimeout(proxima, 120);
      })();
    }
    if (!economizandoDados()) {
      if (document.readyState === 'complete') setTimeout(aquece, 2500);
      else window.addEventListener('load', function () { setTimeout(aquece, 2500); });
    }

    function varre() {
      if (semMovimento || !varrida || primeira) { primeira = false; return; }
      varrida.classList.remove('vai');
      void varrida.offsetWidth;            /* reinicia a animação */
      varrida.classList.add('vai');
    }

    var obs = new IntersectionObserver(function (linhas) {
      linhas.forEach(function (l) {
        if (!l.isIntersecting) return;
        var sec = l.target;
        sec.classList.add('vis');
        varre();
        mostra(sec.getAttribute('data-cena'));
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

    secoes.forEach(function (s) {
      s.classList.add('aguarda');
      obs.observe(s);
    });
  }

  /* O número fecha a linha do tempo: quando a seção entra na tela, os dígitos
     correm de 00000 até 55550 uma vez só. A contagem acontecia dentro do
     "Quem é", presa ao percurso de scroll daquela seção; aqui ela é um evento
     de entrada, e não uma barra de progresso. */
  function ligaContadorNumero() {
    var sec = $('#numero');
    if (!sec) return;
    var contador = $('.numero__digitos span', sec);
    if (!contador) return;

    /* Sem movimento, sem contagem: o número já nasce escrito. */
    if (semMovimento || !('IntersectionObserver' in window)) {
      sec.classList.add('acesa');
      contador.textContent = '55550';
      return;
    }

    var contou = false;
    function conta() {
      if (contou) return;
      contou = true;
      sec.classList.add('acesa');
      var inicio = performance.now();
      var duracao = 1450;
      function quadro(agora) {
        var t = Math.max(0, Math.min(1, (agora - inicio) / duracao));
        var suave = 1 - Math.pow(1 - t, 4);
        contador.textContent = String(Math.round(55550 * suave)).padStart(5, '0');
        if (t < 1) window.requestAnimationFrame(quadro);
        else contador.textContent = '55550';
      }
      window.requestAnimationFrame(quadro);
    }

    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { if (e.isIntersecting) { conta(); obs.disconnect(); } });
    }, { rootMargin: '-25% 0px -25% 0px', threshold: 0 });
    obs.observe(sec);
  }

  /* =======================================================
     5. A CAMINHADA · slides de tela cheia
     O scroll vertical empurra os slides para o lado. No celular o dedo
     também desliza na horizontal, e o gesto vira rolagem da página.
     Com movimento reduzido nada disso roda e os slides empilham.
     ======================================================= */
  function ligaCaminhada() {
    var secao    = $('#caminhada');
    var janela   = $('#camJanela');
    var trilha   = $('#camTrilha');
    var preenche = $('#camPreenche');
    var dica     = $('#camDica');
    var atos     = $$('.cam__ato');
    var slides   = $$('.slide', trilha);
    if (!secao || !janela || !trilha || !slides.length) return;

    var percurso = 0, pedido = null, ativo = -1;
    var fotos = [
      'assets/img/caminhada-recorte-01545-v1.png',
      'assets/img/caminhada-recorte-00889-v1.png',
      'assets/img/caminhada-recorte-01320-v1.png'
    ];

    /* O mesmo palco troca apenas o retrato. Os recortes transparentes evitam
       que cada capítulo pareça uma nova seção encaixotada. */
    slides.forEach(function (slide, i) {
      var foto = $('.slide__foto', slide);
      var picture = foto && $('picture', foto);
      var img = picture && $('img', picture);
      if (!foto || !picture || !img) return;
      foto.classList.add('slide__foto--recorte');
      $$('source', picture).forEach(function (source) { source.remove(); });
      img.src = fotos[i % fotos.length];
      img.removeAttribute('width');
      img.removeAttribute('height');
      img.alt = 'Ricardinho';

      /* Capítulo da liderança jovem: aqui a força está no registro real da
         multidão, por isso a imagem entra inteira como fotografia emoldurada. */
      if (i === 2) {
        foto.classList.remove('slide__foto--recorte');
        foto.classList.add('slide__foto--moldura');
        img.src = 'assets/img/caminhada-img-1939-v1.webp';
        img.alt = 'Ricardinho falando ao microfone diante de uma multidão de jovens.';
      }
      if (i === 3 || i === 4) {
        foto.classList.remove('slide__foto--recorte');
        foto.classList.add('slide__foto--moldura', 'slide__foto--paisagem');
        img.src = i === 3
          ? 'assets/img/caminhada-jesus-litoral-v1.webp'
          : 'assets/img/caminhada-sentinelas-v1.webp';
        img.alt = i === 3
          ? 'Jovens missionários reunidos na praia durante o Jesus no Litoral.'
          : 'Jovens reunidos durante um encontro dos Sentinelas da Manhã.';
      }
      if (i === 5) {
        img.src = 'assets/img/caminhada-apresentador-recorte-v4.png';
        img.alt = 'Ricardinho de camisa clara apontando enquanto apresenta.';
      }
      if (i === 6) {
        foto.classList.remove('slide__foto--recorte');
        /* ⚠️ 'slide__foto--43' porque esta foto é 4:3 e as outras paisagens são
           3:2. Sem ela o quadro cortava 13% da imagem, e é foto de família,
           onde o corte tira gente da borda. Trocar a foto pede conferir a
           proporção do arquivo e a classe. */
        foto.classList.add('slide__foto--moldura', 'slide__foto--paisagem', 'slide__foto--43');
        img.src = 'assets/img/familia-1600.webp';
        img.alt = 'Ricardinho reunido com a esposa e os dois filhos.';
      }
      if (i === 8) {
        foto.classList.remove('slide__foto--recorte');
        foto.classList.add('slide__foto--moldura', 'slide__foto--quadrada');
        img.src = 'assets/img/governador-1600.webp';
        img.alt = 'Ricardinho ao lado do governador Ratinho Junior, com ônibus escolares ao fundo.';
      }
    });

    function marcaAto(i) {
      var ato = slides[i] ? slides[i].getAttribute('data-ato') : '0';
      atos.forEach(function (el) { el.classList.toggle('on', el.getAttribute('data-ato') === ato); });
    }

    function pinta(p) {
      var i = Math.min(slides.length - 1, Math.floor(p * slides.length));
      if (p >= .999) i = slides.length - 1;
      if (i !== ativo) {
        ativo = i;
        slides.forEach(function (slide, indice) {
          slide.classList.toggle('ativo', indice === i);
          slide.classList.toggle('passou', indice < i);
        });
        marcaAto(i);
      }
      if (preenche) preenche.style.height = Math.max(6, ((i + 1) / slides.length) * 100) + '%';
    }

    /* ⚠️ A seção começa uma tela ACIMA de onde ela aparece, porque a família
       passa por cima dela e sai (o `margin-top` negativo no CSS). Esse trecho
       é o COLCHÃO: enquanto a família está saindo, a linha do tempo já está
       montada atrás, parada no primeiro slide. Sem descontar o colchão aqui,
       a revelação já consumiria ~15% do percurso e o segundo slide entraria
       antes de a pessoa ver o primeiro. */
    function colchao() { return window.innerHeight; }

    function mede() {
      percurso = Math.round((slides.length - 1) * window.innerHeight * (window.innerWidth >= 901 ? .68 : .8));
      secao.style.height = (window.innerHeight + percurso + colchao()) + 'px';
    }

    function anda() {
      pedido = null;
      var p = (window.pageYOffset - secao.offsetTop - colchao()) / (percurso || 1);
      p = Math.max(0, Math.min(1, p));
      pinta(p);
      if (dica && p > 0.02) dica.classList.add('some');
    }

    function noScroll() { if (pedido === null) pedido = window.requestAnimationFrame(anda); }

    mede();
    window.addEventListener('scroll', noScroll, { passive: true });
    anda();

    /* setas do teclado */
    janela.addEventListener('keydown', function (e) {
      if (!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      var frente = e.key === 'ArrowRight' || e.key === 'ArrowDown';
      var passo = (percurso / (slides.length - 1)) * (frente ? 1 : -1);
      window.scrollTo({ top: window.pageYOffset + passo, behavior: 'smooth' });
    });

    var tempo;
    window.addEventListener('resize', function () {
      clearTimeout(tempo);
      tempo = setTimeout(function () { mede(); anda(); }, 180);
    });
  }

  /* =======================================================
     6. REVELAÇÃO NA ZONA LIVRE
     A classe só entra por JS, então quem estiver sem JS vê tudo.
     ======================================================= */
  function ligaRevelacao() {
    if (semMovimento || !('IntersectionObserver' in window)) return;
    var alvos = $$('.livre .bloco, .livre .porta, .livre .feito__vem');
    alvos.forEach(function (el) { el.classList.add('rev'); });

    var obs = new IntersectionObserver(function (linhas) {
      linhas.forEach(function (l) {
        if (!l.isIntersecting) return;
        l.target.classList.add('vis');
        obs.unobserve(l.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.02 });

    alvos.forEach(function (el, i) {
      el.style.transitionDelay = (i % 3) * 70 + 'ms';
      obs.observe(el);
    });

    /* Trava de segurança: conteúdo invisível num site de campanha é pior
       que animação perdida. */
    setTimeout(function () {
      alvos.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('vis');
      });
    }, 2500);
  }

  /* =======================================================
     7. ATALHO FIXO DE WHATSAPP
     ======================================================= */
  function ligaAtalho() {
    var atalho = $('#atalho'), hero = $('#topo'), fim = $('#entrar');
    if (!atalho || !hero || !('IntersectionObserver' in window)) return;
    var passouHero = false, chegouFim = false;
    function decide() { atalho.classList.toggle('aparece', passouHero && !chegouFim); }

    new IntersectionObserver(function (l) { passouHero = !l[0].isIntersecting; decide(); },
      { threshold: 0.12 }).observe(hero);
    if (fim) new IntersectionObserver(function (l) { chegouFim = l[0].isIntersecting; decide(); },
      { threshold: 0.15 }).observe(fim);
  }

  /* =======================================================
     8. FORMULÁRIO DE APOIADOR
     ======================================================= */
  function mascaraTelefone(v) {
    var d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2)  return d.length ? '(' + d : '';
    if (d.length <= 6)  return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }

  function ligaFormulario() {
    var form = $('#formApoio'), aviso = $('#formAviso');
    if (!form) return;
    var zap = $('#fZap', form);
    zap.addEventListener('input', function () { zap.value = mascaraTelefone(zap.value); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = $('#fNome', form), bairro = $('#fBairro', form);
      var aceite = form.querySelector('input[name=aceite]');
      var falta = null;

      [nome, bairro, zap].forEach(function (c) {
        var vazio = c.value.trim().length < 2;
        c.setAttribute('aria-invalid', vazio ? 'true' : 'false');
        if (vazio && !falta) falta = c;
      });
      if (zap.value.replace(/\D/g, '').length < 10) {
        zap.setAttribute('aria-invalid', 'true');
        if (!falta) falta = zap;
      }
      if (falta) {
        aviso.className = 'form__aviso erro';
        aviso.textContent = 'Confira os campos em vermelho, por favor.';
        falta.focus(); return;
      }
      if (!aceite.checked) {
        aviso.className = 'form__aviso erro';
        aviso.textContent = 'Marque a autorização para continuar.';
        aceite.focus(); return;
      }

      var botao = form.querySelector('button[type=submit]');
      botao.disabled = true;
      aviso.className = 'form__aviso';
      aviso.textContent = 'Enviando...';

      function terminou() {
        aviso.className = 'form__aviso ok';
        aviso.textContent = grupoConfigurado
          ? 'Recebemos o seu contato. Abrindo o grupo do WhatsApp...'
          : 'Recebemos o seu contato. Obrigado por fazer parte.';
        evento('CadastroApoiador', { bairro: bairro.value.trim() });
        if (window.fbq) window.fbq('track', 'Lead');  /* Lead só aqui, nunca no clique de WhatsApp */
        form.reset();
        botao.disabled = false;
        if (grupoConfigurado) {
          setTimeout(function () { window.open(CONFIG.LINK_GRUPO, '_blank', 'noopener'); }, 900);
        }
      }

      /* Se a gravação falhar, a pessoa vai para o grupo do mesmo jeito. */
      if (!CONFIG.ENDPOINT_FORM) { terminou(); return; }

      fetch(CONFIG.ENDPOINT_FORM, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({
          nome: nome.value.trim(), bairro: bairro.value.trim(),
          whatsapp: zap.value.trim(), origem: document.referrer || 'direto'
        }).toString()
      }).then(terminou).catch(terminou);
    });
  }

  /* =======================================================
     9. COMPARTILHAR E REDES
     ======================================================= */
  function ligaCompartilhar() {
    var bt = $('#btCompartilhar');
    if (!bt) return;
    bt.addEventListener('click', function () {
      var url = window.location.origin + window.location.pathname;
      evento('Compartilhou');
      if (navigator.share) {
        navigator.share({ title: 'Ricardinho 55550', text: CONFIG.TEXTO_COMPARTILHAR, url: url }).catch(function () {});
      } else {
        window.open('https://wa.me/?text=' + encodeURIComponent(CONFIG.TEXTO_COMPARTILHAR + url), '_blank', 'noopener');
      }
    });
  }
  function ligaRedes() {
    $$('[data-evento=instagram]').forEach(function (a) {
      a.addEventListener('click', function () { evento('CliqueInstagram'); });
    });
  }

  /* =======================================================
     PARTIDA
     ======================================================= */
  /* =======================================================
     MENU
     ======================================================= */
  function ligaMenu() {
    var bt = $('#menuBotao'), lista = $('#menuLista');
    if (!bt || !lista) return;
    bt.addEventListener('click', function () {
      var aberto = bt.getAttribute('aria-expanded') === 'true';
      bt.setAttribute('aria-expanded', String(!aberto));
      lista.classList.toggle('aberto', !aberto);
    });
    lista.addEventListener('click', function (e) {
      if (e.target.tagName !== 'A') return;
      bt.setAttribute('aria-expanded', 'false');
      lista.classList.remove('aberto');
    });
  }

  function inicia() {
    iniciaPixel();
    ligaWhatsApp();
    ligaMenu();
    ligaInteracaoAbertura();
    ligaCenas();
    ligaContadorNumero();
    ligaCaminhada();
    ligaRevelacao();
    ligaAtalho();
    ligaFormulario();
    ligaCompartilhar();
    ligaRedes();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicia);
  else inicia();
})();
