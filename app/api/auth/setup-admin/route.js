import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        configured: false,
        adminExists: false,
        message: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server.',
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: existingProfiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    if (profileError) {
      return NextResponse.json({ configured: true, adminExists: false, error: profileError.message });
    }

    const adminExists = Boolean(existingProfiles && existingProfiles.length > 0);

    return NextResponse.json({
      configured: true,
      adminExists,
    });
  } catch (err) {
    return NextResponse.json({ configured: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            'Server configuration missing: SUPABASE_SERVICE_ROLE_KEY is required on the server to initialize the admin account.',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { email, password, full_name } = body || {};

    // 1. Validate email
    if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    // 2. Validate password
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // 3. Validate full_name
    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return NextResponse.json(
        { error: 'Full name is required.' },
        { status: 400 }
      );
    }

    // Instantiate server-only administrative Supabase client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 4. Check whether an admin already exists in public.profiles
    const { data: existingProfiles, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    if (profileCheckError) {
      console.error('Error checking admin existence in profiles:', profileCheckError.message);
      return NextResponse.json(
        { error: 'Database error checking administrator status.' },
        { status: 500 }
      );
    }

    // Also check auth.users to ensure no orphaned admin user exists
    const { data: userData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error('Error querying auth users:', listError.message);
      return NextResponse.json(
        { error: 'Error verifying administrator status.' },
        { status: 500 }
      );
    }

    const adminExistsInAuth = userData?.users?.some(
      (u) => u.user_metadata?.role === 'admin'
    );
    const adminExistsInProfiles = Boolean(existingProfiles && existingProfiles.length > 0);

    // 5. If an admin already exists, return HTTP 403
    if (adminExistsInProfiles || adminExistsInAuth) {
      return NextResponse.json(
        { error: 'An admin account has already been set up. Please log in.' },
        { status: 403 }
      );
    }

    // 6. If no admin exists: create the Auth user using Supabase admin.createUser()
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        role: 'admin',
      },
    });

    if (createError || !newUser?.user) {
      return NextResponse.json(
        { error: createError?.message || 'Failed to create administrative user.' },
        { status: 400 }
      );
    }

    // Create the matching public.profiles row using the new Auth user's UUID
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        full_name: full_name.trim(),
        role: 'admin',
      });

    // 7. If profile creation fails after Auth user creation, delete the newly created Auth user
    if (profileInsertError) {
      console.error('Failed to create profile row, rolling back user:', profileInsertError.message);
      try {
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      } catch (cleanupError) {
        console.error('Cleanup failed during rollback:', cleanupError);
      }

      return NextResponse.json(
        { error: `Failed to create administrator profile: ${profileInsertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Initial admin account registered successfully. You can now log in.',
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Setup admin route unhandled exception:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
