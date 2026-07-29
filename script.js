(function () {
  var docEl = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  try {
    var saved = localStorage.getItem('llr-theme');
    if (saved) docEl.setAttribute('data-theme', saved);
  } catch (e) {}

  document.querySelectorAll('[data-theme-btn]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dark = docEl.getAttribute('data-theme') === 'dark';
      var next = dark ? 'light' : 'dark';
      docEl.setAttribute('data-theme', next);
      try { localStorage.setItem('llr-theme', next); } catch (e) {}
    });
  });

  var nav = document.querySelector('.nav');
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 8);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.14 }
    );
    document.querySelectorAll('[data-rv]').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('[data-rv]').forEach(function (el) { el.classList.add('in'); });
  }

  document.querySelectorAll('[data-sig] img').forEach(function (img) {
    img.addEventListener('error', function () {
      var ph = document.createElement('div');
      ph.className = 'sig-missing';
      ph.textContent = img.getAttribute('src') + ' · 1200 × 400 px';
      img.replaceWith(ph);
    });
  });

  var gridBtn = document.getElementById('gridBtn');
  function setGrid(on) {
    docEl.classList.toggle('grid-on', on);
    if (gridBtn) {
      gridBtn.setAttribute('aria-pressed', on);
      gridBtn.textContent = on ? 'GRID · ON' : 'GRID';
    }
  }
  if (gridBtn) gridBtn.addEventListener('click', function () { setGrid(!docEl.classList.contains('grid-on')); });
  window.addEventListener('keydown', function (e) {
    if ((e.key === 'g' || e.key === 'G') && !e.metaKey && !e.ctrlKey && !e.altKey) {
      var tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      setGrid(!docEl.classList.contains('grid-on'));
    }
  });

  var clock = document.getElementById('clock');
  if (clock) {
    var tick = function () {
      try {
        var t = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Chicago', hour12: false,
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).format(new Date());
        clock.textContent = 'LIT ' + t;
      } catch (e) { clock.textContent = ''; }
    };
    tick();
    setInterval(tick, 1000);
  }

  var benchBtn = document.getElementById('benchBtn');
  var lamp = document.getElementById('bench-light');
  var benchOn = false;
  function syncBench() {
    var dark = docEl.getAttribute('data-theme') === 'dark';
    docEl.classList.toggle('bench-on', benchOn && dark && !reduce);
    if (benchBtn) {
      benchBtn.setAttribute('aria-pressed', benchOn);
      benchBtn.textContent = benchOn ? 'BENCH LIGHT · ON' : 'BENCH LIGHT';
      benchBtn.title = dark ? '' : 'Switch to dark mode to see it';
    }
  }
  if (benchBtn) {
    benchBtn.addEventListener('click', function () { benchOn = !benchOn; syncBench(); });
    document.querySelectorAll('[data-theme-btn]').forEach(function (b) {
      b.addEventListener('click', syncBench);
    });
    syncBench();
  }
  if (lamp && window.matchMedia('(pointer:fine)').matches) {
    var lx = innerWidth / 2, ly = innerHeight / 2, pending = false;
    window.addEventListener('pointermove', function (e) {
      lx = e.clientX; ly = e.clientY;
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        lamp.style.transform = 'translate3d(' + lx + 'px,' + ly + 'px,0)';
        pending = false;
      });
    }, { passive: true });
  }

  var stageEl = document.querySelector('.hero-stage');
  if (stageEl && !reduce && window.matchMedia('(pointer:fine)').matches) {
    window.addEventListener('pointermove', function (e) {
      var rx = (e.clientY / innerHeight - .5) * -4;
      var ry = (e.clientX / innerWidth - .5) * 5;
      stageEl.style.transform = 'perspective(1200px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
    }, { passive: true });
  }

  var buf = '';
  window.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key.length !== 1) return;
    buf = (buf + e.key.toLowerCase()).slice(-6);
    if (buf === 'ferros') {
      location.href = /\/work\//.test(location.pathname) ? 'ferros.html' : 'work/ferros.html';
    }
  });

  window.LLR = { reduce: reduce };
})();
