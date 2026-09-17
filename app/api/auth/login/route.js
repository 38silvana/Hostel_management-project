import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeIdentifierToEmail } from '@/lib/auth-helpers';

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
    const role = authUser.user_metadata?.role || 'student';
    const approvalStatus = authUser.user_metadata?.approval_status || (role === 'admin' ? 'approved' : 'pending');

    // CRITICAL REQUIREMENT: Check student approval status
    if (role === 'student' && approvalStatus !== 'approved') {
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
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
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
