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

// 상대 선수 능력치 랜덤 생성 (80~120%)
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
let timerDisplay = document.getElementById("timer");
let resultsDisplay = document.getElementById("results");

function startRace() {
  time = 0;
  lastTime = null;
  results = [];
  resultsDisplay.textContent = "";

  // 플레이어 초기화
  const mainRunner = {
    name: "플레이어",
    element: document.querySelector(".player.main"),
    stats: mainPlayer,
    distance: 0,
    finished: false
  };
  runners = [mainRunner];

  // 상대 선수 초기화
  const opponents = document.querySelectorAll(".player.opponent");
  opponents.forEach((opponent, index) => {
    const stats = randomOpponentStats(mainPlayer);
    runners.push({
      name: `상대${index + 1}`,
      element: opponent,
      stats: stats,
      distance: 0,
      finished: false
    });
  });

  function update(deltaTime) {
    time += deltaTime;
    timerDisplay.textContent = `기록: ${time.toFixed(2)}초`;

    runners.forEach(runner => {
      if (runner.finished) return;

      const expectedTime = estimateTime(runner.stats.stamina, runner.stats.speed, runner.stats.accel);
      const avgVelocity = track.lengthPx / expectedTime;
      runner.distance += avgVelocity * deltaTime;
      runner.element.style.left = `${5 + runner.distance}px`;

      if (runner.distance >= track.lengthPx) {
        runner.finished = true;
        results.push({ name: runner.name, time: time });
        console.log(`${runner.name} 완주! 기록: ${time.toFixed(2)}초`);

        // 모든 주자가 도착했으면 순위 계산
        if (results.length === runners.length) {
          results.sort((a, b) => a.time - b.time);
          let rankingText = "🏆 경기 결과<br>";
          results.slice(0, 3).forEach((r, i) => {
            rankingText += `${i + 1}위: ${r.name} - ${r.time.toFixed(2)}초<br>`;
          });
          resultsDisplay.innerHTML = rankingText;
          cancelAnimationFrame(animationId);
        }
      }
    });
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
  runners.forEach(r => {
    r.element.style.left = "5%";
    r.distance = 0;
    r.finished = false;
  });
  timerDisplay.textContent = "기록: 0.00초";
  resultsDisplay.textContent = "";
  results = [];
  console.log("경기 리셋 완료");
}
