class Runner {
  constructor(index, manager) {
    this.index = index;
    this.manager = manager;
    this.segment = 0;
    this.t = 0;

    // 물리/능력치 (속도 관련 값들을 절반으로 낮춤)
    this.topSpeed = 0.5 + Math.random() * 0.3; // 이전: 1.0 + Math.random()*0.6
    this.accel = 0.01 + Math.random() * 0.01;  // 이전: 0.02 + Math.random()*0.02
    this.cornering = 1.0 - Math.random() * 0.4;

    // 스태미나(지구력)
    this.maxStamina = 100;
    this.stamina = this.maxStamina;
    this.staminaDrainAlpha = 0.6;
    this.staminaDrainBeta = 0.4;
    this.staminaRecovery = 0.5;

    // 드래프팅/추월 파라미터
    this.draftRange = 60;
    this.draftAngleThreshold = 0.85;
    this.draftBonus = 0.08;
    this.overtakeCost = 12;
    this.overtakeBoost = 0.125; // 이전: 0.25 (절반으로 낮춤)
    this.overtakeChanceBase = 0.6;

    // 레인 오프셋: 외곽에서 시작 (-120 ~ 0)
    this.laneOffset = -Math.min(index * 20, 120);

    // 시각 요소
    this.element = document.createElement("div");
    this.element.className = "runner";
    this.element.style.filter = `hue-rotate(${index * 45}deg)`;
    document.querySelector(".stadium").appendChild(this.element);

    // 상태 플래그
    this.isDrafting = false;
    this.isOvertaking = false;
    this.overtakeTimer = 0;
  }

  getPositionAt(segment, t) {
    let x, y;
    switch (segment) {
      case 0:
        x = 200 + 400 * t;
        y = 0 + this.laneOffset + (this.speed || 0) * 50 * t;
        break;
      case 1: {
        const cxR = 600, cyR = 200;
        const rR = Math.max(200, 200 + this.laneOffset + (this.speed || 0) * 50);
        const thetaR = -Math.PI/2 + t * Math.PI;
        x = cxR + rR * Math.cos(thetaR);
        y = cyR + rR * Math.sin(thetaR);
        break;
      }
      case 2:
        x = 600 - 400 * t;
        y = 400 - this.laneOffset - (this.speed || 0) * 50 * t;
        break;
      case 3: {
        const cxL = 200, cyL = 200;
        const rL = Math.max(200, 200 + this.laneOffset + (this.speed || 0) * 50);
        const thetaL = Math.PI/2 + t * Math.PI;
        x = cxL + rL * Math.cos(thetaL);
        y = cyL + rL * Math.sin(thetaL);
        break;
      }
      case 4:
        x = 200 + 200 * t;
        y = 0 + this.laneOffset;
        break;
      default:
        x = 400; y = 200;
    }
    return { x, y };
  }

  getProgress() {
    return this.segment + this.t;
  }

  getHeadingVector() {
    const eps = 0.01;
    const p1 = this.getPositionAt(this.segment, this.t);
    let seg2 = this.segment;
    let t2 = this.t + eps;
    if (t2 > 1) { t2 -= 1; seg2 = (seg2 + 1) % 5; }
    const p2 = this.getPositionAt(seg2, t2);
    const vx = p2.x - p1.x;
    const vy = p2.y - p1.y;
    const len = Math.hypot(vx, vy) || 1;
    return { x: vx / len, y: vy / len };
  }

  distanceTo(otherPos) {
    const myPos = this.getPositionAt(this.segment, this.t);
    return Math.hypot(myPos.x - otherPos.x, myPos.y - otherPos.y);
  }

  findDraftTarget() {
    const myPos = this.getPositionAt(this.segment, this.t);
    const myHeading = this.getHeadingVector();
    let best = null;
    let bestDist = Infinity;
    for (let other of this.manager.runners) {
      if (other === this) continue;
      const otherPos = other.getPositionAt(other.segment, other.t);
      const dx = otherPos.x - myPos.x;
      const dy = otherPos.y - myPos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > this.draftRange) continue;
      const dirToOther = (dx * myHeading.x + dy * myHeading.y) / (dist || 1);
      if (dirToOther < this.draftAngleThreshold) continue;
      const progDiff = other.getProgress() - this.getProgress();
      const normalizedDiff = progDiff < 0 ? progDiff + 5 : progDiff;
      if (normalizedDiff <= 0 || normalizedDiff > 2) continue;
      if (dist < bestDist) { bestDist = dist; best = other; }
    }
    return best;
  }

  reset() {
    this.segment = 0;
    this.t = 0;
    this.speed = 0;
    this.stamina = this.maxStamina;
    this.isDrafting = false;
    this.isOvertaking = false;
    this.overtakeTimer = 0;
    this.updatePosition(400, 0 + this.laneOffset);
  }

  updatePosition(x, y) {
    this.element.style.transform = `translate(${x}px, ${y}px)`;
  }

  move() {
    if (this.speed === undefined) this.speed = 0;
    let desiredSpeed = Math.min(this.topSpeed, this.speed + this.accel);

    if (this.segment === 1 || this.segment === 3) {
      const cornerLimit = this.topSpeed * Math.max(0.4, this.cornering);
      desiredSpeed = Math.min(desiredSpeed, cornerLimit);
    }

    const draftTarget = this.findDraftTarget();
    this.isDrafting = false;
    let draftMultiplier = 0;
    if (draftTarget) {
      this.isDrafting = true;
      draftMultiplier = this.draftBonus;
      desiredSpeed = Math.min(this.topSpeed * (1 + draftMultiplier), desiredSpeed * (1 + draftMultiplier));
    }

    if (this.isDrafting && this.stamina > this.overtakeCost && !this.isOvertaking) {
      const leader = draftTarget;
      const speedDiff = this.speed - leader.speed;
      const staminaFactor = (this.stamina / this.maxStamina);
      const chance = this.overtakeChanceBase + 0.2 * staminaFactor + 0.2 * Math.max(0, speedDiff);
      if (Math.random() < chance) {
        this.isOvertaking = true;
        this.overtakeTimer = 8;
        this.stamina -= this.overtakeCost;
        desiredSpeed = Math.min(this.topSpeed + this.overtakeBoost, desiredSpeed + this.overtakeBoost);
      }
    }

    if (this.isOvertaking) {
      this.overtakeTimer--;
      if (this.overtakeTimer <= 0) {
        this.isOvertaking = false;
      }
    }

    const accelUsed = Math.max(0, desiredSpeed - this.speed);
    let staminaDelta = -this.staminaDrainAlpha * desiredSpeed - this.staminaDrainBeta * accelUsed;
    if (this.isDrafting) staminaDelta += this.staminaRecovery * 1.2;
    if (desiredSpeed < 0.2 * this.topSpeed) staminaDelta += this.staminaRecovery;
    this.stamina += staminaDelta;
    if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
    if (this.stamina < 0) this.stamina = 0;

    const staminaFactor = Math.max(0.2, this.stamina / this.maxStamina);
    this.speed = Math.max(0, Math.min(desiredSpeed * staminaFactor, this.topSpeed * (0.5 + 0.5 * staminaFactor)));

    // 속도 절반 조정을 위해 speedToT를 절반으로 낮춤 (이전 0.6 -> 현재 0.3)
    const speedToT = 0.3;
    this.t += this.speed * speedToT;
    if (this.t > 1) {
      this.t -= 1;
      this.segment++;
      if (this.segment > 4) {
        this.segment = 0;
        return true;
      }
    }

    const pos = this.getPositionAt(this.segment, this.t);
    this.updatePosition(pos.x, pos.y);

    if (this.isDrafting) this.element.style.opacity = "0.9"; else this.element.style.opacity = "1";
    if (this.isOvertaking) this.element.style.transform += " scale(1.05)";

    return false;
  }
}

class GameManager {
  constructor(numRunners) {
    this.runners = [];
    this.interval = null;
    for (let i = 0; i < numRunners; i++) {
      this.runners.push(new Runner(i, this));
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
