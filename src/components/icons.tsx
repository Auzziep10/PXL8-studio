import type { SVGProps } from 'react';

export function PXL8Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 110 40"
      {...props}
    >
      <title>PXL8 Logo</title>
      <rect width="110" height="40" rx="8" fill="hsl(var(--primary))" />
      <g fill="black">
        {/* Diamond Shape */}
        <path d="M15 20 L25 10 L35 20 L25 30 Z" />
        {/* Pixelation effect under diamond */}
        <path d="M23 20 v2 h-2 v2 h-2 v-2 h2 v-2 z" />
        <path d="M25 22 v2 h2 v-2 z" />
        <path d="M27 20 v2 h2 v2 h2 v-2 h-2 v-2 z" />
        <path d="M21 24 v2 h2 v-2 z" />
        <path d="M29 24 v2 h2 v-2 z" />

        {/* Slash */}
        <path d="M48 12 L42 28" stroke="black" strokeWidth="3" />

        {/* Circle */}
        <circle cx="65" cy="20" r="10" stroke="black" strokeWidth="3" fill="none" />
      </g>
    </svg>
  );
}
