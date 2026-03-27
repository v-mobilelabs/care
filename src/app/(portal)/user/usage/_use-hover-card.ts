"use client";

import { useState, type CSSProperties } from "react";

export function useHoverCard(borderColor: string) {
  const [hovered, setHovered] = useState(false);
  const hoverProps = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };
  const hoverStyle: CSSProperties = {
    transition:
      "box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease",
    boxShadow: hovered
      ? "0 6px 24px light-dark(rgba(0,0,0,0.09), rgba(0,0,0,0.40))"
      : undefined,
    transform: hovered ? "translateY(-2px)" : undefined,
    borderColor: hovered ? borderColor : undefined,
  };

  return { hoverProps, hoverStyle };
}
