import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeIdentifierToEmail } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: 'Supabase configuration is missing on server.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { identifier, password } = body || {};

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Mobile number/Email and password are required.' },
        { status: 400 }
      );
    }

    const email = normalizeIdentifierToEmail(identifier);

    // Client for authenticating credentials
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.session) {
      return NextResponse.json(
        { error: error?.message || 'Invalid credentials. Please verify your mobile number/email and password.' },
        { status: 401 }
      );
    }

    const authUser = data.session.user;

    // Check profiles table (supports admin role as ADMIN or admin in profiles table)
    let dbRole = null;
    let dbFullName = null;
    try {
      const client = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : supabase;
      const { data: profile } = await client
        .from('profiles')
        .select('role, full_name')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profile?.role) {
        dbRole = profile.role;
      }
      if (profile?.full_name) {
        dbFullName = profile.full_name;
      }
    } catch (e) {
      console.warn('Could not query profile in login route:', e);
    }

    const rawRole = dbRole || authUser.user_metadata?.role || 'student';
    const isAdmin = String(rawRole).trim().toLowerCase() === 'admin';
    const role = isAdmin ? 'admin' : rawRole;
    const approvalStatus = authUser.user_metadata?.approval_status || (isAdmin ? 'approved' : 'pending');

    // CRITICAL REQUIREMENT: Check student approval status
    if (!isAdmin && approvalStatus !== 'approved') {
      return NextResponse.json(
        {
          error: 'Your account is pending Admin approval. Please wait for the Shanthibavanam Hostel Warden/Admin to review and approve your registration.',
          isPending: true,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      session: data.session,
      user: {
        id: authUser.id,
        email: authUser.email,
        full_name: dbFullName || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        role,
        approval_status: approvalStatus,
        mobile: authUser.user_metadata?.mobile || '',
      },
    });
  } catch (err) {
    console.error('Unhandled exception in login route:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
