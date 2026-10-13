(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  if (hasIO && !reduceMotion) root.classList.add('js');

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }

  $('#year').textContent = new Date().getFullYear();

  /* ---------------- Scroll progress under the nav ---------------- */
  var bar = $('.nav__progress');
  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.setProperty('--p', max > 0 ? Math.min(window.scrollY / max, 1).toFixed(4) : 0);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------------- Count-up ---------------- */
  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    var to = +el.getAttribute('data-count');
    if (reduceMotion) { el.textContent = to; return; }
    var t0 = performance.now(), dur = to > 20 ? 1600 : 900;
    (function step(t) {
      var p = Math.min((t - t0) / dur, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------------- Road to graduation ---------------- */
  var roadDone = false;
  function road() {
    if (roadDone) return;
    roadDone = true;
    var start = new Date('2022-09-01').getTime(), end = new Date('2027-05-31').getTime();
    var pct = Math.round(Math.max(0, Math.min(1, (Date.now() - start) / (end - start))) * 100);
    $('#road-fill').style.width = pct + '%';
    var out = $('#road-pct');
    if (reduceMotion) { out.textContent = pct; return; }
    out.setAttribute('data-count', pct);
    countUp(out);
  }

  /* ---------------- Reveal, counters, timeline ---------------- */
  if (hasIO) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var t = e.target;
        seen.unobserve(t);
        if (t.hasAttribute('data-count')) countUp(t);
        else if (t.id === 'road') road();
        else t.classList.add('in');
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    $$('.reveal, #path, [data-count], #road').forEach(function (el) { seen.observe(el); });

    /* Active nav link */
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
  } else {
    $$('.reveal, #path').forEach(function (el) { el.classList.add('in'); });
    road();
  }

  /* ---------------- Local time in each city ---------------- */
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

  /* ---------------- Copy email ---------------- */
  (function copyMail() {
    var btn = $('#copy-mail');
    if (!btn) return;
    var label = btn.textContent;
    btn.addEventListener('click', function () {
      var mail = btn.getAttribute('data-mail');
      function done(text) {
        btn.textContent = text;
        btn.classList.add('is-done');
        setTimeout(function () { btn.textContent = label; btn.classList.remove('is-done'); }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(mail).then(function () { done('Copied'); }, function () { done(mail); });
      } else {
        done(mail);
      }
    });
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

  /* ---------------- Neural network ---------------- */
  (function network() {
    var svg = document.getElementById('neuron-net');
    if (!svg) return;
    var NS = 'http://www.w3.org/2000/svg';

    // Four layers, signals travel left to right.
    var COUNTS = [4, 5, 5, 2], XS = [24, 112, 208, 296], MID = 130, GAP = 44;

    function el(name, attrs, parent) {
      var n = document.createElementNS(NS, name);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(n);
      return n;
    }

    var layers = COUNTS.map(function (n, i) {
      var nodes = [];
      for (var j = 0; j < n; j++) nodes.push({ x: XS[i], y: MID + (j - (n - 1) / 2) * GAP });
      return nodes;
    });

    // edges[l][a][b] connects node a of layer l to node b of layer l + 1
    var gEdges = el('g', {}), gNodes = el('g', {}), gPulses = el('g', {});
    var edges = [];
    for (var l = 0; l < layers.length - 1; l++) {
      edges[l] = layers[l].map(function (a) {
        return layers[l + 1].map(function (b) {
          return el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'class': 'edge' }, gEdges);
        });
      });
    }
    layers.forEach(function (nodes, i) {
      var last = i === layers.length - 1;
      nodes.forEach(function (n) {
        n.el = el('circle', { cx: n.x, cy: n.y, r: last ? 7 : 6, 'class': last ? 'node node--out' : 'node' }, gNodes);
      });
    });

    if (reduceMotion) return;

    function rnd(n) { return Math.floor(Math.random() * n); }
    function flash(node) {
      node.el.classList.add('is-hot');
      clearTimeout(node.timer);
      node.timer = setTimeout(function () { node.el.classList.remove('is-hot'); }, 420);
    }

    var SEG = 650; // ms per edge
    function newPath(p, now) {
      p.route = layers.map(function (nodes) { return rnd(nodes.length); });
      p.seg = 0;
      p.start = now + 150 + Math.random() * 900;
      p.started = false;
    }

    var pulses = [];
    for (var i = 0; i < 5; i++) {
      var p = { dot: el('circle', { r: 3, 'class': 'pulse', opacity: 0 }, gPulses) };
      newPath(p, performance.now() + i * 450);
      pulses.push(p);
    }

    function edgeOf(p) { return edges[p.seg][p.route[p.seg]][p.route[p.seg + 1]]; }

    function frame(now) {
      pulses.forEach(function (p) {
        if (now < p.start) return;
        if (!p.started) {
          p.started = true;
          flash(layers[0][p.route[0]]);
          edgeOf(p).classList.add('is-live');
        }
        var t = Math.min((now - p.start) / SEG, 1);
        var e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease in-out
        var a = layers[p.seg][p.route[p.seg]], b = layers[p.seg + 1][p.route[p.seg + 1]];
        p.dot.setAttribute('cx', a.x + (b.x - a.x) * e);
        p.dot.setAttribute('cy', a.y + (b.y - a.y) * e);
        p.dot.setAttribute('opacity', 1);
        if (t < 1) return;

        edgeOf(p).classList.remove('is-live');
        flash(b);
        p.seg++;
        if (p.seg < layers.length - 1) {
          p.start = now;
          edgeOf(p).classList.add('is-live');
        } else {
          p.dot.setAttribute('opacity', 0);
          newPath(p, now);
        }
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

})();
