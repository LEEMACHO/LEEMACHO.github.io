// 트랙 길이: 720px = 100m
const trackLength = 720;

// 초기 플레이어 능력치 (표시 수치)
let playerStats = {
  stamina: 70,
  speed: 60,
  accel: 60
};

// 목표 기록 매핑 테이블
const recordTable = {
  70: 11.0,
  80: 10.5,
  90: 9.5,
  100: 8.5
};

// 예상 기록 계산 함수
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

// 랜덤 능력치 생성 (현재 플레이어 능력치의 80~120%)
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

// 상대 선수들 초기화
const opponents = document.querySelectorAll(".player.opponent");
const opponentStatsList = [];

opponents.forEach((opponent, index) => {
  const stats = randomOpponentStats(playerStats);
  opponentStatsList.push(stats);

  // 각 상대 선수의 예상 기록 계산
  const expectedTime = estimateTime(stats.stamina, stats.speed, stats.accel);
  console.log(`상대 ${index + 1} 능력치:`, stats, "예상 기록:", expectedTime.toFixed(2), "초");
});

// 메인 플레이어 DOM 요소
const runner = document.querySelector(".player.main");

let distance = 0;
let time = 0;
let velocity = 0;

function update(deltaTime) {
  time += deltaTime;

  // 메인 플레이어 예상 기록
  const expectedTime = estimateTime(playerStats.stamina, playerStats.speed, playerStats.accel);

  // 평균 속도 계산
  const avgVelocity = trackLength / expectedTime;

  // 일정한 속도로 이동
  velocity = avgVelocity;
  distance += velocity * deltaTime;

  runner.style.left = `${5 + distance}px`;

  if (distance >= trackLength) {
    console.log(`플레이어 완주 시간: ${time.toFixed(2)}초 (예상: ${expectedTime.toFixed(2)}초)`);
    cancelAnimationFrame(animationId);
  }
}

let lastTime = null;
let animationId;

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(deltaTime);
  animationId = requestAnimationFrame(loop);
}

// 시작
animationId = requestAnimationFrame(loop);
