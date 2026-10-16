/* Nexus Frontier Partners — site script
   1. Contour fields (canvas): the one visual element of the site.
   2. Navigation toggle on small screens.
   3. Contact form: composes an email in the visitor's mail app (no server needed).
*/
(function () {
  "use strict";

  // Change this once the firm's mail domain is live.
  var CONTACT_EMAIL = "contact@nexusfrontierpartners.com";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Contour field ---------- */

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeField(el) {
    var seed = parseInt(el.getAttribute("data-seed") || "7", 10);
    var levels = parseInt(el.getAttribute("data-levels") || "16", 10);
    var animate = el.getAttribute("data-animate") === "true" && !reduceMotion;
    var rnd = mulberry32(seed);

    // A smooth height field built from a handful of long waves.
    var waves = [];
    var n = 6;
    for (var i = 0; i < n; i++) {
      var ang = rnd() * Math.PI * 2;
      var len = 180 + rnd() * 420;            // wavelength in CSS px
      var k = (Math.PI * 2) / len;
      waves.push({
        kx: Math.cos(ang) * k,
        ky: Math.sin(ang) * k,
        amp: 0.45 + rnd() * 0.9,
        w: (rnd() - 0.5) * 0.00022,             // drift speed (radians per ms)
        p: rnd() * Math.PI * 2
      });
    }
    // One broad slope so lines read as terrain, not noise.
    var slopeAng = rnd() * Math.PI * 2;
    var slope = { x: Math.cos(slopeAng) * 0.0012, y: Math.sin(slopeAng) * 0.0012 };

    var canvas = document.createElement("canvas");
    el.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, dpr = 1, cell = 12, cols = 0, rows = 0, grid = null;

    function size() {
      var r = el.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      cell = W > 900 ? 12 : 10;
      cols = Math.ceil(W / cell) + 1;
      rows = Math.ceil(H / cell) + 1;
      grid = new Float32Array(cols * rows);
    }

    function height(x, y, t) {
      var h = slope.x * x + slope.y * y;
      for (var i = 0; i < n; i++) {
        var wv = waves[i];
        h += wv.amp * Math.sin(wv.kx * x + wv.ky * y + wv.p + wv.w * t);
      }
      return h;
    }

    function draw(t) {
      // sample the field
      for (var j = 0; j < rows; j++) {
        for (var i = 0; i < cols; i++) {
          grid[j * cols + i] = height(i * cell, j * cell, t);
        }
      }
      // find range
      var lo = Infinity, hi = -Infinity;
      for (var q = 0; q < grid.length; q++) { var v = grid[q]; if (v < lo) lo = v; if (v > hi) hi = v; }
      var step = (hi - lo) / (levels + 1);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (var L = 1; L <= levels; L++) {
        var iso = lo + step * L;
        var index = (L % 5 === 0);
        ctx.lineWidth = index ? 1.1 : 0.7;
        ctx.strokeStyle = index ? "rgba(247,243,238,0.55)" : "rgba(247,243,238,0.28)";
        ctx.beginPath();
        marching(iso);
        ctx.stroke();
      }
    }

    // Marching squares: emits line segments for one iso level into the current path.
    function marching(iso) {
      for (var j = 0; j < rows - 1; j++) {
        for (var i = 0; i < cols - 1; i++) {
          var a = grid[j * cols + i], b = grid[j * cols + i + 1];
          var c = grid[(j + 1) * cols + i + 1], d = grid[(j + 1) * cols + i];
          var code = (a >= iso ? 8 : 0) | (b >= iso ? 4 : 0) | (c >= iso ? 2 : 0) | (d >= iso ? 1 : 0);
          if (code === 0 || code === 15) continue;
          var x0 = i * cell, y0 = j * cell;
          // edge points: top (a-b), right (b-c), bottom (d-c), left (a-d)
          var top = [x0 + cell * frac(a, b, iso), y0];
          var right = [x0 + cell, y0 + cell * frac(b, c, iso)];
          var bottom = [x0 + cell * frac(d, c, iso), y0 + cell];
          var left = [x0, y0 + cell * frac(a, d, iso)];
          switch (code) {
            case 1: case 14: seg(left, bottom); break;
            case 2: case 13: seg(bottom, right); break;
            case 3: case 12: seg(left, right); break;
            case 4: case 11: seg(top, right); break;
            case 5: seg(top, left); seg(bottom, right); break;
            case 6: case 9: seg(top, bottom); break;
            case 7: case 8: seg(top, left); break;
            case 10: seg(top, right); seg(left, bottom); break;
          }
        }
      }
    }
    function frac(v1, v2, iso) {
      var d = v2 - v1;
      if (Math.abs(d) < 1e-6) return 0.5;
      var f = (iso - v1) / d;
      return f < 0 ? 0 : (f > 1 ? 1 : f);
    }
    function seg(p, q) { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }

    var running = false, last = 0, visible = true;
    function frame(ts) {
      if (!running) return;
      if (visible && ts - last > 33) { last = ts; draw(ts); }
      requestAnimationFrame(frame);
    }

    size();
    draw(0);
    el.classList.add("is-ready");

    if (animate) {
      running = true;
      requestAnimationFrame(frame);
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          visible = entries[0].isIntersecting;
        }, { threshold: 0.05 }).observe(el);
      }
      document.addEventListener("visibilitychange", function () {
        visible = !document.hidden;
      });
    }

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { size(); draw(animate ? performance.now() : 0); }, 120);
    });
  }

  var fields = document.querySelectorAll(".field");
  for (var f = 0; f < fields.length; f++) makeField(fields[f]);

  /* ---------- 2. Navigation ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    });
  }

  /* ---------- 3. Contact form ---------- */
  var form = document.querySelector("form[data-contact]");
  if (form) {
    var lang = document.documentElement.lang || "en";
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = form.querySelector(".error");
      var consent = form.querySelector("input[name=consent]");
      if (consent && !consent.checked) {
        err.textContent = lang === "ko"
          ? "개인정보 수집·이용에 동의해 주셔야 보낼 수 있습니다."
          : "Please agree to the privacy notice before sending.";
        consent.focus();
        return;
      }
      err.textContent = "";
      var v = function (name) { var el = form.querySelector("[name=" + name + "]"); return el ? el.value.trim() : ""; };
      var subject = (lang === "ko" ? "문의 — " : "Enquiry — ") + v("organisation");
      var body = (lang === "ko"
        ? "이름: " + v("name") + "\n기관: " + v("organisation") + "\n이메일: " + v("email") + "\n\n" + v("message")
        : "Name: " + v("name") + "\nOrganisation: " + v("organisation") + "\nEmail: " + v("email") + "\n\n" + v("message"));
      window.location.href = "mailto:" + CONTACT_EMAIL +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);
      var note = form.querySelector(".hint");
      if (note) {
        note.textContent = lang === "ko"
          ? "메일 앱이 열립니다. 열리지 않으면 " + CONTACT_EMAIL + " 로 직접 보내 주세요."
          : "Your mail app should open with the message prepared. If it does not, write to " + CONTACT_EMAIL + ".";
      }
    });
    var mailLinks = document.querySelectorAll("[data-mail]");
    for (var m = 0; m < mailLinks.length; m++) {
      mailLinks[m].textContent = CONTACT_EMAIL;
      mailLinks[m].setAttribute("href", "mailto:" + CONTACT_EMAIL);
    }
  }

  /* ---------- 4. Video: pick a resolution, play when visible, hover-play tiles ---------- */
  // data-src-uhd / data-src-qhd / data-src-hd on the <video>; the largest that suits the screen is used.
  var conn = navigator.connection || {};
  var saveData = !!conn.saveData;
  var effW = Math.round(window.innerWidth * Math.min(window.devicePixelRatio || 1, 2));
  function pickSource(v) {
    var uhd = v.getAttribute("data-src-uhd"), qhd = v.getAttribute("data-src-qhd"), hd = v.getAttribute("data-src-hd");
    if (saveData) return hd || qhd || uhd;
    if (effW >= 3000 && uhd) return uhd;
    if (effW >= 1800 && qhd) return qhd;
    return hd || qhd || uhd;
  }
  var videos = document.querySelectorAll("video[data-src-hd], video[data-src-qhd], video[data-src-uhd]");
  function arm(v) {
    if (v.getAttribute("data-armed")) return;
    v.setAttribute("data-armed", "1");
    var src = pickSource(v);
    if (!src) return;
    v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute("playsinline", "");
    v.addEventListener("playing", function () { v.classList.add("is-playing"); });
    v.src = src;
    v.load();
  }
  function tryPlay(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }

  if (reduceMotion) {
    // Leave posters in place; no autoplay.
  } else if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (v.getAttribute("data-hover") === "true") return;
        if (en.isIntersecting) { arm(v); tryPlay(v); } else if (!v.paused) { v.pause(); }
      });
    }, { rootMargin: "200px 0px", threshold: 0.05 });
    for (var vi = 0; vi < videos.length; vi++) io.observe(videos[vi]);
  } else {
    for (var vj = 0; vj < videos.length; vj++) { arm(videos[vj]); tryPlay(videos[vj]); }
  }
  // Hover-play tiles (desktop pointers only)
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  for (var vk = 0; vk < videos.length; vk++) (function (v) {
    if (v.getAttribute("data-hover") !== "true") return;
    var host = v.closest(".tile") || v.parentNode;
    if (!fine || reduceMotion) return;
    host.addEventListener("mouseenter", function () { arm(v); tryPlay(v); });
    host.addEventListener("mouseleave", function () { v.pause(); v.classList.remove("is-playing"); });
  })(videos[vk]);

  /* ---------- Year ---------- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();
})();
