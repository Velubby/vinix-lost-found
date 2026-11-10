import { NextResponse } from 'next/server';
import { getClaimStatsAction } from '@/app/admin/actions';

export async function GET() {
  const result = await getClaimStatsAction();
  
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.code === 'UNAUTHENTICATED' || result.code === 'FORBIDDEN' ? 403 : 500 });
  }

  return NextResponse.json(result.data);
}