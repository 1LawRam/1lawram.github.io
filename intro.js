/* ============================================================
   INTRO CURTAIN
   Black screen -> the signature writes itself in white along the
   real pen path -> it is erased the same way -> the curtain lifts.
   Plays once per session; skipped entirely under reduced motion.
   ============================================================ */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var intro = document.getElementById('intro');

  /* Unlocks the page and lets the reveal observers start. Called as the
     curtain begins to travel, so the site is already animating in behind it.
     `intro-on` itself stays until the curtain has gone — it is what keeps
     the curtain rendered. */
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

  var paths = Array.prototype.slice.call(intro.querySelectorAll('.sig-nib path'));

  /* no WAAPI, or no paths to draw — don't strand anyone behind a black box */
  if (!paths.length || typeof intro.animate !== 'function') {
    release();
    clearCurtain();
    return;
  }

  var START = 420;    // let the kicker land first
  var DRAW  = 1750;
  var HOLD  = 300;
  var ERASE = 650;

  var shares = paths.map(function (p) {
    return parseFloat(p.style.getPropertyValue('--l')) || 1 / paths.length;
  });
  var total = shares.reduce(function (a, b) { return a + b; }, 0) || 1;

  var anims = [];
  var at = 0;
  paths.forEach(function (path, i) {
    var share = shares[i] / total;
    var offset = at;
    at += share;

    anims.push(path.animate(
      [{ strokeDashoffset: 1.05 }, { strokeDashoffset: 0 }],
      { delay: START + offset * DRAW, duration: Math.max(share * DRAW, 1),
        easing: 'linear', fill: 'both' }
    ));

    anims.push(path.animate(
      [{ strokeDashoffset: 0 }, { strokeDashoffset: -1.05 }],
      { delay: START + DRAW + HOLD + offset * ERASE, duration: Math.max(share * ERASE, 1),
        easing: 'linear', fill: 'forwards' }
    ));
  });

  var done = false;
  function lift() {
    if (done) return;
    done = true;
    clearTimeout(failsafe);
    anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    intro.classList.remove('writing');
    intro.classList.add('wiping');
    /* let the kicker clear, then pull the curtain up */
    setTimeout(function () {
      intro.classList.add('lifting');
      release();
      setTimeout(clearCurtain, 820);
    }, 160);
  }

  /* belt and braces: if an animation never resolves, leave anyway */
  var failsafe = setTimeout(lift, START + DRAW + HOLD + ERASE + 1500);

  requestAnimationFrame(function () { intro.classList.add('writing'); });

  setTimeout(lift, START + DRAW + HOLD + ERASE + 120);

  function skip() { lift(); }
  intro.addEventListener('click', skip);
  document.addEventListener('keydown', function onKey(e) {
    if (done) { document.removeEventListener('keydown', onKey); return; }
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip();
  });
})();
