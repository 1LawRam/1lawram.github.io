/* ============================================================
   BENCH TV — hidden side channel
   Double-click the signature on the contact band to open it.
   No link, no hint, nothing in the nav: it is only ever found
   by someone poking at the page.

   This site is static, so there is no server of ours to push
   bytes through. Playback therefore runs one of two ways, and
   the chip in the header switches between them:

     yt-nocookie — YouTube's own embed host. Full player, every
                   quality, but it needs YouTube reachable.
     proxy       — a Piped instance hands back a muxed MP4 that
                   it is already proxying on its own domain, and
                   that plays in a plain <video>. 360p, and no
                   YouTube domain is contacted at all, so this is
                   the one that still works when the other does
                   not.

   On first open we fetch a YouTube thumbnail as a reachability
   probe and pre-select the proxy if it fails — unless the
   viewer has picked a mirror themselves, in which case their
   choice stands.

   Search and streams both go through public mirrors, tried in
   order, because these instances come and go without notice.
   Everything here was checked live before it shipped; if a host
   below has since died, the fallbacks and the paste-a-link path
   are what keep the panel usable.
   ============================================================ */

(function () {
  'use strict';

  var TIMEOUT = 9000;
  var STORE = 'llr-tv-mirror';

  /* ---------- playback ---------- */

  var MIRRORS = [
    {
      label: 'yt-nocookie',
      kind: 'frame',
      embed: function (id) {
        return 'https://www.youtube-nocookie.com/embed/' + id +
               '?autoplay=1&rel=0&modestbranding=1';
      }
    },
    { label: 'proxy', kind: 'stream' }
  ];

  var STREAM_APIS = [
    'https://pipedapi.ducks.party',
    'https://api.piped.private.coffee'
  ];

  /* ---------- search ---------- */

  function ytThumb(id) {
    return 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg';
  }

  function pickThumb(list, id) {
    var want = ['medium', 'high', 'sddefault', 'maxres'];
    for (var i = 0; i < want.length; i++) {
      for (var j = 0; j < list.length; j++) {
        if (list[j].quality === want[i] && list[j].url) return list[j].url;
      }
    }
    return list.length && list[0].url ? list[0].url : ytThumb(id);
  }

  function parseInvidious(data) {
    if (!Array.isArray(data)) return [];
    var out = [];
    data.forEach(function (v) {
      if (!v.videoId) return;
      out.push({
        id: v.videoId,
        title: v.title || 'Untitled',
        author: v.author || '',
        secs: v.lengthSeconds || 0,
        views: v.viewCount || 0,
        thumb: pickThumb(v.videoThumbnails || [], v.videoId)
      });
    });
    return out;
  }

  function parsePiped(data) {
    var items = (data && data.items) || [];
    var out = [];
    items.forEach(function (v) {
      var m = /[?&]v=([\w-]{11})/.exec(v.url || '');
      if (!m) return;
      out.push({
        id: m[1],
        title: v.title || 'Untitled',
        author: v.uploaderName || '',
        secs: v.duration > 0 ? v.duration : 0,
        views: v.views > 0 ? v.views : 0,
        thumb: v.thumbnail || ytThumb(m[1])
      });
    });
    return out;
  }

  var BACKENDS = [
    {
      label: 'invidious',
      url: function (q) {
        return 'https://invidious.f5.si/api/v1/search?type=video&q=' +
               encodeURIComponent(q);
      },
      parse: parseInvidious
    },
    {
      label: 'piped',
      url: function (q) {
        return 'https://pipedapi.ducks.party/search?filter=videos&q=' +
               encodeURIComponent(q);
      },
      parse: parsePiped
    },
    {
      label: 'piped · coffee',
      url: function (q) {
        return 'https://api.piped.private.coffee/search?filter=videos&q=' +
               encodeURIComponent(q);
      },
      parse: parsePiped
    }
  ];

  /* ---------- helpers ---------- */

  /* A pasted link beats a search every time, so every shape of
     YouTube URL gets recognised before a query goes out. */
  function asVideoId(raw) {
    var s = String(raw).trim();
    if (/^[\w-]{11}$/.test(s)) return s;
    var pats = [
      /(?:youtube\.com|youtube-nocookie\.com)\/watch\?(?:.*&)?v=([\w-]{11})/,
      /youtu\.be\/([\w-]{11})/,
      /\/embed\/([\w-]{11})/,
      /\/shorts\/([\w-]{11})/,
      /\/live\/([\w-]{11})/,
      /[?&]v=([\w-]{11})/
    ];
    for (var i = 0; i < pats.length; i++) {
      var m = pats[i].exec(s);
      if (m) return m[1];
    }
    return null;
  }

  function clock(secs) {
    if (!secs) return 'LIVE';
    var h = Math.floor(secs / 3600);
    var m = Math.floor((secs % 3600) / 60);
    var s = secs % 60;
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return h ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s);
  }

  function views(n) {
    if (!n) return '';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B views';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M views';
    if (n >= 1e3) return Math.round(n / 1e3) + 'K views';
    return n + ' views';
  }

  function fetchJSON(url) {
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, TIMEOUT);
    var opts = { referrerPolicy: 'no-referrer' };
    if (ctl) opts.signal = ctl.signal;
    return fetch(url, opts).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }, function (err) {
      clearTimeout(timer);
      throw err;
    });
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- state ---------- */

  var ui = null;
  var mirror = 0;
  var chosen = false;   /* viewer picked a mirror — never override it */
  var probed = false;
  var current = null;
  var lastFocus = null;
  var hideTimer = 0;

  try {
    var saved = parseInt(localStorage.getItem(STORE), 10);
    if (saved >= 0 && saved < MIRRORS.length) { mirror = saved; chosen = true; }
  } catch (e) {}

  /* ---------- build ---------- */

  function build() {
    var ol = el('div', 'tv-ol');
    ol.setAttribute('hidden', '');

    var panel = el('div', 'tv-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Bench TV');

    var head = el('div', 'tv-head');
    head.appendChild(el('span', 'tv-title', 'Bench TV'));
    var mBtn = el('button', 'tv-chip');
    mBtn.type = 'button';
    mBtn.title = 'Switch playback route';
    var close = el('button', 'tv-x');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close Bench TV');
    close.innerHTML =
      '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" ' +
      'stroke-width="2.2" stroke-linecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>';
    head.appendChild(mBtn);
    head.appendChild(close);

    var stage = el('div', 'tv-stage');

    var form = el('form', 'tv-bar');
    form.setAttribute('autocomplete', 'off');
    var input = el('input', 'tv-in');
    input.type = 'search';
    input.placeholder = 'Search, or paste a link';
    input.setAttribute('aria-label', 'Search for a video');
    var go = el('button', 'tv-go', 'Play');
    go.type = 'submit';
    form.appendChild(input);
    form.appendChild(go);

    var note = el('p', 'tv-note', '');
    note.setAttribute('role', 'status');
    var list = el('div', 'tv-list');

    panel.appendChild(head);
    panel.appendChild(stage);
    panel.appendChild(form);
    panel.appendChild(note);
    panel.appendChild(list);
    ol.appendChild(panel);
    document.body.appendChild(ol);

    ui = { ol: ol, panel: panel, stage: stage, form: form,
           input: input, note: note, list: list, mBtn: mBtn };

    idle();
    syncMirror();

    close.addEventListener('click', hide);
    ol.addEventListener('mousedown', function (e) { if (e.target === ol) hide(); });
    mBtn.addEventListener('click', function () {
      useMirror((mirror + 1) % MIRRORS.length);
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submit(input.value);
    });
  }

  function syncMirror() {
    ui.mBtn.textContent = 'via ' + MIRRORS[mirror].label;
  }

  /* ---------- the stage ---------- */

  function card(kicker, line, actLabel, actFn) {
    ui.stage.innerHTML = '';
    var box = el('div', 'tv-idle');
    box.appendChild(el('span', 'tv-idle-k', kicker));
    box.appendChild(el('p', null, line));
    if (actLabel) {
      var b = el('button', 'tv-act', actLabel);
      b.type = 'button';
      b.addEventListener('click', actFn);
      box.appendChild(b);
    }
    ui.stage.appendChild(box);
  }

  function useMirror(i) {
    mirror = i;
    chosen = true;
    try { localStorage.setItem(STORE, String(i)); } catch (e) {}
    syncMirror();
    if (current) play(current.id, current.title);
  }

  function otherRoute() {
    return mirror === 0 ? 1 : 0;
  }

  function idle() {
    card('Side channel', 'Search, or paste any YouTube link.');
  }

  function play(id, title) {
    current = { id: id, title: title };
    ui.panel.scrollTop = 0;
    if (MIRRORS[mirror].kind === 'stream') playStream(id, title);
    else playFrame(id, title);
  }

  function playFrame(id, title) {
    ui.stage.innerHTML = '';
    var f = document.createElement('iframe');
    f.src = MIRRORS[mirror].embed(id);
    f.title = title || 'Video';
    f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    ui.stage.appendChild(f);
  }

  /* Only the muxed MP4s are any use in a bare <video> — the
     video-only DASH tracks would arrive silent. Highest wins;
     an entry with no parsable height sorts to the bottom. */
  function pickStream(d) {
    var vs = (d && d.videoStreams) || [];
    var best = null;
    vs.forEach(function (v) {
      if (v.videoOnly) return;
      if (!/mp4/i.test(v.mimeType || '')) return;
      if (!v.url) return;
      var h = parseInt(v.quality, 10) || 0;
      if (!best || h > best.h) best = { h: h, url: v.url };
    });
    return best && best.url;
  }

  function playStream(id, title) {
    card('Routing', 'Pulling it through the proxy…');

    var i = 0;
    function attempt() {
      if (i >= STREAM_APIS.length) {
        /* Public instances get throttled by YouTube in waves, so this
           is a normal Tuesday rather than a bug. Hand over a button
           instead of telling them to go hunting for the chip. */
        card('No route',
             'Every proxy mirror refused that one — they get throttled by YouTube in waves.',
             'Try YouTube’s own player', function () { useMirror(0); });
        return;
      }
      var host = STREAM_APIS[i++];
      fetchJSON(host + '/streams/' + id).then(function (d) {
        /* a slow mirror must not hijack a video chosen since */
        if (!current || current.id !== id) return;
        var url = pickStream(d);
        if (!url) { attempt(); return; }
        mount(url, (d && d.title) || title);
      }, function () {
        if (current && current.id === id) attempt();
      });
    }
    attempt();
  }

  function mount(url, title) {
    ui.stage.innerHTML = '';
    var v = document.createElement('video');
    v.src = url;
    v.controls = true;
    v.autoplay = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('title', title || 'Video');
    v.addEventListener('error', function () {
      card('Dropped', 'That stream died on the way over.',
           'Try YouTube’s own player', function () { useMirror(otherRoute()); });
    });
    ui.stage.appendChild(v);
    var p = v.play();
    /* autoplay with sound is blocked until the page has engagement;
       the controls are right there, so let it fail quietly */
    if (p && p.catch) p.catch(function () {});
  }

  /* ---------- search ---------- */

  function submit(raw) {
    var q = String(raw || '').trim();
    if (!q) return;
    var id = asVideoId(q);
    if (id) {
      ui.list.innerHTML = '';
      ui.note.textContent = 'Pasted link';
      play(id, 'Pasted link');
      return;
    }
    search(q);
  }

  function search(q) {
    ui.note.textContent = 'Searching…';
    ui.list.innerHTML = '';

    var i = 0;
    function attempt() {
      if (i >= BACKENDS.length) {
        ui.note.textContent = 'No mirror answered — paste a link instead, that always plays.';
        return;
      }
      var b = BACKENDS[i++];
      fetchJSON(b.url(q)).then(function (data) {
        var rows = b.parse(data);
        if (!rows.length) { attempt(); return; }
        ui.note.textContent = rows.length + ' results · via ' + b.label;
        render(rows);
      }, attempt);
    }
    attempt();
  }

  function render(rows) {
    var frag = document.createDocumentFragment();
    rows.slice(0, 24).forEach(function (v) {
      var row = el('button', 'tv-row');
      row.type = 'button';

      var th = el('span', 'tv-thumb');
      var img = document.createElement('img');
      img.src = v.thumb;
      img.alt = '';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      /* Mirror-hosted thumbnails die with the mirror, ytimg is the
         second guess, and the strip pattern underneath is the third. */
      img.addEventListener('error', function () {
        if (img.getAttribute('data-fell')) { img.remove(); return; }
        img.setAttribute('data-fell', '1');
        img.src = ytThumb(v.id);
      });
      th.appendChild(img);
      th.appendChild(el('span', 'tv-dur', clock(v.secs)));

      var meta = el('span', 'tv-meta');
      meta.appendChild(el('span', 'tv-h', v.title));
      meta.appendChild(el('span', 'tv-sub',
        v.author + (v.views ? ' · ' + views(v.views) : '')));

      row.appendChild(th);
      row.appendChild(meta);
      row.addEventListener('click', function () { play(v.id, v.title); });
      frag.appendChild(row);
    });
    ui.list.appendChild(frag);
  }

  /* ---------- is YouTube even reachable from here? ---------- */

  function probe() {
    if (probed || chosen) return;
    probed = true;
    var img = new Image();
    var settled = false;
    var fail = function () {
      if (settled) return;
      settled = true;
      if (chosen) return;
      mirror = 1;
      syncMirror();
      if (!ui.note.textContent) {
        ui.note.textContent = 'YouTube looks blocked here — routed through the proxy.';
      }
    };
    var ok = function () { settled = true; };
    var t = setTimeout(fail, 2600);
    img.onload = function () { clearTimeout(t); ok(); };
    img.onerror = function () { clearTimeout(t); fail(); };
    img.referrerPolicy = 'no-referrer';
    img.src = ytThumb('dQw4w9WgXcQ') + '?_=' + Date.now();
  }

  /* ---------- show / hide ---------- */

  function show() {
    if (!ui) build();
    lastFocus = document.activeElement;
    /* a reopen inside the close transition would otherwise be
       un-done by that close's pending hidden= */
    clearTimeout(hideTimer);
    ui.ol.removeAttribute('hidden');
    /* Force a style flush so the transition has a start to run from.
       rAF would do it too, but it is throttled in a background tab and
       the panel would then sit invisible until something repainted. */
    void ui.ol.offsetWidth;
    ui.ol.classList.add('open');
    ui.input.focus();
    document.documentElement.classList.add('tv-lock');
    document.addEventListener('keydown', onKey);
    probe();
  }

  function hide() {
    if (!ui) return;
    ui.ol.classList.remove('open');
    idle();
    current = null;
    document.documentElement.classList.remove('tv-lock');
    document.removeEventListener('keydown', onKey);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { ui.ol.setAttribute('hidden', ''); }, 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); hide(); }
  }

  /* ---------- the trigger ---------- */

  var sig = document.querySelector('[data-sig]');
  if (sig) {
    sig.addEventListener('dblclick', function (e) {
      e.preventDefault();
      /* a double-click on the caption would otherwise leave the
         word highlighted behind the panel */
      var sel = window.getSelection && window.getSelection();
      if (sel && sel.removeAllRanges) sel.removeAllRanges();
      show();
    });
  }

  window.BenchTV = { open: show, close: hide };
})();
