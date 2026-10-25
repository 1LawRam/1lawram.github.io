/* ============================================================
   MAKERWORLD — live stats
   The numbers are baked into index.html so the section is never
   empty, then overwritten here from data/makerworld.json, which a
   daily GitHub Action refreshes from MakerWorld's design API.
   (MakerWorld sends no CORS headers, so the browser can't ask it
   directly — the Action is what keeps this honest.)
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('[data-mw-cards]');
  if (!root || !window.fetch) return;

  var nf = new Intl.NumberFormat('en-US');

  function setNum(el, n) {
    if (!el || typeof n !== 'number') return;
    el.textContent = nf.format(n);
  }

  function stamp(iso) {
    var el = document.querySelector('[data-mw-stamp]');
    if (!el || !iso) return;
    var d = new Date(iso);
    if (isNaN(d)) return;
    var when = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    el.textContent = 'Live from MakerWorld · last change ' + when;
  }

  fetch('data/makerworld.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (data) {
      var p = data.profile || {};
      ['downloads', 'prints', 'likes', 'collections'].forEach(function (k) {
        setNum(document.querySelector('.mw-totals [data-mw="' + k + '"]'), p[k]);
      });

      (data.featured || []).forEach(function (m, i) {
        var card = root.querySelector('[data-mw-card="' + i + '"]');
        if (!card) return;

        if (m.url) card.href = m.url;

        var title = card.querySelector('[data-mw="title"]');
        if (title && m.title) title.textContent = m.title;

        var img = card.querySelector('[data-mw="cover"]');
        if (img && m.cover && img.getAttribute('src') !== m.cover) {
          img.src = m.cover;
          if (m.title) img.alt = m.title + ', printed';
        }

        ['downloads', 'prints', 'likes'].forEach(function (k) {
          setNum(card.querySelector('.mw-stats [data-mw="' + k + '"]'), m[k]);
        });
      });

      stamp(data.updated);
    })
    .catch(function () { /* keep the baked-in numbers */ });
})();
