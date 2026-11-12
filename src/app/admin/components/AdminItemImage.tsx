'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getOriginalImageUrlAction } from '@/app/admin/actions';

const originalRequests = new Map<string, Promise<string | null>>();

function requestOriginal(imageUrl: string) {
  const pending = originalRequests.get(imageUrl);
  if (pending) return pending;

  const request = getOriginalImageUrlAction(imageUrl)
    .then((result) => result.url)
    .catch(() => null);
  originalRequests.set(imageUrl, request);
  return request;
}

interface AdminItemImageProps {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
}

/**
 * Shows the unblurred original when staff can read it, and the blurred public
 * photo otherwise. Signed URLs expire, so the original skips Next's optimizer.
 */
export function AdminItemImage({ src, alt, sizes, className }: AdminItemImageProps) {
  const [resolved, setResolved] = useState<{ src: string; url: string | null } | null>(null);

  useEffect(() => {
    let active = true;

    requestOriginal(src).then((url) => {
      if (active) setResolved({ src, url });
    });

    return () => {
      active = false;
    };
  }, [src]);

  const originalUrl = resolved?.src === src ? resolved.url : null;

  return (
    <Image
      src={originalUrl ?? src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      unoptimized={Boolean(originalUrl)}
    />
  );
}
