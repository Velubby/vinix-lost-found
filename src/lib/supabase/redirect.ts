export function getAuthRedirectPath(next?: string | null): string {
  if (!next?.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return '/dashboard';
  }

  try {
    const base = new URL('https://app.invalid');
    const target = new URL(next, base);
    if (target.origin !== base.origin || target.pathname.startsWith('//')) return '/dashboard';
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return '/dashboard';
  }
}
