

(function () {
  'use strict';

  var TIMEOUT = 9000;
  var FRAME_WAIT = 6000;
  var PROBE_WAIT = 2600;
  var STORE = 'llr-tv-mirror';

  var MIRRORS = [
    {
      label: 'yt-nocookie',
      kind: 'frame',
      embed: function (id) {

        return 'https://www.youtube-nocookie.com/embed/' + id +
               '?autoplay=1&rel=0&modestbranding=1&enablejsapi=1' +
               '&origin=' + encodeURIComponent(location.origin);
      }
    },
    { label: 'proxy', kind: 'stream' }
  ];

  var STREAM_APIS = [
    'https://pipedapi.ducks.party',
    'https://api.piped.private.coffee'
  ];

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

  var ui = null;
  var mirror = 0;
  var chosen = false;
  var probed = false;
  var ytOK = null;
  var current = null;
  var lastFocus = null;
  var hideTimer = 0;

  try {
    var saved = parseInt(localStorage.getItem(STORE), 10);
    if (saved >= 0 && saved < MIRRORS.length) { mirror = saved; chosen = true; }
  } catch (e) {}

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

    window.addEventListener('message', function (e) {
      var f = ui && ui.stage.querySelector('iframe');
      if (!f || e.source !== f.contentWindow) return;
      var d = e.data;
      if (typeof d === 'string') {
        try { d = JSON.parse(d); } catch (err) { return; }
      }
      if (!d || d.event !== 'onError') return;
      if (current) failOver(current.id, 'That one refuses to embed');
    });

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

  function idle() {
    card('Side channel', 'Search, or paste any YouTube link.');
  }

  function play(id, title) {
    current = { id: id, title: title, tried: [] };
    ui.panel.scrollTop = 0;
    route(mirror);
  }

  function route(r) {
    if (!current) return;
    current.tried.push(r);

    mirror = r;
    syncMirror();
    if (MIRRORS[r].kind === 'stream') playStream(current.id, current.title);
    else playFrame(current.id, current.title);
  }

  function failOver(id, why) {
    if (!current || current.id !== id) return;
    var next = -1;
    for (var i = 0; i < MIRRORS.length; i++) {
      if (current.tried.indexOf(i) === -1) { next = i; break; }
    }
    if (next === -1) {
      card('Nothing doing', 'Both routes failed on that one.',
           'Try again', function () { play(id, current && current.title); });
      return;
    }
    ui.note.textContent = why + ' \u2014 switching to ' + MIRRORS[next].label + '\u2026';
    route(next);
  }

  function playFrame(id, title) {
    ui.stage.innerHTML = '';
    var f = document.createElement('iframe');
    f.src = MIRRORS[0].embed(id);
    f.title = title || 'Video';
    f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

    var checked = false;
    var check = function () {
      if (checked) return;
      checked = true;
      reachable(function (ok) {
        if (!ok) failOver(id, 'YouTube looks blocked here');
      });
    };
    f.addEventListener('load', function () {
      check();

      try {
        f.contentWindow.postMessage(JSON.stringify({
          event: 'listening', id: 'benchtv', channel: 'widget'
        }), '*');
      } catch (e) {}
    });
    setTimeout(check, FRAME_WAIT);

    ui.stage.appendChild(f);
  }

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

        failOver(id, 'Every proxy mirror refused that');
        return;
      }
      var host = STREAM_APIS[i++];
      fetchJSON(host + '/streams/' + id).then(function (d) {

        if (!current || current.id !== id) return;
        var url = pickStream(d);
        if (!url) { attempt(); return; }
        mount(url, (d && d.title) || title, id);
      }, function () {
        if (current && current.id === id) attempt();
      });
    }
    attempt();
  }

  function mount(url, title, id) {
    ui.stage.innerHTML = '';
    var v = document.createElement('video');
    v.src = url;
    v.controls = true;
    v.autoplay = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('title', title || 'Video');
    v.addEventListener('error', function () {
      failOver(id, 'That stream died on the way over');
    });
    ui.stage.appendChild(v);
    var p = v.play();

    if (p && p.catch) p.catch(function () {});
  }

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

  function reachable(cb) {
    if (ytOK !== null) { cb(ytOK); return; }
    var img = new Image();
    var settled = false;
    var finish = function (v) {
      if (settled) return;
      settled = true;
      ytOK = v;
      cb(v);
    };
    var t = setTimeout(function () { finish(false); }, PROBE_WAIT);
    img.onload = function () { clearTimeout(t); finish(true); };
    img.onerror = function () { clearTimeout(t); finish(false); };
    img.referrerPolicy = 'no-referrer';
    img.src = ytThumb('dQw4w9WgXcQ') + '?_=' + Date.now();
  }

  function probe() {
    if (probed || chosen) return;
    probed = true;
    reachable(function (ok) {
      if (ok || chosen) return;
      mirror = 1;
      syncMirror();
      if (!ui.note.textContent) {
        ui.note.textContent = 'YouTube looks blocked here — routed through the proxy.';
      }
    });
  }

  function show() {
    if (!ui) build();
    lastFocus = document.activeElement;

    clearTimeout(hideTimer);
    ui.ol.removeAttribute('hidden');

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

  var sig = document.querySelector('[data-sig]');
  if (sig) {
    sig.addEventListener('dblclick', function (e) {
      e.preventDefault();

      var sel = window.getSelection && window.getSelection();
      if (sel && sel.removeAllRanges) sel.removeAllRanges();
      show();
    });
  }

  window.BenchTV = { open: show, close: hide };
})();
