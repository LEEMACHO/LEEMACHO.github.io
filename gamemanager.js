// gamemanager.js
// 회색 밴드(두 타원 사이)를 러너가 사용할 수 있는 공간으로 삼는 구현
// 러너는 centerline(타원 중간 반지름)을 따라 이동하고, 법선 벡터로 오프셋을 적용

(function () {
  // 설정값
  const DEFAULT_RUNNERS = 4;
  const RUNNER_SIZE = 36; // CSS 변수와 동일하게 유지
  const SPEED_MIN = 0.6; // radians per second (속도 조절)
  const SPEED_MAX = 1.2;
  const OVERLAY_ID = "overlay";

  // SVG 트랙 파라미터 (index.html의 ellipse와 일치시킬 것)
  const SVG_ID = "trackSvg";
  const OUTER = { cx: 410, cy: 210, rx: 380, ry: 180 };
  const INNER = { cx: 410, cy: 210, rx: 260, ry: 100 };

  // 유틸
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // 타원에서 θ(라디안)로 좌표 얻기
  function ellipsePoint(cx, cy, rx, ry, theta) {
    return { x: cx + rx * Math.cos(theta), y: cy + ry * Math.sin(theta) };
  }

  // 타원에서의 접선 벡터(미분): dx/dθ, dy/dθ
  function ellipseTangent(rx, ry, theta) {
    return { dx: -rx * Math.sin(theta), dy: ry * Math.cos(theta) };
  }

  // 법선 벡터(단위) : tangent rotated 90deg and normalized
  function normalFromTangent(t) {
    // rotate tangent by +90deg => ( -dy, dx ) or (-dy, dx) depending sign
    const nx = -t.dy;
    const ny = t.dx;
    const len = Math.hypot(nx, ny) || 1;
    return { nx: nx / len, ny: ny / len };
  }

  // band(두 타원 사이) 중심선 파라미터: rx_mid = (rx_out + rx_in)/2, ry_mid similarly
  const CENTER = {
    cx: OUTER.cx,
    cy: OUTER.cy,
    rx: (OUTER.rx + INNER.rx) / 2,
    ry: (OUTER.ry + INNER.ry) / 2,
    halfWidth: Math.min((OUTER.rx - INNER.rx) / 2, (OUTER.ry - INNER.ry) / 2) // 반폭(대략)
  };

  // SVG band path 생성: 외부 타원 - 내부 타원 (반전) -> path d
  function buildBandPath(outer, inner) {
    // Use SVG arc commands to create ring-like path
    // We'll approximate by two arcs for outer and two for inner (clockwise/ccw)
    const o1 = `${outer.cx - outer.rx},${outer.cy}`;
    const o2 = `${outer.cx + outer.rx},${outer.cy}`;
    const i1 = `${inner.cx + inner.rx},${inner.cy}`;
    const i2 = `${inner.cx - inner.rx},${inner.cy}`;

    // Build path: move to rightmost outer, arc to leftmost outer, arc back, then inner reversed
    const d = [
      `M ${outer.cx + outer.rx} ${outer.cy}`,
      `A ${outer.rx} ${outer.ry} 0 1 0 ${outer.cx - outer.rx} ${outer.cy}`,
      `A ${outer.rx} ${outer.ry} 0 1 0 ${outer.cx + outer.rx} ${outer.cy}`,
      `M ${inner.cx + inner.rx} ${inner.cy}`,
      `A ${inner.rx} ${inner.ry} 0 1 1 ${inner.cx - inner.rx} ${inner.cy}`,
      `A ${inner.rx} ${inner.ry} 0 1 1 ${inner.cx + inner.rx} ${inner.cy}`,
      `Z`
    ].join(" ");
    return d;
  }

  // centerline path (for debug or optional use)
  function buildCenterlinePath(center) {
    // approximate ellipse with arc commands
    return [
      `M ${center.cx + center.rx} ${center.cy}`,
      `A ${center.rx} ${center.ry} 0 1 0 ${center.cx - center.rx} ${center.cy}`,
      `A ${center.rx} ${center.ry} 0 1 0 ${center.cx + center.rx} ${center.cy}`
    ].join(" ");
  }

  // Runner class
  class Runner {
    constructor(index, overlayEl) {
      this.index = index;
      this.theta = Math.random() * Math.PI * 2; // param along centerline
      this.speed = rand(SPEED_MIN, SPEED_MAX); // radians/sec
      // lateral offset within band: -halfWidth..+halfWidth
      // allow small margin so runner stays inside band
      const margin = 6;
      this.lateral = rand(-CENTER.halfWidth + margin, CENTER.halfWidth - margin);

      // DOM element
      this.el = document.createElement("div");
      this.el.className = "runner";
      this.el.title = `Runner ${index + 1}`;
      // try to use image; fallback to colored box
      // replace URL with your runner image if available
      // this.el.style.backgroundImage = "url('path/to/runner.png')";
      // For visibility, use hue-rotate color filter on a simple background
      this.el.style.backgroundColor = `hsl(${(index * 45) % 360} 70% 55%)`;
      this.el.style.width = `${RUNNER_SIZE}px`;
      this.el.style.height = `${RUNNER_SIZE}px`;
      overlayEl.appendChild(this.el);

      // initial placement
      this.updateVisual(true);
    }

    // compute target position on centerline and offset by lateral along normal
    computePosition() {
      // centerline point at theta
      const cpt = ellipsePoint(CENTER.cx, CENTER.cy, CENTER.rx, CENTER.ry, this.theta);
      // tangent at theta (for centerline)
      const t = ellipseTangent(CENTER.rx, CENTER.ry, this.theta);
      const n = normalFromTangent(t);
      // apply lateral offset along normal
      const x = cpt.x + n.nx * this.lateral;
      const y = cpt.y + n.ny * this.lateral;
      return { x, y, cpt, n };
    }

    // update logic per frame
    step(deltaSec) {
      // advance theta by speed (wrap around)
      this.theta += this.speed * deltaSec;
      if (this.theta > Math.PI * 2) this.theta -= Math.PI * 2;
      if (this.theta < 0) this.theta += Math.PI * 2;

      const pos = this.computePosition();
      this.cx = pos.x;
      this.cy = pos.y;
      this.updateVisual();
    }

    updateVisual(force = false) {
      // overlay is positioned exactly over SVG, so we can use SVG coordinates directly
      // Use transform translate3d for GPU acceleration and include center offset
      this.el.style.transform = `translate3d(${this.cx}px, ${this.cy}px, 0) translate(-50%, -50%)`;
      if (force) {
        this.el.style.left = `${this.cx}px`;
        this.el.style.top = `${this.cy}px`;
      }
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

      // DOM refs
      this.svg = document.getElementById(SVG_ID);
      this.overlay = document.getElementById(OVERLAY_ID);
      this.resultEl = document.getElementById("result");

      if (!this.svg || !this.overlay) {
        console.error("SVG 또는 overlay 요소를 찾을 수 없습니다.");
        return;
      }

      // build band path into SVG
      const bandPath = buildBandPath(OUTER, INNER);
      const bandEl = document.getElementById("band");
      if (bandEl) bandEl.setAttribute("d", bandPath);

      // optional centerline for debug
      const centerlineEl = document.getElementById("centerline");
      if (centerlineEl) centerlineEl.setAttribute("d", buildCenterlinePath(CENTER));

      this.initRunners();
      this.bindUI();
    }

    initRunners() {
      // clear existing
      this.runners.forEach(r => {
        if (r.el && r.el.parentNode) r.el.parentNode.removeChild(r.el);
      });
      this.runners = [];

      // create runners attached to overlay
      for (let i = 0; i < this.numRunners; i++) {
        this.runners.push(new Runner(i, this.overlay));
      }
    }

    startRace() {
      if (this.resultEl) this.resultEl.textContent = "";
      this.running = true;
      this.lastTime = performance.now();
      if (!this.rafId) this.rafId = requestAnimationFrame(this.loop.bind(this));
    }

    stopRace() {
      this.running = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }

    loop(now) {
      const deltaMs = now - (this.lastTime || now);
      this.lastTime = now;
      const deltaSec = deltaMs / 1000;

      this.update(deltaSec);

      if (this.running) {
        this.rafId = requestAnimationFrame(this.loop.bind(this));
      }
    }

    update(deltaSec) {
      for (const r of this.runners) r.step(deltaSec);
      // 우승 판정 등은 필요 시 추가
    }

    setNumRunners(n) {
      this.numRunners = Math.max(1, Math.min(12, parseInt(n, 10) || DEFAULT_RUNNERS));
      this.initRunners();
    }

    bindUI() {
      const startBtn = document.getElementById("startBtn");
      const stopBtn = document.getElementById("stopBtn");
      const numInput = document.getElementById("numRunners");

      if (startBtn) startBtn.addEventListener("click", () => this.startRace());
      if (stopBtn) stopBtn.addEventListener("click", () => this.stopRace());
      if (numInput) numInput.addEventListener("change", (e) => {
        this.setNumRunners(e.target.value);
      });
    }
  }

  // 인스턴스 생성 및 전역 바인딩
  window.game = new GameManager(DEFAULT_RUNNERS);
})();
