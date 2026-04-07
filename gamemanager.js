// gamemanager.js
// rAF + 보간 적용, 우승 판정: laps 기반 안전 판정

(function () {
  const DEFAULT_NUM_RUNNERS = 7;
  const SMOOTH_ALPHA = 0.22;
  const CURVE_SLOW_FACTOR = 0.7;
  const SPEED_MIN = 0.02; // t per second
  const SPEED_MAX = 0.06;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, alpha) { return a + (b - a) * alpha; }

  class Runner {
    constructor(index, stadiumEl) {
      this.index = index;
      this.segment = 0;
      this.t = 0;
      this.laps = 0;

      this.speed = Math.random() * (SPEED_MAX - SPEED_MIN) + SPEED_MIN;
      this.laneOffset = -Math.min(index * 20, 120);
      this.laneRadius = Math.max(200, 200 + this.laneOffset);

      this.cx = 0;
      this.cy = 0;

      this.element = document.createElement("div");
      this.element.className = "runner";
      this.element.title = `Runner ${index + 1}`;
      this.element.style.filter = `hue-rotate(${index * 45}deg)`;
      stadiumEl.appendChild(this.element);

      const p = this.getPositionAt(this.segment, this.t);
      this.cx = p.x; this.cy = p.y;
      this.updateVisual(true);
    }

    reset() {
      this.segment = 0;
      this.t = 0;
      this.laps = 0;
      this.speed = Math.random() * (SPEED_MAX - SPEED_MIN) + SPEED_MIN;
      const p = this.getPositionAt(this.segment, this.t);
      this.cx = p.x; this.cy = p.y;
      this.updateVisual(true);
    }

    getPositionAt(segment, t) {
      let x = 400, y = 200;
      switch (segment) {
        case 0:
          x = 200 + 400 * t;
          y = 0 + this.laneOffset;
          break;
        case 1: {
          const cx = 600, cy = 200;
          const r = this.laneRadius;
          const theta = -Math.PI / 2 + t * Math.PI;
          x = cx + r * Math.cos(theta);
          y = cy + r * Math.sin(theta);
          break;
        }
        case 2:
          x = 600 - 400 * t;
          y = 400 - this.laneOffset;
          break;
        case 3: {
          const cx = 200, cy = 200;
          const r = this.laneRadius;
          const theta = Math.PI / 2 + t * Math.PI;
          x = cx + r * Math.cos(theta);
          y = cy + r * Math.sin(theta);
          break;
        }
        case 4:
          x = 200 + 200 * t;
          y = 0 + this.laneOffset;
          break;
      }
      return { x, y };
    }

    updateVisual(force = false) {
      this.element.style.transform = `translate3d(${this.cx}px, ${this.cy}px, 0) translate(-50%, -50%)`;
      if (force) {
        this.element.style.left = `${this.cx}px`;
        this.element.style.top = `${this.cy}px`;
      }
    }

    step(deltaSec) {
      let effectiveSpeed = this.speed;
      if (this.segment === 1 || this.segment === 3) effectiveSpeed *= CURVE_SLOW_FACTOR;

      this.t += effectiveSpeed * deltaSec;

      if (this.t >= 1) {
        this.t -= 1;
        this.segment++;
        if (this.segment > 4) {
          this.segment = 0;
          this.laps += 1; // 한 바퀴 완료 기록
        }
      }

      const target = this.getPositionAt(this.segment, this.t);
      this.cx = lerp(this.cx, target.x, SMOOTH_ALPHA);
      this.cy = lerp(this.cy, target.y, SMOOTH_ALPHA);

      this.updateVisual();
    }
  }

  class GameManager {
    constructor(numRunners = DEFAULT_NUM_RUNNERS) {
      this.numRunners = numRunners;
      this.runners = [];
      this.running = false;

      this.stadiumEl = document.querySelector(".stadium");
      if (!this.stadiumEl) {
        console.error("stadium element(.stadium)이 없습니다.");
        return;
      }
      this.resultEl = document.getElementById("result") || null;

      this.initRunners();

      this.rafId = null;
      this.lastTime = null;

      window.game = this;
    }

    initRunners() {
      while (this.stadiumEl.firstChild) {
        this.stadiumEl.removeChild(this.stadiumEl.firstChild);
      }
      this.runners = [];
      for (let i = 0; i < this.numRunners; i++) {
        this.runners.push(new Runner(i, this.stadiumEl));
      }
    }

    startRace() {
      if (this.resultEl) this.resultEl.textContent = "";
      this.runners.forEach(r => r.reset());
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

      this.updateRace(deltaSec);

      if (this.running) {
        this.rafId = requestAnimationFrame(this.loop.bind(this));
      } else {
        this.rafId = null;
      }
    }

    updateRace(deltaSec) {
      for (let runner of this.runners) {
        runner.step(deltaSec);
      }

      // 안전한 우승 판정: laps > 0 인 러너만 우승 후보로 판단
      for (let runner of this.runners) {
        if (runner.laps > 0 && runner.segment === 0 && runner.t < 0.02) {
          this.stopRace();
          if (this.resultEl) this.resultEl.textContent = `우승자: ${runner.index + 1}번 러너!`;
          break;
        }
      }
    }

    setNumRunners(n) {
      this.numRunners = Math.max(1, Math.min(12, parseInt(n, 10) || DEFAULT_NUM_RUNNERS));
      this.initRunners();
    }
  }

  new GameManager(DEFAULT_NUM_RUNNERS);
})();
