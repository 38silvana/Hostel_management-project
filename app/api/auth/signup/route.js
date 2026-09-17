import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizeIdentifierToEmail, extractCleanMobile } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      full_name,
      mobile,
      password,
      room_number,
      permanent_address,
      emergency_contact,
    } = body || {};

    // 1. Basic validation
    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }

    const cleanMobile = extractCleanMobile(mobile);
    if (!cleanMobile || cleanMobile.length !== 10) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit mobile number.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    if (!room_number || typeof room_number !== 'string' || !room_number.trim()) {
      return NextResponse.json({ error: 'Room number is required.' }, { status: 400 });
    }

    const internalEmail = normalizeIdentifierToEmail(cleanMobile);

    // 2. Check if a student with this mobile or internalEmail already exists
    const { data: existingUserCheck } = await supabaseAdmin.auth.admin.listUsers();
    const userAlreadyExists = existingUserCheck?.users?.some(
      (u) => u.email?.toLowerCase() === internalEmail.toLowerCase() || u.user_metadata?.mobile === cleanMobile
    );

    if (userAlreadyExists) {
      return NextResponse.json(
        { error: 'A resident account with this mobile number already exists. Please log in or contact Admin.' },
        { status: 400 }
      );
    }

    // 3. Create Auth user with status = 'pending'
    const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'student',
        approval_status: 'pending',
        mobile: cleanMobile,
        full_name: full_name.trim(),
        room_number: room_number.trim(),
      },
    });

    if (authError || !newAuthUser?.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to register account.' },
        { status: 400 }
      );
    }

    const userId = newAuthUser.user.id;

    // 4. Create public.profiles row
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        full_name: full_name.trim(),
        role: 'student',
      });

    if (profileError) {
      console.error('Error inserting profile:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: `Database error creating profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    // 5. Create public.student_profiles row
    const { error: studentProfileError } = await supabaseAdmin
      .from('student_profiles')
      .insert({
        user_id: userId,
        full_name: full_name.trim(),
        room_number: room_number.trim(),
        personal_contact: cleanMobile,
        permanent_address: permanent_address?.trim() || 'N/A',
        emergency_contact: emergency_contact?.trim() || 'N/A',
        fee_status: 'pending',
      });

    if (studentProfileError) {
      console.error('Error inserting student_profiles:', studentProfileError);
      await supabaseAdmin.from('profiles').delete().eq('id', userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: `Database error creating student details: ${studentProfileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Signup request submitted successfully! Your account is currently PENDING approval by the Warden/Admin. You will be able to log in once approved.',
        user: {
          id: userId,
          full_name: full_name.trim(),
          mobile: cleanMobile,
          approval_status: 'pending',
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Unhandled exception in signup route:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
