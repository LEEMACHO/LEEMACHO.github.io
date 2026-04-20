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
let distance;
let time;
let velocity;
let runner = document.querySelector(".player.main");
let timerDisplay = document.getElementById("timer");

function startRace() {
  distance = 0;
  time = 0;
  velocity = 0;
  lastTime = null;
  runner.style.left = "5%";

  const opponents = document.querySelectorAll(".player.opponent");
  opponents.forEach((opponent, index) => {
    const stats = randomOpponentStats(mainPlayer);
    const expectedTime = estimateTime(stats.stamina, stats.speed, stats.accel);
    console.log(`상대 ${index + 1} 능력치:`, stats, "예상 기록:", expectedTime.toFixed(2), "초");
  });

  function update(deltaTime) {
    time += deltaTime;
    timerDisplay.textContent = `기록: ${time.toFixed(2)}초`;

    const expectedTime = estimateTime(mainPlayer.stamina, mainPlayer.speed, mainPlayer.accel);
    const avgVelocity = track.lengthPx / expectedTime;
    velocity = avgVelocity;
    distance += velocity * deltaTime;
    runner.style.left = `${5 + distance}px`;

    if (distance >= track.lengthPx) {
      timerDisplay.textContent = `최종 기록: ${time.toFixed(2)}초`;
      cancelAnimationFrame(animationId);
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
  runner.style.left = "5%";
  timerDisplay.textContent = "기록: 0.00초";
  console.log("경기 리셋 완료");
}
