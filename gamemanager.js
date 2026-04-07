// gamemanager.js

class Runner {
  constructor(index) {
    this.index = index;
    this.segment = 0;
    this.t = 0;
    this.speed = Math.random() * 0.01 + 0.005;

    // 레인 오프셋: 항상 -120 ~ 0 범위 (외곽에서 시작)
    this.laneOffset = -Math.min(index * 20, 120);

    // 레인별 고정 반지름 (속도와 무관)
    this.laneRadius = Math.max(200, 200 + this.laneOffset);

    this.element = document.createElement("div");
    this.element.className = "runner";
    // 색상 필터은 유지해도 되고, 이미지/크기는 CSS에서 담당
    this.element.style.filter = `hue-rotate(${index * 45}deg)`;
    document.querySelector(".stadium").appendChild(this.element);

    // 초기 위치 설정 (left/top 사용)
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

  // 위치 업데이트: transform 대신 left/top 사용
  updatePosition(x, y) {
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
  }

  move() {
    // 곡선 구간에서는 속도를 줄임 (시각적 효과만)
    let effectiveSpeed = this.speed;
    if (this.segment === 1 || this.segment === 3) {
      effectiveSpeed *= 0.7;
    }

    this.t += effectiveSpeed;
    if (this.t > 1) {
      this.t = 0;
      this.segment++;
      if (this.segment > 4) {
        this.segment = 0;
        return true;
      }
    }

    let x, y;
    const laneRadius = this.laneRadius;

    switch (this.segment) {
      case 0: // 상단 직선 (200,0 → 600,0)
        x = 200 + 400 * this.t;
        y = 0 + this.laneOffset;
        break;

      case 1: // 우측 곡선
        {
          const cxR = 600, cyR = 200;
          const rR = laneRadius;
          const thetaR = -Math.PI/2 + this.t * Math.PI;
          x = cxR + rR * Math.cos(thetaR);
          y = cyR + rR * Math.sin(thetaR);
        }
        break;

      case 2: // 하단 직선 (600,400 → 200,400)
        x = 600 - 400 * this.t;
        y = 400 - this.laneOffset;
        break;

      case 3: // 좌측 곡선
        {
          const cxL = 200, cyL = 200;
          const rL = laneRadius;
          const thetaL = Math.PI/2 + this.t * Math.PI;
          x = cxL + rL * Math.cos(thetaL);
          y = cyL + rL * Math.sin(thetaL);
        }
        break;

      case 4: // 결승선 (200,0 → 400,0)
        x = 200 + 200 * this.t;
        y = 0 + this.laneOffset;
        break;
    }

    this.updatePosition(x, y);
    return false;
  }
}

class GameManager {
  constructor(numRunners) {
    this.runners = [];
    this.interval = null;
    for (let i = 0; i < numRunners; i++) {
      this.runners.push(new Runner(i));
    }
  }

  startRace() {
    const resultEl = document.getElementById("result");
    if (resultEl) resultEl.textContent = "";
    this.runners.forEach(r => r.reset());
    clearInterval(this.interval);
    this.interval = setInterval(() => this.updateRace(), 50);
  }

  updateRace() {
    for (let runner of this.runners) {
      if (runner.move()) {
        clearInterval(this.interval);
        const resultEl = document.getElementById("result");
        if (resultEl) resultEl.textContent =
          `우승자: ${runner.index + 1}번 러너!`;
        break;
      }
    }
  }
}

const game = new GameManager(8);
