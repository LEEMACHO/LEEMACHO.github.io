// 설정
const FRAME_MS = 50;
const DELTA_SEC = FRAME_MS / 1000; // 0.05
const R_BASE = 200; // 기본 반지름
const TRACK_LENGTH = 800 + 2 * Math.PI * R_BASE; // ≈2056.64
const TARGET_LAP_SEC = 60; // 목표 1분
const TARGET_PX_PER_SEC = TRACK_LENGTH / TARGET_LAP_SEC; // ≈34.2777 px/s

class Runner {
  constructor(index, manager) {
    this.index = index;
    this.manager = manager;
    this.segment = 0;
    this.t = 0;

    // --- 속도 단위를 px/s로 정의 ---
    // topSpeedPx: 최고속도(px/s). 평균 목표에 맞추려면 TARGET_PX_PER_SEC 사용
    // 약간 여유를 주려면 *1.05 등으로 조정 가능
    this.topSpeedPx = TARGET_PX_PER_SEC * (0.95 + Math.random() * 0.1); // ±5% 랜덤
    this.speedPx = 0; // 현재 속도(px/s)
    this.accelPx = this.topSpeedPx * 0.5; // 가속(px/s^2) — 프레임당 적용 시 델타초 곱함

    // 코너링 능력: 0..1 (1이면 코너에서 거의 감속 없음)
    this.cornering = 1.0 - Math.random() * 0.4;

    // 스태미나 등 기존 파라미터 (필요시 유지)
    this.maxStamina = 100;
    this.stamina = this.maxStamina;
    this.staminaDrainAlpha = 0.6;
    this.staminaDrainBeta = 0.4;
    this.staminaRecovery = 0.5;

    // 드래프팅/추월 파라미터 (px/s 단위에 맞춰 조정)
    this.draftRange = 60;
    this.draftBonus = 0.08; // 비율 보너스 (속도에 곱함)
    this.overtakeCost = 12;
    this.overtakeBoostPx = 5; // 추월 시 순간 속도 보너스 (px/s) — 이전 절대값 대신 px/s로 설정

    // 레인 오프셋
    this.laneOffset = -Math.min(index * 20, 120);

    // 상태
    this.isDrafting = false;
    this.isOvertaking = false;
    this.overtakeTimer = 0;

    // 초반 가속 관련 (원하면 유지)
    this.hasExitedFirstCurve = false;
    this.rampUpProgress = 0;
    this.rampUpRate = 0.02;

    // 시각 요소
    this.element = document.createElement("div");
    this.element.className = "runner";
    this.element.style.filter = `hue-rotate(${index * 45}deg)`;
    document.querySelector(".stadium").appendChild(this.element);
  }

  // 현재 segment의 픽셀 길이 반환
  segmentLengthPx(segment) {
    if (segment === 0 || segment === 2) return 400; // 상단/하단 직선
    // 곡선: 반원 호 길이 = π * r (r은 lane 기준 반지름)
    const r = Math.max(R_BASE, 200 + this.laneOffset); // laneOffset 적용(필요시)
    return Math.PI * r;
  }

  // 트랙상의 좌표 계산 (기존 getPositionAt 사용)
  getPositionAt(segment, t) {
    let x, y;
    switch (segment) {
      case 0:
        x = 200 + 400 * t;
        y = 0 + this.laneOffset + (this.speedPx || 0) * 0 * t; // 시각적 보정 필요시 수정
        break;
      case 1: {
        const cxR = 600, cyR = 200;
        const rR = Math.max(200, 200 + this.laneOffset);
        const thetaR = -Math.PI/2 + t * Math.PI;
        x = cxR + rR * Math.cos(thetaR);
        y = cyR + rR * Math.sin(thetaR);
        break;
      }
      case 2:
        x = 600 - 400 * t;
        y = 400 - this.laneOffset - (this.speedPx || 0) * 0 * t;
        break;
      case 3: {
        const cxL = 200, cyL = 200;
        const rL = Math.max(200, 200 + this.laneOffset);
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

  // 드래프팅 대상 찾기 (기존 로직 재사용 가능)
  findDraftTarget() {
    const myPos = this.getPositionAt(this.segment, this.t);
    // 간단히 가장 가까운 앞 러너 찾기 (기존 조건 유지)
    let best = null, bestDist = Infinity;
    for (let other of this.manager.runners) {
      if (other === this) continue;
      const otherPos = other.getPositionAt(other.segment, other.t);
      const dx = otherPos.x - myPos.x, dy = otherPos.y - myPos.y;
      const dist = Math.hypot(dx, dy);
      if (dist < bestDist && dist <= this.draftRange) { bestDist = dist; best = other; }
    }
    return best;
  }

  reset() {
    this.segment = 0;
    this.t = 0;
    this.speedPx = 0;
    this.stamina = this.maxStamina;
    this.isDrafting = false;
    this.isOvertaking = false;
    this.overtakeTimer = 0;
    this.hasExitedFirstCurve = false;
    this.rampUpProgress = 0;
    this.updatePosition(400, 0 + this.laneOffset);
  }

  updatePosition(x, y) {
    this.element.style.transform = `translate(${x}px, ${y}px)`;
  }

  move() {
    // --- 가속(초당 단위 적용) ---
    // accelPx는 px/s^2, 프레임당 적용: accelPx * DELTA_SEC
    const accelThisFrame = this.accelPx * DELTA_SEC;
    const desiredSpeedPx = Math.min(this.topSpeedPx, this.speedPx + accelThisFrame);

    // 코너링 제한: 코너에서 허용되는 최고 px/s 계산
    let allowedCornerSpeed = this.topSpeedPx;
    if (this.segment === 1 || this.segment === 3) {
      // 코너링 능력에 따라 topSpeedPx의 비율로 제한
      allowedCornerSpeed = this.topSpeedPx * Math.max(0.4, this.cornering);
    }

    // 초반 가속 제한(원하면 유지)
    let allowedSpeedPx = allowedCornerSpeed;
    if (!this.hasExitedFirstCurve) {
      // 예: 초반에는 topSpeed의 20~60%만 허용
      const minFactor = 0.2, maxFactor = 0.6;
      const frac = (this.segment === 0) ? this.t : 1;
      allowedSpeedPx = this.topSpeedPx * (minFactor + (maxFactor - minFactor) * frac);
      allowedSpeedPx = Math.min(allowedSpeedPx, allowedCornerSpeed);
    }

    // 드래프팅 적용 (비율 보너스)
    const draftTarget = this.findDraftTarget();
    this.isDrafting = false;
    let finalDesiredPx = Math.min(desiredSpeedPx, allowedSpeedPx);
    if (draftTarget) {
      this.isDrafting = true;
      finalDesiredPx = Math.min(this.topSpeedPx * (1 + this.draftBonus), finalDesiredPx * (1 + this.draftBonus));
    }

    // 추월 시도 (간단)
    if (this.isDrafting && !this.isOvertaking && this.stamina > this.overtakeCost) {
      if (Math.random() < 0.3) { // 간단 확률
        this.isOvertaking = true;
        this.overtakeTimer = 8;
        this.stamina -= this.overtakeCost;
        finalDesiredPx = Math.min(this.topSpeedPx + this.overtakeBoostPx, finalDesiredPx + this.overtakeBoostPx);
      }
    }
    if (this.isOvertaking) {
      this.overtakeTimer--;
      if (this.overtakeTimer <= 0) this.isOvertaking = false;
    }

    // 스태미나 소모/회복 (기존 방식 유지)
    const accelUsed = Math.max(0, finalDesiredPx - this.speedPx);
    let staminaDelta = -this.staminaDrainAlpha * finalDesiredPx * DELTA_SEC - this.staminaDrainBeta * accelUsed * DELTA_SEC;
    if (this.isDrafting) staminaDelta += this.staminaRecovery * DELTA_SEC * 1.2;
    this.stamina = Math.max(0, Math.min(this.maxStamina, this.stamina + staminaDelta));

    // 스태미나에 따른 속도 보정 (비율)
    const staminaFactor = Math.max(0.2, this.stamina / this.maxStamina);
    this.speedPx = Math.max(0, Math.min(finalDesiredPx * staminaFactor, this.topSpeedPx * (0.5 + 0.5 * staminaFactor)));

    // --- t 증가: 현재 segment 길이 기준으로 delta t 계산 ---
    const segLen = this.segmentLengthPx(this.segment);
    const deltaT = (this.speedPx * DELTA_SEC) / segLen; // (px/s * s) / px = t 증가량
    this.t += deltaT;

    // segment 전환 처리
    if (this.t > 1) {
      this.t -= 1;
      this.segment++;
      if (this.segment > 4) {
        this.segment = 0;
        return true; // 한 바퀴 완료
      }
    }

    // 첫 곡선 통과 체크
    if (!this.hasExitedFirstCurve && this.segment >= 2) {
      this.hasExitedFirstCurve = true;
      this.rampUpProgress = 0;
    }
    if (this.hasExitedFirstCurve && this.rampUpProgress < 1) {
      this.rampUpProgress += this.rampUpRate;
      if (this.rampUpProgress > 1) this.rampUpProgress = 1;
    }

    // 위치 업데이트
    const pos = this.getPositionAt(this.segment, this.t);
    this.updatePosition(pos.x, pos.y);

    // 시각 표시
    this.element.style.opacity = this.isDrafting ? "0.9" : "1";
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
    this.interval = setInterval(() => this.updateRace(), FRAME_MS);
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
