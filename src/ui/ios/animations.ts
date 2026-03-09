/**
 * iOS-style animation tokens for the doctor portal redesign.
 *
 * Usage:
 *   import { ios } from "@/ui/ios/animations";
 *   style={{ transition: ios.transition.spring, animationDelay: ios.stagger(2) }}
 */

// ── Spring curves ──────────────────────────────────────────────────────────────
/** iOS-like spring curve — overshoots slightly, then settles */
export const SPRING = "cubic-bezier(0.2, 0.8, 0.2, 1)";
/** iOS decelerate — fast start, eased end */
export const EASE_OUT = "cubic-bezier(0, 0, 0.2, 1)";
/** iOS standard ease — subtle and smooth */
export const EASE = "cubic-bezier(0.25, 0.1, 0.25, 1)";

// ── Durations ──────────────────────────────────────────────────────────────────
export const duration = {
  fast: "200ms",
  normal: "350ms",
  slow: "500ms",
  /** Extra slow for dramatic entrances */
  dramatic: "700ms",
} as const;

// ── Stagger helper ─────────────────────────────────────────────────────────────
/** Returns a stagger delay string for list animations. */
export function stagger(index: number, base = 50): string {
  return `${index * base}ms`;
}

// ── Pre-built transitions ──────────────────────────────────────────────────────
export const transition = {
  /** Default spring for most UI elements */
  spring: `all ${duration.normal} ${SPRING}`,
  /** Fast spring for micro-interactions (press, hover) */
  fast: `all ${duration.fast} ${SPRING}`,
  /** Slow spring for page transitions */
  slow: `all ${duration.slow} ${SPRING}`,
  /** Background / color only */
  color: `background ${duration.normal} ${SPRING}, border-color ${duration.normal} ${SPRING}, color ${duration.normal} ${SPRING}`,
  /** Transform + opacity for entrance animations */
  entrance: `opacity ${duration.normal} ${EASE_OUT}, transform ${duration.normal} ${SPRING}`,
} as const;

// ── Keyframe CSS strings (inject via <style>) ─────────────────────────────────
export const keyframes = {
  fadeSlideUp: `
    @keyframes ios-fade-slide-up {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }`,
  scaleIn: `
    @keyframes ios-scale-in {
      from { opacity: 0; transform: scale(0.92); }
      to   { opacity: 1; transform: scale(1); }
    }`,
  fadeIn: `
    @keyframes ios-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }`,
  float: `
    @keyframes ios-float {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-6px); }
    }`,
  pulse: `
    @keyframes ios-pulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.6; }
    }`,
} as const;

// ── Animation shorthand strings ────────────────────────────────────────────────
export const animation = {
  fadeSlideUp: (delay = "0ms") =>
    `ios-fade-slide-up ${duration.normal} ${SPRING} ${delay} both`,
  scaleIn: (delay = "0ms") =>
    `ios-scale-in ${duration.normal} ${SPRING} ${delay} both`,
  fadeIn: (delay = "0ms") =>
    `ios-fade-in ${duration.fast} ${EASE_OUT} ${delay} both`,
  float: `ios-float 3s ${EASE} infinite`,
  pulse: `ios-pulse 2s ${EASE} infinite`,
} as const;

/** All keyframes as a single injectable CSS string */
export const allKeyframes = Object.values(keyframes).join("\n");

// ── Convenience namespace ──────────────────────────────────────────────────────
export const ios = {
  SPRING,
  EASE_OUT,
  EASE,
  duration,
  stagger,
  transition,
  keyframes,
  animation,
  allKeyframes,
} as const;
