// gamemanager.js (교체용 전체)
// 간단하고 안정적으로 동작하도록 즉시 전역 game 생성

const FRAME_MS = 50;

class Runner {
  constructor(index, stadiumEl) {
    this.index = index;
    this.segment = 0;
    this.t = 0;
    this.speed = Math.random() * 0.01 + 0.005;

    this.laneOffset = -Math.min(index * 20, 120);
    this.laneRadius = Math.max(200, 200 + this.laneOffset);

    this.element = document.createElement("div");
    this.element.className = "runner";
    this.element.title = `Runner ${index + 1}`;
    this.element.style.filter = `hue-rotate(${index * 45}deg)`;

    stadiumEl.appendChild(this.element);

    const pos = this.getPositionAt(this.segment, this.t);
    this.updatePosition(pos.x, pos.y);
  }

  reset() {
    this.segment = 0;
    this.t = 0;
    this.speed = Math.random() * 0.01 + 0.005;
    const pos = this.getPositionAt(this.segment, this.t);
    this.updatePosition(pos.x, pos.y);

    console.log(`[reset] runner ${this.index} laneOffset:${this.laneOffset} laneRadius:${this.laneRadius} speed:${this.speed.toFixed(4)} initX:${pos.x.toFixed(1)} initY:${pos.y.toFixed(1)}`);
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

  updatePosition(x, y) {
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
  }

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
  constructor(numRunners = 7) {
    this.numRunners = numRunners;
    this.runners = [];
    this.interval = null;

    this.stadiumEl = document.querySelector(".stadium");
    if (!this.stadiumEl) {
      console.error("stadium element(.stadium)이 없습니다.");
      return;
    }

    this.resultEl = document.getElementById("result") || null;
    this.initRunners();
    this.bindUI(); // 버튼이 HTML에 있으면 바인딩
  }

  initRunners() {
    // 기존 러너 제거(트랙 가이드가 있으면 보존하려면 수정 필요)
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
    this.stopRace();
    this.interval = setInterval(() => this.updateRace(), FRAME_MS);
  }

  stopRace() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  updateRace() {
    for (let runner of this.runners) {
      if (runner.move()) {
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
    const initBtn = document.getElementById("initBtn");
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");
    const numInput = document.getElementById("numRunners");

    if (initBtn) initBtn.addEventListener("click", () => {
      const n = numInput ? parseInt(numInput.value, 10) || this.numRunners : this.numRunners;
      this.stopRace();
      this.setNumRunners(n);
    });
    if (startBtn) startBtn.addEventListener("click", () => this.startRace());
    if (stopBtn) stopBtn.addEventListener("click", () => this.stopRace());
  }
}

// 즉시 전역 생성 — index.html의 버튼 onclick="game.startRace()"와 호환
window.game = new GameManager(8);
