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

// 상대 선수 능력치 생성 (범위: 50% ~ 150%)
function randomOpponentStats(baseStats) {
  function randInRange(value) {
    // 0.5 (50%) ~ 1.5 (150%) 사이의 난수 생성
    const multiplier = 0.5 + (Math.random() * 1.0); 
    return Math.floor(value * multiplier);
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
  time = 0;
  lastTime = null;
  results = [];
  if (resultsDisplay) resultsDisplay.innerHTML = "";

  const mainRunner = {
    name: "플레이어(나)",
    element: document.querySelector(".player.main"),
    stats: mainPlayer,
    distance: 0,
    finished: false
  };
  
  runners = [mainRunner];

  // 상대 선수 생성 및 콘솔 상세 출력
  const opponents = document.querySelectorAll(".player.opponent");
  
  console.log("%c--- 🏃 경기 시작: 선수 능력치 정보 (50%~150% 적용) ---", "color: blue; font-weight: bold;");
  console.log(`[내 캐릭터] 체력:${mainPlayer.stamina}, 속도:${mainPlayer.speed}, 가속:${mainPlayer.accel}`);

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

    // 콘솔창에 상대방 능력치와 원본 대비 비율 표시
    const ratio = (( (stats.stamina + stats.speed + stats.accel) / (mainPlayer.stamina + mainPlayer.speed + mainPlayer.accel) ) * 100).toFixed(0);
    console.log(`[${opponentName}] 체력:${stats.stamina}, 속도:${stats.speed}, 가속:${stats.accel} (내 능력치의 약 ${ratio}%)`);
  });
  console.log("-----------------------------------------------------------");

  function update(deltaTime) {
    time += deltaTime;
    timerDisplay.textContent = `기록: ${time.toFixed(2)}초`;

    for (let runner of runners) {
      if (runner.finished) continue;

      const expectedTime = estimateTime(runner.stats.stamina, runner.stats.speed, runner.stats.accel);
      const avgVelocity = track.lengthPx / expectedTime;
      runner.distance += avgVelocity * deltaTime;
      
      runner.element.style.left = `calc(5% + ${runner.distance}px)`;

      if (runner.distance >= track.lengthPx) {
        runner.finished = true;
        results.push({ name: runner.name, time: time });

        // 상위 3명이 들어오면 즉시 중단
        if (results.length >= 3) {
          timerDisplay.textContent = `최종 기록: ${time.toFixed(2)}초`;
          cancelAnimationFrame(animationId);
          displayRanking();
          return; 
        }
      }
    }
  }

  function displayRanking() {
    results.sort((a, b) => a.time - b.time);
    let rankingText = "🏆 <b>TOP 3 결과</b><br>";
    results.slice(0, 3).forEach((r, i) => {
      rankingText += `${i + 1}위: ${r.name} (${r.time.toFixed(2)}초)<br>`;
    });

    if (resultsDisplay) {
      resultsDisplay.innerHTML = rankingText;
    }
    console.log("%c경기 종료: 상위 3명 통과 완료", "color: green; font-weight: bold;");
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
  lastTime = null;
  time = 0;
  results = [];
  if (timerDisplay) timerDisplay.textContent = "기록: 0.00초";
  if (resultsDisplay) resultsDisplay.innerHTML = "";
  document.querySelectorAll(".player").forEach(p => p.style.left = "5%");
  console.log("경기가 리셋되었습니다.");
}
