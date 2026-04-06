class Runner {
  constructor(index) {
    this.index = index;
    this.segment = 0;
    this.t = 0; // 구간 진행도 (0~1)
    this.speed = Math.random() * 0.01 + 0.005;

    this.element = document.createElement("div");
    this.element.className = "runner";
    this.element.style.filter = `hue-rotate(${index * 45}deg)`;
    document.querySelector(".stadium").appendChild(this.element);
  }

  reset() {
    this.segment = 0;
    this.t = 0;
    this.speed = Math.random() * 0.01 + 0.005;
    this.updatePosition(400, 0); // 출발점 강제 지정
  }

  updatePosition(x, y) {
    this.element.style.transform = `translate(${x}px, ${y}px)`;
  }

  move() {
    this.t += this.speed;
    if (this.t > 1) {
      this.t = 0;
      this.segment++;
      if (this.segment > 4) {
        this.segment = 0;
        return true; // 한 바퀴 완료
      }
    }

    let x, y;
    switch (this.segment) {
      case 0: // 상단 직선 (200,0 → 600,0)
        x = 200 + 400 * this.t;
        y = 0;
        break;

      case 1: // 우측 곡선 (600,0 → 800,200 → 600,400)
        const cxR = 600, cyR = 200, rR = 200;
        // θ: -90° → +90°
        const thetaR = -Math.PI/2 + this.t * Math.PI;
        x = cxR + rR * Math.cos(thetaR);
        y = cyR + rR * Math.sin(thetaR);
        break;

      case 2: // 하단 직선 (600,400 → 200,400)
        x = 600 - 400 * this.t;
        y = 400;
        break;

      case 3: // 좌측 곡선 (200,400 → 0,200 → 200,0)
        const cxL = 200, cyL = 200, rL = 200;
        // θ: +90° → +270°
        const thetaL = Math.PI/2 + this.t * Math.PI;
        x = cxL + rL * Math.cos(thetaL);
        y = cyL + rL * Math.sin(thetaL);
        break;

      case 4: // 결승선 (200,0 → 400,0)
        x = 200 + 200 * this.t;
        y = 0;
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

