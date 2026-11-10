'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

const MOBILE_QUERY = '(max-width: 767px)';

export function ResponsiveToaster() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return (
    <Toaster
      position={isMobile ? 'bottom-center' : 'top-right'}
      mobileOffset={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          closeButton: '!left-auto !right-2 !top-1/2 !-translate-y-1/2 !translate-x-0',
        },
      }}
    />
  );
}
