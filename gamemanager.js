const recordTable = { 70: 11.0, 80: 10.5, 90: 9.5, 100: 8.5 };

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

function randomOpponentStats(baseStats) {
  function randInRange(value) {
    const min = Math.floor(value * 0.8);
    const max = Math.floor(value * 1.2);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return {
    stamina: randInRange(baseStats.stamina),
    speed: randInRange(baseStats.speed),
    accel: randInRange(baseStats.accel)
  };
}

let animationId;
let lastTime;
let time;
let runners = [];
let results = [];
const timerDisplay = document.getElementById("timer");
const resultsDisplay = document.getElementById("results");

function startRace() {
  // 1. 초기화
  time = 0;
  lastTime = null;
  results = [];
  if (resultsDisplay) resultsDisplay.innerHTML = "";

  // 2. 플레이어 및 상대 선수 객체 생성
  const mainRunner = {
    name: "플레이어",
    element: document.querySelector(".player.main"),
    stats: mainPlayer,
    distance: 0,
    finished: false
  };
  
  runners = [mainRunner];
  const opponents = document.querySelectorAll(".player.opponent");
  opponents.forEach((opponent, index) => {
    runners.push({
      name: `상대${index + 1}`,
      element: opponent,
      stats: randomOpponentStats(mainPlayer),
      distance: 0,
      finished: false
    });
  });

  // 3. 업데이트 로직
  function update(deltaTime) {
    time += deltaTime;
    timerDisplay.textContent = `기록: ${time.toFixed(2)}초`;

    runners.forEach(runner => {
      if (runner.finished) return;

      const expectedTime = estimateTime(runner.stats.stamina, runner.stats.speed, runner.stats.accel);
      const avgVelocity = track.lengthPx / expectedTime;
      runner.distance += avgVelocity * deltaTime;
      
      // CSS 위치 업데이트 (calc 사용하여 %와 px 혼합 계산)
      runner.element.style.left = `calc(5% + ${runner.distance}px)`;

      // 골인 지점 도달 시
      if (runner.distance >= track.lengthPx) {
        runner.finished = true;
        results.push({ name: runner.name, time: time });
      }
    });

    // 4. 종료 조건: 상위 3명 통과 시
    if (results.length >= 3) {
      cancelAnimationFrame(animationId);
      displayRanking();
    }
  }

  function displayRanking() {
    results.sort((a, b) => a.time - b.time);
    let rankingText = "🏆 <b>TOP 3 결과</b><br>";
    // 상위 3개만 추출
    results.slice(0, 3).forEach((r, i) => {
      rankingText += `${i + 1}위: ${r.name} (${r.time.toFixed(2)}초)<br>`;
    });

    if (resultsDisplay) {
      resultsDisplay.innerHTML = rankingText;
    }
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    update(deltaTime);
    animationId = requestAnimationFrame(loop);
  }

  animationId = requestAnimationFrame(loop);
}

function resetRace() {
  cancelAnimationFrame(animationId);
  lastTime = null; // 타임스탬프 초기화 필수
  time = 0;
  results = [];
  
  if (timerDisplay) timerDisplay.textContent = "기록: 0.00초";
  if (resultsDisplay) resultsDisplay.innerHTML = "";
  
  // 모든 주자 원위치
  const allPlayers = document.querySelectorAll(".player");
  allPlayers.forEach(p => {
    p.style.left = "5%";
  });
}
