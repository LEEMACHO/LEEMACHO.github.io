class Runner {
  constructor(index, manager) {
    this.index = index;
    this.manager = manager;
    this.segment = 0;
    this.t = 0;

    // 물리/능력치
    this.topSpeed = 1.0 + Math.random() * 0.6; // 기본 최대속도 (튜닝 가능)
    this.accel = 0.02 + Math.random() * 0.02; // 가속도
    this.cornering = 1.0 - Math.random() * 0.4; // 코너링 능력 (1.0 좋음)
    
    // 스태미나(지구력)
    this.maxStamina = 100;
    this.stamina = this.maxStamina;
    this.staminaDrainAlpha = 0.6; // 속도 기반 소모 계수
    this.staminaDrainBeta = 0.4;  // 가속 기반 소모 계수
    this.staminaRecovery = 0.5;   // 회복량(느린 구간/드래프팅 시)

    // 드래프팅/추월 파라미터
    this.draftRange = 60;         // 픽셀 단위 거리: 이 범위 안이면 드래프팅 가능
    this.draftAngleThreshold = 0.85; // 진행 방향 정렬 임계값 (dot product)
    this.draftBonus = 0.08;       // 드래프팅 시 속도 보너스 (비율)
    this.overtakeCost = 12;       // 추월 시 소모 스태미나
    this.overtakeBoost = 0.25;    // 추월 시 순간 속도 보너스 (절대값)
    this.overtakeChanceBase = 0.6; // 기본 추월 성공 확률

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

  // 트랙상의 (segment, t) 에서 좌표 반환 (기존 로직과 동일한 좌표계 사용)
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

  // 현재 전역 진행도(단순 비교용): segment + t
  getProgress() {
    return this.segment + this.t;
  }

  // 작은 dt로 진행 방향(단위 벡터) 근사
  getHeadingVector() {
    const eps = 0.01;
    const p1 = this.getPositionAt(this.segment, this.t);
    // 다음 위치: advance t slightly, handle segment wrap
    let seg2 = this.segment;
    let t2 = this.t + eps;
    if (t2 > 1) { t2 -= 1; seg2 = (seg2 + 1) % 5; }
    const p2 = this.getPositionAt(seg2, t2);
    const vx = p2.x - p1.x;
    const vy = p2.y - p1.y;
    const len = Math.hypot(vx, vy) || 1;
    return { x: vx / len, y: vy / len };
  }

  // 거리 계산 유틸
  distanceTo(otherPos) {
    const myPos = this.getPositionAt(this.segment, this.t);
    return Math.hypot(myPos.x - otherPos.x, myPos.y - otherPos.y);
  }

  // 드래프팅 대상 찾기: 바로 앞에 있고 정렬이 잘 되어 있는 러너 반환 또는 null
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
      // 진행 방향 정렬: other가 앞쪽에 있어야 함 (dot > threshold)
      const dirToOther = (dx * myHeading.x + dy * myHeading.y) / (dist || 1);
      if (dirToOther < this.draftAngleThreshold) continue;
      // other가 실제로 앞에 있는지 간단 비교: progress 차이
      const progDiff = other.getProgress() - this.getProgress();
      // 트랙 순환 고려: 만약 음수면 +5
      const normalizedDiff = progDiff < 0 ? progDiff + 5 : progDiff;
      if (normalizedDiff <= 0 || normalizedDiff > 2) continue; // 너무 멀거나 뒤에 있으면 제외
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
    // 기본 가속/속도 목표 계산
    // desiredSpeed는 현재 topSpeed를 기준으로 가속 적용
    if (this.speed === undefined) this.speed = 0;
    let desiredSpeed = Math.min(this.topSpeed, this.speed + this.accel);

    // 코너링 제한: 간단히 segment가 곡선이면 코너링 능력 적용
    if (this.segment === 1 || this.segment === 3) {
      const cornerLimit = this.topSpeed * Math.max(0.4, this.cornering);
      desiredSpeed = Math.min(desiredSpeed, cornerLimit);
    }

    // 드래프팅 검사
    const draftTarget = this.findDraftTarget();
    this.isDrafting = false;
    let draftMultiplier = 0;
    if (draftTarget) {
      // 드래프팅 적용: 속도 보너스 비율, 스태미나 소모 감소
      this.isDrafting = true;
      draftMultiplier = this.draftBonus;
      desiredSpeed = Math.min(this.topSpeed * (1 + draftMultiplier), desiredSpeed * (1 + draftMultiplier));
    }

    // 추월 시도 로직
    if (this.isDrafting && this.stamina > this.overtakeCost && !this.isOvertaking) {
      // 추월 시도 확률: 기본 + (stamina 비율) + (속도 차)
      const leader = draftTarget;
      const speedDiff = this.speed - leader.speed;
      const staminaFactor = (this.stamina / this.maxStamina);
      const chance = this.overtakeChanceBase + 0.2 * staminaFactor + 0.2 * Math.max(0, speedDiff);
      if (Math.random() < chance) {
        // 추월 개시
        this.isOvertaking = true;
        this.overtakeTimer = 8; // 프레임 지속시간(튜닝)
        this.stamina -= this.overtakeCost;
        desiredSpeed = Math.min(this.topSpeed + this.overtakeBoost, desiredSpeed + this.overtakeBoost);
      }
    }

    // 오버테이크 지속 처리
    if (this.isOvertaking) {
      this.overtakeTimer--;
      if (this.overtakeTimer <= 0) {
        this.isOvertaking = false;
      }
    }

    // 실제 속도 적용 (간단한 물리)
    // 가속에 따른 스태미나 소모 계산
    const accelUsed = Math.max(0, desiredSpeed - this.speed);
    // 스태미나 변화: 속도·가속 소모, 드래프팅이면 소모 감소, 느린 구간이면 회복
    let staminaDelta = -this.staminaDrainAlpha * desiredSpeed - this.staminaDrainBeta * accelUsed;
    if (this.isDrafting) staminaDelta += this.staminaRecovery * 1.2; // 드래프팅 중 회복 보정
    if (desiredSpeed < 0.2 * this.topSpeed) staminaDelta += this.staminaRecovery; // 매우 느리면 회복
    this.stamina += staminaDelta;
    if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
    if (this.stamina < 0) this.stamina = 0;

    // 스태미나가 낮으면 topSpeed와 accel 감소
    const staminaFactor = Math.max(0.2, this.stamina / this.maxStamina);
    this.speed = Math.max(0, Math.min(desiredSpeed * staminaFactor, this.topSpeed * (0.5 + 0.5 * staminaFactor)));

    // 진행도 업데이트 (t 증가)
    // speed는 추상 단위; 프레임당 t 증가량으로 변환 (튜닝 필요)
    const speedToT = 0.6; // 속도를 t 증가로 바꾸는 계수(튜닝)
    this.t += this.speed * speedToT;
    if (this.t > 1) {
      this.t -= 1;
      this.segment++;
      if (this.segment > 4) {
        this.segment = 0;
        return true;
      }
    }

    // 위치 계산 및 적용
    const pos = this.getPositionAt(this.segment, this.t);
    this.updatePosition(pos.x, pos.y);

    // 상태 디버그용 클래스 토글(선택)
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
