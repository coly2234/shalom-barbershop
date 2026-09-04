/*
 * Consentimento de cookies (LGPD) — Shalom Barbershop
 * Sem dependências externas. Compatível com navegadores mobile.
 *
 * Categorias:
 *  - necessary   : sempre ativos (não aparecem como opção, pois são essenciais)
 *  - analytics   : Google Analytics
 *  - marketing   : Meta Pixel / anúncios
 *
 * Observação sobre iOS Safari: o evento "beforeunload" não é confiável
 * nesse navegador (a aba pode ser suspensa sem disparar o evento). Por
 * isso a limpeza de cookies não essenciais usa "pagehide" e o estado
 * "hidden" de "visibilitychange", que são disparados de forma muito mais
 * consistente em iOS quando o usuário sai da página ou troca de app.
 */
(function () {
  "use strict";

  var COOKIE_NAME = "cookie_consent";
  var COOKIE_DAYS = 180; // 6 meses
  // Cookies que devem sobreviver à limpeza (sessão de login, o próprio
  // cookie de consentimento, e cookies técnicos do servidor, se houver).
  var ESSENTIAL_COOKIES = [COOKIE_NAME, "session_id", "csrftoken"];

  // ---------- utilidades de cookie ----------
  function setCookie(name, value, days) {
    var expires = "";
    if (days) {
      var d = new Date();
      d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
      expires = "; expires=" + d.toUTCString();
    }
    document.cookie =
      name + "=" + encodeURIComponent(value) + expires + "; path=/; SameSite=Lax";
  }

  function getCookie(name) {
    var match = document.cookie.match(
      new RegExp("(^| )" + name + "=([^;]+)")
    );
    return match ? decodeURIComponent(match[2]) : null;
  }

  function deleteCookie(name) {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    // tenta também sem path, e em possíveis subdomínios do host atual
    document.cookie =
      name +
      "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=" +
      window.location.hostname;
  }

  function clearNonEssentialCookies() {
    document.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].trim();
      if (!name) return;
      if (ESSENTIAL_COOKIES.indexOf(name) === -1) {
        deleteCookie(name);
      }
    });
  }

  // Dispara em navegação para fora do site e em troca de aba/app.
  // pagehide cobre Safari/iOS (beforeunload não é confiável lá);
  // visibilitychange cobre o caso do usuário simplesmente minimizar
  // o navegador ou trocar de app sem fechar a aba.
  window.addEventListener("pagehide", clearNonEssentialCookies);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      clearNonEssentialCookies();
    }
  });

  // ---------- carregamento condicional de scripts de rastreamento ----------
  function loadAnalytics() {
    if (window.__analyticsLoaded) return;
    window.__analyticsLoaded = true;
    // Substitua GA_MEASUREMENT_ID pelo ID real do Google Analytics.
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID";
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", "GA_MEASUREMENT_ID");
  }

  function loadMarketing() {
    if (window.__marketingLoaded) return;
    window.__marketingLoaded = true;
    // Substitua PIXEL_ID pelo ID real do Meta Pixel, se for usado.
    // Deixado como placeholder — só é chamado se o usuário consentir.
  }

  function applyConsent(consent) {
    if (consent.analytics) loadAnalytics();
    if (consent.marketing) loadMarketing();
  }

  // ---------- banner / painel de preferências ----------
  function saveConsent(consent) {
    consent.timestamp = new Date().toISOString();
    setCookie(COOKIE_NAME, JSON.stringify(consent), COOKIE_DAYS);
    applyConsent(consent);
    hideBanner();
  }

  function hideBanner() {
    var el = document.getElementById("cookie-banner");
    if (el) el.remove();
    var modal = document.getElementById("cookie-modal");
    if (modal) modal.remove();
  }

  function buildBanner() {
    var wrap = document.createElement("div");
    wrap.id = "cookie-banner";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-live", "polite");
    wrap.setAttribute("aria-label", "Aviso de cookies");
    wrap.innerHTML =
      '<div class="cc-inner">' +
      '<p class="cc-text">Usamos cookies para melhorar sua experiência e entender como o site é usado. ' +
      'Você pode aceitar todos, rejeitar os não essenciais ou personalizar sua escolha. ' +
      'Saiba mais na nossa <a href="privacidade.html">Política de Privacidade</a>.</p>' +
      '<div class="cc-actions">' +
      '<button type="button" class="cc-btn cc-btn-ghost" data-cc="customize">Personalizar</button>' +
      '<button type="button" class="cc-btn cc-btn-outline" data-cc="reject">Rejeitar não essenciais</button>' +
      '<button type="button" class="cc-btn cc-btn-solid" data-cc="accept">Aceitar todos</button>' +
      "</div></div>";
    document.body.appendChild(wrap);

    wrap.querySelector('[data-cc="accept"]').addEventListener("click", function () {
      saveConsent({ necessary: true, analytics: true, marketing: true });
    });
    wrap.querySelector('[data-cc="reject"]').addEventListener("click", function () {
      saveConsent({ necessary: true, analytics: false, marketing: false });
    });
    wrap.querySelector('[data-cc="customize"]').addEventListener("click", buildModal);
  }

  function buildModal() {
    if (document.getElementById("cookie-modal")) return;
    var modal = document.createElement("div");
    modal.id = "cookie-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Personalizar cookies");
    modal.innerHTML =
      '<div class="cc-modal-box">' +
      "<h2>Personalizar cookies</h2>" +
      '<label class="cc-row"><span><strong>Necessários</strong><br>Essenciais para o funcionamento do site. Não podem ser desativados.</span>' +
      '<input type="checkbox" checked disabled></label>' +
      '<label class="cc-row"><span><strong>Analíticos</strong><br>Ajudam a entender como o site é usado (ex.: Google Analytics).</span>' +
      '<input type="checkbox" id="cc-analytics" checked></label>' +
      '<label class="cc-row"><span><strong>Marketing</strong><br>Usados para anúncios personalizados (ex.: Meta Pixel).</span>' +
      '<input type="checkbox" id="cc-marketing" checked></label>' +
      '<div class="cc-actions">' +
      '<button type="button" class="cc-btn cc-btn-outline" data-cc="cancel">Cancelar</button>' +
      '<button type="button" class="cc-btn cc-btn-solid" data-cc="save">Salvar preferências</button>' +
      "</div></div>";
    document.body.appendChild(modal);

    modal.querySelector('[data-cc="cancel"]').addEventListener("click", function () {
      modal.remove();
    });
    modal.querySelector('[data-cc="save"]').addEventListener("click", function () {
      saveConsent({
        necessary: true,
        analytics: document.getElementById("cc-analytics").checked,
        marketing: document.getElementById("cc-marketing").checked,
      });
    });
  }

  function init() {
    var raw = getCookie(COOKIE_NAME);
    if (raw) {
      try {
        applyConsent(JSON.parse(raw));
      } catch (e) {
        /* cookie corrompido — trata como se não houvesse consentimento */
      }
      return;
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", buildBanner);
    } else {
      buildBanner();
    }
  }

  // Exposto para o link "Preferências de cookies" no rodapé.
  window.openCookiePreferences = function () {
    hideBanner();
    buildBanner();
    buildModal();
  };

  init();
})();
