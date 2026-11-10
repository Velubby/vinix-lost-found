import { NextRequest, NextResponse } from 'next/server';
import { fetchClaimsAction, updateClaimAction } from '@/app/admin/actions';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor') || undefined;
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const status = (searchParams.get('status') as 'diajukan' | 'ditinjau' | 'disetujui' | 'ditolak' | 'semua' | null) || undefined;
  const search = searchParams.get('search') || undefined;

  const result = await fetchClaimsAction(cursor, limit, status, search);
  
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.code === 'UNAUTHENTICATED' || result.code === 'FORBIDDEN' ? 403 : 500 });
  }

  return NextResponse.json(result.data);
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await updateClaimAction(body);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { 
        status: result.code === 'UNAUTHENTICATED' || result.code === 'FORBIDDEN' ? 403 : 
                result.code === 'NOT_FOUND' ? 404 :
                result.code === 'VALIDATION_ERROR' ? 400 : 500 
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}