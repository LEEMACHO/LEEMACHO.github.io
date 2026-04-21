class Track {
  constructor(lengthPx, lengthM) {
    this.lengthPx = lengthPx; // 실제 달려야 할 거리 (1000px)
    this.lengthM = lengthM;   // 현실 미터법 기준 (100m)
  }
}

// 주행 거리를 1000px로 설정
const track = new Track(1000, 100);
