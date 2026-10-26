/* ============================================================
   INTRO CURTAIN
   A black sheet. "Designed by:" fades in, the signature writes
   itself along the pen's own path, then an eraser rubs the whole
   sheet — signature and all — off the screen.
   Plays once per session; skipped under reduced motion.
   ============================================================ */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var intro = document.getElementById('intro');

  function release() {
    docEl.classList.remove('intro-lock');
    try { sessionStorage.setItem('llr-intro', 'done'); } catch (e) {}
    document.dispatchEvent(new CustomEvent('llr:intro-done'));
  }

  function clearCurtain() {
    docEl.classList.remove('intro-on');
    if (intro && intro.parentNode) intro.remove();
  }

  /* the gate script in <head> decided this already */
  if (!intro || !docEl.classList.contains('intro-on')) {
    release();
    clearCurtain();
    return;
  }

  var sheet  = document.getElementById('introSheet');
  var ink    = document.getElementById('sheetInk');
  var keep   = document.getElementById('wipeKeep');
  var rub    = document.getElementById('wipeRub');
  var frame  = document.getElementById('sigFrame');
  var kicker = document.getElementById('introKicker');
  var paths  = Array.prototype.slice.call(intro.querySelectorAll('.sig-nib path'));

  /* no WAAPI, or markup missing — don't strand anyone behind a black box */
  if (!paths.length || !sheet || !rub || typeof intro.animate !== 'function') {
    release();
    clearCurtain();
    return;
  }

  var START = 420;    // let the kicker land first
  var DRAW  = 1950;
  var HOLD  = 420;
  var WIPE  = 1150;
  var PAUSE_SHARE = 0.2;   // of DRAW, spent lifting the pen between strokes

  /* ---------- layout: the SVG works in real pixels ---------- */

  function eraserPath(w, h) {
    /* three sweeps, alternating direction, running well past both edges —
       the way you'd actually wipe a board down */
    var over = w * 0.22;
    var rows = [h * 0.18, h * 0.5, h * 0.82];
    var d = '';
    for (var i = 0; i < rows.length; i++) {
      var ltr = i % 2 === 0;
      var x0 = ltr ? -over : w + over;
      var x1 = ltr ? w + over : -over;
      var y = rows[i];
      d += (i === 0 ? 'M' : 'L') + x0.toFixed(1) + ' ' + y.toFixed(1);
      for (var s = 1; s <= 4; s++) {
        var t = s / 4;
        var x = x0 + (x1 - x0) * t;
        var wob = Math.sin(t * Math.PI * 2 + i * 1.7) * h * 0.022;
        d += 'L' + x.toFixed(1) + ' ' + (y + wob).toFixed(1);
      }
    }
    return d;
  }

  function layout() {
    var w = window.innerWidth, h = window.innerHeight;

    sheet.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    [ink, keep].forEach(function (r) {
      r.setAttribute('x', 0); r.setAttribute('y', 0);
      r.setAttribute('width', w); r.setAttribute('height', h);
    });

    var cw = Math.min(1020, w * 0.86);
    var ch = cw * 377 / 713;
    var cx = (w - cw) / 2;
    var cy = (h - ch) / 2 + h * 0.015;

    frame.setAttribute('x', cx);
    frame.setAttribute('y', cy);
    frame.setAttribute('width', cw);
    frame.setAttribute('height', ch);

    kicker.setAttribute('x', cx + cw * 0.04);
    kicker.setAttribute('y', cy - Math.max(16, h * 0.022));

    rub.setAttribute('d', eraserPath(w, h));
    rub.setAttribute('stroke-width', h / 2.5);
  }

  layout();
  window.addEventListener('resize', layout);

  /* ---------- the writing ---------- */

  var anims = [];
  var shares = paths.map(function (p) {
    return parseFloat(p.style.getPropertyValue('--l')) || 1 / paths.length;
  });
  var gaps = paths.map(function (p) {
    return parseFloat(p.style.getPropertyValue('--gap')) || 0;
  });
  var shareSum = shares.reduce(function (a, b) { return a + b; }, 0) || 1;
  var gapSum   = gaps.reduce(function (a, b) { return a + b; }, 0) || 1;

  var writeMs = DRAW * (1 - PAUSE_SHARE);
  var pauseMs = DRAW * PAUSE_SHARE;
  var at = START;

  paths.forEach(function (path, i) {
    /* pause in proportion to how far the nib has to travel to get here */
    at += (gaps[i] / gapSum) * pauseMs;
    var dur = Math.max((shares[i] / shareSum) * writeMs, 16);
    anims.push(path.animate(
      [{ strokeDashoffset: 1.05 }, { strokeDashoffset: 0 }],
      { delay: at, duration: dur,
        /* handwriting accelerates out of a stroke and settles into its end */
        easing: 'cubic-bezier(.42,0,.58,1)', fill: 'both' }
    ));
    at += dur;
  });

  var wipeAt = at + HOLD;

  anims.push(rub.animate(
    [{ strokeDashoffset: 1.05 }, { strokeDashoffset: 0 }],
    { delay: wipeAt, duration: WIPE, easing: 'cubic-bezier(.5,.02,.5,1)', fill: 'both' }
  ));

  /* ---------- leaving ---------- */

  var done = false;
  function finish(immediate) {
    if (done) return;
    done = true;
    clearTimeout(failsafe);
    window.removeEventListener('resize', layout);
    if (immediate) anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    release();
    clearCurtain();
  }

  var failsafe = setTimeout(function () { finish(true); }, wipeAt + WIPE + 1800);

  requestAnimationFrame(function () { intro.classList.add('writing'); });

  /* the sheet is gone once the eraser has run; release a touch early so the
     page behind is already settling as the last of it lifts */
  setTimeout(function () { finish(false); }, wipeAt + WIPE - 60);

  intro.addEventListener('click', function () { finish(true); });
  document.addEventListener('keydown', function onKey(e) {
    if (done) { document.removeEventListener('keydown', onKey); return; }
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish(true);
  });
})();
