// gamemanager.js
// 트랙 사양: 외부 직선 500m, 반지름 250m / 내부 직선 400m, 반지름 200m
// 러너 스타일은 style.css에서 관리

(function () {
  const DEFAULT_RUNNERS = 4;
  const VIEW_W = 1000, VIEW_H = 500;
  const CENTER = { x: VIEW_W / 2, y: VIEW_H / 2 };

  const OUTER = { straight: 500, radius: 250 };
  const INNER = { straight: 400, radius: 200 };
  const CENTERLINE = {
    straight: (OUTER.straight + INNER.straight) / 2,
    radius: (OUTER.radius + INNER.radius) / 2
  };

  const halfOuterStraight = OUTER.straight / 2;
  const halfInnerStraight = INNER.straight / 2;
  const halfCenterStraight = CENTERLINE.straight / 2;

  function arcLen(r) { return Math.PI * r; }
  const centerArcLen = arcLen(CENTERLINE.radius);
  const centerTotal = 2 * CENTERLINE.straight + 2 * Math.PI * CENTERLINE.radius;

  let svgEl, overlayEl, bandEl, outerStrokeEl, innerStrokeEl, centerlineEl;

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function sampleCenterlineAt(dist) {
    dist = ((dist % centerTotal) + centerTotal) % centerTotal;
    const Ls = CENTERLINE.straight, halfS = Ls / 2, R = CENTERLINE.radius, arcL = centerArcLen;
    const leftX = CENTER.x - halfS, rightX = CENTER.x + halfS;
    const topY = CENTER.y - R, bottomY = CENTER.y + R;

    if (dist < Ls) {
      const t = dist / Ls;
      return { x: leftX + t * (rightX - leftX), y: topY };
    }
    dist -= Ls;
    if (dist < arcL) {
      const a = -Math.PI/2 + (dist/arcL)*Math.PI;
      return { x: rightX + R*Math.cos(a), y: CENTER.y + R*Math.sin(a) };
    }
    dist -= arcL;
    if (dist < Ls) {
      const t = dist / Ls;
      return { x: rightX - t*(rightX-leftX), y: bottomY };
    }
    dist -= Ls;
    const a = Math.PI/2 + (dist/arcL)*Math.PI;
    return { x: leftX + R*Math.cos(a), y: CENTER.y + R*Math.sin(a) };
  }

  function computeNormalAt(dist) {
    const p = sampleCenterlineAt(dist);
    const q = sampleCenterlineAt(dist+0.5);
    const tx = q.x - p.x, ty = q.y - p.y;
    const nx = -ty, ny = tx;
    const len = Math.hypot(nx, ny) || 1;
    return { nx: nx/len, ny: ny/len };
  }

  function buildBandPath() {
    const leftOuterX = CENTER.x - halfOuterStraight, rightOuterX = CENTER.x + halfOuterStraight;
    const topOuterY = CENTER.y - OUTER.radius, bottomOuterY = CENTER.y + OUTER.radius;
    const leftInnerX = CENTER.x - halfInnerStraight, rightInnerX = CENTER.x + halfInnerStraight;
    const topInnerY = CENTER.y - INNER.radius, bottomInnerY = CENTER.y + INNER.radius;

    const dOuter = `M ${leftOuterX} ${topOuterY} L ${rightOuterX} ${topOuterY}
      A ${OUTER.radius} ${OUTER.radius} 0 0 1 ${rightOuterX} ${bottomOuterY}
      L ${leftOuterX} ${bottomOuterY}
      A ${OUTER.radius} ${OUTER.radius} 0 0 1 ${leftOuterX} ${topOuterY} Z`;

    const dInner = `M ${rightInnerX} ${topInnerY} L ${leftInnerX} ${topInnerY}
      A ${INNER.radius} ${INNER.radius} 0 0 0 ${leftInnerX} ${bottomInnerY}
      L ${rightInnerX} ${bottomInnerY}
      A ${INNER.radius} ${INNER.radius} 0 0 0 ${rightInnerX} ${topInnerY} Z`;

    return dOuter + ' ' + dInner;
  }

  function buildOutlinePaths() {
    const leftOuterX = CENTER.x - halfOuterStraight, rightOuterX = CENTER.x + halfOuterStraight;
    const topOuterY = CENTER.y - OUTER.radius, bottomOuterY = CENTER.y + OUTER.radius;
    const outer = `M ${leftOuterX} ${topOuterY} L ${rightOuterX} ${topOuterY}
      A ${OUTER.radius} ${OUTER.radius} 0 0 1 ${rightOuterX} ${bottomOuterY}
      L ${leftOuterX} ${bottomOuterY}
      A
