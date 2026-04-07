// gamemanager.js
// 사용법: index.html에 <script src="gamemanager.js"></script>로 포함
// style.css에서 .stadium, .runner 스타일(특히 transform: translate(-50%,-50%))이 있어야 함

(function () {
  const FRAME_MS = 50;

  class Runner {
    constructor(index, stadiumEl) {
      this.index = index;
      this.segment = 0;
      this.t = 0;
      this.speed = Math.random() * 0.01 + 0.005;

      // 레인 오프셋: 외곽에서 시작 (음수)
      this.laneOffset = -Math.min(index * 20, 120);
      this.laneRadius = Math.max(200, 200 + this.laneOffset);

      // DOM 요소 생성 (CSS가 이미지/크기 담당)
      this.element = document.createElement("div");
      this.element.className = "runner";
      this.element.title = `Runner ${index + 1}`;
      // 색상 필터(선택)
      this.element.style.filter = `hue-rotate(${index * 45}deg)`;

      stadiumEl.appendChild(this.element);

      // 초기 위치
      const pos = this.getPositionAt(this.segment, this.t);
      this.updatePosition(pos.x, pos.y);
    }

    reset() {
      this.segment = 0;
      this.t = 0;
      this.speed = Math.random() * 0.01 + 0.005;
      const pos = this.getPositionAt(this.segment, this.t);
      this.updatePosition(pos.x, pos.y);
    }

    // segment, t -> 좌표 계산
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

    // 위치 업데이트: left/top 사용 (CSS transform: translate(-50%,-50%) 유지)
    updatePosition(x, y) {
      this.element.style.left = `${x}px`;
      this.element.style.top = `${y}px`;
    }

    // 한 프레임 이동
    move() {
      let effectiveSpeed = this.speed;
      if (this.segment === 1 || this.segment === 3) effectiveSpeed *= 0.7;

      this.t += effectiveSpeed;
      if (this.t >= 1) {
        this.t -= 1;
        this.segment++;
        if (this.segment > 4) {
          this.segment = 0;
          return true;
        }
      }

      const pos = this.getPositionAt(this.segment, this.t);
      this.updatePosition(pos.x, pos.y);
      return false;
    }
  }

  class GameManager {
    constructor(numRunners = 8) {
      this.numRunners = numRunners;
      this.runners = [];
      this.interval = null;

      this.stadiumEl = document.querySelector(".stadium");
      if (!this.stadiumEl) {
        console.error("stadium element(.stadium)이 존재하지 않습니다.");
        return;
      }

      this.resultEl = document.getElementById("result") || null;
      this.initRunners();
      this.bindUI();
    }

    initRunners() {
      // 기존 러너 제거
      while (this.stadiumEl.firstChild) {
        this.stadiumEl.removeChild(this.stadiumEl.firstChild);
      }

      this.runners = [];
      for (let i = 0; i < this.numRunners; i++) {
        this.runners.push(new Runner(i, this.stadiumEl));
      }
    }

    startRace() {
      if (!this.stadiumEl) return;
      if (this.resultEl) this.resultEl.textContent = "";
      this.runners.forEach(r => r.reset());
      clearInterval(this.interval);
      this.interval = setInterval(() => this.updateRace(), FRAME_MS);
    }

    stopRace() {
      clearInterval(this.interval);
      this.interval = null;
    }

    updateRace() {
      for (let runner of this.runners) {
        if (runner.move()) {
          // 한 바퀴 완료한 러너가 있으면 멈추고 우승 표시
          this.stopRace();
          if (this.resultEl) this.resultEl.textContent = `우승자: ${runner.index + 1}번 러너!`;
          break;
        }
      }
    }

    setNumRunners(n) {
      this.numRunners = Math.max(1, Math.min(12, parseInt(n, 10) || 8));
      this.initRunners();
    }

    bindUI() {
      // 버튼/입력 요소가 있으면 바인딩 (없어도 동작)
      const initBtn = document.getElementById("initBtn");
      const startBtn = document.getElementById("startBtn");
      const stopBtn = document.getElementById("stopBtn");
      const numInput = document.getElementById("numRunners");

      if (initBtn) {
        initBtn.addEventListener("click", () => {
          const n = numInput ? parseInt(numInput.value, 10) || this.numRunners : this.numRunners;
          this.stopRace();
          this.setNumRunners(n);
        });
      }

      if (startBtn) startBtn.addEventListener("click", () => this.startRace());
      if (stopBtn) stopBtn.addEventListener("click", () => this.stopRace());
    }
  }

  // DOMContentLoaded 후 초기화
  window.addEventListener("DOMContentLoaded", () => {
    // 기본 8명으로 초기화 (index.html의 input 값이 있으면 그 값을 사용)
    const numInput = document.getElementById("numRunners");
    const initial = numInput ? parseInt(numInput.value, 10) || 8 : 8;
    window.game = new GameManager(initial);
  });
})();
