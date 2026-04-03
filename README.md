# LEEMACHO.github.io

<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>단순 경주 게임</title>
  <style>
    body { font-family: sans-serif; }
    .track {
      position: relative;
      width: 800px;
      height: 20px;
      border: 1px solid #333;
      margin: 10px 0;
    }
    .runner {
      position: absolute;
      width: 20px;
      height: 20px;
      background: red;
      top: 0;
      left: 0;
    }
  </style>
</head>
<body>
  <h1>8라인 달리기 경주</h1>
  <button onclick="startRace()">경기 시작!</button>
  <div id="race">
    <!-- 8개의 트랙 생성 -->
  </div>
  <p id="result"></p>

  <script>
    const raceDiv = document.getElementById("race");
    const runners = [];
    const trackLength = 780; // 결승선 위치

    // 트랙과 러너 생성
    for (let i = 0; i < 8; i++) {
      const track = document.createElement("div");
      track.className = "track";
      track.style.top = (i * 30) + "px";

      const runner = document.createElement("div");
      runner.className = "runner";
      runner.style.background = `hsl(${i * 45}, 70%, 50%)`; // 색상 구분

      track.appendChild(runner);
      raceDiv.appendChild(track);

      runners.push({ element: runner, pos: 0, speed: Math.random() * 3 + 1 });
    }

    let raceInterval;

    function startRace() {
      document.getElementById("result").textContent = "";
      runners.forEach(r => { r.pos = 0; r.element.style.left = "0px"; });
      clearInterval(raceInterval);
      raceInterval = setInterval(updateRace, 50);
    }

    function updateRace() {
      runners.forEach(r => {
        // 속도 랜덤 변경 (약간의 변동)
        if (Math.random() < 0.1) {
          r.speed = Math.random() * 3 + 1;
        }
        r.pos += r.speed;
        r.element.style.left = r.pos + "px";

        if (r.pos >= trackLength) {
          clearInterval(raceInterval);
          document.getElementById("result").textContent =
            "우승자: " + (runners.indexOf(r) + 1) + "번 러너!";
        }
      });
    }
  </script>
</body>
</html>
