class Runner {
  constructor(index, trackWidth, trackHeight) {
    this.index = index;
    this.segment = 0;
    this.pos = 0;
    this.speed = Math.random() * 3 + 2;
    this.trackWidth = trackWidth;
    this.trackHeight = trackHeight;

    this.element = document.createElement("div");
    this.element.className = "runner";
    this.element.style.filter = `hue-rotate(${index * 45}deg)`;
    document.querySelector(".stadium").appendChild(this.element);
  }

  reset() {
    this.segment = 0;
    this.pos = this.trackWidth / 2; // 상단 직선 중간에서 출발
    this.speed = Math.random() * 3 + 2;
  }

  move() {
    let x, y;
    if (this.segment === 0) { // 상단 직선
      x = this.pos;
      y = 0;
      this.pos += this.speed;
      if (this.pos >= this.trackWidth - this.trackHeight/2) {
        this.segment = 1;
        this.theta = 0; // 곡선 각도 시작
      }
    } else if (this.segment === 1) { // 우측 곡선
      this.theta += this.speed / (this.trackHeight/2);
      x = this.trackWidth - this.trackHeight/2 + (this.trackHeight/2) * Math.sin(this.theta);
      y = (this.trackHeight/2) * (1 - Math.cos(this.theta));
      if (this.theta >= Math.PI/2) {
        this.segment = 2;
        this.pos = this.trackWidth - this.trackHeight/2; // 곡선 끝 좌표 이어받기
      }
    } else if (this.segment === 2) { // 하단 직선
      x = this.pos;
      y = this.trackHeight;
      this.pos -= this.speed;
      if (this.pos <= this.trackHeight/2) {
        this.segment = 3;
        this.theta = 0;
      }
    } else if (this.segment === 3) { // 좌측 곡선
      this.theta += this.speed / (this.trackHeight/2);
      x = (this.trackHeight/2) * (1 - Math.sin(this.theta));
      y = this.trackHeight - (this.trackHeight/2) * (1 - Math.cos(this.theta));
      if (this.theta >= Math.PI/2) {
        this.segment = 0;
        this.pos = this.trackWidth / 2; // 다시 상단 직선 중간에서 시작
        return true; // 한 바퀴 완료
      }
    }
    this.element.style.transform = `translate(${x}px, ${y}px)`;
    return false;
  }
}

class GameManager {
  constructor(numRunners, trackWidth, trackHeight) {
    this.runners = [];
    this.trackWidth = trackWidth;
    this.trackHeight = trackHeight;
    this.interval = null;

    for (let i = 0; i < numRunners; i++) {
      this.runners.push(new Runner(i, trackWidth, trackHeight));
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

const game = new GameManager(8, 800, 400);
