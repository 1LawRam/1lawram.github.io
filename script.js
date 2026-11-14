

(function () {
  'use strict';

  var docEl = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  try {
    var saved = localStorage.getItem('llr-theme');
    docEl.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');
  } catch (e) {}

  $$('[data-theme-btn]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = docEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      docEl.setAttribute('data-theme', next);
      try { localStorage.setItem('llr-theme', next); } catch (e) {}
      syncBench();
    });
  });

  var nav = $('.nav');
  var nights = $$('section.f-night, section.stage');
  var spy = $$('.nav-links a[href^="#"]').map(function (a) {
    return { link: a, target: document.getElementById(a.getAttribute('href').slice(1)) };
  }).filter(function (s) { return s.target; });
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 8);

    var y = nav.offsetHeight / 2, night = false;
    for (var i = 0; i < nights.length; i++) {
      var r = nights[i].getBoundingClientRect();
      if (r.top <= y && r.bottom > y) { night = true; break; }
    }
    nav.classList.toggle('on-night', night);

    var mark = innerHeight * 0.38, current = null;
    for (i = 0; i < spy.length; i++) {
      if (spy[i].target.getBoundingClientRect().top <= mark) current = spy[i].link;
    }
    for (i = 0; i < spy.length; i++) {
      if (spy[i].link === current) spy[i].link.setAttribute('aria-current', 'location');
      else spy[i].link.removeAttribute('aria-current');
    }
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  var indexBtn = $('#indexBtn');
  var panel = $('#indexPanel');
  var lastFocus = null;

  function setIndex(open) {
    if (!panel || !indexBtn) return;
    panel.classList.toggle('open', open);
    docEl.classList.toggle('index-open', open);
    indexBtn.setAttribute('aria-expanded', open);
    indexBtn.setAttribute('aria-label', open ? 'Close index' : 'Open index');
    if (open) {
      lastFocus = document.activeElement;
      var first = $('a', panel);
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 60);
    } else if (lastFocus && lastFocus.focus) {
      lastFocus.focus({ preventScroll: true });
    }
  }
  if (indexBtn && panel) {
    indexBtn.addEventListener('click', function () { setIndex(!panel.classList.contains('open')); });
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) setIndex(false); });
    window.addEventListener('keydown', function (e) {
      if (!panel.classList.contains('open')) return;
      if (e.key === 'Escape') { setIndex(false); return; }
      if (e.key !== 'Tab') return;

      var f = [indexBtn].concat($$('a,button', panel));
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
  }

  var revealSel = '[data-rv],[data-stagger],[data-in]';
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    var observe = function () { $$(revealSel).forEach(function (el) { io.observe(el); }); };

    if (docEl.classList.contains('intro-on')) document.addEventListener('llr:intro-done', observe, { once: true });
    else observe();
  } else {
    $$(revealSel).forEach(function (el) { el.classList.add('in'); });
  }

  $$('.ticker-track').forEach(function (track) {
    var items = $$('span', track);
    var html = items.map(function (s) { return s.outerHTML + '<i aria-hidden="true"></i>'; }).join('');

    track.innerHTML = html + html + html + html;
  });

  var nf = new Intl.NumberFormat('en-US');
  function countUp(el) {
    var read = function () {
      var to = el.getAttribute('data-count-to');
      return to !== null ? parseFloat(to) : parseFloat(el.textContent.replace(/[^0-9.]/g, ''));
    };
    var target = read();
    if (!isFinite(target) || reduce) return;
    var t0 = performance.now(), dur = 1300;
    (function frame(now) {
      var k = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - k, 4);
      target = read();
      el.textContent = nf.format(Math.round(target * e));
      if (k < 1) requestAnimationFrame(frame);
    })(t0);
  }
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        countUp(en.target);
      });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach(function (el) { cio.observe(el); });
  }

  var slots = $$('.photo-slot[data-photo]');
  if (slots.length && window.fetch) {
    var first = slots[0].getAttribute('data-photo');
    var dir = first.slice(0, first.lastIndexOf('/') + 1);
    fetch(dir + 'manifest.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : { photos: [] }; })
      .then(function (m) {
        var have = m.photos || [];
        slots.forEach(function (slot) {
          var src = slot.getAttribute('data-photo');
          if (have.indexOf(src.slice(src.lastIndexOf('/') + 1)) < 0) return;
          var img = new Image();
          img.alt = slot.getAttribute('data-alt') || '';
          img.decoding = 'async';
          img.onload = function () {
            var frame = $('.fig-frame', slot);
            if (frame) frame.appendChild(img);
            slot.classList.add('has-photo');
          };
          img.src = src;
        });
      })
      .catch(function () {});
  }

  $$('[data-copy]').forEach(function (btn) {
    var label = $('[data-copy-label]', btn) || btn;
    var original = label.textContent;
    var status = $('#copyStatus');
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function (ok) {
        label.textContent = ok ? 'Copied' : 'Press ⌘C';
        btn.classList.toggle('done', ok);
        if (status) status.textContent = ok ? 'Email address copied.' : '';
        document.dispatchEvent(new CustomEvent('llr:copied', { detail: ok }));
        setTimeout(function () { label.textContent = original; btn.classList.remove('done'); }, 1800);
      };

      var legacy = function () {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) {}
        ta.remove();
        if (!ok) {

          var mail = $('.mail');
          if (mail && window.getSelection) {
            var range = document.createRange(); range.selectNodeContents(mail);
            var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
          }
        }
        done(ok);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, legacy);
      } else {
        legacy();
      }
    });
  });

  $$('[data-sig] img').forEach(function (img) {
    img.addEventListener('error', function () {
      var ph = document.createElement('span');
      ph.className = 'sig-missing';
      ph.textContent = 'signature';
      img.replaceWith(ph);
    });
  });

  var gridBtn = $('#gridBtn');
  function setGrid(on) {
    docEl.classList.toggle('grid-on', on);
    if (gridBtn) { gridBtn.setAttribute('aria-pressed', on); gridBtn.textContent = on ? 'Grid · on' : 'Grid'; }
  }
  if (gridBtn) gridBtn.addEventListener('click', function () { setGrid(!docEl.classList.contains('grid-on')); });

  var benchBtn = $('#benchBtn');
  var lamp = $('#bench-light');
  var benchOn = false;
  function syncBench() {
    var dark = docEl.getAttribute('data-theme') === 'dark';
    docEl.classList.toggle('bench-on', benchOn && dark && !reduce);
    if (benchBtn) {
      benchBtn.setAttribute('aria-pressed', benchOn);
      benchBtn.textContent = benchOn ? 'Bench light · on' : 'Bench light';
      benchBtn.title = dark ? '' : 'Switch to dark mode to see it';
    }
  }
  if (benchBtn) { benchBtn.addEventListener('click', function () { benchOn = !benchOn; syncBench(); }); syncBench(); }
  if (lamp && window.matchMedia('(pointer:fine)').matches) {
    var lx = 0, ly = 0, pending = false;
    window.addEventListener('pointermove', function (e) {
      lx = e.clientX; ly = e.clientY;
      if (pending || !docEl.classList.contains('bench-on')) return;
      pending = true;
      requestAnimationFrame(function () {
        lamp.style.transform = 'translate3d(' + lx + 'px,' + ly + 'px,0)';
        pending = false;
      });
    }, { passive: true });
  }

  var clock = $('#clock');
  if (clock) {
    var tick = function () {
      try {
        clock.textContent = 'LIT ' + new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Chicago', hour12: false,
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).format(new Date());
      } catch (e) { clock.textContent = ''; }
    };
    tick(); setInterval(tick, 1000);
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
      return;
    }
    if (e.key === 'g' || e.key === 'G') setGrid(!docEl.classList.contains('grid-on'));
  });

  window.LLR = { reduce: reduce };
})();
