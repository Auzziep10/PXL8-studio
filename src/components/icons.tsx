
import type { SVGProps } from 'react';
import Image from 'next/image';

export function PXL8Logo(props: SVGProps<SVGSVGElement>) {
  // The className is passed down from where the component is used,
  // which might control the size (e.g., h-8 w-auto).
  // A default is provided for safety.
  const width = props.width || 110;
  const height = props.height || 40;

  return (
    <Image
      src="https://firebasestorage.googleapis.com/v0/b/studio-2557083098-2faf8.firebasestorage.app/o/PXL8%20logo%202%40300x.png?alt=media&token=606f53d5-7892-455f-b620-25dfaec5e752"
      alt="PXL8 Logo"
      width={Number(width)}
      height={Number(height)}
      className={props.className}
      priority // Ensures the logo loads quickly as it's likely LCP
    />
  );
}
