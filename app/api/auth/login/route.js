import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeIdentifierToEmail, extractCleanMobile } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
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

    const trimmedId = String(identifier).trim();
    const primaryEmail = normalizeIdentifierToEmail(trimmedId);
    let targetEmail = primaryEmail;

    // Smart identifier resolution using service role when available
    if (supabaseAdmin) {
      try {
        const lowerId = trimmedId.toLowerCase();
        const cleanMobile = extractCleanMobile(trimmedId);

        if (lowerId === 'admin' || lowerId === 'warden' || lowerId === 'administrator') {
          // Look up verified admin in public.profiles first
          const { data: adminProfiles } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('role', 'admin')
            .limit(1);

          if (adminProfiles && adminProfiles.length > 0) {
            const { data: adminAuth } = await supabaseAdmin.auth.admin.getUserById(adminProfiles[0].id);
            if (adminAuth?.user?.email) {
              targetEmail = adminAuth.user.email;
            }
          } else {
            const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
            const adminUser = usersData?.users?.find((u) => {
              const role = u.user_metadata?.role;
              return role && String(role).trim().toLowerCase() === 'admin';
            });
            if (adminUser?.email) {
              targetEmail = adminUser.email;
            }
          }
        } else if (cleanMobile && cleanMobile.length === 10) {
          const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
          const matchedUser = usersData?.users?.find(
            (u) =>
              u.user_metadata?.mobile === cleanMobile ||
              u.phone?.endsWith(cleanMobile) ||
              u.email?.toLowerCase().startsWith(`${cleanMobile}@`)
          );
          if (matchedUser?.email) {
            targetEmail = matchedUser.email;
          }
        }
      } catch (lookupErr) {
        console.warn('Optional user pre-lookup skipped:', lookupErr?.message);
      }
    }

    // Authenticate credentials
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    let { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password,
    });

    if ((error || !data?.session) && targetEmail !== primaryEmail) {
      const fallbackResult = await supabase.auth.signInWithPassword({
        email: primaryEmail,
        password,
      });
      if (fallbackResult.data?.session) {
        data = fallbackResult.data;
        error = null;
      }
    }

    if (error || !data?.session) {
      return NextResponse.json(
        { error: error?.message || 'Invalid credentials. Please verify your mobile number/email and password.' },
        { status: 401 }
      );
    }

    const authUser = data.session.user;
    const userAccessToken = data.session.access_token;

    // Check profiles table
    let dbRole = null;
    let dbFullName = null;

    try {
      const client = supabaseAdmin
        ? supabaseAdmin
        : createClient(supabaseUrl, anonKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
          global: {
            headers: {
              Authorization: `Bearer ${userAccessToken}`,
            },
          },
        });

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

    // SECURITY: Only a verified 'admin' record in public.profiles grants administrative access.
    // If the profile is missing or the database lookup fails, deny admin access.
    const isAdmin = String(dbRole || '').trim().toLowerCase() === 'admin';
    const role = isAdmin ? 'admin' : 'student';

    // SECURITY: Server-controlled app_metadata.approval_status is the SOLE authority for approval.
    // We NEVER trust user_metadata.approval_status and NEVER auto-approve on login.
    // Missing or non-approved approval_status defaults strictly to 'pending'.
    const rawApproval = authUser.app_metadata?.approval_status;
    const approvalStatus = isAdmin
      ? 'approved'
      : (rawApproval === 'approved' ? 'approved' : 'pending');

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
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}