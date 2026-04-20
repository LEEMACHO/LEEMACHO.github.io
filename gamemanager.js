const recordTable = { 70: 11.0, 80: 10.5, 90: 9.5, 100: 8.5 };

// ... (estimateTime, randomOpponentStats 함수는 기존과 동일) ...

let animationId;
let lastTime;
let time;
let runners = [];
let results = [];
let isRaceActive = false; // [추가] 경기 진행 상태 플래그

const timerDisplay = document.getElementById("timer");
const resultsDisplay = document.getElementById("results");

function startRace() {
  // 1. 초기화
  time = 0;
  lastTime = null;
  results = [];
  isRaceActive = true; // 경기 활성화
  if (resultsDisplay) resultsDisplay.innerHTML = "";

  // 2. 선수 객체 생성 및 콘솔 출력
  const mainRunner = {
    name: "플레이어(나)",
    element: document.querySelector(".player.main"),
    stats: mainPlayer,
    distance: 0,
    finished: false
  };
  runners = [mainRunner];

  const opponents = document.querySelectorAll(".player.opponent");
  console.log("%c--- 경기 시작 (능력치 50%~150%) ---", "color: blue; font-weight: bold;");

  opponents.forEach((opponent, index) => {
    const stats = randomOpponentStats(mainPlayer);
    runners.push({
      name: `상대${index + 1}`,
      element: opponent,
      stats: stats,
      distance: 0,
      finished: false
    });
    console.log(`[상대${index + 1}] 체력:${stats.stamina}, 속도:${stats.speed}, 가속:${stats.accel}`);
  });

  // 3. 업데이트 로직
  function update(deltaTime) {
    // 경기가 비활성 상태면 더 이상 시간을 더하지 않음
    if (!isRaceActive) return;

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

        // 상위 3명 통과 시 즉시 종료 처리
        if (results.length >= 3) {
          stopRace(); // 별도의 중단 함수 호출
          return; 
        }
      }
    }
  }

  // 경기 중단 함수
  function stopRace() {
    isRaceActive = false; // 플래그를 false로 하여 update 차단
    cancelAnimationFrame(animationId); // 애니메이션 루프 중단
    
    // 타이머 텍스트를 최종 기록으로 고정
    const finalTime = time.toFixed(2);
    timerDisplay.textContent = `최종 기록: ${finalTime}초`;
    
    displayRanking();
  }

  function displayRanking() {
    results.sort((a, b) => a.time - b.time);
    let rankingText = "🏆 <b>TOP 3 결과</b><br>";
    results.slice(0, 3).forEach((r, i) => {
      rankingText += `${i + 1}위: ${r.name} (${r.time.toFixed(2)}초)<br>`;
    });
    if (resultsDisplay) resultsDisplay.innerHTML = rankingText;
  }

  function loop(timestamp) {
    if (!isRaceActive) return; // 경기가 끝났다면 루프를 타지 않음

    if (!lastTime) lastTime = timestamp;
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    
    update(deltaTime);
    animationId = requestAnimationFrame(loop);
  }

  animationId = requestAnimationFrame(loop);
}

function resetRace() {
  isRaceActive = false; // 리셋 시에도 플래그 해제
  cancelAnimationFrame(animationId);
  lastTime = null;
  time = 0;
  results = [];
  if (timerDisplay) timerDisplay.textContent = "기록: 0.00초";
  if (resultsDisplay) resultsDisplay.innerHTML = "";
  document.querySelectorAll(".player").forEach(p => p.style.left = "5%");
}
