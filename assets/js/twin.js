/* Nexus Frontier Partners — project twin
   A line-drawn 3D model of a climate-infrastructure site, rendered on canvas at device resolution.
   No libraries. Terrain contours, a reservoir, a treatment plant, a solar array, a data centre,
   and the water and power flows between them. Labels are HTML so they stay crisp.
   Usage: <div class="twin" data-twin="project|water|agri|dc" data-seed="5"></div>
*/
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  var PAPER = "247,243,238";
  var BLUE = "122,178,232";   // water flow
  var AMBER = "232,196,122";  // power flow

  function makeTwin(el) {
    var kind = el.getAttribute("data-twin") || "project";
    var seed = parseInt(el.getAttribute("data-seed") || "5", 10);
    var rnd = mulberry32(seed);
    var lang = document.documentElement.lang || "en";

    // ---------- terrain ----------
    var W = 84, D = 56;              // world extent (x: -42..42, z: -28..28)
    var step = 1.5;
    var cols = Math.round(W / step) + 1, rows = Math.round(D / step) + 1;
    var waves = [];
    for (var i = 0; i < 5; i++) {
      var ang = rnd() * Math.PI * 2, len = 22 + rnd() * 40, k = Math.PI * 2 / len;
      waves.push({ kx: Math.cos(ang) * k, kz: Math.sin(ang) * k, amp: 0.6 + rnd() * 1.4, p: rnd() * 6.28 });
    }
    var basin = { x: -17, z: 4, r: 11, depth: 9 };
    var ridge = { x: 26, z: -14, r: 16, h: 4.5 };
    function height(x, z) {
      var h = 0.03 * x - 0.02 * z;
      for (var i = 0; i < waves.length; i++) { var w = waves[i]; h += w.amp * Math.sin(w.kx * x + w.kz * z + w.p); }
      var dx = x - basin.x, dz = z - basin.z, d = Math.sqrt(dx * dx + dz * dz) / basin.r;
      if (d < 1) h -= basin.depth * (1 - d * d) * (1 - d * d);
      dx = x - ridge.x; dz = z - ridge.z; d = Math.sqrt(dx * dx + dz * dz) / ridge.r;
      if (d < 1) h += ridge.h * (1 - d * d) * (1 - d * d);
      return h;
    }
    var grid = new Float32Array(cols * rows);
    var lo = Infinity, hi = -Infinity;
    for (var j = 0; j < rows; j++) for (var ii = 0; ii < cols; ii++) {
      var v = height(-W / 2 + ii * step, -D / 2 + j * step);
      grid[j * cols + ii] = v; if (v < lo) lo = v; if (v > hi) hi = v;
    }
    var waterLevel = height(basin.x, basin.z) + 2.2;
    function inBasin(x, z) { var dx = x - basin.x, dz = z - basin.z; return dx * dx + dz * dz < basin.r * basin.r * 1.25; }

    // Contour segments in world space, computed once.
    var levels = 15, contours = [];
    function frac(a, b, iso) { var d = b - a; if (Math.abs(d) < 1e-6) return 0.5; var f = (iso - a) / d; return f < 0 ? 0 : f > 1 ? 1 : f; }
    for (var L = 1; L <= levels; L++) {
      var iso = lo + (hi - lo) * L / (levels + 1);
      var segs = [];
      for (var jj = 0; jj < rows - 1; jj++) for (var i2 = 0; i2 < cols - 1; i2++) {
        var a = grid[jj * cols + i2], b = grid[jj * cols + i2 + 1], c = grid[(jj + 1) * cols + i2 + 1], dd = grid[(jj + 1) * cols + i2];
        var code = (a >= iso ? 8 : 0) | (b >= iso ? 4 : 0) | (c >= iso ? 2 : 0) | (dd >= iso ? 1 : 0);
        if (code === 0 || code === 15) continue;
        var x0 = -W / 2 + i2 * step, z0 = -D / 2 + jj * step;
        var top = [x0 + step * frac(a, b, iso), iso, z0];
        var right = [x0 + step, iso, z0 + step * frac(b, c, iso)];
        var bottom = [x0 + step * frac(dd, c, iso), iso, z0 + step];
        var left = [x0, iso, z0 + step * frac(a, dd, iso)];
        switch (code) {
          case 1: case 14: segs.push(left, bottom); break;
          case 2: case 13: segs.push(bottom, right); break;
          case 3: case 12: segs.push(left, right); break;
          case 4: case 11: segs.push(top, right); break;
          case 5: segs.push(top, left, bottom, right); break;
          case 6: case 9: segs.push(top, bottom); break;
          case 7: case 8: segs.push(top, left); break;
          case 10: segs.push(top, right, left, bottom); break;
        }
      }
      contours.push({ iso: iso, index: L % 5 === 0, segs: segs });
    }

    // reservoir: fine grid for a smooth water body and shoreline
    var waterCells = [], shore = [];
    (function () {
      var fs = 0.6, iso = waterLevel;
      var x0 = basin.x - basin.r * 1.3, x1 = basin.x + basin.r * 1.3, z0 = basin.z - basin.r * 1.3, z1 = basin.z + basin.r * 1.3;
      var nx = Math.ceil((x1 - x0) / fs), nz = Math.ceil((z1 - z0) / fs);
      var g = new Float32Array((nx + 1) * (nz + 1));
      for (var j = 0; j <= nz; j++) for (var i = 0; i <= nx; i++) g[j * (nx + 1) + i] = inBasin(x0 + i * fs, z0 + j * fs) ? height(x0 + i * fs, z0 + j * fs) : iso + 5;
      for (var jj = 0; jj < nz; jj++) for (var ii = 0; ii < nx; ii++) {
        var a = g[jj * (nx + 1) + ii], b = g[jj * (nx + 1) + ii + 1], c = g[(jj + 1) * (nx + 1) + ii + 1], dd = g[(jj + 1) * (nx + 1) + ii];
        var cx = x0 + ii * fs, cz = z0 + jj * fs;
        if (a < iso && b < iso && c < iso && dd < iso) waterCells.push([cx, cz]);
        var code = (a >= iso ? 8 : 0) | (b >= iso ? 4 : 0) | (c >= iso ? 2 : 0) | (dd >= iso ? 1 : 0);
        if (code === 0 || code === 15) continue;
        var top = [cx + fs * frac(a, b, iso), iso, cz];
        var right = [cx + fs, iso, cz + fs * frac(b, c, iso)];
        var bottom = [cx + fs * frac(dd, c, iso), iso, cz + fs];
        var left = [cx, iso, cz + fs * frac(a, dd, iso)];
        switch (code) {
          case 1: case 14: shore.push(left, bottom); break;
          case 2: case 13: shore.push(bottom, right); break;
          case 3: case 12: shore.push(left, right); break;
          case 4: case 11: shore.push(top, right); break;
          case 5: shore.push(top, left, bottom, right); break;
          case 6: case 9: shore.push(top, bottom); break;
          case 7: case 8: shore.push(top, left); break;
          case 10: shore.push(top, right, left, bottom); break;
        }
      }
      waterCells.fs = fs;
    })();

    // ---------- site elements ----------
    function onGround(x, z, lift) { return [x, height(x, z) + (lift || 0), z]; }
    var show = {
      plant: kind !== "agri",
      solar: kind !== "water",
      dc: kind === "project" || kind === "dc",
      farm: kind === "agri" || kind === "project" || kind === "water",
      reservoir: true
    };
    var plant = { x: -4, z: 12 }, dc = { x: 22, z: 12 }, solar = { x: 18, z: -14 }, sub = { x: 8, z: -1 }, farm = { x: -4, z: -14 };

    // Paths for flows: water (reservoir -> plant -> dc / farm) and power (solar -> sub -> dc / plant)
    function path(points) {
      var pts = [], total = 0;
      for (var i = 0; i < points.length; i++) pts.push(onGround(points[i][0], points[i][1], 0.5));
      var acc = [0];
      for (var k = 1; k < pts.length; k++) { var p = pts[k], q = pts[k - 1]; total += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); acc.push(total); }
      return { pts: pts, acc: acc, total: total };
    }
    var flows = [];
    if (show.plant) flows.push({ color: BLUE, p: path([[basin.x + 5, basin.z + 2], [-9, 9], [plant.x, plant.z]]), n: 6, speed: 0.045 });
    if (show.plant && show.dc) flows.push({ color: BLUE, p: path([[plant.x + 5, plant.z], [10, 13], [dc.x - 5, dc.z]]), n: 7, speed: 0.04 });
    if (show.plant && show.farm) flows.push({ color: BLUE, p: path([[plant.x - 2, plant.z - 4], [-5, 0], [farm.x, farm.z + 5]]), n: 5, speed: 0.035 });
    if (show.solar) flows.push({ color: AMBER, p: path([[solar.x - 6, solar.z + 2], [sub.x, sub.z]]), n: 5, speed: 0.06 });
    if (show.solar && show.dc) flows.push({ color: AMBER, p: path([[sub.x, sub.z], [15, 5], [dc.x - 3, dc.z - 3]]), n: 6, speed: 0.06 });
    if (show.solar && show.plant && !show.dc) flows.push({ color: AMBER, p: path([[sub.x, sub.z], [plant.x + 3, plant.z - 3]]), n: 5, speed: 0.06 });
    if (!show.plant && show.farm) flows.push({ color: BLUE, p: path([[basin.x + 3, basin.z - 7], [-9, -9], [farm.x, farm.z + 4]]), n: 6, speed: 0.04 });
    if (show.solar && show.farm && !show.dc && !show.plant) flows.push({ color: AMBER, p: path([[sub.x, sub.z], [farm.x + 6, farm.z + 2]]), n: 5, speed: 0.06 });

    // ---------- canvas ----------
    var canvas = document.createElement("canvas");
    el.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var labelsBox = document.createElement("div");
    labelsBox.className = "twin-labels";
    el.appendChild(labelsBox);

    var L10N = {
      en: { reservoir: "Reservoir", plant: "Treatment and reuse plant", dc: "Data centre campus", solar: "Solar array and storage", farm: "Irrigated farmland", sub: "Substation" },
      ko: { reservoir: "저수지", plant: "처리·재이용 플랜트", dc: "데이터센터 캠퍼스", solar: "태양광·저장장치", farm: "관개 농지", sub: "변전소" }
    };
    var T = L10N[lang === "ko" ? "ko" : "en"];
    var labelDefs = [];
    if (show.reservoir) labelDefs.push({ key: "reservoir", at: [basin.x, basin.z], lift: 1.2 });
    if (show.plant) labelDefs.push({ key: "plant", at: [plant.x, plant.z], lift: 3.2 });
    if (show.dc) labelDefs.push({ key: "dc", at: [dc.x, dc.z], lift: 4.2 });
    if (show.solar) labelDefs.push({ key: "solar", at: [solar.x, solar.z], lift: 2.4 });
    if (show.farm) labelDefs.push({ key: "farm", at: [farm.x, farm.z], lift: 1.6 });
    if (show.solar) labelDefs.push({ key: "sub", at: [sub.x, sub.z], lift: 2.2 });
    var labelEls = labelDefs.map(function (d) {
      var s = document.createElement("span");
      s.className = "twin-label";
      s.textContent = T[d.key];
      labelsBox.appendChild(s);
      return s;
    });

    var Wpx = 0, Hpx = 0, dpr = 1;
    function size() {
      var r = el.getBoundingClientRect();
      Wpx = Math.max(1, Math.round(r.width)); Hpx = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(Wpx * dpr); canvas.height = Math.round(Hpx * dpr);
      canvas.style.width = Wpx + "px"; canvas.style.height = Hpx + "px";
    }

    // ---------- camera ----------
    var yaw0 = -0.55, pitch = 0.64, dist = 112, mouse = { x: 0, y: 0 }, mouseT = { x: 0, y: 0 };
    var cy, sy, cp, sp, camX, camY, camZ, focal;
    function setCamera(t) {
      mouse.x += (mouseT.x - mouse.x) * 0.04; mouse.y += (mouseT.y - mouse.y) * 0.04;
      // Narrow panels (phones) look more from above so the labels spread out.
      var narrow = Wpx < 640;
      var yaw = yaw0 + (narrow ? 0.25 : 0) + (reduceMotion ? 0 : 0.10 * Math.sin(t * 0.00012)) + mouse.x * 0.12;
      var pt = (narrow ? 0.9 : pitch) + mouse.y * 0.05;
      cy = Math.cos(yaw); sy = Math.sin(yaw); cp = Math.cos(pt); sp = Math.sin(pt);
      camX = dist * cp * sy; camY = dist * sp; camZ = dist * cp * cy;
      focal = Math.min(Wpx, Hpx * 1.6) * (narrow ? 1.5 : 1.4);
    }
    // Returns [sx, sy, depth] or null when behind the camera.
    function project(p) {
      var x = p[0] - camX, y = p[1] - 2 - camY, z = p[2] - camZ;
      // rotate around Y by -yaw
      var x1 = x * cy - z * sy, z1 = x * sy + z * cy;
      // rotate around X by -pitch (camera looks toward origin)
      var y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      var depth = -z2;
      if (depth < 1) return null;
      return [Wpx / 2 + focal * x1 / depth, Hpx * 0.5 - focal * y2 / depth, depth];
    }

    // ---------- drawing helpers ----------
    function line(points, rgb, alpha, width) {
      ctx.beginPath();
      var started = false;
      for (var i = 0; i < points.length; i++) {
        var s = project(points[i]); if (!s) { started = false; continue; }
        if (!started) { ctx.moveTo(s[0], s[1]); started = true; } else ctx.lineTo(s[0], s[1]);
      }
      ctx.strokeStyle = "rgba(" + rgb + "," + alpha + ")"; ctx.lineWidth = width; ctx.stroke();
    }
    function segments(segs, rgb, alpha, width) {
      ctx.beginPath();
      for (var i = 0; i < segs.length; i += 2) {
        var a = project(segs[i]), b = project(segs[i + 1]); if (!a || !b) continue;
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      }
      ctx.strokeStyle = "rgba(" + rgb + "," + alpha + ")"; ctx.lineWidth = width; ctx.stroke();
    }
    function box(cx, cz, w, d, h, rgb, alpha) {
      var y0 = height(cx, cz) + 0.15, y1 = y0 + h;
      var c = [[cx - w / 2, cz - d / 2], [cx + w / 2, cz - d / 2], [cx + w / 2, cz + d / 2], [cx - w / 2, cz + d / 2]];
      var top = [], bot = [];
      for (var i = 0; i < 4; i++) { top.push([c[i][0], y1, c[i][1]]); bot.push([c[i][0], y0, c[i][1]]); }
      // faint top fill
      ctx.beginPath();
      var ok = true;
      for (var k = 0; k < 4; k++) { var s = project(top[k]); if (!s) { ok = false; break; } if (k === 0) ctx.moveTo(s[0], s[1]); else ctx.lineTo(s[0], s[1]); }
      if (ok) { ctx.closePath(); ctx.fillStyle = "rgba(" + rgb + ",0.07)"; ctx.fill(); }
      line(top.concat([top[0]]), rgb, alpha, 1);
      line(bot.concat([bot[0]]), rgb, alpha * 0.55, 0.8);
      for (var m = 0; m < 4; m++) line([bot[m], top[m]], rgb, alpha * 0.8, 0.9);
    }
    function circle(cx, cz, r, lift, rgb, alpha, n) {
      var pts = [];
      for (var i = 0; i <= (n || 40); i++) { var a = i / (n || 40) * Math.PI * 2; var x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; pts.push([x, height(cx, cz) + lift, z]); }
      line(pts, rgb, alpha, 1);
    }
    function pointOnPath(p, t) {
      var dd = t * p.total;
      for (var i = 1; i < p.pts.length; i++) {
        if (dd <= p.acc[i]) {
          var f = (dd - p.acc[i - 1]) / (p.acc[i] - p.acc[i - 1] || 1);
          var a = p.pts[i - 1], b = p.pts[i];
          return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
        }
      }
      return p.pts[p.pts.length - 1];
    }

    // ---------- frame ----------
    var start = null, built = 0;
    function draw(ts) {
      if (start === null) start = ts;
      var t = ts - start;
      built = reduceMotion ? 1 : Math.min(1, t / 2600);   // build-up over 2.6 s
      setCamera(ts);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, Wpx, Hpx);
      ctx.lineCap = "round"; ctx.lineJoin = "round";

      // reservoir water
      if (show.reservoir) {
        var fs = waterCells.fs;
        ctx.beginPath();
        for (var wc = 0; wc < waterCells.length; wc++) {
          var wx = waterCells[wc][0], wz = waterCells[wc][1];
          var p0 = project([wx, waterLevel, wz]), p1 = project([wx + fs, waterLevel, wz]), p2 = project([wx + fs, waterLevel, wz + fs]), p3 = project([wx, waterLevel, wz + fs]);
          if (!p0 || !p1 || !p2 || !p3) continue;
          ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0] + 0.3, p1[1]); ctx.lineTo(p2[0] + 0.3, p2[1] + 0.3); ctx.lineTo(p3[0], p3[1] + 0.3); ctx.closePath();
        }
        ctx.fillStyle = "rgba(" + BLUE + "," + (0.14 * built) + ")"; ctx.fill();
        segments(shore, BLUE, 0.7 * built, 1.1);
      }

      // contours, revealed from low to high
      var shown = Math.ceil(contours.length * Math.min(1, built * 1.4));
      for (var c = 0; c < shown; c++) {
        var cl = contours[c];
        segments(cl.segs, PAPER, cl.index ? 0.42 : 0.2, cl.index ? 1.0 : 0.65);
      }
      // frame edge of the terrain
      line([[-W / 2, height(-W / 2, -D / 2), -D / 2], [W / 2, height(W / 2, -D / 2), -D / 2], [W / 2, height(W / 2, D / 2), D / 2], [-W / 2, height(-W / 2, D / 2), D / 2], [-W / 2, height(-W / 2, -D / 2), -D / 2]], PAPER, 0.25, 0.8);

      if (built > 0.45) {
        var a = Math.min(1, (built - 0.45) / 0.4);
        if (show.plant) {
          box(plant.x, plant.z, 10, 6, 1.4, PAPER, 0.8 * a);
          circle(plant.x - 2.6, plant.z - 4.6, 1.6, 0.3, PAPER, 0.75 * a);
          circle(plant.x + 1.2, plant.z - 4.6, 1.6, 0.3, PAPER, 0.75 * a);
          circle(plant.x + 5, plant.z - 4.6, 1.6, 0.3, PAPER, 0.75 * a);
          circle(plant.x - 2.6, plant.z - 4.6, 0.5, 0.3, PAPER, 0.5 * a, 16);
          circle(plant.x + 1.2, plant.z - 4.6, 0.5, 0.3, PAPER, 0.5 * a, 16);
          circle(plant.x + 5, plant.z - 4.6, 0.5, 0.3, PAPER, 0.5 * a, 16);
        }
        if (show.dc) { box(dc.x, dc.z - 2.2, 12, 3, 2.2, PAPER, 0.85 * a); box(dc.x, dc.z + 2.2, 12, 3, 2.2, PAPER, 0.85 * a); box(dc.x + 8, dc.z, 2.2, 2.2, 1.2, PAPER, 0.6 * a); }
        if (show.solar) {
          for (var r = 0; r < 4; r++) for (var q = 0; q < 8; q++) {
            var px = solar.x - 12.25 + q * 3.5, pz = solar.z - 5.25 + r * 3.5;
            var y = height(px, pz) + 0.5;
            line([[px - 1.4, y, pz - 0.9], [px + 1.4, y, pz - 0.9], [px + 1.4, y + 0.7, pz + 0.9], [px - 1.4, y + 0.7, pz + 0.9], [px - 1.4, y, pz - 0.9]], PAPER, 0.6 * a, 0.75);
          }
          box(sub.x, sub.z, 2.4, 2.4, 1.0, PAPER, 0.7 * a);
          box(solar.x + 11, solar.z + 1, 2.4, 1.4, 1.2, PAPER, 0.7 * a);
        }
        if (show.farm) {
          for (var fr = 0; fr < 6; fr++) {
            var fz = farm.z - 6 + fr * 2.4;
            var pts = [];
            for (var fx = -10; fx <= 10; fx += 1) pts.push([farm.x + fx, height(farm.x + fx, fz) + 0.2, fz]);
            line(pts, PAPER, 0.3 * a, 0.7);
          }
          circle(farm.x, farm.z, 6.5, 0.25, PAPER, 0.5 * a, 60);
          line([[farm.x - 6.5, height(farm.x - 6.5, farm.z) + 0.6, farm.z], [farm.x + 6.5, height(farm.x + 6.5, farm.z) + 0.6, farm.z]], PAPER, 0.55 * a, 0.9);
        }
        // routes
        for (var f = 0; f < flows.length; f++) line(flows[f].p.pts, flows[f].color, 0.35 * a, 0.9);
      }

      // flows
      if (built > 0.85) {
        var fa = Math.min(1, (built - 0.85) / 0.15);
        for (var g = 0; g < flows.length; g++) {
          var fl = flows[g];
          for (var n = 0; n < fl.n; n++) {
            var u = ((reduceMotion ? 0.3 : t * 0.001 * fl.speed) + n / fl.n) % 1;
            var s = project(pointOnPath(fl.p, u)); if (!s) continue;
            var rad = Math.max(1.4, 3.2 * (60 / s[2]));
            ctx.beginPath(); ctx.arc(s[0], s[1], rad * 2.2, 0, 6.283); ctx.fillStyle = "rgba(" + fl.color + "," + (0.12 * fa) + ")"; ctx.fill();
            ctx.beginPath(); ctx.arc(s[0], s[1], rad, 0, 6.283); ctx.fillStyle = "rgba(" + fl.color + "," + (0.9 * fa) + ")"; ctx.fill();
          }
        }
      }

      // labels
      for (var li = 0; li < labelDefs.length; li++) {
        var d = labelDefs[li], sp2 = project(onGround(d.at[0], d.at[1], d.lift));
        var le = labelEls[li];
        if (!sp2 || built < 0.6) { le.style.opacity = "0"; continue; }
        le.style.opacity = String(Math.min(1, (built - 0.6) / 0.3));
        // keep the label inside the panel
        var lw = le.offsetWidth || 0, lh = le.offsetHeight || 0;
        var lx = Math.max(lw / 2 + 4, Math.min(Wpx - lw / 2 - 4, sp2[0]));
        var ly = Math.max(lh + 4, Math.min(Hpx - 4, sp2[1]));
        le.style.transform = "translate(" + Math.round(lx) + "px," + Math.round(ly) + "px) translate(-50%, -100%)";
      }
    }

    var running = true, visible = true;
    function frame(ts) {
      if (!running) return;
      if (visible) draw(ts);
      if (reduceMotion && built >= 1) { running = false; return; }
      requestAnimationFrame(frame);
    }
    size();
    requestAnimationFrame(frame);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }, { threshold: 0.05 }).observe(el);
    }
    el.addEventListener("mousemove", function (e) {
      var r = el.getBoundingClientRect();
      mouseT.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      mouseT.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    el.addEventListener("mouseleave", function () { mouseT.x = 0; mouseT.y = 0; });
    var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(size, 120); });
  }

  var twins = document.querySelectorAll(".twin");
  for (var i = 0; i < twins.length; i++) makeTwin(twins[i]);

  // HUD: the six requirements light up one after another (illustrative).
  var huds = document.querySelectorAll(".twin-hud");
  for (var h = 0; h < huds.length; h++) (function (hud) {
    var items = hud.querySelectorAll(".twin-hud li");
    var start = null;
    function tick(ts) {
      if (start === null) start = ts;
      var t = (ts - start) / 1000;
      for (var i = 0; i < items.length; i++) {
        var p = Math.max(0, Math.min(1, (t - 1.2 - i * 1.1) / 1.0));
        var bar = items[i].querySelector("i");
        if (bar) bar.style.transform = "scaleX(" + p + ")";
        items[i].classList.toggle("is-on", p >= 1);
      }
      if (t < 1.2 + items.length * 1.1 + 1) requestAnimationFrame(tick);
    }
    if (reduceMotion) { for (var i = 0; i < items.length; i++) { items[i].classList.add("is-on"); var b = items[i].querySelector("i"); if (b) b.style.transform = "scaleX(1)"; } return; }
    var started = false;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { if (entries[0].isIntersecting && !started) { started = true; requestAnimationFrame(tick); } }, { threshold: 0.3 }).observe(hud);
    } else { requestAnimationFrame(tick); }
  })(huds[h]);
})();
