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

  const trackLength = 1000; // 주행 거리 1000px
  const startPos = 50;     // 시작선 위치 50px
  const typeNames = ["", "밸런스", "선입(초반)", "추입(후반)"];

  // 선수 객체 생성 템플릿
  const createRunner = (name, element, stats, driveType) => ({
    name,
    element,
    stats,
    driveType,
    distance: 0,
    velocity: 0, 
    currentStamina: stats.stamina * 11, // 1000px 트랙에 맞춘 체력 배율
    maxStamina: stats.stamina * 11,
    finished: false,
    reactionTime: 0
  });

  // 1. 플레이어 생성 (초기 속도 0 - 추후 키 입력 이벤트로 부여)
  const player = createRunner("플레이어(나)", document.querySelector(".player.main"), mainPlayer, 1);
  runners = [player];

  // 2. 상대 선수 생성 (랜덤 반응 속도 적용)
  const opponents = document.querySelectorAll(".player.opponent");
  console.log("%c--- 🏁 레이스 시작! (반응 속도 체크) ---", "color: #8e44ad; font-weight: bold;");

  opponents.forEach((opponent, index) => {
    const stats = randomOpponentStats(mainPlayer);
    const driveType = Math.floor(Math.random() * 3) + 1;
    
    // 0.1s ~ 0.5s 사이의 랜덤 반응 속도
    const reaction = Math.random() * 0.4 + 0.1;
    // 반응 속도에 따른 초기 속도 보간 (0.1s -> 10, 0.5s -> 5)
    const initV = 11.25 - (12.5 * reaction);

    const runner = createRunner(`상대${index + 1}`, opponent, stats, driveType);
    runner.velocity = initV; 
    runner.reactionTime = reaction;
    
    runners.push(runner);
    console.log(`[상대${index + 1}] 반응: ${reaction.toFixed(3)}s | 초기속도: ${initV.toFixed(2)} | 타입: ${typeNames[driveType]}`);
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

      // 플레이어가 아직 반응하지 않았다면 (velocity가 0이면) 대기
      if (runner.name === "플레이어(나)" && runner.velocity === 0) continue;

      const dist = runner.distance;
      let staminaDrainRate = 1.0;

      // [특성 반영] 주행 지점 비율에 따른 체력 소모율 변화
      if (runner.driveType === 2 && dist < trackLength * 0.4) {
        staminaDrainRate = 2.5; // 선입형: 초반 스퍼트
      } else if (runner.driveType === 3 && dist > trackLength * 0.6) {
        staminaDrainRate = 3.5; // 추입형: 후반 역전
      }

      // [체력-속도 엔진]
      if (runner.currentStamina > 0) {
        // 이동한 만큼 체력 감소
        const moveStep = runner.velocity * deltaTime;
        runner.currentStamina -= (moveStep * staminaDrainRate);

        // 소모된 체력에 비례하여 가속도(속도) 생성
        const consumed = runner.maxStamina - runner.currentStamina;
        
        // 초기 속도(반응속도 기반) + 체력 소모 가속
        let targetVelocity = runner.velocity + (consumed * 0.8); 

        // 속도 제한: 능력치 기반 최대치
        const limit = runner.stats.speed * 2.5; 
        runner.velocity = Math.min(targetVelocity, limit);
      } else {
        // 체력 고갈 시 감속 (탈진)
        runner.currentStamina = 0;
        runner.velocity *= 0.97;
        if (runner.velocity < 15) runner.velocity = 15;
      }

      // 위치 업데이트
      runner.distance += runner.velocity * deltaTime;
      runner.element.style.left = `${startPos + runner.distance}px`;

      // 결승선 통과 체크
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
  }

  function stopRace() {
    isRaceActive = false;
    cancelAnimationFrame(animationId);
    timerDisplay.textContent = `최종 기록: ${time.toFixed(2)}초`;
    displayRanking();
  }

  function displayRanking() {
    results.sort((a, b) => a.time - b.time);
    let rankingText = "<div style='background:#f9f9f9; padding:8px; border-bottom:2px solid #ccc;'>🏆 <b>경기 결과 (TOP 3)</b></div>";
    results.slice(0, 3).forEach((r, i) => {
      rankingText += `<div style='padding:4px;'>${i + 1}위: ${r.name} <small style='color:gray;'>[${typeNames[r.type]}]</small> - ${r.time.toFixed(2)}초</div>`;
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
    p.style.left = "50px"; // 시작선 위치로 초기화
  });
  console.log("트랙이 리셋되었습니다.");
}
