

(function () {
  'use strict';

  var INK = '#131210', PAPER = '#fbf9f4';
  var SIGNAL = '#ff5722', VOLT = '#c6f432', COBALT = '#2b50f0', BUTTER = '#ffc940', BLUSH = '#ffb3c7';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var uid = 0;
  var bare = false;

  function pivot(x, y) {
    return ' style="transform-box:view-box;transform-origin:' + x + 'px ' + y + 'px"';
  }

  function joint(name, x, y, inner) {
    return '<g class="j-' + name + '"' + pivot(x, y) + '><g class="k-' + name + '"' + pivot(x, y) + '>' + inner + '</g></g>';
  }

  function lens(x, y, r) {
    return '<g transform="translate(' + x + ' ' + y + ')">' +
      '<circle r="' + r + '" fill="' + INK + '"/>' +
      '<g class="c-eye"><circle r="' + (r - 5.6).toFixed(1) + '" fill="' + PAPER + '"/>' +
      '<g class="c-pupil"><circle r="' + (r * 0.37).toFixed(1) + '" fill="' + INK + '"/></g></g>' +
      '</g>';
  }

  function bar(x1, y1, x2, y2, w, fill) {
    var d = 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2;
    return '<path d="' + d + '" stroke="' + INK + '" stroke-width="' + (w + 10) + '" stroke-linecap="round"/>' +
           '<path d="' + d + '" stroke="' + fill + '" stroke-width="' + w + '" stroke-linecap="round"/>';
  }

  function hub(x, y, r) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="4.5"/>' +
           '<circle cx="' + x + '" cy="' + y + '" r="2.6" fill="' + INK + '"/>';
  }

  function roundPoly(pts, r) {
    var n = pts.length, d = '';
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
      var v1 = [p0[0] - p1[0], p0[1] - p1[1]], v2 = [p2[0] - p1[0], p2[1] - p1[1]];
      var l1 = Math.hypot(v1[0], v1[1]), l2 = Math.hypot(v2[0], v2[1]);
      var a = [p1[0] + v1[0] / l1 * r, p1[1] + v1[1] / l1 * r];
      var b = [p1[0] + v2[0] / l2 * r, p1[1] + v2[1] / l2 * r];
      d += (i ? 'L' : 'M') + a[0].toFixed(1) + ' ' + a[1].toFixed(1) +
           'Q' + p1[0] + ' ' + p1[1] + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
    }
    return d + 'Z';
  }

  function confetti(cx, top) {
    if (bare) return '';
    var bits = [
      [SIGNAL, -46, -44], [VOLT, -22, -62], [COBALT, 8, -66], [BUTTER, 36, -56],
      [BLUSH, 56, -34], [VOLT, -60, -18], [SIGNAL, 64, -8], [COBALT, -34, -74]
    ].map(function (c, i) {
      var x = cx + c[1] * 0.25;
      var shape = i % 2
        ? '<circle cx="' + x + '" cy="' + (top + 4) + '" r="4.4"'
        : '<rect x="' + (x - 4.5) + '" y="' + top + '" width="9" height="9" rx="2"';
      return shape + ' fill="' + c[0] + '" stroke="' + INK + '" stroke-width="2" style="--cx:' + c[1] + 'px;--cy:' + c[2] + 'px"/>';
    }).join('');
    return '<g class="fx fx-confetti">' + bits + '</g>';
  }

  function bang(x, y) {
    if (bare) return '';
    return '<g class="fx fx-bang">' +
      '<path d="M' + x + ' ' + y + ' v20" stroke="' + INK + '" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M' + x + ' ' + y + ' v20" stroke="' + BUTTER + '" stroke-width="4.4" stroke-linecap="round"/>' +
      '<circle cx="' + x + '" cy="' + (y + 32) + '" r="4.6" fill="' + BUTTER + '" stroke="' + INK + '" stroke-width="2.6"/>' +
      '</g>';
  }

  function dots(x, y) {
    if (bare) return '';
    return '<g class="fx fx-dots" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="3">' +
      '<circle cx="' + x + '" cy="' + (y + 30) + '" r="4"/>' +
      '<circle cx="' + (x + 12) + '" cy="' + (y + 15) + '" r="5.6"/>' +
      '<circle cx="' + (x + 28) + '" cy="' + (y - 4) + '" r="7.6"/>' +
      '</g>';
  }

  function sparks(x, y) {
    if (bare) return '';
    return '<g class="fx fx-sparks" stroke="' + BUTTER + '" stroke-width="3.6" stroke-linecap="round" fill="none">' +
      '<path d="M' + (x - 5) + ' ' + (y - 4) + ' l-9 -8"/>' +
      '<path d="M' + (x + 2) + ' ' + (y - 7) + ' l2 -12"/>' +
      '<path d="M' + (x - 8) + ' ' + (y + 2) + ' l-12 2"/>' +
      '<path d="M' + (x + 8) + ' ' + (y - 3) + ' l10 -6"/>' +
      '</g>';
  }

  function shell(inner, shadowRx) {
    return '<svg viewBox="0 0 220 260" aria-hidden="true" focusable="false">' +
      '<ellipse class="c-shadow" cx="110" cy="243" rx="' + shadowRx + '" ry="7" fill="' + INK + '" opacity=".14"/>' +
      inner + '</svg>';
  }

  function rotor(cx, cy, rx) {
    return '<g transform="translate(' + cx + ' ' + cy + ')">' +
      '<ellipse rx="' + rx + '" ry="' + (rx * 0.2).toFixed(1) + '" fill="' + INK + '" opacity=".13"/>' +
      '<ellipse class="c-blade" rx="' + rx + '" ry="' + (rx * 0.1).toFixed(1) + '" fill="' + INK + '"/>' +
      '</g>';
  }

  var CAST = {

    explorer: {
      draw: function () {
        var C = SIGNAL, D = '#d9410f';
        var id = 'x-clip-' + (++uid);
        return shell(
          joint('all', 110, 132,
            (bare ? '' : '<path class="fx fx-beam" d="M110 142 L58 243 H162 Z" fill="' + VOLT + '"' + pivot(110, 142) + '/>') +

            '<path d="M96 118 L66 97 M124 118 L154 97" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/>' +
            '<rect x="60" y="86" width="12" height="13" rx="3" fill="' + D + '" stroke="' + INK + '" stroke-width="4"/>' +
            '<rect x="148" y="86" width="12" height="13" rx="3" fill="' + D + '" stroke="' + INK + '" stroke-width="4"/>' +
            rotor(66, 82, 20) + rotor(154, 82, 20) +

            '<path d="M93 154 L85 177 M127 154 L135 177" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>' +
            '<path d="M72 179 H97 M123 179 H148" stroke="' + INK + '" stroke-width="6.5" stroke-linecap="round"/>' +

            joint('top', 130, 106,
              '<path d="M130 106 L139 82" stroke="' + INK + '" stroke-width="4.5" stroke-linecap="round"/>' +
              '<circle class="c-led" cx="140" cy="78" r="6.5" fill="' + VOLT + '" stroke="' + INK + '" stroke-width="3.6"/>') +

            '<path d="M82 132 L38 121 M138 132 L182 121" stroke="' + INK + '" stroke-width="7.5" stroke-linecap="round"/>' +
            '<rect x="24" y="106" width="20" height="19" rx="5" fill="' + C + '" stroke="' + INK + '" stroke-width="4.5"/>' +
            '<rect x="176" y="106" width="20" height="19" rx="5" fill="' + C + '" stroke="' + INK + '" stroke-width="4.5"/>' +
            rotor(34, 99, 30) + rotor(186, 99, 30) +

            '<defs><clipPath id="' + id + '"><rect x="72" y="104" width="76" height="54" rx="22"/></clipPath></defs>' +
            '<g clip-path="url(#' + id + ')"><rect x="72" y="104" width="76" height="54" fill="' + C + '"/>' +
            '<rect x="72" y="143" width="76" height="15" fill="' + D + '"/></g>' +
            '<rect x="72" y="104" width="76" height="54" rx="22" fill="none" stroke="' + INK + '" stroke-width="5"/>' +
            (bare ? '' : '<circle class="fx fx-ping" cx="110" cy="130" r="25" fill="none" stroke="' + INK + '" stroke-width="3"/>') +
            lens(110, 130, 18)
          ) +
          bang(176, 30) + dots(160, 34) + confetti(110, 66),
          30);
      }
    },

    builder: {
      draw: function () {
        var C = COBALT, D = '#1f3ec9';
        return shell(
          joint('all', 110, 240,
            '<path d="' + roundPoly([[64, 240], [156, 240], [145, 215], [75, 215]], 6) + '" fill="' + D + '" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"/>' +
            '<circle cx="84" cy="229" r="2.8" fill="' + INK + '"/><circle cx="136" cy="229" r="2.8" fill="' + INK + '"/>' +
            '<rect x="84" y="203" width="52" height="14" rx="5" fill="' + C + '" stroke="' + INK + '" stroke-width="5"/>' +
            joint('s1', 110, 204,
              bar(110, 204, 82, 140, 15, C) +
              joint('s2', 82, 140,
                bar(82, 140, 136, 100, 12, C) +
                joint('hd', 136, 100,
                  joint('jl', 127, 114, bar(127, 116, 121, 137, 5, BUTTER)) +
                  joint('jr', 149, 114, bar(149, 116, 155, 137, 5, BUTTER)) +
                  '<rect x="110" y="70" width="56" height="48" rx="15" fill="' + C + '" stroke="' + INK + '" stroke-width="5"/>' +
                  '<circle class="c-led" cx="156" cy="80" r="3.4" fill="' + VOLT + '" stroke="' + INK + '" stroke-width="2.4"/>' +
                  lens(136, 95, 16) +
                  sparks(138, 148)
                ) +
                hub(82, 140, 10)
              ) +
              hub(110, 204, 11)
            )
          ) +
          bang(184, 22) + dots(168, 30) + confetti(120, 52),
          60);
      }
    },

    thinker: {
      draw: function () {
        var C = BLUSH, D = '#f08fa9';
        var id = 't-clip-' + (++uid);
        var sine = 'M6 128 q11.5 -17 23 0', wave = 'M6 128 q11.5 -34 23 0', sq = 'M4 139';
        for (var i = 0; i < 7; i++) { sine += ' t23 0'; wave += ' t23 0'; }
        for (i = 0; i < 6; i++) sq += ' h16 v-22 h16 v22';
        var T = ' fill="none" stroke="' + VOLT + '" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"';
        var traces = '<g class="t t-sine"><path class="k-sine" d="' + sine + '"' + T + '/></g>';
        if (!bare) traces +=
          '<g class="t t-wave"><path class="k-wave" d="' + wave + '"' + T + '/></g>' +
          '<g class="t t-square"><path class="k-square" d="' + sq + '"' + T + '/></g>' +
          '<path class="t t-spike" d="M52 138 H82 L91 103 L100 151 L107 132 H144"' + T + '/>' +
          '<path class="t t-smile" d="M74 119 q24 27 48 0"' + T + '/>' +
          '<g class="t t-dots" fill="' + VOLT + '"><circle cx="80" cy="128" r="5"/><circle cx="98" cy="128" r="5"/><circle cx="116" cy="128" r="5"/></g>' +
          '<g class="t t-seek"><path d="M98 96 V160 M56 128 H140" stroke="' + PAPER + '" stroke-width="1.5" opacity=".28"/>' +
            '<g class="c-seek"><circle cx="98" cy="128" r="6.5" fill="' + VOLT + '"/></g></g>';
        return shell(
          joint('all', 110, 236,
            '<rect class="c-foot-l" x="56" y="212" width="30" height="24" rx="8" fill="' + INK + '"/>' +
            '<rect class="c-foot-r" x="134" y="212" width="30" height="24" rx="8" fill="' + INK + '"/>' +
            joint('top', 110, 80,
              '<path d="M82 82 V67 q0 -12 12 -12 h32 q12 0 12 12 V82" fill="none" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/>') +
            '<rect x="38" y="78" width="144" height="138" rx="18" fill="' + C + '" stroke="' + INK + '" stroke-width="5"/>' +

            '<rect x="52" y="92" width="92" height="72" rx="9" fill="' + INK + '"/>' +
            '<defs><clipPath id="' + id + '"><rect x="55" y="95" width="86" height="66" rx="6"/></clipPath></defs>' +
            '<g clip-path="url(#' + id + ')">' +
              '<path d="M75 92 V164 M98 92 V164 M121 92 V164 M52 110 H144 M52 128 H144 M52 146 H144" stroke="' + PAPER + '" stroke-width="1.4" opacity=".12"/>' +
              traces +
            '</g>' +

            '<g transform="translate(163 105)"><g class="c-knob"><circle r="10" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="4.5"/><path d="M0 -1 V-6" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/></g></g>' +
            '<g transform="translate(163 134)"><g class="c-knob c-knob-2"><circle r="10" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="4.5"/><path d="M0 -1 V-6" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/></g></g>' +
            '<circle class="c-led" cx="163" cy="158" r="4.2" fill="' + VOLT + '" stroke="' + INK + '" stroke-width="2.8"/>' +
            '<rect x="88" y="181" width="17" height="12" rx="3.5" fill="' + D + '" stroke="' + INK + '" stroke-width="3.4"/>' +
            '<rect x="111" y="181" width="17" height="12" rx="3.5" fill="' + D + '" stroke="' + INK + '" stroke-width="3.4"/>' +
            '<path d="M152 182 h22 M152 190 h22" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +

            '<circle cx="64" cy="187" r="7" fill="' + INK + '"/>' +
            joint('tail', 64, 187,
              '<path d="M64 187 C42 181 27 188 24 202" fill="none" stroke="' + INK + '" stroke-width="4.5" stroke-linecap="round"/>' +
              bar(24, 204, 21, 222, 5, SIGNAL) +
              '<path d="M20.500 226 L19.500 236" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>' +
              sparks(15, 238))
          ) +
          confetti(110, 52),
          68);
      }
    }
  };

  var live = [];

  function mount(el) {
    if (el.__char) return;
    var who = CAST[el.getAttribute('data-char')];
    if (!who) return;
    el.__char = { base: el.getAttribute('data-state') || 'idle', timer: 0 };
    if (!el.getAttribute('data-state')) el.setAttribute('data-state', 'idle');
    el.innerHTML = who.draw();
    if (!el.hasAttribute('aria-hidden') && !el.hasAttribute('aria-label')) el.setAttribute('aria-hidden', 'true');

    var hover = el.getAttribute('data-on-hover');
    if (hover) {
      el.addEventListener('pointerenter', function () { set(el, hover); });
      el.addEventListener('pointerleave', function () { set(el, el.__char.base); });
    }
    if (!el.closest('a')) {
      el.addEventListener('click', function () { set(el, 'celebrating', { ms: 1600 }); });
    }
    if (io) io.observe(el); else el.classList.add('is-live');
  }

  function set(el, state, opt) {
    if (!el.__char) mount(el);
    if (!el.__char) return;
    clearTimeout(el.__char.timer);
    el.setAttribute('data-state', state);
    if (opt && opt.ms) {
      el.__char.timer = setTimeout(function () {
        el.setAttribute('data-state', el.__char.base);
      }, opt.ms);
    } else if (opt && opt.base === true) {
      el.__char.base = state;
    }
  }

  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var el = en.target;
      var on = en.isIntersecting && !reduce;
      el.classList.toggle('is-live', on);
      var i = live.indexOf(el);
      if (on && i < 0) live.push(el);
      if (!on && i >= 0) live.splice(i, 1);
      if (en.isIntersecting && !el.__char.seen) {
        el.__char.seen = true;
        var enter = el.getAttribute('data-on-enter');
        if (enter && !reduce) set(el, enter, { ms: 1600 });
      }
    });
  }, { threshold: 0.25 }) : null;

  var px = -1, py = -1, pending = false;
  function look() {
    pending = false;
    for (var i = 0; i < live.length; i++) {
      var el = live[i];
      if (el.getAttribute('data-track') === 'off') continue;
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height * 0.46;
      var dx = px - cx, dy = py - cy;
      var d = Math.hypot(dx, dy) || 1;
      var reach = Math.min(1, d / 260);
      el.style.setProperty('--tx', (dx / d * 4.2 * reach).toFixed(2) + 'px');
      el.style.setProperty('--ty', (dy / d * 3.8 * reach).toFixed(2) + 'px');
      if (el.getAttribute('data-state') === 'curious') {
        el.style.setProperty('--lean', (Math.max(-1, Math.min(1, dx / 420)) * 7).toFixed(2) + 'deg');
      }
    }
  }
  if (!reduce && window.matchMedia('(pointer:fine)').matches) {
    window.addEventListener('pointermove', function (e) {
      px = e.clientX; py = e.clientY;
      if (!pending) { pending = true; requestAnimationFrame(look); }
    }, { passive: true });
  }

  function mountAll(root) {
    (root || document).querySelectorAll('.char[data-char]').forEach(mount);
  }

  window.LLRChar = {
    names: Object.keys(CAST),
    mount: mount,
    mountAll: mountAll,
    set: set,

    svg: function (name) {
      var who = CAST[name];
      if (!who) return '';
      bare = true;
      var out = who.draw().replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="260" ');
      bare = false;
      return out;
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mountAll(); });
  else mountAll();
})();
