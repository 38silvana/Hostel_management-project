import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
const BUCKET_NAME = 'resident-photos';

/**
 * Extracts the trusted client IP.
 * On Vercel deployments, 'x-vercel-forwarded-for' is injected by the edge proxy and cannot be spoofed.
 * If unavailable, falls back to 'x-real-ip' or the rightmost (trusted proxy) entry in 'x-forwarded-for',
 * rather than the client-controlled leftmost entry.
 *
 * @param {Request} request
 * @returns {string}
 */
function getTrustedClientIp(request) {
  const vercelIp = request.headers.get('x-vercel-forwarded-for');
  if (vercelIp) {
    return vercelIp.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map((ip) => ip.trim()).filter(Boolean);
    return ips[ips.length - 1] || '127.0.0.1';
  }

  return '127.0.0.1';
}

/**
 * Validates actual binary file signatures (magic bytes) to verify genuine image content.
 * Prevents disguised files, executable uploads, SVG scripts, and MIME spoofing.
 *
 * @param {Buffer} buffer
 * @returns {'jpg' | 'png' | 'gif' | 'webp' | null}
 */
function validateImageSignature(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'jpg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) {
    return 'png';
  }

  // GIF: GIF87a or GIF89a (47 49 46 38 37/39 61)
  if (
    buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61
  ) {
    return 'gif';
  }

  // WEBP: starts with 'RIFF' and bytes 8..11 are 'WEBP'
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
}

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin configuration is missing.' },
        { status: 500 }
      );
    }

    // 1. Session verification if Authorization header is provided
    // Authenticated users (including applicants whose account is pending) can upload photos.
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    let authenticatedUser = null;

    if (token) {
      const { data: authData } = await supabaseAdmin.auth.getUser(token);
      if (authData?.user) {
        authenticatedUser = authData.user;
      }
    }

    // 2. Client IP extraction using trusted Vercel header
    const clientIp = getTrustedClientIp(request);

    // 3. Form Data Extraction
    const formData = await request.formData();
    const file = formData.get('photo');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No photo file provided.' }, { status: 400 });
    }

    // 4. File Size Limit (5 MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Image size exceeds 5MB limit. Please upload a smaller photo.' },
        { status: 400 }
      );
    }

    // 5. MIME Type Check
    if (!ALLOWED_MIME_TYPES.includes(file.type?.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid file format. Please upload an image (JPG, PNG, WEBP, or GIF).' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 6. Binary File Signature Verification (Magic Bytes)
    // Strictly rejects executable payloads, HTML/SVG scripts, and invalid image buffers
    const verifiedExt = validateImageSignature(buffer);
    if (!verifiedExt) {
      return NextResponse.json(
        { error: 'Invalid image content. File signature does not match a valid image (JPEG, PNG, WEBP, or GIF).' },
        { status: 400 }
      );
    }

    // 7. Ensure Bucket Exists
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

    // 8. Safe Random Storage Filename (Cryptographically random UUID, discarding untrusted user filenames)
    const randomSuffix = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    const subfolder = authenticatedUser ? `users/${authenticatedUser.id}` : 'applicants';
    const fileName = `photo_${Date.now()}_${randomSuffix}.${verifiedExt}`;
    const filePath = `${subfolder}/${fileName}`;

    const contentTypeMap = {
      jpg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: contentTypeMap[verifiedExt] || 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
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
