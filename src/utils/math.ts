export type Point = { x: number; y: number };
export type StickData = {
  id: string;
  x: number;
  y: number;
  rotation: number;
  color: string;
  zIndex: number;
  removed: boolean;
};

export const STICK_LENGTH = 240;
export const STICK_WIDTH = 26;
export const CONTAINER_SIZE = 600;

// Math helpers for collision detection using OBB/Capsule logic
export function sqr(x: number) { return x * x; }
export function dist2(v: Point, w: Point) { return sqr(v.x - w.x) + sqr(v.y - w.y); }
export function distToSegmentSquared(p: Point, v: Point, w: Point) {
  const l2 = dist2(v, w);
  if (l2 === 0) return dist2(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}
export function distToSegment(p: Point, v: Point, w: Point) { 
    return Math.sqrt(distToSegmentSquared(p, v, w)); 
}
export function ccw(A: Point, B: Point, C: Point) {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
}
export function doLineSegmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point) {
    return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}
export function segmentsDistance(p1: Point, p2: Point, p3: Point, p4: Point) {
  if (doLineSegmentsIntersect(p1, p2, p3, p4)) return 0;
  return Math.min(
    distToSegment(p1, p3, p4),
    distToSegment(p2, p3, p4),
    distToSegment(p3, p1, p2),
    distToSegment(p4, p1, p2)
  );
}

export function getEndpoints(stick: StickData): [Point, Point] {
    const coreLength = STICK_LENGTH - STICK_WIDTH;
    const dx = (coreLength / 2) * Math.cos(stick.rotation);
    const dy = (coreLength / 2) * Math.sin(stick.rotation);
    return [
        { x: stick.x - dx, y: stick.y - dy },
        { x: stick.x + dx, y: stick.y + dy }
    ];
}

export function doSticksOverlap(s1: StickData, s2: StickData) {
    const [p1, p2] = getEndpoints(s1);
    const [p3, p4] = getEndpoints(s2);
    const distance = segmentsDistance(p1, p2, p3, p4);
    // Add a tiny epsilon 0.5 to be forgiving and avoid visual precision issues
    return distance < STICK_WIDTH - 0.5; 
}
