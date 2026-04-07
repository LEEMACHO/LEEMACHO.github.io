// gamemanager.js
// 트랙 사양: 외부 straight 500m radius 250m, 내부 straight 400m radius 200m
// viewBox 1000 x 500 (미터 단위). 러너는 밴드 중심선 따라 이동, lateral offset 적용.

(function () {
  const DEFAULT_RUNNERS = 4;
  const RUNNER_SIZE = 36;
  const VIEW_W = 1000;
  const VIEW_H = 500;
  const CENTER = { x: VIEW_W / 2, y: VIEW_H / 2 };

  // 트랙 사양
  const OUTER = { straight: 500, radius: 250 };
  const INNER = { straight: 400, radius: 200 };

  // centerline (밴드 중심)
  const CENTERLINE = {
    straight: (OUTER.straight + INNER.straight) / 2, // 450
    radius: (OUTER.radius + INNER.radius) / 2        // 225
  };

  const halfOuterStraight = OUTER.straight / 2;
  const halfInnerStraight = INNER.straight / 2;
  const halfCenterStraight = CENTERLINE.straight / 2;

  function arcLen(radius) { return Math.PI * radius; } // semicircle length
  const centerArcLen = arcLen(CENTERLINE.radius);
  const centerTotal = 2 * CENTERLINE.straight + 2 * Math.PI * CENTERLINE.radius;

  // DOM refs
  let svgEl, overlayEl, bandEl, outerStrokeEl, innerStrokeEl, centerlineEl;

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // sample centerline by distance along path
  function sampleCenterlineAt(dist) {
    dist = ((dist % centerTotal) + centerTotal) % centerTotal;
    const Ls = CENTERLINE.straight;
    const halfS = Ls / 2;
    const R = CENTERLINE.radius;
    const arcL = centerArcLen;

    const leftX = CENTER.x - halfS;
    const rightX = CENTER.x + halfS;
    const topY = CENTER.y - R;
    const bottomY = CENTER.y + R;

    if (dist < Ls) {
      const t = dist / Ls;
      const x = leftX + t * (rightX - leftX);
      const y = topY;
      return { x, y, seg: 'topStraight', t };
    }
    dist -= Ls;
    if (dist < arcL) {
      const a = -Math.PI / 2 + (dist / arcL) * Math.PI;
      const cx = rightX, cy = CENTER.y;
      const x = cx + R * Math.cos(a);
      const y = cy + R * Math.sin(a);
      return { x, y, seg: 'rightArc', a };
    }
    dist -= arcL;
    if (dist < Ls) {
      const t = dist / Ls;
      const x = rightX - t * (rightX - leftX);
      const y = bottomY;
      return { x, y, seg: 'bottomStraight', t };
    }
    dist -= Ls;
    const a = Math.PI / 2 + (dist / arcL) * Math.PI;
    const cx = leftX, cy = CENTER.y;
    const x = cx + R * Math.cos(a);
    const y = cy + R * Math.sin(a);
    return { x, y, seg: 'leftArc', a };
  }

  function sampleAhead(dist, delta = 0.5) {
    return sampleCenterlineAt(dist + delta);
  }

  function computeNormalAt(dist) {
    const p = sampleCenterlineAt(dist);
    const q = sampleAhead(dist, 0.5);
    const tx = q.x - p.x;
    const ty = q.y - p.y;
    const nx = -ty;
    const ny = tx;
    const len = Math.hypot(nx, ny) || 1;
    return { nx: nx / len, ny: ny / len };
  }

  function buildBandPath() {
    const halfOuter = halfOuterStraight;
    const leftOuterX = CENTER.x - halfOuter;
    const rightOuterX = CENTER.x + halfOuter;
    const topOuterY = CENTER.y - OUTER.radius;
    const bottomOuterY = CENTER.y + OUTER.radius;
    const R1 = OUTER.radius;

    const halfInner = halfInnerStraight;
    const leftInnerX = CENTER.x - halfInner;
    const rightInnerX = CENTER.x + halfInner;
    const topInnerY = CENTER.y - INNER.radius;
    const bottomInnerY = CENTER.y + INNER.radius;
    const R2 = INNER.radius;

    const dOuter = [
      `M ${leftOuterX} ${topOuterY}`,
      `L ${rightOuterX} ${topOuterY}`,
      `A ${R1} ${R1} 0 0 1 ${rightOuterX} ${bottomOuterY}`,
      `L ${leftOuterX} ${bottomOuterY}`,
      `A ${R1} ${R1} 0 0 1 ${leftOuterX} ${topOuterY}`,
      `Z`
    ].join(' ');

    const dInner = [
      `M ${rightInnerX} ${topInnerY}`,
      `L ${leftInnerX} ${topInnerY}`,
      `A ${R2} ${R2} 0 0 0 ${leftInnerX} ${bottomInnerY}`,
      `L ${rightInnerX} ${bottomInnerY}`,
      `A ${R2} ${R2} 0 0 0 ${rightInnerX} ${topInnerY}`,
      `Z`
    ].join(' ');

    return dOuter + ' ' + dInner;
  }

  function buildOutlinePaths() {
    const halfOuter = halfOuterStraight;
    const leftOuterX = CENTER.x - halfOuter;
    const rightOuterX = CENTER.x + halfOuter;
    const topOuterY = CENTER.y - OUTER.radius;
    const bottomOuterY = CENTER.y + OUTER.radius;
    const R1 = OUTER.radius;

    const outer = [
      `M ${leftOuterX} ${topOuterY}`,
      `L ${rightOuterX} ${topOuterY}`,
      `A ${R1} ${R1} 0 0 1 ${rightOuterX} ${bottomOuterY}`,
      `L ${leftOuterX} ${bottomOuterY}`,
      `A ${R1} ${R1} 0 0 1 ${leftOuterX} ${topOuterY}`,
      `Z`
    ].join(' ');

    const halfInner = halfInnerStraight;
    const leftInnerX = CENTER.x - halfInner;
    const rightInnerX = CENTER.x + halfInner;
    const topInnerY = CENTER.y - INNER.radius;
    const bottomInnerY = CENTER.y + INNER.radius;
    const R2 = INNER.radius;

    const inner = [
      `M ${leftInnerX} ${topInnerY}`,
      `L ${rightInnerX} ${topInnerY}`,
      `A ${R2} ${R2} 0 0 1 ${rightInnerX} ${bottomInnerY}`,
      `L ${leftInnerX} ${bottomInnerY}`,
      `A ${R2} ${R2} 0 0 1 ${leftInnerX} ${topInnerY}`,
      `Z`
    ].join(' ');

    return { outer, inner };
  }

  function buildCenterlinePath() {
    const halfS = halfCenterStraight;
    const leftX = CENTER.x - halfS;
    const rightX = CENTER.x + halfS;
    const R = CENTERLINE.radius;
    const topY = CENTER.y - R;
    const bottomY = CENTER.y + R;

    const d = [
      `M ${leftX} ${topY}`,
      `L ${rightX} ${topY}`,
      `A ${R} ${R} 0 0 1 ${rightX} ${bottomY}`,
      `L ${leftX} ${bottomY}`,
      `A ${R} ${R} 0 0 1 ${leftX} ${topY}`,
      `Z`
    ].join(' ');
    return d;
  }

  function svgToPage(x, y) {
    const rect = svgEl.getBoundingClientRect();
    const px = rect.left + (x / VIEW_W) * rect.width;
    const py = rect.top + (y / VIEW_H) * rect.height;
    return { px, py };
  }

  class Runner {
    constructor(index, overlay) {
      this.index = index;
      this.pos = Math.random() * centerTotal;
      const bandHalfWidth = Math.min(OUTER.radius - CENTERLINE.radius, CENTERLINE.radius - INNER.radius);
      const margin = 6;
      this.lateral = rand(-bandHalfWidth + margin, bandHalfWidth - margin);

      const lapsPerMinuteMin = 0.08;
      const lapsPerMinuteMax = 0.18;
      const lapsPerSecMin = lapsPerMinuteMin / 60;
      const lapsPerSecMax = lapsPerMinuteMax / 60;
      this.speed = rand(lapsPerSecMin, lapsPerSecMax) * centerTotal;

      this.el = document.createElement('div');
      this.el.className = 'runner debug';
      this.el.title = `Runner ${index + 1}`;
      this.el.style.backgroundColor = `hsl(${(index * 55) % 360} 70% 55%)`;
      this.el.style.width = `${RUNNER_SIZE}px`;
      this.el.style.height = `${RUNNER_SIZE}px`;
      overlay.appendChild(this.el);

      this.updateVisual(true);
    }

    computePos() {
      const p = sampleCenterlineAt(this.pos);
      const n = computeNormalAt(this.pos);
      const x = p.x + n.nx * this.lateral;
      const y = p.y + n.ny * this.lateral;
      return { x, y, p, n };
    }

    step(deltaSec) {
      this.pos += this.speed * deltaSec;
      if (this.pos >= centerTotal) this.pos -= centerTotal;
      if (this.pos < 0) this.pos += centerTotal;

      const pos = this.computePos();
      this.x = pos.x;
      this.y = pos.y;
      this.updateVisual();
    }

    updateVisual(force = false) {
      const page = svgToPage(this.x, this.y);
      this.el.style.transform = `translate3d(${page.px}px, ${page.py}px, 0) translate(-50%, -50%)`;
      if (force) {
        this.el.style.left = `${page.px}px`;
        this.el.style.top = `${page.py}px`;
      }
    }

    reset() {
      this.pos = Math.random() * centerTotal;
      const bandHalfWidth = Math.min(OUTER.radius - CENTERLINE.radius, CENTERLINE.radius - INNER.radius);
      this.lateral = rand(-bandHalfWidth + 6, bandHalfWidth - 6);
      this.updateVisual(true);
    }
  }

  class GameManager {
    constructor(numRunners = DEFAULT_RUNNERS) {
      this.numRunners = numRunners;
      this.runners = [];
      this.running = false;
      this.rafId = null;
      this.lastTime = null;

      svgEl = document.getElementById('trackSvg');
      overlayEl = document.getElementById('overlay');
      bandEl = document.getElementById('band');
      outerStrokeEl = document.getElementById('outerStroke');
      innerStrokeEl = document.getElementById('innerStroke');
      centerlineEl = document.getElementById('centerline');

      if (!svgEl || !overlayEl || !bandEl) {
        console.error('필요한 DOM 요소를 찾을 수 없습니다.');
        return;
      }

      bandEl.setAttribute('d', buildBandPath());
      const outlines = buildOutlinePaths();
      outerStrokeEl.setAttribute('d', outlines.outer);
      innerStrokeEl.setAttribute('d', outlines.inner);
      centerlineEl.setAttribute('d', buildCenterlinePath());

      this.initRunners();
      this.bindUI();

      window.addEventListener('resize', () => {
        this.runners.forEach(r => r.updateVisual(true));
      });
    }

    initRunners() {
      this.runners.forEach(r => {
        if (r.el && r.el.parentNode) r.el.parentNode.removeChild(r.el);
      });
      this.runners = [];
      for (let i = 0; i < this.numRunners; i++) {
        this.runners.push(new Runner(i, overlayEl));
      }
    }

    startRace() {
      const resultEl = document.getElementById('result');
      if (resultEl) resultEl.textContent = '';
      this.running = true;
      this.lastTime = performance.now();
      const numInput = document.getElementById('numRunners');
      const startBtn = document.getElementById('startBtn');
      if (numInput) numInput.disabled = true;
      if (startBtn) startBtn.disabled = true;
      if (!this.rafId) this.rafId = requestAnimationFrame(this.loop.bind(this));
    }

    stopRace() {
      this.running = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      const numInput = document.getElementById('numRunners');
      const startBtn = document.getElementById('startBtn');
      if (numInput) numInput.disabled = false;
      if (startBtn) startBtn.disabled = false;
    }

    loop(now) {
      const deltaMs = now - (this.lastTime || now);
      this.lastTime = now;
      const deltaSec = deltaMs / 1000;
      this.update(deltaSec);
      if (this.running) this.rafId = requestAnimationFrame(this.loop.bind(this));
    }

    update(deltaSec) {
      for (const r of this.runners) r.step(deltaSec);
    }

    setNumRunners(n) {
      this.numRunners = Math.max(1, Math.min(12, parseInt(n, 10) || DEFAULT_RUNNERS));
      this.initRunners();
    }

    bindUI() {
      const startBtn = document.getElementById('startBtn');
      const stopBtn = document.getElementById('stopBtn');
      const numInput = document.getElementById('numRunners');

      if (startBtn) startBtn.addEventListener('click', () => {
        const n = numInput ? parseInt(numInput.value, 10) : this.numRunners;
        const validN = Math.max(1, Math.min(12, isNaN(n) ? this.numRunners : n));
        this.setNumRunners(validN);
        this.startRace();
      });
      if (stopBtn) stopBtn.addEventListener('click', () => this.stopRace());
      if (numInput) numInput.addEventListener('change', (e) => {
        const v = parseInt(e.target.value, 10);
        if (!isNaN(v) && !this.running) this.setNumRunners(v);
      });
    }
  }

  window.game = new GameManager(DEFAULT_RUNNERS);
})();
