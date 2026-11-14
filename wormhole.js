

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.matchMedia('(max-width: 760px)').matches;
  var RINGS = small ? 26 : 34;
  var SLOTS = small ? 10 : 13;
  var SPACING = 3.1;
  var RADIUS = 5.2;
  var GRID = 8;

  var PAPER = '#f4f1ea', INK = '#131210', SIGNAL = '#ff5722', VOLT = '#c6f432',
      COBALT = '#2b50f0', BUTTER = '#ffc940', BLUSH = '#ffb3c7';

  var WORDS = ['FERROS', 'DRONE STUDY', 'TALOS', 'ARGUS', 'CASSANDRA', 'INKLING', 'LYNX', 'TELOS',
               'BUILT.', 'NOT BOUGHT.', 'ROBOTICS', 'PCB DESIGN', 'CAD', 'LOAD CELLS', 'THERMAL',
               'CIRCUIT PYTHON', 'FDM', 'VISION'];
  var SPECS = [['KRUSKAL–WALLIS P', '0.001'], ['DROP HEIGHT', '5 ft'], ['LOAD CELLS', '5'], ['AXES', '6'],
               ['PARTS TOTAL', '~$232'], ['ARCH TRAVEL', '180°'], ['THERMAL ARRAY', '32×24'],
               ['BUDGET CAP', '$300'], ['PRINTS MADE', '380'], ['DOWNLOADS', '614']];
  var PAIRS = [[INK, PAPER], [PAPER, INK], [SIGNAL, INK], [VOLT, INK], [COBALT, PAPER], [BUTTER, INK], [BLUSH, INK]];

  var atlas = null, atlasListeners = [];

  function drawAtlas() {
    var S = 256, c = atlas || document.createElement('canvas');
    c.width = c.height = S * GRID;
    var x = c.getContext('2d');
    var disp = '"Bricolage var", "Arial Narrow", Arial, sans-serif';
    var mono = '"SF Mono", ui-monospace, Menlo, Consolas, monospace';

    function cell(i, fn) {
      var cx = (i % GRID) * S, cy = Math.floor(i / GRID) * S;
      x.save(); x.translate(cx, cy); x.beginPath(); x.rect(0, 0, S, S); x.clip();
      fn(); x.restore();
    }
    function fit(text, max, weight, startPx) {
      var px = startPx;
      do { x.font = weight + ' condensed ' + px + 'px ' + disp; px -= 4; }
      while (x.measureText(text).width > max && px > 20);
    }

    for (var i = 0; i < GRID * GRID; i++) {
      (function (i) {
        var pair = PAIRS[(i * 3 + Math.floor(i / GRID)) % PAIRS.length];
        var kind = i % 8;
        cell(i, function () {
          x.fillStyle = pair[0]; x.fillRect(0, 0, S, S);
          x.fillStyle = pair[1]; x.strokeStyle = pair[1];

          if (kind === 0 || kind === 3 || kind === 6) {
            var w = WORDS[(i * 5 + kind) % WORDS.length];
            var lines = w.split(' ');
            x.textBaseline = 'alphabetic';
            lines.forEach(function (ln, k) {
              fit(ln, S - 40, 800, 120);
              x.fillText(ln, 20, S - 28 - (lines.length - 1 - k) * 78);
            });
            x.font = '500 13px ' + mono;
            x.fillText('LLR / ' + ('0' + (i % 64)).slice(-2), 20, 34);
          } else if (kind === 1 || kind === 5) {
            var sp = SPECS[(i + kind) % SPECS.length];
            x.font = '500 14px ' + mono;
            x.fillText(sp[0], 20, 36);
            x.fillRect(20, 48, S - 40, 3);
            fit(sp[1], S - 40, 800, 132);
            x.fillText(sp[1], 20, S - 30);
          } else if (kind === 2) {
            var v = [41, 36, 44, 38, 84];
            x.font = '500 13px ' + mono;
            x.fillText('PEAK FORCE · S1–S5', 20, 34);
            for (var b = 0; b < 5; b++) {
              var h = v[b] * 1.9;
              x.fillRect(22 + b * 44, S - 24 - h, 34, h);
            }
          } else if (kind === 4) {
            x.lineWidth = 3;
            if (i % 3 === 0) {
              for (var g = 16; g < S; g += 32) { x.beginPath(); x.moveTo(g, 0); x.lineTo(g, S); x.moveTo(0, g); x.lineTo(S, g); x.stroke(); }
            } else if (i % 3 === 1) {
              for (var d = 0; d < 8; d++) for (var e = 0; e < 8; e++) { x.beginPath(); x.arc(20 + d * 31, 20 + e * 31, 5, 0, 6.3); x.fill(); }
            } else {
              x.lineWidth = 14;
              for (var s = -S; s < S * 2; s += 44) { x.beginPath(); x.moveTo(s, S); x.lineTo(s + S, 0); x.stroke(); }
            }
          }

        });
      })(i);
    }
    atlas = c;
    return c;
  }

  function addCharacters() {
    if (!window.LLRChar || !atlas) return;
    var names = ['explorer', 'builder', 'thinker'], S = 256, x = atlas.getContext('2d'), left = 0;
    var bg = { explorer: VOLT, builder: BUTTER, thinker: PAPER };
    for (var i = 7, n = 0; i < GRID * GRID; i += 8, n++) {
      (function (i, name) {
        left++;
        var img = new Image();
        img.onload = function () {
          var cx = (i % GRID) * S, cy = Math.floor(i / GRID) * S;
          x.fillStyle = bg[name]; x.fillRect(cx, cy, S, S);
          x.drawImage(img, cx + 34, cy + 16, 188, 222);
          if (--left === 0) atlasListeners.forEach(function (f) { f(); });
        };
        img.onerror = function () { left--; };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(window.LLRChar.svg(name));
      })(i, names[n % 3]);
    }
  }

  function getAtlas() {
    if (atlas) return atlas;
    drawAtlas();
    addCharacters();

    if (document.fonts && document.fonts.load) {
      document.fonts.load('800 80px "Bricolage var"').then(function () {
        drawAtlas(); addCharacters();
        atlasListeners.forEach(function (f) { f(); });
      }, function () {});
    }
    return atlas;
  }

  var VERT = [
    'attribute float aRing; attribute float aSlot; attribute vec2 aCorner;',
    'uniform mat4 uProj; uniform float uTravel, uSpacing, uRadius, uSlots, uSpin, uTilt, uFlare, uBend, uGrid;',
    'uniform float uFogNear, uFogFar, uLast; uniform vec3 uDrop; uniform vec2 uLook;',
    'varying vec2 vUv; varying float vFog; varying float vVis;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'vec2 path(float z){ return uBend * vec2(sin(z * 0.045) + 0.6 * sin(z * 0.021 + 1.7), 0.8 * cos(z * 0.037 + 0.4)); }',
    'void main(){',
    '  float ring = floor(uTravel / uSpacing) + aRing;',
    '  float zw = (ring + aCorner.y * 0.93) * uSpacing;',
    '  float d = zw - uTravel;',
    '  float a = (aSlot + 0.5 * mod(ring, 2.0)) / uSlots * 6.2831853 + ring * 0.21 + uSpin + zw * 0.012;',
    '  a += aCorner.x * 3.14159265 / uSlots * 0.93;',
    '  float rad = uRadius * (1.0 + uFlare * exp(-max(zw, 0.0) / (uSpacing * 2.6)));',

    '  vec2 c = path(zw) - path(uTravel) - (path(uTravel + 0.5) - path(uTravel - 0.5)) * d;',
    '  vec3 p = vec3(c + rad * vec2(cos(a), sin(a)), -d);',
    '  float ct = cos(uTilt), st = sin(uTilt);',
    '  p = vec3(p.x, p.y * ct - p.z * st, p.y * st + p.z * ct) + uDrop;',
    '  float cy = cos(uLook.x), sy = sin(uLook.x);',
    '  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);',
    '  float cp = cos(uLook.y), sp = sin(uLook.y);',
    '  p = vec3(p.x, p.y * cp - p.z * sp, p.y * sp + p.z * cp);',
    '  gl_Position = uProj * vec4(p, 1.0);',
    '  float cell = floor(hash(vec2(ring, aSlot)) * uGrid * uGrid);',
    '  vec2 inner = vec2(aCorner.x * 0.5 + 0.5, aCorner.y) * 0.95 + 0.025;',
    '  vUv = (vec2(mod(cell, uGrid), floor(cell / uGrid)) + inner) / uGrid;',
    '  vFog = smoothstep(uFogNear, uFogFar, d);',
    '  vVis = step(-0.5, ring) * step(ring, uLast + 0.5);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'uniform sampler2D uAtlas; uniform vec3 uFogCol;',
    'varying vec2 vUv; varying float vFog; varying float vVis;',
    'void main(){',
    '  if (vVis < 0.5) discard;',
    '  vec3 c = texture2D(uAtlas, vUv).rgb;',
    '  gl_FragColor = vec4(mix(c, uFogCol, vFog), 1.0);',
    '}'
  ].join('\n');

  function Tunnel(canvas) {
    var gl = null;
    try {
      gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance' }) ||
           canvas.getContext('experimental-webgl');
    } catch (e) {}
    if (!gl) return null;

    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    var quad = [[-1, 0], [1, 0], [1, 1], [-1, 0], [1, 1], [-1, 1]];
    var data = new Float32Array((RINGS + 2) * SLOTS * 6 * 4), o = 0;
    for (var r = -2; r < RINGS; r++) for (var s = 0; s < SLOTS; s++) for (var q = 0; q < 6; q++) {
      data[o++] = r; data[o++] = s; data[o++] = quad[q][0]; data[o++] = quad[q][1];
    }
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    var loc = function (n) { return gl.getAttribLocation(prog, n); };
    var aRing = loc('aRing'), aSlot = loc('aSlot'), aCorner = loc('aCorner');
    gl.enableVertexAttribArray(aRing);   gl.vertexAttribPointer(aRing, 1, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(aSlot);   gl.vertexAttribPointer(aSlot, 1, gl.FLOAT, false, 16, 4);
    gl.enableVertexAttribArray(aCorner); gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, 16, 8);

    var U = {};
    ['uProj', 'uTravel', 'uSpacing', 'uRadius', 'uSlots', 'uSpin', 'uTilt', 'uFlare', 'uBend', 'uGrid',
     'uFogNear', 'uFogFar', 'uLast', 'uDrop', 'uLook', 'uAtlas', 'uFogCol'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n);
    });

    var tex = gl.createTexture();
    function upload() {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, getAtlas());
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      var ext = gl.getExtension('EXT_texture_filter_anisotropic');
      if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    }
    upload();
    atlasListeners.push(upload);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.uniform1f(U.uSpacing, SPACING);
    gl.uniform1f(U.uRadius, RADIUS);
    gl.uniform1f(U.uSlots, SLOTS);
    gl.uniform1f(U.uGrid, GRID);
    gl.uniform1i(U.uAtlas, 0);

    var fog = [0.957, 0.945, 0.918];
    function readFog() {
      var v = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
      var m = /^#([0-9a-f]{6})$/i.exec(v);
      if (m) fog = [parseInt(m[1].slice(0, 2), 16) / 255, parseInt(m[1].slice(2, 4), 16) / 255, parseInt(m[1].slice(4, 6), 16) / 255];
    }
    readFog();
    var mo = new MutationObserver(readFog);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    var proj = new Float32Array(16), lastW = 0, lastH = 0;
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
      var w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (w === lastW && h === lastH) return;
      lastW = canvas.width = w; lastH = canvas.height = h;
      gl.viewport(0, 0, w, h);
      var aspect = w / h;

      var fov = (aspect < 1 ? 92 : 74) * Math.PI / 180;
      var f = 1 / Math.tan(fov / 2), near = 0.05, far = 260;
      proj.fill(0);
      proj[0] = f / aspect; proj[5] = f; proj[10] = (far + near) / (near - far); proj[11] = -1;
      proj[14] = 2 * far * near / (near - far);
      gl.uniformMatrix4fv(U.uProj, false, proj);
    }

    return {
      render: function (s) {
        resize();
        gl.clearColor(fog[0], fog[1], fog[2], 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniform1f(U.uTravel, s.travel);
        gl.uniform1f(U.uSpin, s.spin || 0);
        gl.uniform1f(U.uTilt, s.tilt || 0);
        gl.uniform1f(U.uFlare, s.flare || 0);
        gl.uniform1f(U.uBend, s.bend === undefined ? 5.5 : s.bend);
        gl.uniform1f(U.uFogNear, s.fogNear);
        gl.uniform1f(U.uFogFar, s.fogFar);
        gl.uniform1f(U.uLast, s.last === undefined ? 1e6 : s.last);
        gl.uniform3f(U.uDrop, s.dx || 0, s.dy || 0, s.dz || 0);
        gl.uniform2f(U.uLook, s.lx || 0, s.ly || 0);
        gl.uniform3f(U.uFogCol, fog[0], fog[1], fog[2]);
        gl.drawArrays(gl.TRIANGLES, 0, (RINGS + 2) * SLOTS * 6);
      },
      destroy: function () {
        mo.disconnect();
        var i = atlasListeners.indexOf(upload);
        if (i >= 0) atlasListeners.splice(i, 1);
        var lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      }
    };
  }

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  var FOG_FAR = SPACING * (RINGS - 6);

  function passage() {
    var sec = document.getElementById('passage');
    var canvas = document.getElementById('passageCanvas');
    if (!sec || !canvas) return;
    if (reduce) { sec.classList.add('flat'); return; }

    var tunnel = null, running = false, raf = 0, last = 0;
    var hud = sec.querySelector('.passage-hud');
    var meter = sec.querySelector('.passage-meter');
    var LENGTH = small ? 150 : 210;
    var END = Math.floor(LENGTH / SPACING) + 3;
    var cur = null, mx = 0, my = 0;

    window.addEventListener('pointermove', function (e) {
      mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5;
    }, { passive: true });

    function target(now) {
      var r = sec.getBoundingClientRect(), vh = innerHeight;
      var p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      var k = smooth(p / 0.17);
      var out = smooth((p - 0.86) / 0.14);
      return {
        p: p,
        travel: lerp(-12, 0, k) + LENGTH * smooth((p - 0.08) / 0.92),
        tilt: lerp(-0.64, 0, k),
        dy: lerp(0.6, 0, k),
        dz: lerp(-4, 0, k),
        flare: 1.7,
        spin: now * 0.00002,
        fogNear: lerp(FOG_FAR * 0.42, 0.2, out),
        fogFar: lerp(FOG_FAR, 1.2, out),
        lx: mx * 0.10, ly: my * 0.07
      };
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      var t = target(now);
      if (!cur) cur = t;
      var a = 1 - Math.exp(-dt * 7.5);
      for (var key in t) if (key !== 'p' && key !== 'spin' && key !== 'flare') cur[key] = lerp(cur[key], t[key], a);
      cur.spin = t.spin; cur.flare = t.flare; cur.last = END;
      tunnel.render(cur);
      if (meter) meter.style.setProperty('--p', t.p.toFixed(3));
      if (hud) hud.style.opacity = t.p > 0.9 ? 0 : 1;
    }

    function start() {
      if (running) return;
      if (!tunnel) {
        tunnel = Tunnel(canvas);
        if (!tunnel) { sec.classList.add('flat'); io.disconnect(); return; }
      }
      running = true; last = performance.now(); cur = null;
      raf = requestAnimationFrame(frame);
    }
    function stop() { running = false; cancelAnimationFrame(raf); }

    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) start(); else stop();
    }, { rootMargin: '30% 0px 30% 0px' });
    io.observe(sec);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else if (sec.getBoundingClientRect().bottom > 0 && sec.getBoundingClientRect().top < innerHeight) start();
    });
  }

  var veil = null, vTunnel = null, busy = false;

  function makeVeil(instant) {
    veil = document.createElement('div');
    veil.className = 'warp-veil';
    veil.setAttribute('aria-hidden', 'true');
    if (instant) veil.style.transition = 'none';
    var c = document.createElement('canvas');
    veil.appendChild(c);
    document.body.appendChild(veil);
    vTunnel = Tunnel(c);
    return vTunnel;
  }
  function dropVeil() {
    if (vTunnel) vTunnel.destroy();
    if (veil) veil.remove();
    veil = vTunnel = null; busy = false;
    document.documentElement.classList.remove('warp-in');
  }

  function go(url) {
    if (busy) return;
    if (reduce || !makeVeil(false)) { dropVeil(); location.href = url; return; }
    busy = true;
    try { sessionStorage.setItem('llr-warp', '1'); } catch (e) {}
    var t0 = performance.now(), DUR = 900, seed = Math.random() * 400;
    void veil.offsetWidth; veil.classList.add('on');

    var left = false;
    var leave = function () { if (!left) { left = true; location.href = url; } };
    setTimeout(leave, DUR + 500);
    (function frame(now) {
      var k = clamp((now - t0) / DUR, 0, 1);
      var e = k * k * k;
      vTunnel.render({
        travel: seed + 6 + e * 150,
        spin: e * 1.1,
        fogNear: lerp(FOG_FAR * 0.42, 0.3, smooth((k - 0.72) / 0.28)),
        fogFar: lerp(FOG_FAR, 1.6, smooth((k - 0.72) / 0.28)),
        bend: 4
      });
      if (k < 1) requestAnimationFrame(frame);
      else leave();
    })(t0);
  }

  function arrive() {
    var flagged = false;
    try { flagged = sessionStorage.getItem('llr-warp') === '1'; sessionStorage.removeItem('llr-warp'); } catch (e) {}
    if (!flagged || reduce) { document.documentElement.classList.remove('warp-in'); return; }
    if (!makeVeil(true)) { dropVeil(); return; }
    veil.classList.add('on');
    busy = true;
    var t0 = performance.now(), DUR = 820, seed = Math.random() * 400;

    setTimeout(function () { if (veil) dropVeil(); }, DUR + 900);
    (function frame(now) {
      if (!veil) return;
      var k = clamp((now - t0) / DUR, 0, 1);
      var e = 1 - Math.pow(1 - k, 3);
      vTunnel.render({
        travel: seed + e * 70,
        spin: 1.1 - e * 0.5,
        fogNear: lerp(0.3, FOG_FAR * 0.42, smooth(k / 0.5)),
        fogFar: lerp(1.6, FOG_FAR, smooth(k / 0.5)),
        bend: 4
      });
      if (k === 0) document.documentElement.classList.remove('warp-in');
      if (k > 0.45 && veil.classList.contains('on')) {
        veil.style.transition = 'opacity .42s linear';
        veil.classList.remove('on');
      }
      if (k < 1) requestAnimationFrame(frame);
      else setTimeout(dropVeil, 140);
    })(t0);
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-warp]');
    if (!a || e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    if (reduce) return;
    e.preventDefault();
    go(a.href);
  });

  window.addEventListener('pageshow', function (e) { if (e.persisted) dropVeil(); });

  function init() { arrive(); passage(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.LLRWarp = { go: go };
})();
