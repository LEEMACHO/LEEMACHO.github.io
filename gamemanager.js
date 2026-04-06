class Runner {
  constructor(index) {
    this.index = index;
    this.segment = 0;
    this.t = 0;
    this.speed = Math.random() * 0.01 + 0.005;

    // 레인 오프셋: 항상 -120 ~ 0 범위 (외곽에서 시작)
    this.laneOffset = -Math.min(index * 20, 120);

    this.element = document.createElement("div");
    this.element.className = "runner";
    this.element.style.filter = `hue-rotate(${index * 45}deg)`;
    document.querySelector(".stadium").appendChild(this.element);
  }

  reset() {
    this.segment = 0;
    this.t = 0;
    this.speed = Math.random() * 0.01 + 0.005;
    this.updatePosition(400, 0 + this.laneOffset); // 출발점 (상단 직선 외곽)
  }

  updatePosition(x, y) {
    this.element.style.transform = `translate(${x}px, ${y}px)`;
  }

  move() {
    // 곡선 구간에서는 속도를 줄임 (이 값은 위치 계산에 직접 영향을 주지 않음)
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

    // 고정된 레인 반지름: 속도에 의존하지 않음
    const laneRadius = Math.max(200, 200 + this.laneOffset);

    switch (this.segment) {
      case 0: // 상단 직선 (200,0 → 600,0)
        x = 200 + 400 * this.t;
        // Y는 laneOffset만 반영 (속도 영향 제거)
        y = 0 + this.laneOffset;
        break;

      case 1: // 우측 곡선 (외곽만 사용), 반지름은 laneRadius로 고정
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
        // 하단 직선은 -laneOffset으로 외곽 유지 (속도 영향 제거)
        y = 400 - this.laneOffset;
        break;

      case 3: // 좌측 곡선 (외곽만 사용)
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
    document.getElementById("result").textContent = "";
    this.runners.forEach(r => r.reset());
    clearInterval(this.interval);
    this.interval = setInterval(() => this.updateRace(), 50);
  }

  updateRace() {
    for (let runner of this.runners) {
      if (runner.move()) {
        clearInterval(this.interval);
        document.getElementById("result").textContent =
          `우승자: ${runner.index + 1}번 러너!`;
        break;
      }
    }
  }
}

const game = new GameManager(8);
