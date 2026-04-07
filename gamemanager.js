// gamemanager.js
// rAF + 보간(lerp) 적용 버전 — 즉시 전역 game 생성

(function () {
  // 설정값: 튜닝 포인트
  const TARGET_FPS = 60;            // 논리적 기준 FPS (speed 단위 보정에 사용)
  const DEFAULT_NUM_RUNNERS = 7;    // 기본 러너 수
  const SMOOTH_ALPHA = 0.22;        // 보간 계수(0.05~0.35 권장). 작을수록 더 부드럽고 느림.
  const CURVE_SLOW_FACTOR = 0.7;    // 곡선에서 속도 계수
  // speed는 "t per second" 단위로 해석됩니다. (예: 0.06 => 1/0.06 ≈ 16.7초/segment)
  // 기존 랜덤 범위를 t/sec로 바꾸려면 아래 범위를 조정하세요.
  const SPEED_MIN = 0.02;
  const SPEED_MAX = 0.06;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, alpha) { return a + (b - a) * alpha; }

  class Runner {
    constructor(index, stadiumEl) {
      this.index = index;
      this.segment = 0;
      this.t = 0;

      // speed: t per second (랜덤 분포)
      this.speed = Math.random() * (SPEED_MAX - SPEED_MIN) + SPEED_MIN;

      // 레인 오프셋: 음수는 위쪽으로 이동
      this.laneOffset = -Math.min(index * 20, 120);
      this.laneRadius = Math.max(200, 200 + this.laneOffset);

      // 시각 좌표(보간용)
      this.cx = 0;
      this.cy = 0;

      // DOM
      this.element = document.createElement("div");
      this.element.className = "runner";
      this.element.title = `Runner ${index + 1}`;
      this.element.style.filter = `hue-rotate(${index * 45}deg)`;
      stadiumEl.appendChild(this.element);

      // 초기 위치 설정
      const p = this.getPositionAt(this.segment, this.t);
      this.cx = p.x; this.cy = p.y;
      this.updateVisual(true);

      // 디버그(원하면 활성화)
      // console.log(`[init] #${this.index} speed:${this.speed.toFixed(3)} laneOffset:${this.laneOffset}`);
    }

    reset() {
      this.segment = 0;
      this.t = 0;
      this.speed = Math.random() * (SPEED_MAX - SPEED_MIN) + SPEED_MIN;
      const p = this.getPositionAt(this.segment, this.t);
      this.cx = p.x; this.cy = p.y;
      this.updateVisual(true);
      // console.log(`[reset] #${this.index} speed:${this.speed.toFixed(3)} initX:${p.x.toFixed(1)} initY:${p.y.toFixed(1)}`);
    }

    // segment, t -> 목표 좌표 계산
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

    // 화면에 보이는 위치 갱신 (transform으로 GPU 가속 + 중심 정렬 유지)
    updateVisual(force = false) {
      // transform: translate3d(cx,cy,0) translate(-50%,-50%)
      // force가 true면 즉시 스타일을 덮어씀(초기화용)
      this.element.style.transform = `translate3d(${this.cx}px, ${this.cy}px, 0) translate(-50%, -50%)`;
      if (force) {
        // left/top도 설정해두면 개발자 도구에서 확인하기 쉬움 (선택)
        this.element.style.left = `${this.cx}px`;
        this.element.style.top = `${this.cy}px`;
      }
    }

    // 한 프레임 분량의 논리 업데이트 (deltaSec: 초)
    step(deltaSec) {
      // effectiveSpeed: t per second
      let effectiveSpeed = this.speed;
      if (this.segment === 1 || this.segment === 3) effectiveSpeed *= CURVE_SLOW_FACTOR;

      // t 증가 (시간 기반)
      this.t += effectiveSpeed * deltaSec;

      // 세그먼트 전환 처리 (연속성 유지)
      if (this.t >= 1) {
        this.t -= 1;
        this.segment++;
        if (this.segment > 4) {
          this.segment = 0;
          // 한 바퀴 완료 신호는 GameManager가 별도 체크
        }
      }

      // 목표 좌표 계산
      const target = this.getPositionAt(this.segment, this.t);

      // 보간(lerp)로 부드럽게 이동
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

      // rAF 루프 변수
      this.rafId = null;
      this.lastTime = null;

      // 즉시 전역 바인딩
      window.game = this;
    }

    initRunners() {
      // 기존 러너 제거 (트랙 가이드가 있으면 보존하려면 수정 필요)
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

      // 논리 업데이트
      this.updateRace(deltaSec);

      // 계속 루프
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

      // 우승자 체크: 한 프레임에 한 명이라도 segment가 0으로 돌아왔을 때(한 바퀴 완료) 우승 처리
      // 주의: 여러 러너가 동시에 도착할 수 있으므로 첫 발견자를 우승자로 처리
      for (let runner of this.runners) {
        // 한 바퀴 완료 판정: t가 작고 segment가 0인 상태 직후(리셋 직후)로 간주
        // 여기서는 간단히 'segment === 0 && runner.t < 0.02' 로 판정
        if (runner.segment === 0 && runner.t < 0.02) {
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

  // 즉시 인스턴스 생성 (index.html의 버튼 onclick="game.startRace()"와 호환)
  // 기존에 window.game가 있으면 덮어씀
  new GameManager(DEFAULT_NUM_RUNNERS);
})();
