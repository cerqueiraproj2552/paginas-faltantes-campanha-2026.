/* =========================================================
   Ricardinho 55550 · Depoimentos em vídeo
   Roda depois de script.js (que já cuida do menu, do botão de
   WhatsApp e do atalho fixo). Este arquivo só liga o carrossel
   estilo Netflix e o modal de vídeo.

   PARA CADASTRAR UM DEPOIMENTO NOVO
   Duplique um <button class="depo-card"> dentro da fileira certa e troque:
   - data-video       → o ID do vídeo no YouTube (o trecho depois de "v=")
   - data-titulo      → nome da legenda que aparece no player
   - o <img>          → miniatura do depoimento (mesma pasta assets/img)
   Enquanto data-video estiver como "COLE_AQUI_O_ID_DO_VIDEO", o card
   avisa no console e não abre o modal, para ninguém publicar vídeo quebrado.
   ========================================================= */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* =======================================================
     1. CARROSSÉIS
     ======================================================= */
  function ligaCarrosseis() {
    $$('.depo-trilha-wrap').forEach(function (wrap) {
      var trilha = $('.depo-trilha', wrap);
      var esq = $('.depo-seta--esq', wrap);
      var dir = $('.depo-seta--dir', wrap);
      if (!trilha) return;

      function passo() { return trilha.clientWidth * 0.82; }
      if (esq) esq.addEventListener('click', function () {
        trilha.scrollBy({ left: -passo(), behavior: 'smooth' });
      });
      if (dir) dir.addEventListener('click', function () {
        trilha.scrollBy({ left: passo(), behavior: 'smooth' });
      });

      function atualizaSetas() {
        var fim = trilha.scrollWidth - trilha.clientWidth - 4;
        if (esq) esq.disabled = trilha.scrollLeft <= 4;
        if (dir) dir.disabled = trilha.scrollLeft >= fim;
      }
      trilha.addEventListener('scroll', atualizaSetas, { passive: true });
      atualizaSetas();
    });
  }

  /* =======================================================
     2. MODAL DE VÍDEO
     ======================================================= */
  function ligaModal() {
    var modal = $('#depoModal');
    if (!modal) return;
    var caixa    = $('.modal-video__caixa', modal);
    var legenda  = $('.modal-video__legenda', modal);
    var fechar   = $('.modal-video__fechar', modal);
    var ultimoFoco = null;

    function limpaFrame() {
      $$('iframe', caixa).forEach(function (f) { f.remove(); });
    }

    function abrir(idVideo, titulo) {
      ultimoFoco = document.activeElement;
      limpaFrame();
      var iframe = document.createElement('iframe');
      iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('title', titulo || 'Depoimento em vídeo');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + idVideo + '?autoplay=1&rel=0';
      caixa.insertBefore(iframe, caixa.firstChild);
      legenda.textContent = titulo || '';
      modal.hidden = false;
      requestAnimationFrame(function () { modal.classList.add('aberto'); });
      document.body.style.overflow = 'hidden';
      fechar.focus();
    }

    function fecharModal() {
      modal.classList.remove('aberto');
      document.body.style.overflow = '';
      window.setTimeout(function () {
        modal.hidden = true;
        limpaFrame();
        if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
      }, 260);
    }

    $$('[data-video]').forEach(function (card) {
      card.addEventListener('click', function () {
        var id = card.getAttribute('data-video');
        if (!id || id.indexOf('COLE_AQUI') === 0) {
          console.warn('[Depoimentos] Falta colar o ID do vídeo do YouTube em data-video deste card.');
          return;
        }
        abrir(id, card.getAttribute('data-titulo'));
      });
    });

    fechar.addEventListener('click', fecharModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) fecharModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('aberto')) fecharModal();
    });
  }

  function inicia() {
    ligaCarrosseis();
    ligaModal();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicia);
  else inicia();
})();
