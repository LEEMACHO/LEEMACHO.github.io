const startButton = document.getElementById("start-btn");
const resetButton = document.getElementById("reset-btn");

startButton.addEventListener("click", () => {
  console.log("경기 시작!");
  startRace();
});

resetButton.addEventListener("click", () => {
  console.log("