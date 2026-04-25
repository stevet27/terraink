export type ClipShape = "none" | "circle" | "heart";

export function applyCanvasClip(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  shape: ClipShape,
): void {
  if (shape === "none") return;
  ctx.beginPath();
  if (shape === "circle") buildCirclePath(ctx, width, height);
  else if (shape === "heart") buildHeartPath(ctx, width, height);
  ctx.clip();
}

function buildCirclePath(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.arc(width / 2, height * 0.46, Math.min(width, height) * 0.48, 0, Math.PI * 2);
}

// Classic Valentine heart built from two circular arcs (lobes) + cubic curves (lower sides).
//
// Normalised 0-100 coordinate space:
//   Left  circle: centre (28, 30), radius 22 → spans x=6-50, lobe top y=8
//   Right circle: centre (72, 30), radius 22 → spans x=50-94, lobe top y=8
//   V-notch at (50, 30), bottom tip at (50, 90)
//   Path extents: x 6-94 (span 88), y 8-90 (span 82)
//
// k = 0.5523 × 22 = 12.15  (cubic bezier constant for quarter-circle approximation)
function buildHeartPath(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const sw = (width  * 0.96) / 88; // fill 96 % of width  across x-span 6-94
  const sh = (height * 0.92) / 82; // fill 92 % of height across y-span 8-90
  const ox = width  / 2 - 50 * sw;
  const oy = height * 0.49 - 49 * sh; // centre midpoint (y=49 in norm space) at 49 % of canvas

  const k = 12.15; // kappa × radius
  const cx = (n: number) => n * sw + ox;
  const cy = (n: number) => n * sh + oy;

  ctx.moveTo(cx(50), cy(30)); // V-notch (top centre indent)

  // Left lobe — two quarter-circle beziers (CCW: east → north → west of left circle)
  ctx.bezierCurveTo(cx(50),    cy(30 - k), cx(28 + k), cy(8),      cx(28), cy(8));
  ctx.bezierCurveTo(cx(28 - k),cy(8),      cx(6),      cy(30 - k), cx(6),  cy(30));

  // Left lower curve to bottom tip
  ctx.bezierCurveTo(cx(6), cy(56), cx(34), cy(84), cx(50), cy(90));

  // Right lower curve from bottom tip
  ctx.bezierCurveTo(cx(66), cy(84), cx(94), cy(56), cx(94), cy(30));

  // Right lobe — two quarter-circle beziers (CCW: east → north → west of right circle)
  ctx.bezierCurveTo(cx(94),    cy(30 - k), cx(72 + k), cy(8),      cx(72), cy(8));
  ctx.bezierCurveTo(cx(72 - k),cy(8),      cx(50),     cy(30 - k), cx(50), cy(30));

  ctx.closePath();
}

export function buildSvgClipElement(
  width: number,
  height: number,
  shape: ClipShape,
): string {
  if (shape === "circle") {
    const r  = (Math.min(width, height) * 0.48).toFixed(2);
    const cx = (width / 2).toFixed(2);
    const cy = (height * 0.46).toFixed(2);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" />`;
  }
  if (shape === "heart") {
    const sw = (width  * 0.96) / 88;
    const sh = (height * 0.92) / 82;
    const ox = width  / 2 - 50 * sw;
    const oy = height * 0.49 - 49 * sh;
    const k  = 12.15;
    const x  = (n: number) => (n * sw + ox).toFixed(2);
    const y  = (n: number) => (n * sh + oy).toFixed(2);
    const d  = [
      `M ${x(50)} ${y(30)}`,
      `C ${x(50)} ${y(30-k)},${x(28+k)} ${y(8)},${x(28)} ${y(8)}`,
      `C ${x(28-k)} ${y(8)},${x(6)} ${y(30-k)},${x(6)} ${y(30)}`,
      `C ${x(6)} ${y(56)},${x(34)} ${y(84)},${x(50)} ${y(90)}`,
      `C ${x(66)} ${y(84)},${x(94)} ${y(56)},${x(94)} ${y(30)}`,
      `C ${x(94)} ${y(30-k)},${x(72+k)} ${y(8)},${x(72)} ${y(8)}`,
      `C ${x(72-k)} ${y(8)},${x(50)} ${y(30-k)},${x(50)} ${y(30)} Z`,
    ].join(" ");
    return `<path d="${d}" />`;
  }
  return "";
}

// SVG path in objectBoundingBox (0–1) coordinates for the CSS clip-path preview.
// Same construction as canvas (circular lobe approximation), converted to 0-1 space.
// The lobes will be slightly oval on non-square posters due to objectBoundingBox
// axis scaling, but the Valentine heart form is clearly preserved.
// aspect = widthCm / heightCm (unused — kept for API compatibility).
export function heartBBoxPath(_aspect: number): string {
  // Divide the normalised 0-100 path by 100.  k = 12.15 / 100 = 0.1215.
  const k = 0.1215;
  const f = (n: number) => n.toFixed(4);
  const pt = (px: number, py: number) => `${f(px)},${f(py)}`;

  return [
    `M ${pt(0.50, 0.30)}`,
    `C ${pt(0.50, 0.30-k)} ${pt(0.28+k, 0.08)} ${pt(0.28, 0.08)}`,
    `C ${pt(0.28-k, 0.08)} ${pt(0.06, 0.30-k)} ${pt(0.06, 0.30)}`,
    `C ${pt(0.06, 0.56)} ${pt(0.34, 0.84)} ${pt(0.50, 0.90)}`,
    `C ${pt(0.66, 0.84)} ${pt(0.94, 0.56)} ${pt(0.94, 0.30)}`,
    `C ${pt(0.94, 0.30-k)} ${pt(0.72+k, 0.08)} ${pt(0.72, 0.08)}`,
    `C ${pt(0.72-k, 0.08)} ${pt(0.50, 0.30-k)} ${pt(0.50, 0.30)}`,
    `Z`,
  ].join(" ");
}
