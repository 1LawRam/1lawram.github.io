

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

  if (!paths.length || !sheet || !rub || typeof intro.animate !== 'function') {
    release();
    clearCurtain();
    return;
  }

  var START = 420;
  var HOLD  = 650;
  var WIPE  = 1150;
  var FPS   = 60;

  function eraserPath(w, h) {

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

  var vb = (frame.getAttribute('viewBox') || '0 0 893 551').split(/[\s,]+/).map(Number);
  var sigAspect = (vb[3] && vb[2]) ? vb[3] / vb[2] : 551 / 893;

  function layout() {
    var w = window.innerWidth, h = window.innerHeight;

    sheet.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    [ink, keep].forEach(function (r) {
      r.setAttribute('x', 0); r.setAttribute('y', 0);
      r.setAttribute('width', w); r.setAttribute('height', h);
    });

    var cw = Math.min(1020, w * 0.86);
    var ch = cw * sigAspect;
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

  var anims = [];
  var end = START;

  paths.forEach(function (path) {
    var at = START + (parseFloat(path.getAttribute('data-at')) || 0);
    var k = (path.getAttribute('data-k') || '0,1').split(',').map(Number);
    var frames = k.map(function (p) { return { strokeDashoffset: 1 - p }; });
    frames[0].strokeDashoffset = 1.05;
    var dur = Math.max(((k.length - 1) / FPS) * 1000, 16);
    anims.push(path.animate(frames, { delay: at, duration: dur, easing: 'linear', fill: 'both' }));
    end = Math.max(end, at + dur);
  });

  var wipeAt = end + HOLD;

  anims.push(rub.animate(
    [{ strokeDashoffset: 1.05 }, { strokeDashoffset: 0 }],
    { delay: wipeAt, duration: WIPE, easing: 'cubic-bezier(.5,.02,.5,1)', fill: 'both' }
  ));

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

  setTimeout(function () { finish(false); }, wipeAt + WIPE - 60);

  intro.addEventListener('click', function () { finish(true); });
  document.addEventListener('keydown', function onKey(e) {
    if (done) { document.removeEventListener('keydown', onKey); return; }
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish(true);
  });
})();
