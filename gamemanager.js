class Runner {
  constructor(index, a, b) {
    this.index = index;
    this.theta = 0;
    this.speed = Math.random() * 0.05 + 0.02; // 각도 증가량
    this.a = a; // 가로 반지름
    this.b = b; // 세로 반지름

    this.element = document.createElement("div");
    this.element.className = "runner";
    this.element.style.filter = `hue-rotate(${index * 45}deg)`;
    document.querySelector(".stadium").appendChild(this.element);
  }

  reset() {
    this.theta = 0;
    this.speed = Math.random() * 0.05 + 0.02;
  }

  move() {
    this.theta += this.speed;
    const x = this.a * Math.cos(this.theta) + this.a;
    const y = this.b * Math.sin(this.theta) + this.b;
    this.element.style.transform = `translate(${x}px, ${y}px)`;
    return this.theta >= 2 * Math.PI; // 한 바퀴 돌면 경기 종료
  }
}

class GameManager {
  constructor(numRunners, a, b) {
    this.runners = [];
    this.a = a;
    this.b = b;
    this.interval = null;

    for (let i = 0; i < numRunners; i++) {
      this.runners.push(new Runner(i, a, b));
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

const game = new GameManager(8, 350, 180); // 경기장 크기 (가로/세로 반지름)
