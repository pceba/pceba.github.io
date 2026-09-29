(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

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
        var c = $('.print__cap', p);
        cap.textContent = c ? c.textContent : '';
        img.alt = cap.textContent;
        dlg.showModal();
      });
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  })();

  /* ---------------- Portrait as a neuron ---------------- */
  (function neuron() {
    var svg = document.getElementById('neuron-net');
    if (!svg) return;
    var NS = 'http://www.w3.org/2000/svg';
    var C = { x: 300, y: 240 }, R = 150;
    var L1 = [120, 180, 240, 300, 360].map(function (y) { return { x: 26, y: y }; });
    var L2 = [150, 210, 270, 330].map(function (y) { return { x: 96, y: y }; });
    var OUT = [190, 290].map(function (y) { return { x: 498, y: y }; });

    function el(name, attrs, parent) {
      var n = document.createElementNS(NS, name);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(n);
      return n;
    }
    function onRim(p, pad) {
      var dx = p.x - C.x, dy = p.y - C.y, d = Math.sqrt(dx * dx + dy * dy);
      return { x: C.x + dx / d * (R + (pad || 0)), y: C.y + dy / d * (R + (pad || 0)) };
    }

    var edges = [];
    var gEdges = el('g', {});
    L1.forEach(function (a) {
      L2.forEach(function (b) {
        el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'class': 'edge' }, gEdges);
        edges.push({ a: a, b: b, stage: 0 });
      });
    });
    L2.forEach(function (a) {
      var b = onRim(a);
      el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'class': 'edge edge--face' }, gEdges);
      edges.push({ a: a, b: b, stage: 1 });
    });
    OUT.forEach(function (b) {
      var a = onRim(b);
      el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'class': 'edge edge--face' }, gEdges);
      edges.push({ a: a, b: b, stage: 2 });
    });

    el('circle', { cx: C.x, cy: C.y, r: R + 14, 'class': 'ring' });
    L1.forEach(function (n) { el('circle', { cx: n.x, cy: n.y, r: 5, 'class': 'node' }); });
    L2.forEach(function (n) { el('circle', { cx: n.x, cy: n.y, r: 6, 'class': 'node' }); });
    OUT.forEach(function (n) { el('circle', { cx: n.x, cy: n.y, r: 6, 'class': 'node' }); });

    if (reduceMotion) return;

    // Signals travel forward: inputs -> hidden -> the portrait -> outputs.
    var gPulse = el('g', {});
    var cycle = 3.6;
    function pick(stage) { var e = edges.filter(function (x) { return x.stage === stage; }); return e[Math.floor(Math.random() * e.length)]; }
    for (var i = 0; i < 9; i++) {
      var stage = i % 3, e = pick(stage);
      var c = el('circle', { r: 2.6, 'class': 'pulse', opacity: 0 }, gPulse);
      var begin = (stage * 1.1 + Math.random() * 0.6 + Math.floor(i / 3) * 1.2).toFixed(2) + 's';
      el('animateMotion', {
        path: 'M' + e.a.x + ' ' + e.a.y + ' L' + e.b.x + ' ' + e.b.y,
        dur: '1.1s', begin: begin, repeatCount: 'indefinite', calcMode: 'spline',
        keyTimes: '0;1', keySplines: '.4 0 .2 1'
      }, c);
      el('animate', {
        attributeName: 'opacity', values: '0;1;1;0', keyTimes: '0;.15;.8;1',
        dur: '1.1s', begin: begin, repeatCount: 'indefinite'
      }, c);
    }
  })();

  /* ---------------- Tilt for logo and photo tiles ---------------- */
  (function tilt() {
    if (reduceMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    $$('[data-tilt]').forEach(function (t) {
      t.addEventListener('pointermove', function (e) {
        var r = t.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        t.classList.add('is-tilting');
        t.style.setProperty('--ry', ((px - 0.5) * 10).toFixed(2) + 'deg');
        t.style.setProperty('--rx', ((0.5 - py) * 8).toFixed(2) + 'deg');
        t.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        t.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
      t.addEventListener('pointerleave', function () {
        t.classList.remove('is-tilting');
        t.style.setProperty('--rx', '0deg');
        t.style.setProperty('--ry', '0deg');
      });
    });
  })();

})();
