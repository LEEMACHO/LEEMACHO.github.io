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
    this.updatePosition(300, 0); // 출발점 강제 지정
  }

  updatePosition(x, y) {
    this.element.style.transform = `translate(${x}px, ${y}px)`;
  }

  move() {
    this.t += this.speed;
    if (this.t > 1) {
      this.t = 0;
      this.segment++;
      if (this.segment > 6) {
        this.segment = 0;
        return true; // 한 바퀴 완료
      }
    }

    let x, y;
    switch (this.segment) {
      case 0: // 출발점에서 (500,0)까지 직선
        x = 300 + 200 * this.t;
        y = 0;
        break;
      case 1: // (500,0) -> (600,100) 곡선
        x = 500 + 100 * this.t;
        y = 0 + 100 * this.t;
        break;
      case 2: // (600,100) -> (500,200) 곡선
        x = 600 - 100 * this.t;
        y = 100 + 100 * this.t;
        break;
      case 3: // (500,200) -> (100,200) 직선
        x = 500 - 400 * this.t;
        y = 200;
        break;
      case 4: // (100,200) -> (0,100) 곡선
        x = 100 - 100 * this.t;
        y = 200 - 100 * this.t;
        break;
      case 5: // (0,100) -> (100,0) 곡선
        x = 0 + 100 * this.t;
        y = 100 - 100 * this.t;
        break;
      case 6: // (100,0) -> (300,0) 직선
        x = 100 + 200 * this.t;
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

