/* ============================================================
   sketch.js — the hand-drawn layer
   Doodle marginalia, marker highlights, starburst badges,
   marquee tickers, and draw-on-scroll line art.
   ============================================================ */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Roughen filter (shared) ---------- */

  function installDefs() {
    if (document.getElementById('sketch-defs')) return;
    var svg = document.createElementNS(NS, 'svg');
    svg.id = 'sketch-defs';
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    svg.innerHTML =
      '<defs>' +
      '<filter id="sk-rough" x="-20%" y="-20%" width="140%" height="140%">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="3" seed="4" result="n"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>' +
      '<filter id="sk-rough-live" x="-25%" y="-25%" width="150%" height="150%">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.026" numOctaves="3" seed="2" result="n">' +
          '<animate attributeName="seed" values="2;11;23;2" dur="2.8s" repeatCount="indefinite"/>' +
        '</feTurbulence>' +
        '<feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>' +
      '</defs>';
    document.body.appendChild(svg);
  }

  /* ---------- 2. Doodle library ---------- */
  /* All drawn on a 100x100 box, stroke only, so they scale cleanly. */

  var DOODLES = {
    arrowCurve:  'M8 76c6-34 32-56 68-58M62 10l16 8-13 13',
    arrowLoop:   'M10 84c28 4 44-12 42-32-1-13-16-17-21-7-6 12 10 24 28 22 14-2 24-12 29-26M86 36l6 15-16 2',
    squiggle:    'M4 50c10-18 20 18 30 0s20 18 30 0 20 18 32 0',
    spiral:      'M54 50c0-5-8-6-10 0s6 14 14 10 10-18 2-26-28-6-34 8 2 34 20 40 40-6 44-24',
    star:        'M50 6l11 28 30 2-23 20 8 30-26-17-26 17 8-30L9 36l30-2z',
    sparkle:     'M50 8v30M50 62v30M8 50h30M62 50h30M24 24l16 16M60 60l16 16M76 24L60 40M40 60L24 76',
    gear:        'M50 26a24 24 0 1 0 0 48 24 24 0 0 0 0-48M50 38a12 12 0 1 0 0 24 12 12 0 0 0 0-24M50 8v16M50 76v16M92 50H76M24 50H8M80 20L68 32M32 68L20 80M80 80L68 68M32 32L20 20',
    bolt:        'M56 6L20 56h24l-8 38 40-52H52z',
    circleScrib: 'M74 24C58 10 28 14 18 32S20 76 46 84s52-8 54-30c2-18-14-32-34-34-16-2-30 4-36 14',
    checkmark:   'M14 54l22 24L88 18',
    cross:       'M18 18l64 64M82 18L18 82',
    springCoil:  'M12 50h10m0 0c0-14 14-14 14 0s14 14 14 0 14-14 14 0 14 14 14 0m0 0h10',
    waveLine:    'M4 50c12 0 12-26 24-26s12 26 24 26 12-22 24-22 10 14 20 14',
    dimension:   'M10 50h80M10 38v24M90 38v24M18 44l-8 6 8 6M82 44l8 6-8 6',
    boltNut:     'M50 14l31 18v36L50 86 19 68V32zM50 34a16 16 0 1 0 0 32 16 16 0 0 0 0-32',
    chip:        'M26 26h48v48H26zM26 40H10M26 60H10M74 40h16M74 60h16M40 26V10M60 26V10M40 74v16M60 74v16',
    eye:         'M6 50s18-26 44-26 44 26 44 26-18 26-44 26S6 50 6 50M50 38a12 12 0 1 0 0 24 12 12 0 0 0 0-24',
    exclaim:     'M50 12v48M50 78v8',
    underline:   'M4 20c24-10 48 8 72-2 10-4 16-2 20 2M8 32c26-8 50 8 70 0',
    plusCluster: 'M20 20v16M12 28h16M70 56v18M61 65h18M46 10v10M41 15h10',
    heart:       'M50 86S12 60 12 36c0-13 10-22 21-22 8 0 14 4 17 10 3-6 9-10 17-10 11 0 21 9 21 22 0 24-38 50-38 50z',
    lightning2:  'M30 8l-14 46h18l-8 38 36-52H42l12-32z',
    radar:       'M50 90a40 40 0 1 1 0-80 40 40 0 0 1 0 80M50 72a22 22 0 1 1 0-44M50 50l26-26',
    solderTip:   'M12 88l30-30M38 54l16-16 24 24-16 16zM74 38l14-14M86 20l6 6',
    droplet:     'M50 10c16 22 26 34 26 46a26 26 0 0 1-52 0c0-12 10-24 26-46z',
    scope:       'M50 10v80M10 50h80M50 26a24 24 0 1 1 0 48 24 24 0 0 1 0-48',
    propeller:   'M50 50c-14-12-34-10-38 2s14 20 26 12M50 50c12-14 10-34-2-38s-20 14-12 26M50 50c14 12 34 10 38-2s-14-20-26-12M50 50c-12 14-10 34 2 38s20-14 12-26'
  };

  function makeDoodle(name, opts) {
    var d = DOODLES[name];
    if (!d) return null;
    opts = opts || {};
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('stroke', 'currentColor');
    g.setAttribute('stroke-width', opts.weight || '5');
    g.setAttribute('stroke-linecap', 'round');
    g.setAttribute('stroke-linejoin', 'round');
    if (!reduce) g.setAttribute('filter', 'url(#' + (opts.live ? 'sk-rough-live' : 'sk-rough') + ')');
    d.split('M').filter(Boolean).forEach(function (seg) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', 'M' + seg.trim());
      g.appendChild(p);
    });
    svg.appendChild(g);
    return svg;
  }

  /* ---------- 3. Draw-on-scroll ---------- */

  function prime(svg) {
    var parts = svg.querySelectorAll('path,circle,rect,ellipse,line,polygon');
    for (var i = 0; i < parts.length; i++) {
      var el = parts[i], len = 0;
      try { len = el.getTotalLength ? el.getTotalLength() : 0; } catch (e) {}
      if (!len || !isFinite(len)) len = 300;
      el.style.strokeDasharray = len;
      el.style.strokeDashoffset = len;
      el.dataset.len = len;
    }
  }

  function draw(svg, baseDelay) {
    var parts = svg.querySelectorAll('path,circle,rect,ellipse,line,polygon');
    for (var i = 0; i < parts.length; i++) {
      var el = parts[i];
      el.style.transition =
        'stroke-dashoffset .72s cubic-bezier(.22,.61,.36,1) ' + ((baseDelay || 0) + i * 0.1) + 's';
      el.style.strokeDashoffset = '0';
    }
  }

  /* ---------- 4. Starburst badge ---------- */

  function burstPath(points, outer, inner) {
    var d = '', step = Math.PI / points;
    for (var i = 0; i < points * 2; i++) {
      var r = i % 2 ? inner : outer;
      var a = i * step - Math.PI / 2;
      d += (i ? 'L' : 'M') + (50 + Math.cos(a) * r).toFixed(2) + ' ' + (50 + Math.sin(a) * r).toFixed(2);
    }
    return d + 'Z';
  }

  function buildBursts() {
    document.querySelectorAll('.burst').forEach(function (host) {
      if (host.querySelector('svg')) return;
      var pts = parseInt(host.dataset.points || '16', 10);
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('aria-hidden', 'true');
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', burstPath(pts, 48, 36));
      p.setAttribute('fill', 'currentColor');
      p.setAttribute('stroke', 'var(--ink)');
      p.setAttribute('stroke-width', '2.6');
      p.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(p);
      host.insertBefore(svg, host.firstChild);
    });
  }

  /* ---------- 5. Marquee ticker ---------- */

  function buildTickers() {
    document.querySelectorAll('.ticker').forEach(function (t) {
      var track = t.querySelector('.ticker-track');
      if (!track || track.dataset.built) return;
      var items = track.innerHTML;
      /* repeat until comfortably wider than the viewport, then double for the loop */
      var reps = Math.max(2, Math.ceil(window.innerWidth / Math.max(track.offsetWidth, 1)) + 1);
      var once = '';
      for (var i = 0; i < reps; i++) once += items;
      track.innerHTML = once + once;
      track.dataset.built = '1';
    });
  }

  /* ---------- 6. Word-split reveal ---------- */

  function splitWords(host) {
    if (host.dataset.split) return;
    var lines = host.innerHTML.split(/<br\s*\/?>/i);
    host.innerHTML = '';
    lines.forEach(function (line, li) {
      if (li) host.appendChild(document.createElement('br'));
      var tmp = document.createElement('div');
      tmp.innerHTML = line;
      (tmp.textContent || '').trim().split(/\s+/).forEach(function (w, wi) {
        if (!w) return;
        if (wi) host.appendChild(document.createTextNode(' '));
        var outer = document.createElement('span');
        outer.className = 'rv-word';
        var inner = document.createElement('i');
        inner.textContent = w;
        outer.appendChild(inner);
        host.appendChild(outer);
      });
    });
    host.dataset.split = '1';
  }

  function stageWords(host) {
    var words = host.querySelectorAll('.rv-word > i');
    for (var i = 0; i < words.length; i++) {
      words[i].style.transitionDelay = (i * 0.07).toFixed(2) + 's';
    }
  }

  /* ---------- 7. Placement of doodles ---------- */

  function placeDoodles() {
    document.querySelectorAll('[data-doodle]').forEach(function (host) {
      if (host.dataset.built) return;
      var svg = makeDoodle(host.dataset.doodle, {
        weight: host.dataset.weight,
        live: host.hasAttribute('data-live')
      });
      if (!svg) return;
      host.appendChild(svg);
      host.dataset.built = '1';
      if (!reduce) prime(svg);
    });
  }

  /* ---------- 8. Observe + run ---------- */

  function init() {
    installDefs();
    placeDoodles();
    buildBursts();

    document.querySelectorAll('[data-words]').forEach(function (h) {
      splitWords(h);
      stageWords(h);
    });

    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('[data-rv],[data-stagger]').forEach(function (e) { e.classList.add('in'); });
      document.querySelectorAll('.mark').forEach(function (e) { e.classList.add('lit'); });
      document.querySelectorAll('[data-doodle] svg').forEach(function (s) { draw(s, 0); });
      return;
    }

    /* doodles draw themselves in */
    var dio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var svg = en.target.querySelector('svg');
        if (svg) draw(svg, parseFloat(en.target.dataset.delay || 0));
        dio.unobserve(en.target);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('[data-doodle]').forEach(function (e) { dio.observe(e); });

    /* marker highlights */
    var mio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        setTimeout(function () { el.classList.add('lit'); }, parseFloat(el.dataset.delay || 0) * 1000);
        mio.unobserve(el);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('.mark').forEach(function (e) { mio.observe(e); });

    /* staggered groups */
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var kids = en.target.children;
        for (var i = 0; i < kids.length; i++) {
          kids[i].style.transitionDelay = (i * 0.085).toFixed(2) + 's';
        }
        en.target.classList.add('in');
        sio.unobserve(en.target);
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('[data-stagger]').forEach(function (e) { sio.observe(e); });

    window.addEventListener('load', buildTickers);
    buildTickers();
  }

  window.Sketch = { make: makeDoodle, draw: draw, prime: prime, doodles: DOODLES };

  function start() {
    if (document.documentElement.classList.contains('intro-on')) {
      document.addEventListener('llr:intro-done', init, { once: true });
    } else {
      init();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
