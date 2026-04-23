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

  const trackLength = 1000; // 100m (1000px) 단거리 트랙
  const startPos = 50;     // 출발선

  // 선수 객체 생성 템플릿 (주행 타입 삭제)
  const createRunner = (name, element, stats) => ({
    name, element, stats,
    distance: 0,
    velocity: 0,
    currentStamina: stats.stamina * 11, // 단거리 주행에 필요한 체력 총량
    maxStamina: stats.stamina * 11,
    finished: false
  });

  // 1. 주자 라인업 구성
  runners = [createRunner("플레이어(나)", document.querySelector(".player.main"), mainPlayer)];

  const opponents = document.querySelectorAll(".player.opponent");
  console.log("%c--- 🏁 단거리 전력질주 모드 가동 ---", "color: #e67e22; font-weight: bold;");

  opponents.forEach((opponent, index) => {
    const stats = randomOpponentStats(mainPlayer);
    
    // 반응 속도에 따른 초기 속도
    const reaction = Math.random() * 0.4 + 0.1;
    const initV = 11.25 - (12.5 * reaction);

    const runner = createRunner(`상대${index + 1}`, opponent, stats);
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

      // 플레이어 출발 대기 (키 입력 전까지 0)
      if (runner.name === "플레이어(나)" && runner.velocity === 0) continue;

      // [물리 엔진] 모든 선수 동일 소모율 적용 (단거리 특화)
      if (runner.currentStamina > 0) {
        // 체력 소모
        const moveStep = runner.velocity * deltaTime;
        runner.currentStamina -= moveStep;

        const consumed = runner.maxStamina - runner.currentStamina;
        const staminaPercent = runner.currentStamina / runner.maxStamina;

        // 1. 가속도 반영 (accel 능력치에 따른 엔진 출력)
        const accelPower = runner.stats.accel / 25; 
        let targetVelocity = runner.velocity + (Math.sqrt(consumed) * accelPower); 

        // 2. 속도 제한 (능력치 속도 * 1.2를 천장으로 설정)
        // 단거리이므로 후반 페이스 저하폭을 줄임 (기존 0.8 -> 0.9)
        const maxLimit = runner.stats.speed * 1.2; 
        const dynamicLimit = maxLimit * (0.9 + (staminaPercent * 0.1)); 

        runner.velocity = Math.min(targetVelocity, dynamicLimit);
      } else {
        // [탈진 시] 속도(speed) 능력치의 70% 유지
        runner.currentStamina = 0;
        runner.velocity *= 0.995; // 단거리라 감속을 최소화
        const floorVelocity = runner.stats.speed * 0.7; 
        if (runner.velocity < floorVelocity) runner.velocity = floorVelocity;
      }

      // 위치 업데이트
      runner.distance += runner.velocity * deltaTime;
      runner.element.style.left = `${startPos + runner.distance}px`;

      speedLog += `${runner.name}: ${Math.floor(runner.velocity)} | `;

      // 골인 체크
      if (runner.distance >= trackLength) {
        runner.finished = true;
        runner.element.style.left = `${startPos + trackLength}px`;
        results.push({ name: runner.name, time: time });
        if (results.length >= 3) { stopRace(); return; }
      }
    }

    // 2초마다 속도 출력
    if (Math.floor(time * 10) % 20 === 0) console.log(speedLog);
  }

  function stopRace() {
    isRaceActive = false;
    cancelAnimationFrame(animationId);
    timerDisplay.textContent = `최종 기록: ${time.toFixed(2)}초`;
    displayRanking();
  }

  function displayRanking() {
    results.sort((a, b) => a.time - b.time);
    let rankingText = "<div style='background:#eee; padding:8px;'>🏆 <b>순위</b></div>";
    results.slice(0, 3).forEach((r, i) => {
      rankingText += `<div style='padding:4px;'>${i+1}위: ${r.name} - ${r.time.toFixed(2)}s</div>`;
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
}
