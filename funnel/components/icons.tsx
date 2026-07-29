// Icone inline (SVG) per evitare dipendenze extra. Ereditano currentColor.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export function IconHome(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

export function IconEuro(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M18 7a6 6 0 1 0 0 10" />
      <path d="M4 10h9" />
      <path d="M4 14h9" />
    </svg>
  );
}

export function IconHandshake(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m11 17 2 2a1 1 0 0 0 1.4 0l3.6-3.6" />
      <path d="M2 12 6 8l4 1 2-2 4 2 6 3" />
      <path d="m7 15 2 2" />
      <path d="M20 12v6" />
      <path d="M4 12v6" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconArrowDown(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L18 18l5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 2 6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}
