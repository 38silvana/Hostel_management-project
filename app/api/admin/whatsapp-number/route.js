import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/whatsapp-number
 * Returns the currently configured Admin WhatsApp number.
 */
export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const adminUser = auth.user;
    let whatsappNumber = adminUser.user_metadata?.whatsapp_number || '';

    // If not on current admin user, fallback to any admin user who configured it
    if (!whatsappNumber && supabaseAdmin) {
      try {
        const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
        const adminWithPhone = (allUsers?.users || []).find(
          (u) =>
            String(u.user_metadata?.role || '').toLowerCase() === 'admin' &&
            u.user_metadata?.whatsapp_number
        );
        if (adminWithPhone) {
          whatsappNumber = adminWithPhone.user_metadata.whatsapp_number;
        }
      } catch (listErr) {
        console.warn('Could not list users for WhatsApp number fallback:', listErr);
      }
    }

    return NextResponse.json({
      whatsapp_number: whatsappNumber,
    });
  } catch (err) {
    console.error('Error fetching admin WhatsApp number:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/whatsapp-number
 * Validates and updates the Admin WhatsApp recipient number.
 */
export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin configuration is missing.' },
        { status: 500 }
      );
    }

    const adminUser = auth.user;
    const body = await request.json();
    const { whatsapp_number } = body || {};

    const digits = String(whatsapp_number || '').replace(/\D/g, '');
    const cleanMobile = digits.length >= 10 ? digits.slice(-10) : digits;

    if (!cleanMobile || cleanMobile.length !== 10) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit mobile number for WhatsApp notifications.' },
        { status: 400 }
      );
    }

    // Persist to user_metadata of the authenticated admin user
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(adminUser.id, {
      user_metadata: {
        ...adminUser.user_metadata,
        whatsapp_number: cleanMobile,
      },
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      whatsapp_number: cleanMobile,
      message: 'Admin WhatsApp number saved successfully.',
    });
  } catch (err) {
    console.error('Error updating admin WhatsApp number:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
