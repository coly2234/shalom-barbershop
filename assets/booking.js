/*
 * Fluxo de agendamento com horários dinâmicos.
 *
 * Dia + profissional -> gera os horários possíveis a partir do
 * horário de funcionamento e da duração do serviço, remove os que já
 * estão ocupados (consultando o Firestore) e escuta em tempo real
 * (onSnapshot) enquanto o modal estiver aberto, para refletir
 * reservas feitas por outros clientes na hora.
 *
 * Ao confirmar, grava o agendamento numa transação que só cria o
 * documento se o horário ainda estiver livre — isso evita que dois
 * clientes fiquem com o mesmo horário se clicarem ao mesmo tempo.
 *
 * Sem configurar o Firebase (veja assets/firebase-config.js), o site
 * roda em modo de demonstração: mostra os horários, mas não bloqueia
 * entre clientes.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  runTransaction,
  onSnapshot,
  collection,
  query,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

(function () {
  "use strict";

  var WHATSAPP_NUMBER = "5586999252595";

  var PROFESSIONALS = [
    { id: "barbeiro1", name: "Barbeiro 1" },
    { id: "barbeiro2", name: "Barbeiro 2" },
    { id: "barbeiro3", name: "Barbeiro 3" },
  ];

  // Duração estimada de cada serviço, em minutos — usada para calcular
  // quantos horários cabem em cada bloco de funcionamento. Ajuste
  // conforme o tempo real de cada serviço.
  var DURATIONS = {
    "Corte": 30,
    "Barba": 20,
    "Corte + Barba": 45,
    "Degradê": 40,
  };
  var DEFAULT_DURATION = 30;
  var SLOT_STEP = 20; // granularidade dos horários, em minutos

  // Blocos de funcionamento por dia da semana (0=domingo ... 6=sábado).
  var HOURS = {
    0: [],
    1: [["09:00", "13:00"], ["15:00", "20:00"]],
    2: [["09:00", "13:00"], ["15:00", "20:00"]],
    3: [["09:00", "13:00"], ["15:00", "20:00"]],
    4: [["09:00", "13:00"], ["15:00", "20:00"]],
    5: [["09:00", "13:00"], ["15:00", "20:00"]],
    6: [["09:00", "16:00"]],
  };

  var WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  // ---------- Firebase ----------
  var DEMO_MODE = !window.SHALOM_FIREBASE_CONFIG || window.SHALOM_FIREBASE_CONFIG.apiKey === "SUA_API_KEY";
  var db = null;
  if (!DEMO_MODE) {
    try {
      var app = initializeApp(window.SHALOM_FIREBASE_CONFIG);
      db = getFirestore(app);
    } catch (e) {
      console.error("Falha ao iniciar o Firebase, caindo em modo de demonstração.", e);
      DEMO_MODE = true;
    }
  }

  // ---------- helpers de data/hora ----------
  function toMinutes(hhmm) {
    var parts = hhmm.split(":");
    return Number(parts[0]) * 60 + Number(parts[1]);
  }
  function fromMinutes(m) {
    var h = Math.floor(m / 60);
    var mm = m % 60;
    return String(h).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
  }
  function isoDate(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function nextDays(n) {
    var out = [];
    var today = new Date();
    for (var i = 0; i < n; i++) {
      var d = new Date(today);
      d.setDate(today.getDate() + i);
      out.push({
        date: d,
        label: String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"),
        weekday: WEEKDAYS[d.getDay()],
      });
    }
    return out;
  }
  function initials(name) {
    return name.split(" ").map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase();
  }
  function generateSlots(date, serviceName) {
    var duration = DURATIONS[serviceName] || DEFAULT_DURATION;
    var blocks = HOURS[date.getDay()] || [];
    var slots = [];
    blocks.forEach(function (b) {
      var start = toMinutes(b[0]);
      var end = toMinutes(b[1]);
      for (var t = start; t + duration <= end; t += SLOT_STEP) {
        slots.push(fromMinutes(t));
      }
    });
    return slots;
  }

  // ---------- modal ----------
  function openBooking(serviceName) {
    var state = { day: null, pro: null, time: null };
    var days = nextDays(7);
    var unsubscribe = null;

    var overlay = document.createElement("div");
    overlay.className = "bk-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Agendar horário");

    var daysHtml = days.map(function (d, i) {
      return '<button type="button" class="bk-day" data-i="' + i + '"><strong>' + d.label + "</strong>" + d.weekday + "</button>";
    }).join("");

    var prosHtml = PROFESSIONALS.map(function (p) {
      return (
        '<button type="button" class="bk-pro" data-id="' + p.id + '">' +
        '<span class="bk-pro-avatar">' + initials(p.name) + "</span>" +
        "<span>" + p.name + "</span>" +
        "</button>"
      );
    }).join("");

    overlay.innerHTML =
      '<div class="bk-box">' +
      '<button type="button" class="bk-close" aria-label="Fechar">×</button>' +
      '<div class="bk-title">' + serviceName + "</div>" +
      '<div class="bk-label">Selecione o dia da semana desejado:</div>' +
      '<div class="bk-days">' + daysHtml + "</div>" +
      '<div class="bk-label">Selecione o profissional:</div>' +
      '<div class="bk-pros">' + prosHtml + "</div>" +
      '<div class="bk-slots-section" hidden>' +
      '<div class="bk-label">Escolha um horário disponível:</div>' +
      '<div class="bk-slots"></div>' +
      "</div>" +
      '<button type="button" class="bk-confirm" disabled>Continuar no WhatsApp</button>' +
      '<div class="bk-hint">' +
      (DEMO_MODE
        ? "Modo de demonstração: configure o Firebase (assets/firebase-config.js) para bloquear horários entre clientes automaticamente."
        : "Horários ocupados somem daqui em tempo real assim que alguém reserva.") +
      "</div>" +
      "</div>";

    document.body.appendChild(overlay);

    var slotsSection = overlay.querySelector(".bk-slots-section");
    var slotsWrap = overlay.querySelector(".bk-slots");
    var confirmBtn = overlay.querySelector(".bk-confirm");

    function updateConfirm() {
      confirmBtn.disabled = !(state.day && state.pro && state.time);
      confirmBtn.textContent = DEMO_MODE || !confirmBtn.disabled ? "Continuar no WhatsApp" : "Continuar no WhatsApp";
    }

    function renderSlots(bookedTimes) {
      var allSlots = generateSlots(state.day.date, serviceName);
      var free = allSlots.filter(function (t) { return bookedTimes.indexOf(t) === -1; });
      state.time = null;
      updateConfirm();
      if (!free.length) {
        slotsWrap.innerHTML = '<p style="font-size:13px;color:#948a78;">Sem horários livres nesse dia. Escolha outra data.</p>';
        return;
      }
      slotsWrap.innerHTML = free.map(function (t) {
        return '<button type="button" class="bk-day bk-slot" data-t="' + t + '">' + t + "</button>";
      }).join("");
      slotsWrap.querySelectorAll(".bk-slot").forEach(function (el) {
        el.addEventListener("click", function () {
          slotsWrap.querySelectorAll(".bk-slot").forEach(function (o) { o.classList.remove("selected"); });
          el.classList.add("selected");
          state.time = el.dataset.t;
          updateConfirm();
        });
      });
    }

    function loadSlotsForSelection() {
      if (unsubscribe) { unsubscribe(); unsubscribe = null; }
      if (!state.day || !state.pro) { slotsSection.hidden = true; return; }
      slotsSection.hidden = false;
      slotsWrap.innerHTML = '<p style="font-size:13px;color:#948a78;">Carregando horários…</p>';

      if (DEMO_MODE) {
        renderSlots([]);
        return;
      }

      var q = query(
        collection(db, "bookings"),
        where("date", "==", isoDate(state.day.date)),
        where("professionalId", "==", state.pro.id)
      );
      unsubscribe = onSnapshot(q, function (snap) {
        var booked = [];
        snap.forEach(function (docSnap) { booked.push(docSnap.data().time); });
        renderSlots(booked);
      }, function (err) {
        console.error("Erro ao carregar horários do Firestore:", err);
        slotsWrap.innerHTML = '<p style="font-size:13px;color:#948a78;">Não foi possível carregar os horários agora.</p>';
      });
    }

    overlay.querySelectorAll(".bk-day").forEach(function (el) {
      el.addEventListener("click", function () {
        overlay.querySelectorAll(".bk-days .bk-day").forEach(function (o) { o.classList.remove("selected"); });
        el.classList.add("selected");
        state.day = days[Number(el.dataset.i)];
        loadSlotsForSelection();
      });
    });

    overlay.querySelectorAll(".bk-pro").forEach(function (el) {
      el.addEventListener("click", function () {
        overlay.querySelectorAll(".bk-pro").forEach(function (o) { o.classList.remove("selected"); });
        el.classList.add("selected");
        state.pro = PROFESSIONALS.filter(function (p) { return p.id === el.dataset.id; })[0];
        loadSlotsForSelection();
      });
    });

    function closeModal() {
      if (unsubscribe) unsubscribe();
      overlay.remove();
    }
    overlay.querySelector(".bk-close").addEventListener("click", closeModal);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeModal(); });

    confirmBtn.addEventListener("click", function () {
      var msg =
        "Olá! Quero agendar: " + serviceName +
        " no dia " + state.day.label + " (" + state.day.weekday + ")" +
        " às " + state.time +
        " com " + state.pro.name + ".";
      var waLink = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg);

      if (DEMO_MODE) {
        window.open(waLink, "_blank", "noopener");
        closeModal();
        return;
      }

      var bookingId = isoDate(state.day.date) + "_" + state.pro.id + "_" + state.time.replace(":", "");
      var ref = doc(db, "bookings", bookingId);
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Reservando…";

      runTransaction(db, function (tx) {
        return tx.get(ref).then(function (snap) {
          if (snap.exists()) {
            throw new Error("TAKEN");
          }
          tx.set(ref, {
            service: serviceName,
            date: isoDate(state.day.date),
            weekday: state.day.weekday,
            professionalId: state.pro.id,
            professionalName: state.pro.name,
            time: state.time,
            createdAt: serverTimestamp(),
          });
        });
      }).then(function () {
        window.open(waLink, "_blank", "noopener");
        closeModal();
      }).catch(function (err) {
        if (err && err.message === "TAKEN") {
          alert("Esse horário acabou de ser reservado por outra pessoa. Escolha outro horário.");
          loadSlotsForSelection();
        } else {
          console.error("Erro ao reservar horário:", err);
          alert("Não foi possível confirmar o horário agora. Tente novamente.");
        }
        updateConfirm();
      });
    });
  }

  window.openBooking = openBooking;
})();
