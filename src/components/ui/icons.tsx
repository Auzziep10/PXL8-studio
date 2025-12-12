
import type { SVGProps } from 'react';
import NextImage from 'next/image';

export function PXL8Logo(props: SVGProps<SVGSVGElement>) {
  // The className is passed down from where the component is used,
  // which might control the size (e.g., h-8 w-auto).
  // A default is provided for safety.
  const width = props.width || 110;
  const height = props.height || 40;

  return (
    <NextImage
      src="https://firebasestorage.googleapis.com/v0/b/pxl8-final.appspot.com/o/website-images%2FAsset%207%40300x.png?alt=media"
      alt="PXL8 Logo"
      width={Number(width)}
      height={Number(height)}
      className={props.className}
      priority // Ensures the logo loads quickly as it's likely LCP
    />
  );
}
