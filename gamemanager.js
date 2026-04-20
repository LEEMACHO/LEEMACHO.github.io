/**
 * [설정 데이터]
 * 능력치 평균에 따른 기준 기록 보간 테이블
 */
const recordTable = { 70: 11.0, 80: 10.5, 90: 9.5, 100: 8.5 };

/**
 * [함수] 능력치 기반 예상 시간 계산
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
 * [함수] 상대 선수 능력치 랜덤 생성 (내 능력치의 50% ~ 150%)
 */
function randomOpponentStats(baseStats) {
  function randInRange(value) {
    // 0.5 ~ 1.5 사이의 난수 적용
    const multiplier = 0.5 + (Math.random() * 1.0); 
    return Math.floor(value * multiplier);
  }
  return {
    stamina: randInRange(baseStats.stamina),
    speed: randInRange(baseStats.speed),
    accel: randInRange(baseStats.accel)
  };
}

// 전역 변수 설정
let animationId;
let lastTime;
let time;
let runners = [];
let results = [];
let isRaceActive = false; // 경기 진행 상태 플래그 (타이머 정지 핵심)

const timerDisplay = document.getElementById("timer");
const resultsDisplay = document.getElementById("results");

/**
 * [메인 함수] 경기 시작
 */
function startRace() {
  // 1. 초기화 및 상태 설정
  time = 0;
  lastTime = null;
  results = [];
  isRaceActive = true; 
  if (resultsDisplay) resultsDisplay.innerHTML = "";

  // 2. 플레이어 및 상대 선수 객체 생성
  const mainRunner = {
    name: "플레이어(나)",
    element: document.querySelector(".player.main"),
    stats: mainPlayer, // player.js의 mainPlayer 참조
    distance: 0,
    finished: false
  };
  
  runners = [mainRunner];

  const opponents = document.querySelectorAll(".player.opponent");
  
  console.log("%c--- 🏃 경기 시작: 선수 정보 (50%~150%) ---", "color: #2ecc71; font-weight: bold; font-size: 14px;");
  console.log(`[나] 체력:${mainPlayer.stamina}, 속도:${mainPlayer.speed}, 가속:${mainPlayer.accel}`);

  opponents.forEach((opponent, index) => {
    const stats = randomOpponentStats(mainPlayer);
    const opponentName = `상대${index + 1}`;
    
    runners.push({
      name: opponentName,
      element: opponent,
      stats: stats,
      distance: 0,
      finished: false
    });

    console.log(`[${opponentName}] 체력:${stats.stamina}, 속도:${stats.speed}, 가속:${stats.accel}`);
  });

  /**
   * 내부 업데이트 루프
   */
  function update(deltaTime) {
    if (!isRaceActive) return; // 정지 상태면 로직 중단

    time += deltaTime;
    timerDisplay.textContent = `기록: ${time.toFixed(2)}초`;

    for (let runner of runners) {
      if (runner.finished) continue;

      const expectedTime = estimateTime(runner.stats.stamina, runner.stats.speed, runner.stats.accel);
      const avgVelocity = track.lengthPx / expectedTime;
      runner.distance += avgVelocity * deltaTime;
      
      // 위치 업데이트
      runner.element.style.left = `calc(5% + ${runner.distance}px)`;

      // 결승선 통과 체크
      if (runner.distance >= track.lengthPx) {
        runner.finished = true;
        results.push({ name: runner.name, time: time });

        // 3명 통과 시 즉시 종료
        if (results.length >= 3) {
          stopRace();
          return; 
        }
      }
    }
  }

  /**
   * 경기 정지 처리
   */
  function stopRace() {
    isRaceActive = false; 
    cancelAnimationFrame(animationId); 
    
    // 최종 기록 화면 고정
    timerDisplay.textContent = `최종 기록: ${time.toFixed(2)}초`;
    displayRanking();
  }

  /**
   * 결과 출력
   */
  function displayRanking() {
    results.sort((a, b) => a.time - b.time);
    let rankingText = "<div style='border-bottom: 2px solid #333; margin-bottom: 10px; padding-bottom: 5px;'>🏆 <b>경기 결과 (TOP 3)</b></div>";
    
    results.slice(0, 3).forEach((r, i) => {
      const color = i === 0 ? "#f1c40f" : i === 1 ? "#bdc3c7" : "#e67e22"; // 금, 은, 동 색상
      rankingText += `<div style='color: ${color}; font-weight: bold;'>${i + 1}위: ${r.name} (${r.time.toFixed(2)}초)</div>`;
    });

    if (resultsDisplay) {
      resultsDisplay.innerHTML = rankingText;
    }
    console.log("%c--- 경기 종료 ---", "color: #e74c3c; font-weight: bold;");
  }

  /**
   * 애니메이션 루프
   */
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
    p.style.left = "5%";
  });
  
  console.log("경기가 초기화되었습니다.");
}
