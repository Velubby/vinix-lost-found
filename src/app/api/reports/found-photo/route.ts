import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: 'SERVER_MISCONFIGURED' }, { status: 500 });
    }

    const form = await request.formData();
    const file = form.get('file');
    const photoIdRaw = form.get('photoId');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'MISSING_FILE' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'INVALID_TYPE' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'FILE_TOO_LARGE' }, { status: 400 });
    }
    const photoId = typeof photoIdRaw === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(photoIdRaw)
      ? photoIdRaw
      : crypto.randomUUID();

    const input = Buffer.from(await file.arrayBuffer());
    const base = sharp(input, { failOn: 'none' }).rotate();
    const meta = await base.metadata();
    const width = meta.width ?? 1600;
    const height = meta.height ?? 1600;

    const blurred = await sharp(input, { failOn: 'none' })
      .rotate()
      .resize({ width: Math.min(1600, width), height: Math.min(1600, height), fit: 'inside', withoutEnlargement: true })
      .blur(18)
      .webp({ quality: 82 })
      .toBuffer();

    const original = await sharp(input, { failOn: 'none' })
      .rotate()
      .resize({ width: Math.min(1600, width), height: Math.min(1600, height), fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const service = createServiceClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const blurredPath = `${user.id}/${photoId}.webp`;
    const originalPath = `${user.id}/original/${photoId}.webp`;

    const { error: blurredError } = await service.storage
      .from('item-images')
      .upload(blurredPath, blurred, { contentType: 'image/webp', upsert: false });
    if (blurredError) {
      console.error('Upload blurred photo error:', blurredError);
      return NextResponse.json({ error: 'UPLOAD_FAILED' }, { status: 500 });
    }

    const { error: originalError } = await service.storage
      .from('item-originals')
      .upload(originalPath, original, { contentType: 'image/webp', upsert: false });
    if (originalError) {
      console.error('Upload original photo error:', originalError);
      // Keep blurred upload; admin can fall back to blurred.
    }

    const publicUrl = service.storage.from('item-images').getPublicUrl(blurredPath).data.publicUrl;
    return NextResponse.json({ url: publicUrl, photoId });
  } catch (error) {
    console.error('found-photo upload error:', error);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
