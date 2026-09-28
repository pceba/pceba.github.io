(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------------- Language ---------------- */
  $$('[data-set-lang]').forEach(function (b) {
    b.addEventListener('click', function () {
      var l = b.getAttribute('data-set-lang');
      root.lang = l;
      try { localStorage.setItem('lang', l); } catch (e) {}
    });
  });

  $('#year').textContent = new Date().getFullYear();

  /* ---------------- Nav state ---------------- */
  var nav = $('.nav');
  function onNavScroll() { nav.classList.toggle('is-scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', onNavScroll, { passive: true });
  onNavScroll();

  if ('IntersectionObserver' in window) {
    var links = {};
    $$('.nav__links a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting || !links[e.target.id]) return;
        Object.keys(links).forEach(function (k) { links[k].classList.remove('is-active'); });
        links[e.target.id].classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(function (s) { spy.observe(s); });

    /* ---------------- Reveal ---------------- */
    var rev = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        rev.unobserve(e.target);
        if (e.target.classList.contains('club__intro')) countUp();
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    $$('.reveal').forEach(function (el) { rev.observe(el); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------------- Count-up ---------------- */
  var counted = false;
  function countUp() {
    if (counted) return;
    counted = true;
    var el = $('.count');
    var to = +el.getAttribute('data-to');
    if (reduceMotion) { el.textContent = to; return; }
    var t0 = performance.now(), dur = 1800;
    (function step(t) {
      var p = clamp((t - t0) / dur, 0, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------------- History: scroll-linked track ---------------- */
  (function history() {
    var sec = $('#history');
    var track = $('.history__track', sec);
    var bar = $('.history__progress span', sec);
    var moments = $$('.moment', sec);
    if (reduceMotion) return;

    sec.classList.add('is-pinned');
    var dist = 0;

    function measure() {
      dist = Math.max(0, track.scrollWidth - window.innerWidth);
      sec.style.height = (window.innerHeight + dist) + 'px';
      update();
    }
    function update() {
      var r = sec.getBoundingClientRect();
      var span = sec.offsetHeight - window.innerHeight;
      var p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
      track.style.transform = 'translate3d(' + (-p * dist).toFixed(1) + 'px,0,0)';
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      var edge = window.innerWidth * 0.86;
      moments.forEach(function (m) {
        m.classList.toggle('lit', m.getBoundingClientRect().left < edge);
      });
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    measure();
  })();

  /* ---------------- Clocks ---------------- */
  (function clocks() {
    var cities = $$('.city[data-tz]');
    function tick() {
      var now = new Date();
      cities.forEach(function (c) {
        var parts;
        try {
          parts = new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', hour12: false, timeZone: c.getAttribute('data-tz')
          }).format(now).split(':');
        } catch (e) { return; }
        $('.t', c).innerHTML = parts[0] + '<span class="colon">:</span>' + parts[1];
      });
    }
    tick();
    setInterval(tick, 15000);
  })();

  /* ---------------- Lightbox ---------------- */
  (function lightbox() {
    var dlg = $('#lightbox');
    if (!dlg || typeof dlg.showModal !== 'function') return;
    var img = $('#lightbox-img'), cap = $('#lightbox-cap');
    $$('.print').forEach(function (p) {
      p.addEventListener('click', function () {
        img.src = p.getAttribute('data-full');
        var c = $('.print__cap.' + root.lang, p);
        cap.textContent = c ? c.textContent : '';
        img.alt = cap.textContent;
        dlg.showModal();
      });
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  })();

  /* =========================================================
     A tiny neural network, trained live with Adam.
     2 inputs -> 12 tanh -> 12 tanh -> 1 sigmoid
     ========================================================= */
  (function machine() {
    var field = $('#field');
    var netCv = $('#net');
    if (!field || !field.getContext) return;

    var SIZES = [2, 12, 12, 1];
    var COL = {
      paper: [248, 242, 230],
      a: [176, 96, 58],    // terracotta, class 1
      b: [109, 116, 70],   // olive, class 0
      ink: [59, 42, 31]
    };

    /* ---- model ---- */
    var W, B, mW, vW, mB, vB, t;
    function randn() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    function init() {
      W = []; B = []; mW = []; vW = []; mB = []; vB = []; t = 0;
      for (var l = 0; l < SIZES.length - 1; l++) {
        var nin = SIZES[l], nout = SIZES[l + 1], s = Math.sqrt(1 / nin);
        var w = new Float64Array(nin * nout);
        for (var i = 0; i < w.length; i++) w[i] = randn() * s;
        W.push(w); B.push(new Float64Array(nout));
        mW.push(new Float64Array(w.length)); vW.push(new Float64Array(w.length));
        mB.push(new Float64Array(nout)); vB.push(new Float64Array(nout));
      }
    }

    function forward(x, y, acts) {
      var a = acts ? acts[0] : new Float64Array(2);
      a[0] = x; a[1] = y;
      for (var l = 0; l < W.length; l++) {
        var nin = SIZES[l], nout = SIZES[l + 1], w = W[l], b = B[l];
        var out = acts ? acts[l + 1] : new Float64Array(nout);
        for (var j = 0; j < nout; j++) {
          var s = b[j], row = j * nin;
          for (var i = 0; i < nin; i++) s += w[row + i] * a[i];
          out[j] = l === W.length - 1 ? 1 / (1 + Math.exp(-s)) : Math.tanh(s);
        }
        a = out;
      }
      return a[0];
    }

    var acts = SIZES.map(function (n) { return new Float64Array(n); });
    var deltas = SIZES.map(function (n) { return new Float64Array(n); });
    var gW, gB;
    function zeroGrads() {
      gW = W.map(function (w) { return new Float64Array(w.length); });
      gB = B.map(function (b) { return new Float64Array(b.length); });
    }

    function trainStep(points, lr) {
      if (!points.length) return 0;
      zeroGrads();
      var loss = 0, L = W.length;
      for (var n = 0; n < points.length; n++) {
        var pt = points[n];
        var p = forward(pt.x, pt.y, acts);
        var yv = pt.c;
        loss += -(yv * Math.log(p + 1e-9) + (1 - yv) * Math.log(1 - p + 1e-9));
        deltas[L][0] = p - yv; // BCE + sigmoid
        for (var l = L - 1; l >= 0; l--) {
          var nin = SIZES[l], nout = SIZES[l + 1], w = W[l];
          var aIn = acts[l], dOut = deltas[l + 1], dIn = deltas[l];
          for (var j = 0; j < nout; j++) {
            var d = dOut[j], row = j * nin;
            gB[l][j] += d;
            for (var i = 0; i < nin; i++) gW[l][row + i] += d * aIn[i];
          }
          if (l > 0) {
            for (var i2 = 0; i2 < nin; i2++) {
              var s = 0;
              for (var j2 = 0; j2 < nout; j2++) s += w[j2 * nin + i2] * dOut[j2];
              dIn[i2] = s * (1 - aIn[i2] * aIn[i2]);
            }
          }
        }
      }
      // Adam
      t++;
      var b1 = 0.9, b2 = 0.999, eps = 1e-8, inv = 1 / points.length;
      var c1 = 1 - Math.pow(b1, t), c2 = 1 - Math.pow(b2, t);
      for (var l2 = 0; l2 < L; l2++) {
        adam(W[l2], gW[l2], mW[l2], vW[l2]);
        adam(B[l2], gB[l2], mB[l2], vB[l2]);
      }
      function adam(P, G, M, V) {
        for (var k = 0; k < P.length; k++) {
          var g = G[k] * inv;
          M[k] = b1 * M[k] + (1 - b1) * g;
          V[k] = b2 * V[k] + (1 - b2) * g * g;
          P[k] -= lr * (M[k] / c1) / (Math.sqrt(V[k] / c2) + eps);
        }
      }
      return loss / points.length;
    }

    /* ---- data ---- */
    var points = [];
    var cls = 1;
    function jitter(s) { return (Math.random() - 0.5) * s; }
    var presets = {
      circle: function () {
        var out = [];
        for (var i = 0; i < 90; i++) {
          var inner = i % 2 === 0;
          var r = inner ? Math.random() * 0.36 : 0.62 + Math.random() * 0.3;
          var a = Math.random() * Math.PI * 2;
          out.push({ x: r * Math.cos(a), y: r * Math.sin(a) * 0.9, c: inner ? 1 : 0 });
        }
        return out;
      },
      xor: function () {
        var out = [];
        while (out.length < 100) {
          var x = jitter(1.8), y = jitter(1.6);
          if (Math.abs(x) < 0.1 || Math.abs(y) < 0.1) continue;
          out.push({ x: x, y: y, c: x * y > 0 ? 1 : 0 });
        }
        return out;
      },
      spiral: function () {
        var out = [], n = 60;
        for (var c = 0; c < 2; c++) {
          for (var i = 0; i < n; i++) {
            var r = 0.08 + (i / n) * 0.82;
            var a = (i / n) * 3.2 * Math.PI + c * Math.PI;
            out.push({ x: r * Math.sin(a) + jitter(0.05), y: r * Math.cos(a) * 0.95 + jitter(0.05), c: c });
          }
        }
        return out;
      },
      clear: function () { return []; }
    };

    /* ---- canvas sizing ---- */
    var ctx = field.getContext('2d');
    var nctx = netCv.getContext('2d');
    var dpr = 1, FW = 0, FH = 0;
    var GX = 84, GY = 55;
    var grid = document.createElement('canvas');
    grid.width = GX; grid.height = GY;
    var gctx = grid.getContext('2d');
    var gimg = gctx.createImageData(GX, GY);

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = field.getBoundingClientRect();
      FW = Math.round(r.width * dpr); FH = Math.round(r.height * dpr);
      field.width = FW; field.height = FH;
      var nr = netCv.getBoundingClientRect();
      netCv.width = Math.round(nr.width * dpr); netCv.height = Math.round(nr.height * dpr);
      GY = Math.max(20, Math.round(GX * r.height / r.width));
      grid.height = GY; gimg = gctx.createImageData(GX, GY);
      dirty = true;
    }

    // world coords: x in [-1,1], y in [-ay, ay] where ay = H/W
    function ay() { return FH / FW || 0.66; }
    function toWorld(px, py) { return { x: (px / FW) * 2 - 1, y: ((py / FH) * 2 - 1) * ay() }; }
    function toPx(x, y) { return { x: (x + 1) / 2 * FW, y: (y / ay() + 1) / 2 * FH }; }

    /* ---- drawing ---- */
    function mix(c1, c2, k) { return [c1[0] + (c2[0] - c1[0]) * k, c1[1] + (c2[1] - c1[1]) * k, c1[2] + (c2[2] - c1[2]) * k]; }

    function drawField() {
      var d = gimg.data, A = ay();
      for (var j = 0; j < GY; j++) {
        var y = ((j + 0.5) / GY * 2 - 1) * A;
        for (var i = 0; i < GX; i++) {
          var x = (i + 0.5) / GX * 2 - 1;
          var p = points.length ? forward(x, y) : 0.5;
          var k = (p - 0.5) * 2;
          var c = k > 0 ? mix(COL.paper, COL.a, k * 0.46) : mix(COL.paper, COL.b, -k * 0.42);
          var o = (j * GX + i) * 4;
          d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
        }
      }
      gctx.putImageData(gimg, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(grid, 0, 0, FW, FH);

      // faint graph-paper lines
      ctx.strokeStyle = 'rgba(59,42,31,0.06)';
      ctx.lineWidth = 1;
      var step = FW / 16;
      ctx.beginPath();
      for (var gx = step; gx < FW; gx += step) { ctx.moveTo(gx, 0); ctx.lineTo(gx, FH); }
      for (var gy = step; gy < FH; gy += step) { ctx.moveTo(0, gy); ctx.lineTo(FW, gy); }
      ctx.stroke();

      // points
      var R = 5 * dpr;
      points.forEach(function (pt) {
        var q = toPx(pt.x, pt.y);
        ctx.beginPath();
        ctx.arc(q.x, q.y, R, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(' + (pt.c ? COL.a : COL.b).join(',') + ')';
        ctx.fill();
        ctx.lineWidth = 1.6 * dpr;
        ctx.strokeStyle = 'rgba(251,247,239,0.95)';
        ctx.stroke();
      });

      if (!points.length) {
        ctx.fillStyle = 'rgba(94,71,53,0.75)';
        ctx.font = 'italic ' + Math.round(22 * dpr) + 'px "Cormorant Garamond", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(root.lang === 'es' ? 'Un lienzo en blanco. Pon el primer punto.' : 'A blank page. Place the first point.', FW / 2, FH / 2);
      }
    }

    function drawNet() {
      var w = netCv.width, h = netCv.height;
      nctx.clearRect(0, 0, w, h);
      var cols = SIZES.length, padX = 10 * dpr, padY = 8 * dpr;
      var pos = SIZES.map(function (n, l) {
        var x = padX + (w - 2 * padX) * (l / (cols - 1));
        var arr = [];
        for (var i = 0; i < n; i++) arr.push({ x: x, y: n === 1 ? h / 2 : padY + (h - 2 * padY) * (i / (n - 1)) });
        return arr;
      });
      for (var l = 0; l < W.length; l++) {
        var nin = SIZES[l], nout = SIZES[l + 1];
        for (var j = 0; j < nout; j++) {
          for (var i = 0; i < nin; i++) {
            var v = W[l][j * nin + i], m = Math.min(1, Math.abs(v) / 2.2);
            nctx.strokeStyle = 'rgba(' + (v > 0 ? COL.a : COL.b).join(',') + ',' + (0.08 + m * 0.7).toFixed(3) + ')';
            nctx.lineWidth = (0.4 + m * 1.6) * dpr;
            nctx.beginPath();
            nctx.moveTo(pos[l][i].x, pos[l][i].y);
            nctx.lineTo(pos[l + 1][j].x, pos[l + 1][j].y);
            nctx.stroke();
          }
        }
      }
      pos.forEach(function (col) {
        col.forEach(function (p) {
          nctx.beginPath();
          nctx.arc(p.x, p.y, 2.6 * dpr, 0, Math.PI * 2);
          nctx.fillStyle = 'rgb(' + COL.ink.join(',') + ')';
          nctx.fill();
        });
      });
    }

    /* ---- stats ---- */
    var stSteps = $('#stat-steps'), stLoss = $('#stat-loss'), stPts = $('#stat-points');
    var steps = 0, lastLoss = null;
    function stats() {
      stSteps.textContent = steps.toLocaleString('en-US');
      stLoss.textContent = lastLoss == null ? '—' : lastLoss.toFixed(3);
      stPts.textContent = points.length;
    }

    /* ---- interaction ---- */
    field.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    field.addEventListener('pointerdown', function (e) {
      var r = field.getBoundingClientRect();
      var w = toWorld((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr);
      var c = e.button === 2 ? 1 - cls : cls;
      points.push({ x: w.x, y: w.y, c: c });
      calm = 0;
      dirty = true;
      stats();
    });

    $$('.swatch').forEach(function (b) {
      b.addEventListener('click', function () {
        cls = +b.getAttribute('data-cls');
        $$('.swatch').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      });
    });
    $$('[data-preset]').forEach(function (b) {
      b.addEventListener('click', function () {
        points = presets[b.getAttribute('data-preset')]();
        init(); steps = 0; lastLoss = null; calm = 0; dirty = true;
        stats(); drawNet();
      });
    });
    $$('[data-set-lang]').forEach(function (b) { b.addEventListener('click', function () { dirty = true; }); });

    /* ---- loop (only while visible) ---- */
    var visible = false, dirty = true, frame = 0, calm = 0;
    function loop() {
      if (!visible) { running = false; return; }
      frame++;
      var hasBoth = points.some(function (p) { return p.c === 1; }) && points.some(function (p) { return p.c === 0; });
      if (points.length && (calm < 1 || frame % 12 === 0)) {
        var iters = points.length > 120 ? 2 : 3;
        for (var k = 0; k < iters; k++) { lastLoss = trainStep(points, 0.008); steps++; }
        calm = hasBoth && lastLoss < 0.015 ? 1 : 0;
        dirty = true;
      }
      if (dirty) { drawField(); dirty = false; }
      if (frame % 4 === 0) { drawNet(); stats(); }
      requestAnimationFrame(loop);
    }
    var running = false;
    function start() { if (!running) { running = true; requestAnimationFrame(loop); } }

    init();
    points = presets.circle();
    size();
    drawField(); drawNet(); stats();
    window.addEventListener('resize', function () { size(); drawField(); drawNet(); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start();
      }, { rootMargin: '100px' }).observe(field);
    } else { visible = true; start(); }
  })();
})();
