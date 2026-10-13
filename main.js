(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }

  $('#year').textContent = new Date().getFullYear();

  /* ---------------- Active nav link ---------------- */
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
  }

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
