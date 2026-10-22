// The race camera's maths: a close chase camera that follows where the robot is going more than
// where it points, so a slide shows the robot's side; it pulls back and widens as speed builds, and
// shakes a little under a boost. Pure functions, so the node tests can check them.
import { clamp, wrapAngle } from './rng.js';

const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/**
 * The direction the camera wants to face: the robot's heading, turned part of the way toward its
 * direction of travel. At a crawl it is just the heading; in a slide it leans into the slide.
 * c: a car state (psi, vx, vy). Body frame: forward is (sin psi, cos psi), +vy is toward +x of the car.
 */
export function chaseYawTarget(c) {
  const speed = Math.hypot(c.vx, c.vy);
  if (speed < 0.5) return c.psi;
  const sx = Math.sin(c.psi), cz = Math.cos(c.psi);
  const wx = c.vx * sx + c.vy * cz; // the velocity in world x and z
  const wz = c.vx * cz - c.vy * sx;
  const beta = Math.atan2(wx, wz);
  return c.psi + wrapAngle(beta - c.psi) * 0.7 * smooth(2, 6, speed);
}

/** Move an angle toward a target, the short way round, with a time constant of 1 / rate seconds. */
export function followAngle(cur, target, dt, rate) {
  return wrapAngle(cur + wrapAngle(target - cur) * (1 - Math.exp(-rate * dt)));
}

/** Where the camera sits and what it shows. speed: 0..1.3 of top speed, boost: 0..1. */
export function chaseParams(speed, boost) {
  const s = clamp(speed, 0, 1.3), b = clamp(boost, 0, 1);
  return {
    dist: 14 + 2.2 * s + 2.6 * b, // behind the robot
    height: 6.6 + 0.9 * s, // above the road (the robots are about 6 units tall, so the camera has to clear the roof)
    ahead: 11 + 4 * s, // how far in front of the robot the camera looks: the further, the lower the robot sits in the frame
    lookY: 1.8,
    fov: 58 + 14 * Math.pow(Math.min(s, 1), 1.2) + 8 * b, // degrees
    yawRate: 4.5, // how quickly the camera swings round (1/s)
    shake: 0.025 * s * s + 0.07 * b, // world units of wobble
  };
}
