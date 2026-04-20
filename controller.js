const startButton = document.getElementById("start-btn");
const resetButton = document.getElementById("reset-btn");
const countdownDisplay = document.getElementById("countdown");

let countdownInterval;

startButton.addEventListener("click", () => {
  let count = 3;
  countdownDisplay.textContent = count;
  countdownInterval = setInterval(() => {
    count--;
    if (
