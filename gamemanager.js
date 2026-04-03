class Runner {
  constructor(index, trackLength) {
    this.index = index;
    this.pos = 0;
    this.speed = Math.random() * 3 + 1;
    this.trackLength = trackLength;

    // 트랙과 러너 DOM 생성
    this.track = document.createElement("div");
    this.track.className = "track";

    this.element = document.createElement("div");
    this.element.className = "runner";
    this.element.style.filter = `hue-rotate(${index * 45}deg)`;

    this.track.appendChild(this.element);
    document.getElementById("race").appendChild(this.track);
  }

  reset() {
    this.pos = 0;
    this.element.style.left = "0px";
    this.speed = Math.random() * 3 + 1;
  }

  move() {
    if (Math.random() < 0.1) this.speed = Math.random() * 3 + 1;
    this.pos += this.speed;
    this.element.style.left = this.pos + "px";
    return this.pos >= this.trackLength;
  }
}

class GameManager {
  constructor(numRunners, trackLength) {
    this.runners = [];
    this.trackLength = trackLength;
    this.interval = null;

    for (let i = 0; i < numRunners; i++) {
      this.runners.push(new Runner(i, trackLength));
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

// 전역에서 사용할 게임 객체 생성
const game = new GameManager(8, 760);
