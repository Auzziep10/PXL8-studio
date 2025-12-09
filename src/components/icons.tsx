import type { SVGProps } from 'react';

export function PXL8Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 110 40"
      width="110"
      height="40"
      {...props}
    >
      <defs>
        <clipPath id="clip0_101_2">
          <rect width="110" height="40" rx="8" fill="white" />
        </clipPath>
      </defs>
      <g clipPath="url(#clip0_101_2)">
        <rect width="110" height="40" fill="hsl(var(--primary))" />
        <path
          d="M17.432 12.33h-5.28v15.34h5.28v-3.7h3.7v-7.94h-3.7v-3.7zM26.412 12.33h-5.28v3.7h5.28v-3.7zM35.392 12.33h-5.28v3.7h5.28v-3.7zM17.432 20.27h-5.28v3.7h5.28v-3.7zM26.412 20.27h-5.28v7.94h5.28v-7.94zM35.392 20.27h-5.28v3.7h5.28v-3.7zM12.152 27.67h5.28v-3.7h-5.28v3.7zM26.412 31.91h-5.28v-3.7h5.28v3.7zM35.392 27.67h-5.28v-3.7h-3.7v7.94h3.7v3.7h5.28v-7.94z"
          fill="black"
        />
        <path
          d="M48.261 12.33v19.58h-3.72V12.33h3.72zM63.841 12.33l-5.75 8.27-5.76-8.27h-4.32l8.03 11.23v8.35h3.72v-8.35l8.03-11.23h-4.25z"
          fill="white"
        />
        <path
          d="M80.05 31.91c-3.6 0-6.43-2.8-6.43-6.4s2.83-6.4 6.43-6.4 6.43 2.8 6.43 6.4-2.83 6.4-6.43 6.4zm0-3.23c1.78 0 3.23-1.42 3.23-3.17s-1.45-3.17-3.23-3.17-3.23 1.42-3.23 3.17 1.45 3.17 3.23 3.17zM96.001 22.8h-3.4v-2.79h10.1v2.79h-3.4v9.11h-3.3V22.8z"
          fill="white"
        />
      </g>
    </svg>
  );
}
