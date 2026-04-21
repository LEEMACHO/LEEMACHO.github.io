// 전역 변수 및 설정
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

  const typeNames = ["", "밸런스", "초반스퍼트(선입)", "후반역전(추입)"];
  
  // [수정] 트랙 길이를 1000px로 고정 참조
  const trackLength = 1000; 
  const startPos = 50; // CSS의 .start-line 위치 (50px)

  // 1. 선수 객체 생성 함수
  const createRunner = (name, element, stats, driveType) => ({
    name,
    element,
    stats,
    driveType,
    distance: 0, // 달린 거리 (0~1000)
    velocity: 0,
    currentStamina: stats.stamina * 8, // 체력 수치는 추후 조정 예정
    maxStamina: stats.stamina * 8,
    finished: false
  });

  // 플레이어 및 상대 생성
  runners = [createRunner("플레이어(나)", document.querySelector(".player.main"), mainPlayer, 1)];

  const opponents = document.querySelectorAll(".player.opponent");
  console.log("%c--- 🏃 트랙 1000px 레이스 시작 ---", "color: #2ecc71; font-weight: bold;");

  opponents.forEach((opponent, index) => {
    const stats = randomOpponentStats(mainPlayer);
    const driveType = Math.floor(Math.random() * 3) + 1;
    runners.push(createRunner(`상대${index + 1}`, opponent, stats, driveType));
    console.log(`[상대${index + 1}] 타입: ${typeNames[driveType]}`);
  });

  /**
   * 실시간 업데이트 엔진
   */
  function update(deltaTime) {
    if (!isRaceActive) return;

    time += deltaTime;
    timerDisplay.textContent = `기록: ${time.toFixed(2)}초`;

    for (let runner of runners) {
      if (runner.finished) continue;

      const dist = runner.distance;
      let staminaDrainRate = 1.0;

      // [특성 반영] 주행 지점 비율에 따른 체력 소모 (trackLength 기준 자동 계산)
      if (runner.driveType === 2 && dist < trackLength * 0.4) {
        staminaDrainRate = 2.5;
      } else if (runner.driveType === 3 && dist > trackLength * 0.6) {
        staminaDrainRate = 3.5;
      }

      // [체력-속도 매커니즘]
      if (runner.currentStamina > 0) {
        const moveStep = runner.velocity * deltaTime;
        runner.currentStamina -= (moveStep * staminaDrainRate);

        const consumed = runner.maxStamina - runner.currentStamina;
        let targetVelocity = (consumed * 0.8); 
        const limit = runner.stats.speed * 2.5; 
        runner.velocity = Math.min(targetVelocity, limit);
      } else {
        // 탈진 상태
        runner.currentStamina = 0;
        runner.velocity *= 0.97;
        if (runner.velocity < 15) runner.velocity = 15;
      }

      // [핵심 수정] 실제 위치 업데이트: 시작 지점(50px) + 달린 거리
      runner.distance += runner.velocity * deltaTime;
      runner.element.style.left = `${startPos + runner.distance}px`;

      // [핵심 수정] 골인 체크: 달린 거리가 1000px에 도달했는지 확인
      if (runner.distance >= trackLength) {
        runner.finished = true;
        // 정확히 결승선 위치에 고정
        runner.element.style.left = `${startPos + trackLength}px`; 
        results.push({ name: runner.name, time: time, type: runner.driveType });

        if (results.length >= 3) {
          stopRace();
          return;
        }
      }
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
    const typeNames = ["", "밸런스", "선입", "추입"];
    let rankingText = "<div style='background:#eee; padding:5px;'>🏆 <b>RANKING (TOP 3)</b></div>";
    results.slice(0, 3).forEach((r, i) => {
      rankingText += `<div>${i + 1}위: ${r.name} (${typeNames[r.type]}) - ${r.time.toFixed(2)}s</div>`;
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
 * [수정] 리셋 함수: 모든 선수를 시작선(50px) 위치로 되돌림
 */
function resetRace() {
  isRaceActive = false;
  cancelAnimationFrame(animationId);
  lastTime = null;
  time = 0;
  results = [];
  if (timerDisplay) timerDisplay.textContent = "기록: 0.00초";
  if (resultsDisplay) resultsDisplay.innerHTML = "";
  
  // 모든 주자 위치를 시작선(50px)으로 초기화
  document.querySelectorAll(".player").forEach(p => {
    p.style.left = "50px";
  });
  console.log("경기장이 리셋되었습니다. (시작점: 50px)");
}
