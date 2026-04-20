const startButton = document.getElementById("start-btn");
const resetButton = document.getElementById("reset-btn");
const countdownDisplay = document.getElementById("countdown");

let countdownInterval;
let raceStarted = false;

// 경기 시작 버튼 이벤트
startButton.addEventListener("click", () => {
  if (raceStarted) return; // 이미 경기 중이면 무시

  let count = 3;
  countdownDisplay.textContent = count;

  countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownDisplay.textContent = count;
    } else if (count === 0) {
      countdownDisplay.textContent = "출발!";
      clearInterval(countdownInterval);

      raceStarted = true;
      startRace(); // gamemanager.js의 경기 시작 호출
    }
  }, 1000);
});

// 경기 리셋 버튼 이벤트
resetButton.addEventListener("click", () => {
  resetRace(); // gamemanager.js의 리셋 호출
  countdownDisplay.textContent = "";
  raceStarted = false;
});
