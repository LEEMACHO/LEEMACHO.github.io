// 전역 변수 설정
let animationId;
let lastTime;
let time;
let runners = [];
let results = [];
let isRaceActive = false;

const timerDisplay = document.getElementById("timer");
const resultsDisplay = document.getElementById("results");

/**
 * [함수] 상대 선수 능력치 랜덤 생성 (50% ~ 150%)
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

  const trackLength = 1000; 
  const startPos = 50;
  const typeNames = ["", "밸런스", "선입(초반)", "추입(후반)"];

  const createRunner = (name, element, stats, driveType) => ({
    name, element, stats, driveType,
    distance: 0,
    velocity: 0,
    currentStamina: stats.stamina * 11, 
    maxStamina: stats.stamina * 11,
    finished: false
  });

  // 1. 플레이어 및 상대 생성
  runners = [createRunner("플레이어(나)", document.querySelector(".player.main"), mainPlayer, 1)];

  const opponents = document.querySelectorAll(".player.opponent");
  console.log("%c--- 🏁 레이스 시작 (V: 실시간 속도 표시) ---", "color: #3498db; font-weight: bold;");

  opponents.forEach((opponent, index) => {
    const stats = randomOpponentStats(mainPlayer);
    const driveType = Math.floor(Math.random() * 3) + 1;
    const reaction = Math.random() * 0.4 + 0.1;
    const initV = 11.25 - (12.5 * reaction);

    const runner = createRunner(`상대${index + 1}`, opponent, stats, driveType);
    runner.velocity = initV; 
    runner.reactionTime = reaction;
    runners.push(runner);
  });

  /**
   * 실시간 업데이트 엔진
   */
  function update(deltaTime) {
    if (!isRaceActive) return;

    time += deltaTime;
    timerDisplay.textContent = `기록: ${time.toFixed(2)}초`;

    // 콘솔 출력을 위한 데이터 수집 (매 초마다 출력하려면 조건 추가 가능)
    let speedLog = `[${time.toFixed(1)}초] `;

    for (let runner of runners) {
      if (runner.finished) continue;

      // 플레이어가 아직 반응 전이라면 대기
      if (runner.name === "플레이어(나)" && runner.velocity === 0) continue;

      const dist = runner.distance;
      let staminaDrainRate = 1.0;

      // [특성 반영]
      if (runner.driveType === 2 && dist < trackLength * 0.4) staminaDrainRate = 2.5;
      else if (runner.driveType === 3 && dist > trackLength * 0.6) staminaDrainRate = 3.5;

      if (runner.currentStamina > 0) {
        const moveStep = runner.velocity * deltaTime;
        runner.currentStamina -= (moveStep * staminaDrainRate);

        const consumed = runner.maxStamina - runner.currentStamina;
        const staminaPercent = runner.currentStamina / runner.maxStamina;

        // [방안 2] 루트 가속: 초반 반응성 강화
        let targetVelocity = runner.velocity + (Math.sqrt(consumed) * 4.5); 

        // [방안 3] 동적 한계치: 체력이 낮아질수록 최대 속도 하향
        const maxLimit = runner.stats.speed * 4.0; 
        const dynamicLimit = maxLimit * (0.6 + (staminaPercent * 0.4)); 

        runner.velocity = Math.min(targetVelocity, dynamicLimit);
      } else {
        // [방안 1] 탈진 저점 보장: 스피드 능력치의 80% 유지
        runner.currentStamina = 0;
        runner.velocity *= 0.99; 
        const floorVelocity = runner.stats.speed * 0.8; 
        if (runner.velocity < floorVelocity) runner.velocity = floorVelocity;
      }

      // 위치 이동
      runner.distance += runner.velocity * deltaTime;
      runner.element.style.left = `${startPos + runner.distance}px`;

      // 실시간 속도 로그 기록
      speedLog += `${runner.name}: ${Math.floor(runner.velocity)}px/s | `;

      // 골인 체크
      if (runner.distance >= trackLength) {
        runner.finished = true;
        runner.element.style.left = `${startPos + trackLength}px`;
        results.push({ name: runner.name, time: time, type: runner.driveType });
        if (results.length >= 3) { stopRace(); return; }
      }
    }

    // 0.5초 주기로 콘솔에 주자들의 현재 속도 출력 (너무 잦은 출력을 방지)
    if (Math.floor(time * 10) % 5 === 0) {
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
    let rankingText = "<div style='background:#f1f1f1; padding:8px; border-bottom:1px solid #ccc;'>🏆 <b>FINAL RANKING</b></div>";
    results.slice(0, 3).forEach((r, i) => {
      rankingText += `<div style='padding:4px;'>${i+1}위: ${r.name} <small>(${typeNames[r.type]})</small> - ${r.time.toFixed(2)}s</div>`;
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

function resetRace() {
  isRaceActive = false;
  cancelAnimationFrame(animationId);
  lastTime = null;
  time = 0;
  results = [];
  if (timerDisplay) timerDisplay.textContent = "기록: 0.00초";
  if (resultsDisplay) resultsDisplay.innerHTML = "";
  document.querySelectorAll(".player").forEach(p => p.style.left = "50px");
  console.clear();
  console.log("경기장 리셋 완료.");
}
