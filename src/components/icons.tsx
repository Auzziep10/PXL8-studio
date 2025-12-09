import Image from 'next/image';
import type { SVGProps } from 'react';

export function PXL8Logo(props: Omit<React.ComponentProps<typeof Image>, 'src' | 'alt'>) {
  return (
    <Image
      src="/logo.png"
      alt="PXL8 Logo"
      width={110}
      height={40}
      priority
      {...props}
    />
  );
}
