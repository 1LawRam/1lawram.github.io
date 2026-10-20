(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var GLYPHS = {
    spool: '<circle cx="50" cy="50" r="33"/><circle cx="50" cy="50" r="11"/><path d="M83 50c6 9 3 21-8 27"/>',
    chip: '<rect x="27" y="27" width="46" height="46" rx="6"/><path d="M27 41H13M27 59H13M73 41h14M73 59h14M41 27V13M59 27V13M41 73v14M59 73v14"/>',
    iron: '<path d="M16 84 43 57"/><path d="M39 53l14-14 22 22-14 14z"/><path d="M73 39l11-11"/>',
    thermal: '<rect x="20" y="20" width="60" height="60" rx="8"/><path d="M20 40h60M20 60h60M40 20v60M60 20v60"/>',
    pcb: '<rect x="15" y="25" width="70" height="50" rx="6"/><circle cx="33" cy="42" r="5"/><circle cx="33" cy="60" r="5"/><path d="M38 42h26v18M64 60h13"/>',
    arch: '<path d="M13 85a37 37 0 0 1 74 0"/><path d="M50 47v24"/><circle cx="50" cy="40" r="9"/>',
    drone: '<circle cx="27" cy="27" r="12"/><circle cx="73" cy="27" r="12"/><circle cx="27" cy="73" r="12"/><circle cx="73" cy="73" r="12"/><rect x="39" y="39" width="22" height="22" rx="5"/><path d="M36 36 43 43M64 36 57 43M36 64 43 57M64 64 57 57"/>',
    resistor: '<path d="M8 50h19l6-17 10 34 10-34 10 34 6-17h19"/>',
    wave: '<path d="M9 63c11 0 12-31 23-31s12 31 23 31 12-25 23-25 8 12 13 12"/>',
    bolt: '<path d="M50 11v50"/><path d="M33 61h34l-6 28H39z"/>',
    caliper: '<path d="M13 29h74M13 29v42M87 29v19"/><path d="M41 29v47M41 61h30"/>',
    servo: '<rect x="24" y="30" width="52" height="40" rx="6"/><circle cx="66" cy="50" r="11"/><path d="M66 50 58 42M24 40H12M24 60H12"/>',
    needle: '<path d="M50 12v46"/><path d="M44 58h12l-3 30h-6z"/><circle cx="50" cy="14" r="6"/>',
    tag: '<rect x="20" y="20" width="60" height="60" rx="5"/><rect x="34" y="34" width="14" height="14"/><rect x="52" y="34" width="14" height="14"/><rect x="34" y="52" width="14" height="14"/>'
  };

  var NAMES = Object.keys(GLYPHS);
  var NS = 'http://www.w3.org/2000/svg';
  var filterReady = false;

  function installFilter() {
    if (filterReady) return;
    filterReady = true;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    svg.innerHTML =
      '<defs><filter id="wm-rough" x="-25%" y="-25%" width="150%" height="150%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="3" seed="7" result="n">' +
      '<animate attributeName="seed" values="7;19;31;7" dur="2.4s" repeatCount="indefinite"/>' +
      '</feTurbulence>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter></defs>';
    document.body.appendChild(svg);
  }

  function makeGlyph(name) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'wm-glyph');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML =
      '<g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" ' +
      'stroke-linejoin="round" filter="url(#wm-rough)">' + GLYPHS[name] + '</g>';
    return svg;
  }

  function drawIn(svg) {
    var parts = svg.querySelectorAll('path,circle,rect');
    for (var i = 0; i < parts.length; i++) {
      var el = parts[i];
      var len;
      try { len = el.getTotalLength ? el.getTotalLength() : 0; } catch (e) { len = 0; }
      if (!len) len = 240;
      el.style.strokeDasharray = len;
      el.style.strokeDashoffset = len;
      el.style.transition = 'stroke-dashoffset .5s cubic-bezier(.22,.61,.36,1) ' + (i * 0.055) + 's';
      void el.getBoundingClientRect();
      el.style.strokeDashoffset = '0';
    }
  }

  function drawOut(svg) {
    var parts = svg.querySelectorAll('path,circle,rect');
    for (var i = 0; i < parts.length; i++) {
      var el = parts[i];
      el.style.transition = 'stroke-dashoffset .34s ease-in ' + (i * 0.03) + 's';
      el.style.strokeDashoffset = el.style.strokeDasharray;
    }
  }

  function setup(host) {
    var tmp = document.createElement('div');
    tmp.innerHTML = host.innerHTML.replace(/<br\s*\/?>/gi, '\n');
    var text = tmp.textContent;
    var cells = [];

    host.setAttribute('aria-label', text.replace(/\s+/g, ' ').trim());
    host.textContent = '';

    text.split('\n').forEach(function (line, li) {
      if (li) host.appendChild(document.createElement('br'));
      line.split(/(\s+)/).forEach(function (word) {
        if (!word) return;
        if (/^\s+$/.test(word)) {
          host.appendChild(document.createTextNode(word));
          return;
        }
        var wrap = document.createElement('span');
        wrap.className = 'wm-word';
        for (var i = 0; i < word.length; i++) {
          var span = document.createElement('span');
          span.className = 'wm-cell';
          span.setAttribute('aria-hidden', 'true');
          var inner = document.createElement('span');
          inner.className = 'wm-ch';
          inner.textContent = word[i];
          span.appendChild(inner);
          wrap.appendChild(span);
          if (/[A-Za-z0-9]/.test(word[i])) cells.push(span);
        }
        host.appendChild(wrap);
      });
    });
    return cells;
  }

  function run(host, cells) {
    var busy = [];
    var max = cells.length > 22 ? 2 : 1;

    /* never swap the first letter — a headline reading "ET'S BUILD..."
       costs more than the glyph gains */
    if (cells.length > 1) cells = cells.slice(1);

    function pick() {
      if (busy.length >= max) return;
      var free = cells.filter(function (c) { return busy.indexOf(c) < 0; });
      if (!free.length) return;
      var cell = free[Math.floor(Math.random() * free.length)];
      var name = NAMES[Math.floor(Math.random() * NAMES.length)];
      busy.push(cell);

      var svg = makeGlyph(name);
      cell.appendChild(svg);
      cell.classList.add('swapped');
      requestAnimationFrame(function () { drawIn(svg); });

      setTimeout(function () {
        drawOut(svg);
        cell.classList.remove('swapped');
        setTimeout(function () {
          svg.remove();
          busy.splice(busy.indexOf(cell), 1);
        }, 420);
      }, 2100 + Math.random() * 1200);
    }

    var timer = setInterval(function () {
      if (document.hidden) return;
      var r = host.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      pick();
    }, 2600);

    setTimeout(pick, 1200);
    return timer;
  }

  function init() {
    var hosts = document.querySelectorAll('[data-play]');
    if (!hosts.length) return;
    installFilter();
    for (var i = 0; i < hosts.length; i++) {
      var cells = setup(hosts[i]);
      if (!reduce && cells.length) run(hosts[i], cells);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
