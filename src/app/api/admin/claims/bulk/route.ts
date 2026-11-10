import { NextRequest, NextResponse } from 'next/server';
import { bulkUpdateClaimsAction } from '@/app/admin/actions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await bulkUpdateClaimsAction(body);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { 
        status: result.code === 'UNAUTHENTICATED' || result.code === 'FORBIDDEN' ? 403 : 
                result.code === 'VALIDATION_ERROR' ? 400 : 500 
      });
    }

    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}