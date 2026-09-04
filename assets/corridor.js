/*
 * Corridor hero — vanilla JS port of the geometric image-stream idea:
 * depth authored as apparent size (geometric growth) so consecutive
 * cards keep a constant size ratio; rails open early and hold (fan>1)
 * so the ribbon leaves centre flat and bends once; each card is born
 * across the axis (negative railBirth) so the centre is never empty.
 */
(function () {
  "use strict";

  var PATH = {
    perspective: 30,
    cardWidth: 18,
    cardHeight: 25,
    cardRadius: 0.4,
    birthHeight: 2.6,
    exitHeight: 46,
    railBirth: -11,
    railExit: 44,
    fan: 3.3,
    turnBirth: 6,
    turnExit: 28,
    stops: 24,
  };

  function keyframes(dir, name, p) {
    var steps = [];
    for (var s = 0; s <= p.stops; s++) {
      var u = s / p.stops;
      var scale = (p.birthHeight / p.cardHeight) * Math.pow(p.exitHeight / p.birthHeight, u);
      var z = p.perspective * (1 - 1 / scale);
      var rail = p.railExit - (p.railExit - p.railBirth) * Math.pow(1 - u, p.fan);
      var turn = p.turnBirth + (p.turnExit - p.turnBirth) * u;
      steps.push(
        (u * 100).toFixed(2) + "%{transform:translate3d(" +
        (dir * rail).toFixed(2) + "cqw,0," + z.toFixed(2) + "cqw) rotateY(" +
        (-dir * turn).toFixed(2) + "deg)}"
      );
    }
    return "@keyframes " + name + "{" + steps.join("") + "}";
  }

  function buildCorridor(root, opts) {
    var cardsPerRail = opts.cards || 9;
    var speed = opts.speed || 18;
    var axis = opts.axis || 55;
    var sources = opts.sources || [];
    var right = "ish-r-" + opts.id;
    var left = "ish-l-" + opts.id;

    var styleEl = document.createElement("style");
    styleEl.textContent = keyframes(1, right, PATH) + keyframes(-1, left, PATH);
    root.appendChild(styleEl);

    var wrap = document.createElement("div");
    wrap.className = "corridor";
    wrap.style.perspectiveOrigin = "50% " + axis + "%";
    var plane = document.createElement("div");
    plane.className = "corridor-plane";
    wrap.appendChild(plane);
    root.appendChild(wrap);

    [right, left].forEach(function (name) {
      for (var i = 0; i < cardsPerRail; i++) {
        var src = sources[i % sources.length];
        var card = document.createElement("div");
        card.className = "corridor-card" + (src.tone ? " tone-" + src.tone : "");
        card.style.top = axis + "%";
        card.style.animation = name + " " + speed + "s linear infinite";
        card.style.animationDelay = (-(i * speed) / cardsPerRail) + "s";
        if (src.img) {
          var im = document.createElement("img");
          im.src = src.img;
          im.alt = "";
          im.loading = "lazy";
          im.decoding = "async";
          im.draggable = false;
          card.appendChild(im);
        }
        plane.appendChild(card);
      }
    });
  }

  window.ShalomCorridor = { build: buildCorridor };
})();
