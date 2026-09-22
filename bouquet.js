/*
 * Ramo de flores amarillas — animación en canvas 2D.
 *
 * Secuencia: crecen los tallos desde el amarre, se despliegan las hojas,
 * abren las corolas con un rebote elástico y la escena queda viva con
 * viento, polen, destellos y mariposas.
 */
(() => {
  'use strict';

  const cvs = document.getElementById('escena');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const TAU = Math.PI * 2;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOT = REDUCED ? 0.18 : 1;

  /* ------------------------------------------------------------------ utils */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const C4 = TAU / 3;
  const elastic = t =>
    t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * C4) + 1;
  const phase = (time, start, dur) => clamp((time - start) / dur, 0, 1);

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let SEED = Number(new URLSearchParams(location.search).get('semilla')) ||
             (Date.now() % 1000000);
  let rnd = mulberry32(SEED);
  const rr = (a, b) => a + (b - a) * rnd();
  const pick = arr => arr[Math.floor(rnd() * arr.length)];

  /* ----------------------------------------------------------------- paleta */
  const COROLAS = [
    { a: '#fffbe3', b: '#ffe06b', c: '#f2a20b' },
    { a: '#fff6cd', b: '#ffd23f', c: '#e08a00' },
    { a: '#fff9d8', b: '#ffcf33', c: '#d97706' },
    { a: '#fffdf0', b: '#f8e48a', c: '#e9a419' },
    { a: '#fff4c4', b: '#ffbe2e', c: '#c96a06' }
  ];
  const COGOLLOS = [
    { hi: '#c98a34', mid: '#8a5424', low: '#4a2a10' },
    { hi: '#e0a745', mid: '#a06a25', low: '#59320f' },
    { hi: '#f2c14e', mid: '#c2861f', low: '#7a4a12' }
  ];
  const HOJAS = [
    { a: '#7fb341', b: '#3d7a33', c: '#1d4726' },
    { a: '#a3c556', b: '#4d8438', c: '#24512a' }
  ];
  const TIPOS = ['sol', 'sol', 'margarita', 'margarita', 'ranunculo', 'copa'];

  /* ------------------------------------------------------------------ estado */
  let W = 0, H = 0, DPR = 1, U = 1;
  let amarre, cupula, papel;
  let flores = [], bokeh = [], polen = [], destellos = [], petalos = [], mariposas = [];
  let START = 0, INTRO = 0;
  let viento = 0, vientoObj = 0;
  const puntero = { x: 0.5, y: 0.5, activo: false };

  /* ------------------------------------------------------------- construcción */
  function build() {
    rnd = mulberry32(SEED);
    // El ramo se compone de abajo hacia arriba: primero el cono de papel,
    // luego el amarre y sobre él la cúpula de corolas.
    const retrato = H > W;
    papel = {
      x: W * 0.5,
      y: 0,
      w: Math.min(W * 0.17, 200 * U),
      h: Math.min(H * 0.26, 300 * U)
    };
    amarre = { x: W * 0.5, y: H - papel.h * 0.3 - H * (retrato ? 0.19 : 0.08) };
    papel.y = amarre.y;
    cupula = {
      x: W * 0.5,
      y: 0,
      rx: Math.min(W * 0.40, 500 * U),
      ry: Math.min(H * 0.24, 300 * U)
    };
    cupula.y = amarre.y - papel.h - cupula.ry * 0.92;

    const N = clamp(Math.round((cupula.rx * cupula.ry) / (U * U) / 4600), 14, 30);
    const puntos = [];
    const cabe = (x, y, R, holgura) =>
      puntos.every(p => Math.hypot(p.x - x, p.y - y) > (p.R + R) * holgura);

    // Corolas principales: más grandes y al frente en el centro de la cúpula.
    for (let i = 0, tope = N * 240; puntos.length < N && i < tope; i++) {
      const a = rnd() * TAU;
      const r = Math.sqrt(rnd());
      const x = cupula.x + Math.cos(a) * cupula.rx * r;
      const y = cupula.y + Math.sin(a) * cupula.ry * r * (Math.sin(a) < 0 ? 1 : 0.82);
      const z = clamp(1 - r * 0.85 + (rnd() - 0.5) * 0.18, 0, 1);
      const R = U * lerp(38, 76, z) * rr(0.9, 1.1);
      if (cabe(x, y, R, 0.62)) puntos.push({ x, y, R, z, tipo: pick(TIPOS) });
    }
    // Relleno: ramitas menudas que desbordan el contorno.
    const M = Math.round(N * 0.55);
    for (let i = 0, tope = M * 200; puntos.length < N + M && i < tope; i++) {
      const a = rnd() * TAU;
      const r = rr(0.88, 1.22);
      const x = cupula.x + Math.cos(a) * cupula.rx * r;
      const y = cupula.y + Math.sin(a) * cupula.ry * r * (Math.sin(a) < 0 ? 1.04 : 0.7);
      const R = U * rr(9, 17);
      if (cabe(x, y, R, 0.5)) {
        puntos.push({ x, y, R, z: rr(-0.16, 0.06), tipo: rnd() < 0.78 ? 'menuda' : 'capullo' });
      }
    }
    puntos.sort((p, q) => p.z - q.z);

    flores = puntos.map((p, i) => {
      const abanico = clamp((p.x - amarre.x) / cupula.rx, -1, 1);
      const p0 = { x: amarre.x + abanico * 20 * U, y: amarre.y };
      const p3 = { x: p.x, y: p.y };
      const curva = (rnd() - 0.5) * 48 * U + abanico * 56 * U;
      const p1 = { x: p0.x + abanico * 34 * U, y: lerp(p0.y, p3.y, 0.44) };
      const p2 = { x: p3.x - abanico * 26 * U + curva * 0.28, y: lerp(p0.y, p3.y, 0.80) };

      const hojas = [];
      const nh = p.tipo === 'menuda' || p.tipo === 'capullo' ? 1 : 1 + Math.round(rnd() * 1.6);
      for (let h = 0; h < nh; h++) {
        hojas.push({
          t: rr(0.34, 0.76),
          lado: rnd() < 0.5 ? -1 : 1,
          largo: U * rr(26, 52),
          pal: pick(HOJAS),
          fase: rnd() * TAU
        });
      }

      const espera = 0.16 + i * 0.05 + rnd() * 0.14;
      const durTallo = rr(1.0, 1.35);
      return {
        p0, p1, p2, p3,
        R: p.R,
        z: p.z,
        tipo: p.tipo,
        corola: pick(COROLAS),
        cogollo: pick(COGOLLOS),
        grosor: U * lerp(3.2, 6.2, clamp(p.z, 0, 1)) * (p.tipo === 'menuda' ? 0.5 : 1),
        inclina: (rnd() - 0.5) * 0.5,
        giro: rnd() * TAU,
        fase: rnd() * TAU,
        vaiven: U * rr(7, 20) * (1.25 - p.z * 0.5),
        vel: rr(0.5, 0.95),
        hojas,
        t0: espera,
        t1: espera + durTallo,
        tb: espera + durTallo * 0.72,
        durB: rr(0.85, 1.15),
        brillo: rr(0.75, 1)
      };
    });

    INTRO = flores.reduce((m, f) => Math.max(m, f.tb + f.durB), 0) + 0.2;

    bokeh = Array.from({ length: 34 }, () => ({
      x: rnd() * W,
      y: rnd() * H,
      r: U * rr(14, 90),
      a: rr(0.03, 0.13),
      v: U * rr(2, 10),
      ph: rnd() * TAU
    }));
    polen = Array.from({ length: 80 }, () => ({
      x: rnd() * W,
      y: rnd() * H,
      r: U * rr(0.9, 3.1),
      v: U * rr(6, 26),
      ph: rnd() * TAU,
      d: rr(0.3, 1.1)
    }));
    mariposas = [
      { t0: INTRO + 0.6, cx: cupula.x - cupula.rx * 0.95, cy: cupula.y - cupula.ry * 0.5,
        rx: W * 0.17, ry: H * 0.13, sp: 0.30, ph: 0.4, sc: U * 1.1 },
      { t0: INTRO + 2.1, cx: cupula.x + cupula.rx * 0.98, cy: cupula.y + cupula.ry * 0.2,
        rx: W * 0.14, ry: H * 0.16, sp: 0.24, ph: 2.7, sc: U * 0.85 }
    ];
    destellos = [];
    petalos = [];
  }

  /* ------------------------------------------------------------------ tallos */
  function bez(f, t) {
    const m = 1 - t;
    const k0 = m * m * m, k1 = 3 * m * m * t, k2 = 3 * m * t * t, k3 = t * t * t;
    return {
      x: f.p0.x * k0 + f.p1.x * k1 + f.p2.x * k2 + f.p3.x * k3,
      y: f.p0.y * k0 + f.p1.y * k1 + f.p2.y * k2 + f.p3.y * k3
    };
  }
  function balanceo(f, t, time) {
    const amp = f.vaiven * t * t;
    return Math.sin(time * f.vel * 1.25 + f.fase) * amp + viento * amp * 1.5;
  }
  function punto(f, t, time) {
    const p = bez(f, t);
    p.x += balanceo(f, t, time);
    return p;
  }

  function drawTallo(f, g, time) {
    const pasos = 16;
    const izq = [], der = [];
    for (let i = 0; i <= pasos; i++) {
      const t = (i / pasos) * g;
      const p = punto(f, t, time);
      const q = punto(f, Math.min(1, t + 0.02), time);
      let dx = q.x - p.x, dy = q.y - p.y;
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      const w = (f.grosor * (1 - 0.72 * t)) / 2;
      izq.push({ x: p.x - dy * w, y: p.y + dx * w });
      der.push({ x: p.x + dy * w, y: p.y - dx * w });
    }
    const base = izq[0], fin = izq[izq.length - 1];
    const grad = ctx.createLinearGradient(base.x, base.y, fin.x, fin.y);
    grad.addColorStop(0, '#20482a');
    grad.addColorStop(0.55, '#3d7a33');
    grad.addColorStop(1, '#84b544');
    ctx.beginPath();
    ctx.moveTo(izq[0].x, izq[0].y);
    for (let i = 1; i < izq.length; i++) ctx.lineTo(izq[i].x, izq[i].y);
    for (let i = der.length - 1; i >= 0; i--) ctx.lineTo(der[i].x, der[i].y);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }

  function drawHoja(h, p, ang, b, time) {
    if (b <= 0) return;
    const largo = h.largo * b;
    const ancho = largo * 0.34;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ang + h.lado * (1.05 + Math.sin(time * 0.9 + h.fase) * 0.09));
    ctx.scale(1, h.lado);
    const g = ctx.createLinearGradient(0, 0, largo, 0);
    g.addColorStop(0, h.pal.c);
    g.addColorStop(0.5, h.pal.b);
    g.addColorStop(1, h.pal.a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(largo * 0.3, -ancho, largo * 0.72, -ancho * 0.7, largo, 0);
    ctx.bezierCurveTo(largo * 0.72, ancho * 0.55, largo * 0.3, ancho * 0.8, 0, 0);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.lineWidth = Math.max(0.5, largo * 0.02);
    ctx.beginPath();
    ctx.moveTo(largo * 0.05, 0);
    ctx.quadraticCurveTo(largo * 0.55, ancho * 0.12, largo * 0.95, 0);
    ctx.stroke();
    ctx.restore();
  }

  /* ------------------------------------------------------------------ corola */
  function petalo(largo, ancho, pinza) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(largo * 0.18, -ancho, largo * (0.70 + pinza), -ancho * 0.86, largo, 0);
    ctx.bezierCurveTo(largo * (0.70 + pinza), ancho * 0.86, largo * 0.18, ancho, 0, 0);
    ctx.closePath();
  }

  function corona(f, n, largoF, anchoF, giro, b, time, rizo, pinza, alfa) {
    const pal = f.corola;
    for (let i = 0; i < n; i++) {
      const vib = Math.sin(time * 1.7 + i * 1.9 + f.fase) * 0.03;
      const largo = f.R * largoF * (0.9 + 0.2 * (((i * 7919) % 13) / 13)) * lerp(0.5, 1, b);
      const ancho = f.R * anchoF * lerp(0.7, 1, b);
      ctx.save();
      ctx.rotate(giro + (i / n) * TAU + vib + (1 - b) * rizo);
      const g = ctx.createLinearGradient(0, 0, largo, 0);
      g.addColorStop(0, pal.a);
      g.addColorStop(0.5, pal.b);
      g.addColorStop(1, pal.c);
      ctx.globalAlpha = alfa;
      ctx.fillStyle = g;
      petalo(largo, ancho, pinza);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.16)';
      ctx.lineWidth = Math.max(0.5, f.R * 0.012);
      ctx.beginPath();
      ctx.moveTo(largo * 0.1, 0);
      ctx.lineTo(largo * 0.86, 0);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  function cogollo(f, r, time) {
    const pal = f.cogollo;
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.34, r * 0.08, 0, 0, r);
    g.addColorStop(0, pal.hi);
    g.addColorStop(0.55, pal.mid);
    g.addColorStop(1, pal.low);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    const n = Math.max(10, Math.round(r * 1.5));
    ctx.save();
    ctx.rotate(time * 0.04 + f.giro);
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996;
      const rad = r * 0.9 * Math.sqrt(i / n);
      const s = Math.max(0.5, r * 0.055 * (1 - 0.35 * (i / n)));
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rad, Math.sin(a) * rad, s, 0, TAU);
      ctx.fillStyle = i % 3 ? 'rgba(74,42,16,.72)' : 'rgba(255,214,102,.5)';
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,226,140,.45)';
    ctx.lineWidth = Math.max(0.6, r * 0.09);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.97, 0, TAU);
    ctx.stroke();
  }

  function drawCorola(f, b, time) {
    switch (f.tipo) {
      case 'sol':
        corona(f, 19, 1.0, 0.30, f.giro, b, time, 1.1, 0.02, 1);
        corona(f, 13, 0.74, 0.26, f.giro + 0.26, b, time, 0.8, 0.04, 0.95);
        cogollo(f, f.R * 0.33 * b, time);
        break;
      case 'margarita':
        corona(f, 14, 1.0, 0.22, f.giro, b, time, 1.3, 0.06, 1);
        cogollo(f, f.R * 0.26 * b, time);
        break;
      case 'ranunculo':
        for (let k = 4; k >= 0; k--) {
          const e = 0.42 + k * 0.155;
          corona(f, 6 + k, e, 0.30, f.giro + k * 0.55, b, time, 0.9 + k * 0.1, 0.1, 1 - k * 0.04);
        }
        ctx.beginPath();
        ctx.arc(0, 0, f.R * 0.1 * b, 0, TAU);
        ctx.fillStyle = '#f7d14f';
        ctx.fill();
        break;
      case 'copa':
        ctx.save();
        ctx.rotate(f.giro * 0.1);
        corona(f, 8, 0.96, 0.36, f.giro, b, time, 1.6, 0.16, 1);
        corona(f, 5, 0.66, 0.34, f.giro + 0.5, b, time, 1.2, 0.2, 1);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(0, 0, f.R * 0.12 * b, 0, TAU);
        ctx.fillStyle = '#c98a34';
        ctx.fill();
        break;
      case 'menuda':
        corona(f, 5, 1.0, 0.44, f.giro, b, time, 1.4, 0.1, 1);
        ctx.beginPath();
        ctx.arc(0, 0, f.R * 0.2 * b, 0, TAU);
        ctx.fillStyle = '#fff1a8';
        ctx.fill();
        break;
      default: { // capullo
        const g = ctx.createLinearGradient(0, -f.R, 0, f.R);
        g.addColorStop(0, f.corola.b);
        g.addColorStop(1, '#5f8a35');
        ctx.beginPath();
        ctx.ellipse(0, 0, f.R * 0.62 * b, f.R * b, 0, 0, TAU);
        ctx.fillStyle = g;
        ctx.fill();
      }
    }
  }

  function drawFlor(f, b, time) {
    const tip = punto(f, 1, time);
    const prev = punto(f, 0.94, time);
    const ang = Math.atan2(tip.x - prev.x, -(tip.y - prev.y));
    const esc = lerp(0.2, 1, b);

    // halo cálido detrás de la corola
    const halo = f.R * (1.9 + Math.sin(time * 1.3 + f.fase) * 0.1) * b;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const hg = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, halo);
    hg.addColorStop(0, `rgba(255,205,90,${0.20 * f.brillo * b})`);
    hg.addColorStop(0.45, `rgba(240,150,40,${0.07 * f.brillo * b})`);
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, halo, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(tip.x, tip.y);
    ctx.rotate(ang * 0.5 + f.inclina + viento * 0.04);
    ctx.scale(esc, esc);
    drawCorola(f, b, time);
    ctx.restore();
  }

  /* ------------------------------------------------------ papel y lazo */
  function drawPapel(p) {
    if (p <= 0) return;
    const { x, y, w, h } = papel;
    const e = lerp(0.55, 1, elastic(p));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(e, e);
    ctx.rotate(viento * 0.012);

    const panel = (x1, y1, x2, y2, c1, c2, comba) => {
      const g = ctx.createLinearGradient(0, -h, 0, h * 0.14);
      g.addColorStop(0, c1);
      g.addColorStop(1, c2);
      ctx.beginPath();
      ctx.moveTo(0, h * 0.2);
      ctx.lineTo(x1, y1);
      ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 - h * comba, x2, y2);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
    };

    panel(-w * 1.06, -h * 0.66, -w * 0.02, -h * 1.10, '#d9c08c', '#7e6439', 0.10);
    panel(w * 0.04, -h * 1.06, w * 1.02, -h * 0.60, '#e6cfa0', '#8b6d42', 0.10);
    panel(-w * 0.76, -h * 0.52, w * 0.82, -h * 0.60, '#faecc9', '#a8834f', -0.16);

    ctx.strokeStyle = 'rgba(112,86,50,.26)';
    ctx.lineWidth = Math.max(0.6, U * 1.1);
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, h * 0.18);
      ctx.lineTo(w * 0.23 * i, -h * (0.44 + Math.abs(i) * 0.05));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLazo(p, time) {
    if (p <= 0) return;
    const { x, y, w, h } = papel;
    const e = elastic(p);
    ctx.save();
    ctx.translate(x, y - h * 0.34);
    ctx.scale(e, e);
    ctx.rotate(viento * 0.02);
    const cinta = ctx.createLinearGradient(-w * 0.5, 0, w * 0.5, 0);
    cinta.addColorStop(0, '#e8b83c');
    cinta.addColorStop(0.5, '#ffe9a8');
    cinta.addColorStop(1, '#d99b20');

    // banda alrededor del amarre
    ctx.fillStyle = cinta;
    ctx.beginPath();
    ctx.moveTo(-w * 0.52, -h * 0.05);
    ctx.quadraticCurveTo(0, h * 0.06, w * 0.52, -h * 0.05);
    ctx.lineTo(w * 0.5, h * 0.06);
    ctx.quadraticCurveTo(0, h * 0.17, -w * 0.5, h * 0.06);
    ctx.closePath();
    ctx.fill();

    // colas
    ctx.strokeStyle = cinta;
    ctx.lineCap = 'round';
    ctx.lineWidth = h * 0.045;
    for (const s of [-1, 1]) {
      const onda = Math.sin(time * 1.6 + s) * h * 0.035 + viento * h * 0.03 * s;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        s * w * 0.24, h * 0.16,
        s * w * 0.38 + onda, h * 0.34,
        s * w * 0.66 + onda * 1.3, h * 0.48
      );
      ctx.stroke();
    }
    // lazos
    for (const s of [-1, 1]) {
      const resp = 1 + Math.sin(time * 1.1 + s * 0.6) * 0.03;
      ctx.save();
      ctx.scale(s * resp, resp);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(w * 0.14, -h * 0.26, w * 0.48, -h * 0.17, w * 0.34, -h * 0.02);
      ctx.bezierCurveTo(w * 0.27, h * 0.08, w * 0.09, h * 0.05, 0, 0);
      ctx.closePath();
      ctx.fillStyle = cinta;
      ctx.fill();
      ctx.strokeStyle = 'rgba(140,92,20,.35)';
      ctx.lineWidth = h * 0.008;
      ctx.stroke();
      ctx.restore();
    }
    // nudo
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.075, h * 0.055, 0, 0, TAU);
    ctx.fillStyle = '#f6d276';
    ctx.fill();
    ctx.restore();
  }

  /* --------------------------------------------------------------- atmósfera */
  function drawFondo(time) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#140e2b');
    g.addColorStop(0.45, '#241741');
    g.addColorStop(0.80, '#3c2442');
    g.addColorStop(1, '#130d23');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const gx = cupula.x + Math.sin(time * 0.2) * 22 * U;
    const gy = cupula.y + 46 * U;
    const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * 0.6);
    rg.addColorStop(0, 'rgba(255,190,72,.30)');
    rg.addColorStop(0.32, 'rgba(228,128,56,.12)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawRayos(time) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(cupula.x, -H * 0.12);
    ctx.rotate(Math.sin(time * 0.07 * MOT) * 0.08);
    const largo = H * 1.5;
    for (let i = 0; i < 9; i++) {
      const a = -0.85 + i * 0.21 + Math.sin(time * 0.3 + i) * 0.012;
      const ancho = 0.028 + ((i * 5) % 3) * 0.012;
      const g = ctx.createLinearGradient(0, 0, 0, largo);
      g.addColorStop(0, 'rgba(255,214,120,.10)');
      g.addColorStop(1, 'rgba(255,190,80,0)');
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-largo * ancho, largo);
      ctx.lineTo(largo * ancho, largo);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawBokeh(time) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of bokeh) {
      const y = ((b.y - time * b.v * MOT) % (H + b.r * 2) + H + b.r * 2) % (H + b.r * 2) - b.r;
      const x = b.x + Math.sin(time * 0.25 + b.ph) * 18 * U + viento * 8 * U;
      const g = ctx.createRadialGradient(x, y, 0, x, y, b.r);
      const a = b.a * (0.7 + 0.3 * Math.sin(time * 0.8 + b.ph));
      g.addColorStop(0, `rgba(255,206,110,${a})`);
      g.addColorStop(0.6, `rgba(255,170,70,${a * 0.35})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, b.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPolen(time) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of polen) {
      const y = ((p.y - time * p.v * MOT) % (H + 40) + H + 40) % (H + 40) - 20;
      const x = p.x + Math.sin(time * 0.7 * p.d + p.ph) * 26 * U + viento * 14 * U * p.d;
      const a = 0.22 + 0.5 * Math.abs(Math.sin(time * 1.6 * p.d + p.ph));
      const g = ctx.createRadialGradient(x, y, 0, x, y, p.r * 4);
      g.addColorStop(0, `rgba(255,244,190,${a})`);
      g.addColorStop(0.35, `rgba(255,205,90,${a * 0.5})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, p.r * 4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function estrella(r, r2) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const rad = i % 2 ? r2 : r;
      const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.quadraticCurveTo(0, 0, x, y);
    }
    ctx.closePath();
  }

  function updateDestellos(dt, time) {
    if (!REDUCED && flores.length && rnd() < dt * 9) {
      const f = flores[Math.floor(rnd() * flores.length)];
      if (time > f.tb + f.durB * 0.6) {
        const a = rnd() * TAU;
        const d = f.R * rr(0.2, 1.05);
        const p = punto(f, 1, time);
        destellos.push({
          x: p.x + Math.cos(a) * d,
          y: p.y + Math.sin(a) * d,
          r: U * rr(5, 15),
          rot: rnd() * TAU,
          vida: 0,
          dur: rr(0.5, 1.1)
        });
      }
    }
    for (let i = destellos.length - 1; i >= 0; i--) {
      destellos[i].vida += dt;
      if (destellos[i].vida > destellos[i].dur) destellos.splice(i, 1);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const d of destellos) {
      const k = d.vida / d.dur;
      const a = Math.sin(k * Math.PI);
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot + k * 0.9);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, d.r);
      g.addColorStop(0, `rgba(255,252,225,${a})`);
      g.addColorStop(0.5, `rgba(255,216,120,${a * 0.6})`);
      g.addColorStop(1, 'rgba(255,190,70,0)');
      ctx.fillStyle = g;
      estrella(d.r * (0.6 + 0.4 * a), d.r * 0.14);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function soltarPetalos(x, y) {
    const n = 22;
    for (let i = 0; i < n; i++) {
      const a = rr(0, TAU);
      const v = U * rr(90, 300);
      petalos.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - U * rr(40, 160),
        rot: rnd() * TAU,
        vr: (rnd() - 0.5) * 7,
        largo: U * rr(10, 24),
        pal: pick(COROLAS),
        vida: 0,
        dur: rr(1.5, 2.8)
      });
    }
  }

  function updatePetalos(dt) {
    for (let i = petalos.length - 1; i >= 0; i--) {
      const p = petalos[i];
      p.vida += dt;
      if (p.vida > p.dur) { petalos.splice(i, 1); continue; }
      p.vy += U * 210 * dt;
      p.vx += viento * U * 26 * dt;
      p.vx *= 1 - 1.1 * dt;
      p.vy *= 1 - 0.7 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const a = 1 - Math.pow(p.vida / p.dur, 2);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, 0.4 + 0.6 * Math.abs(Math.cos(p.rot * 1.3)));
      ctx.globalAlpha = a;
      const g = ctx.createLinearGradient(0, 0, p.largo, 0);
      g.addColorStop(0, p.pal.a);
      g.addColorStop(1, p.pal.c);
      ctx.fillStyle = g;
      petalo(p.largo, p.largo * 0.42, 0.04);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawMariposa(m, time) {
    const t = time - m.t0;
    if (t < 0) return;
    const ent = easeOut(clamp(t / 1.6, 0, 1));
    const pos = s => ({
      x: m.cx + Math.sin(s * m.sp * TAU * 0.5 + m.ph) * m.rx,
      y: m.cy + Math.sin(s * m.sp * TAU * 0.81 + m.ph * 1.7) * m.ry
    });
    const p = pos(time), q = pos(time + 0.05);
    const ang = Math.atan2(q.y - p.y, q.x - p.x);
    const flap = Math.sin(time * (REDUCED ? 3 : 13) + m.ph) ;
    const f = 0.22 + 0.78 * Math.abs(flap);
    const sc = m.sc * ent;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ang * 0.35);
    ctx.scale(sc, sc);
    ctx.globalAlpha = ent;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.scale(s * f, 1);
      const g = ctx.createLinearGradient(0, 0, 26, -10);
      g.addColorStop(0, '#ffe9a0');
      g.addColorStop(0.55, '#ffc53d');
      g.addColorStop(1, '#e07a1c');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(6, -18, 26, -20, 27, -5);
      ctx.bezierCurveTo(27, 3, 10, 4, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 1);
      ctx.bezierCurveTo(8, 6, 20, 10, 17, 16);
      ctx.bezierCurveTo(13, 21, 3, 10, 0, 1);
      ctx.closePath();
      ctx.fillStyle = 'rgba(245,160,40,.92)';
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#3a2410';
    ctx.beginPath();
    ctx.ellipse(0, 2, 2.2, 8, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,36,16,.9)';
    ctx.lineWidth = 0.9;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.quadraticCurveTo(s * 4, -11, s * 7, -13);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawVineta() {
    const g = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.28, W * 0.5, H * 0.52, Math.max(W, H) * 0.78);
    g.addColorStop(0, 'rgba(10,6,22,0)');
    g.addColorStop(1, 'rgba(10,6,22,.62)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const velo = ctx.createLinearGradient(0, H * 0.72, 0, H);
    velo.addColorStop(0, 'rgba(15,10,30,0)');
    velo.addColorStop(1, 'rgba(15,10,30,.62)');
    ctx.fillStyle = velo;
    ctx.fillRect(0, H * 0.72, W, H * 0.28);
  }

  /* -------------------------------------------------------------------- loop */
  function updateViento(dt, time) {
    const racha =
      Math.sin(time * 0.37) * 0.55 +
      Math.sin(time * 0.91 + 1.7) * 0.28 +
      Math.sin(time * 1.73 + 0.4) * 0.12;
    const tiro = puntero.activo ? (puntero.x - 0.5) * 2.4 : 0;
    vientoObj = (racha + tiro) * MOT;
    viento += (vientoObj - viento) * Math.min(1, dt * 2.4);
  }

  let last = 0;
  function frame(now) {
    const abs = now / 1000;
    const dt = Math.min(0.05, abs - last || 0.016);
    last = abs;
    const time = Math.max(0, abs - START);

    updateViento(dt, time);

    drawFondo(time);
    drawRayos(time);
    drawBokeh(time);

    for (const f of flores) {
      const g = easeInOut(phase(time, f.t0, f.t1 - f.t0));
      if (g <= 0) continue;
      drawTallo(f, g, time);
      for (const h of f.hojas) {
        if (g < h.t) continue;
        const b = easeOut(clamp((g - h.t) / 0.22, 0, 1));
        const p = punto(f, h.t, time);
        const q = punto(f, Math.min(1, h.t + 0.04), time);
        drawHoja(h, p, Math.atan2(q.y - p.y, q.x - p.x), b, time);
      }
    }

    drawPapel(easeOut(phase(time, 0.05, 0.8)));
    drawLazo(phase(time, 0.55, 0.9), time);

    for (const f of flores) {
      const b = elastic(phase(time, f.tb, f.durB));
      if (b <= 0) continue;
      drawFlor(f, b, time);
    }

    updateDestellos(dt, time);
    drawPolen(time);
    updatePetalos(dt);
    for (const m of mariposas) drawMariposa(m, time);
    drawVineta();

    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ entorno */
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = cvs.clientWidth || window.innerWidth;
    H = cvs.clientHeight || window.innerHeight;
    cvs.width = Math.round(W * DPR);
    cvs.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    U = Math.max(0.52, Math.min(W / 1080, H / 800));
    build();
  }

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(resize, 140);
  });

  window.addEventListener('pointermove', e => {
    puntero.x = e.clientX / W;
    puntero.y = e.clientY / H;
    puntero.activo = true;
  });
  window.addEventListener('pointerleave', () => { puntero.activo = false; });
  cvs.addEventListener('pointerdown', e => soltarPetalos(e.clientX, e.clientY));

  const btn = document.getElementById('replay');
  if (btn) {
    btn.addEventListener('click', () => {
      SEED = (SEED * 31 + 1013904223) % 2147483647;
      build();
      START = performance.now() / 1000;
      soltarPetalos(amarre.x, amarre.y - papel.h * 0.4);
    });
  }

  resize();
  START = performance.now() / 1000 - (REDUCED ? INTRO + 2 : 0);
  requestAnimationFrame(frame);
})();
