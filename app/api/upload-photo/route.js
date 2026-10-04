import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
const BUCKET_NAME = 'resident-photos';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No photo file provided.' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type?.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid file format. Please upload an image (JPG, PNG, WEBP, or GIF).' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Image size exceeds 5MB limit. Please upload a smaller photo.' },
        { status: 400 }
      );
    }

    // Ensure bucket exists
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);
      if (!bucketExists) {
        await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: MAX_FILE_SIZE,
          allowedMimeTypes: ALLOWED_MIME_TYPES,
        });
      }
    } catch (bErr) {
      console.warn('Bucket verification warning:', bErr);
    }

    const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
    const cleanExt = (fileExt || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const fileName = `admission_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${cleanExt}`;
    const filePath = `applicants/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return NextResponse.json(
        { error: `Photo upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      photo_url: urlData.publicUrl,
      file_path: filePath,
    });
  } catch (err) {
    console.error('Unhandled photo upload exception:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error during photo upload.' },
      { status: 500 }
    );
  }
}
