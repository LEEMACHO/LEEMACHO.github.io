// gamemanager.js
// 사용자 요청 사양에 맞춘 트랙(외부 1000x500, 내부 800x400) 및 러너 구현
// 러너는 밴드 중심선(centerline)을 따라 이동하고 법선으로 lateral offset 적용

(function () {
  // 설정 (사양에 맞춤)
  const DEFAULT_RUNNERS = 4;
  const RUNNER_SIZE = 36; // CSS와 동일
  // 트랙 사양 (미터 단위, viewBox 1000x500)
  const VIEW_W = 1000;
  const VIEW_H = 500;
  const CENTER = { x: VIEW_W / 2, y: VIEW_H / 2 };

  // 외부(바깥) : straight 500, radius 250
  const OUTER = {
    straight: 500,
    radius: 250
  };
  // 내부(안쪽) : straight 400, radius 200
  const INNER = {
    straight: 400,
    radius: 200
  };

  // centerline: 평균값 사용 (밴드 중심)
  const CENTERLINE = {
    straight: (OUTER.straight + INNER.straight) / 2, // 450
    radius: (OUTER.radius + INNER.radius) / 2        // 225
  };

  // derived values
  const halfOuterStraight = OUTER.straight / 2; // 250
  const halfInnerStraight = INNER.straight / 2; // 200
  const halfCenterStraight = CENTERLINE.straight / 2; // 225

  // arc lengths
  function arcLen(radius) { return Math.PI * radius; } // semicircle length
  const outerArcLen = arcLen(OUTER.radius);
  const innerArcLen = arcLen(INNER.radius);
  const centerArcLen = arcLen(CENTERLINE.radius);

  // total path lengths (two straights + two semicircles)
  const outerTotal = 2 * OUTER.straight + 2 * Math.PI * OUTER.radius;
  const innerTotal = 2 * INNER.straight + 2 * Math.PI * INNER.radius;
  const centerTotal = 2 * CENTERLINE.straight + 2 * Math.PI * CENTERLINE.radius;

  // DOM refs (set later)
  let svgEl, overlayEl, bandEl, outerStrokeEl, innerStrokeEl, centerlineEl;

  // 유틸
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // sample point on centerline by distance along path (0..centerTotal)
  // path order: top straight (left->right), right arc (top->bottom), bottom straight (right->left), left arc (bottom->top)
  function sampleCenterlineAt(dist) {
    // normalize
    dist = ((dist % centerTotal) + centerTotal) % centerTotal;

    const Ls = CENTERLINE.straight;
    const halfS = Ls / 2;
    const R = CENTERLINE.radius;
    const arcL = centerArcLen;

    // coordinates for key positions
    const leftX = CENTER.x - halfS;
    const rightX = CENTER.x + halfS;
    const topY = CENTER.y - R;
    const bottomY = CENTER.y + R;

    if (dist < Ls) {
      // top straight
      const t = dist / Ls;
      const x = leftX + t * (rightX - leftX);
      const y = topY;
      return { x, y, seg: 'topStraight', t };
    }
    dist -= Ls;
    if (dist < arcL) {
      // right semicircle: center at (rightX, CENTER.y), angle from -90deg to +90deg
      const a = -Math.PI / 2 + (dist / arcL) * Math.PI;
      const cx = rightX, cy = CENTER.y;
      const x = cx + R * Math.cos(a);
      const y = cy + R * Math.sin(a);
      return { x, y, seg: 'rightArc', a };
    }
    dist -= arcL;
    if (dist < Ls) {
      // bottom straight (right -> left)
      const t = dist / Ls;
      const x = rightX - t * (rightX - leftX);
      const y = bottomY;
      return { x, y, seg: 'bottomStraight', t };
    }
    dist -= Ls;
    // left arc: center at (leftX, CENTER.y), angle from +90deg to +270deg
    const a = Math.PI / 2 + (dist / arcL) * Math.PI;
    const cx = leftX, cy = CENTER.y;
    const x = cx + R * Math.cos(a);
    const y = cy + R * Math.sin(a);
    return { x, y, seg: 'leftArc', a };
  }

  // small forward sample to compute tangent (for normal)
  function sampleAhead(dist, delta = 1) {
    return sampleCenterlineAt(dist + delta);
  }

  // compute normal vector from two sample points
  function computeNormalAt(dist) {
    const p = sampleCenterlineAt(dist);
    const q = sampleAhead(dist, 0.5); // small ahead
    const tx = q.x - p.x;
    const ty = q.y - p.y;
    // tangent (tx,ty) -> normal = (-ty, tx)
    const nx = -ty;
    const ny = tx;
    const len = Math.hypot(nx, ny) || 1;
    return { nx: nx / len, ny: ny / len };
  }

  // build band path (outer path minus inner path)
  function buildBandPath() {
    // Outer path: top straight from (leftOuterTop) -> (rightOuterTop), arc to bottom, bottom straight back, arc to top
    const halfOuter = halfOuterStraight;
    const leftOuterX = CENTER.x - halfOuter;
    const rightOuterX = CENTER.x + halfOuter;
    const topOuterY = CENTER.y - OUTER.radius;
    const bottomOuterY = CENTER.y + OUTER.radius;
    const R1 = OUTER.radius;

    // Inner path
    const halfInner = halfInnerStraight;
    const leftInnerX = CENTER.x - halfInner;
    const rightInnerX = CENTER.x + halfInner;
    const topInnerY = CENTER.y - INNER.radius;
    const bottomInnerY = CENTER.y + INNER.radius;
    const R2 = INNER.radius;

    // Build path string: outer clockwise, then inner counter-clockwise (to create hole)
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

    // Combine: outer then inner (inner will be hole if fill-rule nonzero/evenodd; to be safe set 'd' to outer+inner)
    return dOuter + ' ' + dInner;
  }

  // build stroke paths for outer and inner outlines
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

  // centerline path (for debug)
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

  // map SVG (viewBox) coordinates to page coordinates (overlay)
  function svgToPage(x, y) {
    const rect = svgEl.getBoundingClientRect();
    // viewBox is 0..VIEW_W, 0..VIEW_H
    const px = rect.left + (x / VIEW_W) * rect.width;
    const py = rect.top + (y / VIEW_H) * rect.height;
    return { px, py };
  }

  // Runner class
  class Runner {
    constructor(index, overlay) {
      this.index = index;
      // position along centerline in meters (distance)
      this.pos = Math.random() * centerTotal;
      // lateral offset inside band: keep inside half-band width
      const halfBandX = (halfOuterStraight - halfInnerStraight) / 2; // not used directly
      // compute approximate half-width of band (min of radial and straight half differences)
      const radialHalf = (OUTER.radius - INNER.radius) / 2; // 25
      const straightHalf = (halfOuterStraight - halfInnerStraight) / 2; // 25
      const halfBand = Math.min(radialHalf, straightHalf) + CENTERLINE.radius - CENTERLINE.radius; // ~25
      // But we want lateral offset measured along normal from centerline: allow up to half band width
      const bandHalfWidth = Math.min(OUTER.radius - CENTERLINE.radius, CENTERLINE.radius - INNER.radius);
      // small margin
      const margin = 6;
      this.lateral = rand(-bandHalfWidth + margin, bandHalfWidth - margin);

      // speed in meters per second along centerline (tune)
      // convert angular/radian style to linear: choose speed range relative to centerTotal
      const lapsPerMinuteMin = 0.08; // slow
      const lapsPerMinuteMax = 0.18; // faster
      const lapsPerSecMin = lapsPerMinuteMin / 60;
      const lapsPerSecMax = lapsPerMinuteMax / 60;
      this.speed = rand(lapsPerSecMin, lapsPerSecMax) * centerTotal; // meters per second along centerline

      // DOM
      this.el = document.createElement('div');
      this.el.className = 'runner debug';
      this.el.title = `Runner ${index + 1}`;
      // color by index
      this.el.style.backgroundColor = `hsl(${(index * 55) % 360} 70% 55%)`;
      this.el.style.width = `${RUNNER_SIZE}px`;
      this.el.style.height = `${RUNNER_SIZE}px`;
      overlay.appendChild(this.el);

      // initial visual
      this.updateVisual(true);
    }

    // compute centerline point and normal at current pos
    computePos() {
      const p = sampleCenterlineAt(this.pos);
      const n = computeNormalAt(this.pos);
      // apply lateral offset along normal
      const x = p.x + n.nx * this.lateral;
      const y = p.y + n.ny * this.lateral;
      return { x, y, p, n };
    }

    step(deltaSec) {
      this.pos += this.speed * deltaSec;
      // wrap
      if (this.pos >= centerTotal) this.pos -= centerTotal;
      if (this.pos < 0) this.pos += centerTotal;

      const pos = this.computePos();
      this.x = pos.x;
      this.y = pos.y;
      this.updateVisual();
    }

    updateVisual(force = false) {
      // map svg coords to page coords
      const page = svgToPage(this.x, this.y);
      // place element using transform (include center offset)
      this.el.style.transform = `translate3d(${page.px}px, ${page.py}px, 0) translate(-50%, -50%)`;
      if (force) {
        this.el.style.left = `${page.px}px`;
        this.el.style.top = `${page.py}px`;
      }
    }

    reset() {
      this.pos = Math.random() * centerTotal;
      this.lateral = rand(-20, 20); // small lateral jitter
      this.updateVisual(true);
    }
  }

  // Game manager
  class GameManager {
    constructor(numRunners = DEFAULT_RUNNERS) {
      this.numRunners = numRunners;
      this.runners = [];
      this.running = false;
      this.rafId = null;
      this.lastTime = null;

      // DOM
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

      // build shapes
      bandEl.setAttribute('d', buildBandPath());
      const outlines = buildOutlinePaths();
      outerStrokeEl.setAttribute('d', outlines.outer);
      innerStrokeEl.setAttribute('d', outlines.inner);
      centerlineEl.setAttribute('d', buildCenterlinePath());

      this.initRunners();
      this.bindUI();

      // handle resize: reposition runners when SVG scales
      window.addEventListener('resize', () => {
        this.runners.forEach(r => r.updateVisual(true));
      });
    }

    initRunners() {
      // clear existing DOM runners
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
      // disable input while running
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
      // enable input
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
      // 우승 판정 등은 필요 시 추가 가능
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
        // read input and apply
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

  // create global game
  window.game = new GameManager(DEFAULT_RUNNERS);
})();
