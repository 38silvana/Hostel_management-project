import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizeIdentifierToEmail, extractCleanMobile } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';

    // 1. Fetch student profiles
    const { data: profiles, error: pError } = await supabaseAdmin
      .from('student_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (pError) {
      console.error('Error fetching student profiles:', pError);
      return NextResponse.json({ error: pError.message }, { status: 500 });
    }

    // 2. Fetch all auth users to retrieve approval_status and metadata
    const { data: authData, error: aError } = await supabaseAdmin.auth.admin.listUsers();
    if (aError) {
      console.warn('Could not list auth users:', aError);
    }

    const authUsersMap = new Map();
    (authData?.users || []).forEach((u) => {
      authUsersMap.set(u.id, u);
    });

    // 3. Combine records
    const formatted = (profiles || []).map((p) => {
      const authUser = authUsersMap.get(p.user_id);
      const approvalStatus = authUser?.user_metadata?.approval_status || 'pending';
      const email = authUser?.email || '';

      return {
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        room_number: p.room_number,
        personal_contact: p.personal_contact || authUser?.user_metadata?.mobile || '',
        emergency_contact: p.emergency_contact || '',
        permanent_address: p.permanent_address || '',
        fee_status: p.fee_status || 'pending',
        approval_status: approvalStatus,
        profile_photo: p.profile_photo_url || null,
        email,
        created_at: p.created_at,
      };
    });

    // 4. Filter by search if provided
    let results = formatted;
    if (search) {
      results = formatted.filter(
        (s) =>
          s.full_name?.toLowerCase().includes(search) ||
          s.room_number?.toLowerCase().includes(search) ||
          s.personal_contact?.includes(search)
      );
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error('Unhandled exception in students GET:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      full_name,
      personal_contact,
      password,
      room_number,
      permanent_address,
      emergency_contact,
      fee_status,
    } = body || {};

    if (!full_name || !room_number || !personal_contact) {
      return NextResponse.json(
        { error: 'Full name, room number, and contact number are required.' },
        { status: 400 }
      );
    }

    const cleanMobile = extractCleanMobile(personal_contact);
    const internalEmail = normalizeIdentifierToEmail(cleanMobile);
    const initialPassword = password || 'Hostel@123';

    // Create user as approved since Admin is directly creating
    const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password: initialPassword,
      email_confirm: true,
      user_metadata: {
        role: 'student',
        approval_status: 'approved',
        mobile: cleanMobile,
        full_name: full_name.trim(),
        room_number: room_number.trim(),
      },
    });

    if (authError || !newAuthUser?.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create student user.' },
        { status: 400 }
      );
    }

    const userId = newAuthUser.user.id;

    // Create profile
    await supabaseAdmin.from('profiles').insert({
      id: userId,
      full_name: full_name.trim(),
      role: 'student',
    });

    // Create student_profile
    const { data: newProfile, error: spError } = await supabaseAdmin
      .from('student_profiles')
      .insert({
        user_id: userId,
        full_name: full_name.trim(),
        room_number: room_number.trim(),
        personal_contact: cleanMobile,
        permanent_address: permanent_address?.trim() || 'N/A',
        emergency_contact: emergency_contact?.trim() || 'N/A',
        fee_status: fee_status || 'pending',
      })
      .select()
      .single();

    if (spError) {
      return NextResponse.json({ error: spError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        ...newProfile,
        approval_status: 'approved',
        email: internalEmail,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Unhandled exception in students POST:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
