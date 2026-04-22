// [1] 전역 변수 설정
let animationId;
let lastTime;
let time;
let runners = [];
let results = [];
let isRaceActive = false;

const timerDisplay = document.getElementById("timer");
const resultsDisplay = document.getElementById("results");

/**
 * [함수] 상대 선수 능력치 랜덤 생성
 */
function randomOpponentStats(baseStats) {
  const randInRange = (val) => Math.floor(val * (0.5 + Math.random()));
  return {
    stamina: randInRange(baseStats.stamina),
    speed: randInRange(baseStats.speed),
    accel: randInRange(baseStats.accel)
  };
}

/**
 * [메인 함수] 경기 시작
 */
function startRace() {
  time = 0;
  lastTime = null;
  results = [];
  isRaceActive = true;
  if (resultsDisplay) resultsDisplay.innerHTML = "";

  const trackLength = 1000; // 목표 주행 거리
  const startPos = 50;     // 출발선 위치 (px)
  const typeNames = ["", "밸런스", "선입(초반)", "추입(후반)"];

  // 선수 객체 생성 템플릿
  const createRunner = (name, element, stats, driveType) => ({
    name, element, stats, driveType,
    distance: 0,
    velocity: 0,
    currentStamina: stats.stamina * 11, // 트랙 길이에 맞춘 체력 총량
    maxStamina: stats.stamina * 11,
    finished: false
  });

  // 1. 주자 라인업 구성 (플레이어 + 상대 6인)
  runners = [createRunner("플레이어(나)", document.querySelector(".player.main"), mainPlayer, 1)];

  const opponents = document.querySelectorAll(".player.opponent");
  console.log("%c--- 🏁 경기 시작: 가중치 물리 엔진 가동 ---", "color: #3498db; font-weight: bold;");

  opponents.forEach((opponent, index) => {
    const stats = randomOpponentStats(mainPlayer);
    const driveType = Math.floor(Math.random() * 3) + 1;
    
    // 반응 속도(0.1~0.5초)에 따른 초기 속도 부여
    const reaction = Math.random() * 0.4 + 0.1;
    const initV = 11.25 - (12.5 * reaction);

    const runner = createRunner(`상대${index + 1}`, opponent, stats, driveType);
    runner.velocity = initV; 
    runner.reactionTime = reaction;
    runners.push(runner);
  });

  /**
   * [실시간 업데이트 엔진]
   */
  function update(deltaTime) {
    if (!isRaceActive) return;

    time += deltaTime;
    timerDisplay.textContent = `기록: ${time.toFixed(2)}초`;

    let speedLog = `[${time.toFixed(1)}초] `;

    for (let runner of runners) {
      if (runner.finished) continue;

      // 플레이어 대기 로직 (속도가 0이면 출발 전으로 간주)
      if (runner.name === "플레이어(나)" && runner.velocity === 0) continue;

      const dist = runner.distance;
      let staminaDrainRate = 1.0;

      // 주행 타입별 체력 연소 전략
      if (runner.driveType === 2 && dist < 400) staminaDrainRate = 2.5; 
      else if (runner.driveType === 3 && dist > 600) staminaDrainRate = 3.5;

      if (runner.currentStamina > 0) {
        // 이동 거리에 따른 체력 소모
        const moveStep = runner.velocity * deltaTime;
        runner.currentStamina -= (moveStep * staminaDrainRate);

        const consumed = runner.maxStamina - runner.currentStamina;
        const staminaPercent = runner.currentStamina / runner.maxStamina;

        // [가속 로직] 가속도(accel) 능력치가 가속 곡선의 기울기를 결정
        const accelPower = runner.stats.accel / 25; 
        let targetVelocity = runner.velocity + (Math.sqrt(consumed) * accelPower); 

        // [속도 제한] 최고 속도는 능력치의 1.2배, 지칠수록 능력치의 0.8배까지 하락
        const maxLimit = runner.stats.speed * 1.2; 
        const dynamicLimit = maxLimit * (0.8 + (staminaPercent * 0.2)); 

        runner.velocity = Math.min(targetVelocity, dynamicLimit);
      } else {
        // [탈진 로직] 체력 0일 때 감속하되, 속도(speed) 능력치의 70%를 저점으로 유지
        runner.currentStamina = 0;
        runner.velocity *= 0.99;
        const floorVelocity = runner.stats.speed * 0.7; 
        if (runner.velocity < floorVelocity) runner.velocity = floorVelocity;
      }

      // 실제 좌표 이동
      runner.distance += runner.velocity * deltaTime;
      runner.element.style.left = `${startPos + runner.distance}px`;

      // 로그 데이터 수집
      speedLog += `${runner.name}: ${Math.floor(runner.velocity)} | `;

      // 골인 체크
      if (runner.distance >= trackLength) {
        runner.finished = true;
        runner.element.style.left = `${startPos + trackLength}px`;
        results.push({ name: runner.name, time: time, type: runner.driveType });

        if (results.length >= 3) {
          stopRace();
          return;
        }
      }
    }

    // 2초마다 콘솔에 현재 속도 상황 출력
    if (Math.floor(time * 10) % 20 === 0) {
      console.log(speedLog);
    }
  }

  function stopRace() {
    isRaceActive = false;
    cancelAnimationFrame(animationId);
    timerDisplay.textContent = `최종 기록: ${time.toFixed(2)}초`;
    displayRanking();
  }

  function displayRanking() {
    results.sort((a, b) => a.time - b.time);
    let rankingText = "<div style='background:#f1f1f1; padding:8px; border-bottom:1px solid #ccc;'>🏆 <b>순위 (TOP 3)</b></div>";
    results.slice(0, 3).forEach((r, i) => {
      rankingText += `<div style='padding:4px;'>${i + 1}위: ${r.name} - ${r.time.toFixed(2)}s</div>`;
    });
    if (resultsDisplay) resultsDisplay.innerHTML = rankingText;
  }

  function loop(timestamp) {
    if (!isRaceActive) return;
    if (!lastTime) lastTime = timestamp;
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    update(deltaTime);
    animationId = requestAnimationFrame(loop);
  }
  animationId = requestAnimationFrame(loop);
}

/**
 * 리셋 함수
 */
function resetRace() {
  isRaceActive = false;
  cancelAnimationFrame(animationId);
  lastTime = null;
  time = 0;
  results = [];
  if (timerDisplay) timerDisplay.textContent = "기록: 0.00초";
  if (resultsDisplay) resultsDisplay.innerHTML = "";
  document.querySelectorAll(".player").forEach(p => {
    p.style.left = "50px";
  });
  console.clear();
  console.log("경기가 리셋되었습니다.");
}
