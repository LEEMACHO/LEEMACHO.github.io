/**
 * [설정 데이터] 능력치 기반 기준 기록 테이블
 */
const recordTable = { 70: 11.0, 80: 10.5, 90: 9.5, 100: 8.5 };

/**
 * [함수] 능력치 기반 예상 시간 계산 (기본 베이스)
 */
function estimateTime(stamina, speed, accel) {
  const score = (stamina + speed + accel) / 3;
  if (score <= 70) return recordTable[70];
  if (score >= 100) return recordTable[100];
  const lower = Math.floor(score / 10) * 10;
  const upper = lower + 10;
  const tLower = recordTable[lower];
  const tUpper = recordTable[upper];
  const ratio = (score - lower) / (upper - lower);
  return tLower + (tUpper - tLower) * ratio;
}

/**
 * [함수] 상대 선수 능력치 랜덤 생성 (50% ~ 150%)
 */
function randomOpponentStats(baseStats) {
  function randInRange(value) {
    const multiplier = 0.5 + (Math.random() * 1.0); 
    return Math.floor(value * multiplier);
  }
  return {
    stamina: randInRange(baseStats.stamina),
    speed: randInRange(baseStats.speed),
    accel: randInRange(baseStats.accel)
  };
}

// 전역 변수
let animationId;
let lastTime;
let time;
let runners = [];
let results = [];
let isRaceActive = false;

const timerDisplay = document.getElementById("timer");
const resultsDisplay = document.getElementById("results");

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

  // 1. 플레이어 생성 (기본 밸런스형)
  runners = [{
    name: "플레이어(나)",
    element: document.querySelector(".player.main"),
    stats: mainPlayer,
    distance: 0,
    velocity: 0,
    driveType: 1, // 플레이어는 밸런스형 고정 (원할 시 랜덤 변경 가능)
    finished: false
  }];

  // 2. 상대 선수 생성 (특성 랜덤 배정)
  const opponents = document.querySelectorAll(".player.opponent");
  console.log("%c--- 🏃 특성 기반 레이스 시작 (50%~150%) ---", "color: #3498db; font-weight: bold; font-size: 14px;");

  opponents.forEach((opponent, index) => {
    const stats = randomOpponentStats(mainPlayer);
    const driveType = Math.floor(Math.random() * 3) + 1; // 1, 2, 3 중 랜덤
    
    runners.push({
      name: `상대${index + 1}`,
      element: opponent,
      stats: stats,
      distance: 0,
      velocity: 0,
      driveType: driveType,
      finished: false
    });

    console.log(`[상대${index + 1}] 타입: ${typeNames[driveType]} | 스탯합: ${stats.stamina + stats.speed + stats.accel}`);
  });

  /**
   * 실시간 업데이트 루프
   */
  function update(deltaTime) {
    if (!isRaceActive) return;

    time += deltaTime;
    timerDisplay.textContent = `기록: ${time.toFixed(2)}초`;

    for (let runner of runners) {
      if (runner.finished) continue;

      // --- [특성 엔진] 주행 지점에 따른 가속도 보정 ---
      let accelMultiplier = 1.0;
      const progress = runner.distance / track.lengthPx; // 0.0 ~ 1.0

      if (runner.driveType === 2) { 
        // 초반 스퍼트형: 40% 지점까지 강력, 이후 급감
        accelMultiplier = progress < 0.4 ? 1.9 : 0.55;
      } else if (runner.driveType === 3) { 
        // 후반 역전형: 60% 지점까지 대기, 이후 폭발
        accelMultiplier = progress < 0.6 ? 0.45 : 2.3;
      } else { 
        // 밸런스형: 전 구간 안정적
        accelMultiplier = 1.15;
      }

      // 물리 공식 적용
      const acceleration = (runner.stats.accel / 45) * accelMultiplier;
      const maxVelocity = (runner.stats.speed * 2.3);

      // 속도 증가 (최고 속도 제한)
      if (runner.velocity < maxVelocity) {
        runner.velocity += acceleration;
      }

      // 실제 이동
      runner.distance += runner.velocity * deltaTime;
      runner.element.style.left = `calc(5% + ${runner.distance}px)`;

      // 골인 체크
      if (runner.distance >= track.lengthPx) {
        runner.finished = true;
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
    let rankingText = "<div style='border-bottom: 2px solid #333; margin-bottom: 10px;'>🏆 <b>TOP 3 결과</b></div>";
    
    results.slice(0, 3).forEach((r, i) => {
      const color = i === 0 ? "#f1c40f" : i === 1 ? "#bdc3c7" : "#e67e22";
      rankingText += `<div style='color: ${color};'>${i + 1}위: ${r.name} [${typeNames[r.type]}] (${r.time.toFixed(2)}초)</div>`;
    });

    if (resultsDisplay) resultsDisplay.innerHTML = rankingText;
    console.log("%c--- 경기 종료 ---", "color: #e74c3c; font-weight: bold;");
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
  document.querySelectorAll(".player").forEach(p => p.style.left = "5%");
  console.log("경기가 초기화되었습니다.");
}
