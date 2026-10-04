import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizeIdentifierToEmail, extractCleanMobile } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      // A. Applicant Details
      full_name,
      mobile,
      age,
      date_of_birth,
      permanent_address,
      profile_photo_url,

      // B. Study / Work Details
      programme_of_study,
      institute,
      firm_details,

      // C. Parent / Guardian Details
      parent_guardian_name,
      relationship,
      occupation,
      parent_contact,
      parent_address,

      // D. Hostel Details
      emergency_contact,
      vehicle_usage,
      date_of_admission,
      room_number,
      password,

      // Declaration
      declaration_accepted,
    } = body || {};

    // 1. Mandatory Validations
    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return NextResponse.json({ error: 'Name of the Applicant is required.' }, { status: 400 });
    }

    const cleanMobile = extractCleanMobile(mobile);
    if (!cleanMobile || cleanMobile.length !== 10) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit mobile number for login.' },
        { status: 400 }
      );
    }

    if (!age || isNaN(parseInt(age, 10)) || parseInt(age, 10) <= 0) {
      return NextResponse.json({ error: 'Valid age is required.' }, { status: 400 });
    }

    if (!date_of_birth || typeof date_of_birth !== 'string' || !date_of_birth.trim()) {
      return NextResponse.json({ error: 'Date of Birth is required.' }, { status: 400 });
    }

    if (!permanent_address || typeof permanent_address !== 'string' || !permanent_address.trim()) {
      return NextResponse.json({ error: 'Permanent address is required.' }, { status: 400 });
    }

    if (!parent_guardian_name || typeof parent_guardian_name !== 'string' || !parent_guardian_name.trim()) {
      return NextResponse.json({ error: 'Name of the Parent / Guardian is required.' }, { status: 400 });
    }

    if (!emergency_contact || typeof emergency_contact !== 'string' || !emergency_contact.trim()) {
      return NextResponse.json({ error: 'Emergency contact number is required.' }, { status: 400 });
    }

    if (!room_number || typeof room_number !== 'string' || !room_number.trim()) {
      return NextResponse.json({ error: 'Room number is required.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    // Mandatory Declaration Check
    if (!declaration_accepted) {
      return NextResponse.json(
        { error: 'You must agree to the declaration before submitting your hostel admission application.' },
        { status: 400 }
      );
    }

    const parsedAge = parseInt(age, 10);
    const internalEmail = normalizeIdentifierToEmail(cleanMobile);

    // 2. Check if an account with this mobile or internalEmail already exists
    const { data: existingUserCheck } = await supabaseAdmin.auth.admin.listUsers();
    const userAlreadyExists = existingUserCheck?.users?.some(
      (u) => u.email?.toLowerCase() === internalEmail.toLowerCase() || u.user_metadata?.mobile === cleanMobile
    );

    if (userAlreadyExists) {
      return NextResponse.json(
        { error: 'A resident account with this mobile number already exists. Please log in or contact the Hostel Admin.' },
        { status: 400 }
      );
    }

    // 3. Create Auth user with status = 'pending' and complete metadata
    const userMetadata = {
      role: 'student',
      approval_status: 'pending',
      mobile: cleanMobile,
      full_name: full_name.trim(),
      room_number: room_number.trim(),
      profile_photo_url: profile_photo_url || null,
      age: parsedAge,
      date_of_birth: date_of_birth.trim(),
      permanent_address: permanent_address.trim(),
      programme_of_study: programme_of_study?.trim() || '',
      institute: institute?.trim() || '',
      firm_details: firm_details?.trim() || '',
      parent_guardian_name: parent_guardian_name.trim(),
      relationship: relationship?.trim() || 'Parent',
      occupation: occupation?.trim() || '',
      parent_contact: parent_contact?.trim() || '',
      parent_address: parent_address?.trim() || '',
      emergency_contact: emergency_contact.trim(),
      vehicle_usage: vehicle_usage === 'Yes' ? 'Yes' : 'No',
      date_of_admission: date_of_admission?.trim() || null,
      declaration_accepted: true,
    };

    const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password: password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (authError || !newAuthUser?.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to register admission application.' },
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

    // 5. Create public.student_profiles row with full fields + graceful fallback
    const fullStudentProfile = {
      user_id: userId,
      full_name: full_name.trim(),
      room_number: room_number.trim(),
      personal_contact: cleanMobile,
      permanent_address: permanent_address.trim(),
      emergency_contact: emergency_contact.trim(),
      fee_status: 'pending',
      profile_photo_url: profile_photo_url || null,
      age: parsedAge,
      date_of_birth: date_of_birth.trim(),
      programme_of_study: programme_of_study?.trim() || null,
      institute: institute?.trim() || null,
      firm_details: firm_details?.trim() || null,
      parent_guardian_name: parent_guardian_name.trim(),
      relationship: relationship?.trim() || null,
      occupation: occupation?.trim() || null,
      parent_contact: parent_contact?.trim() || null,
      parent_address: parent_address?.trim() || null,
      vehicle_usage: vehicle_usage === 'Yes' ? 'Yes' : 'No',
      date_of_admission: date_of_admission?.trim() || null,
      declaration_accepted: true,
    };

    const { error: studentProfileError } = await supabaseAdmin
      .from('student_profiles')
      .insert(fullStudentProfile);

    if (studentProfileError) {
      console.warn('Initial student_profiles insert error (may need migration), attempting standard columns:', studentProfileError.message);
      // Fallback with standard existing columns so application never fails
      const fallbackProfile = {
        user_id: userId,
        full_name: full_name.trim(),
        room_number: room_number.trim(),
        personal_contact: cleanMobile,
        permanent_address: permanent_address.trim(),
        emergency_contact: emergency_contact.trim(),
        fee_status: 'pending',
        profile_photo_url: profile_photo_url || null,
      };

      const { error: fallbackError } = await supabaseAdmin
        .from('student_profiles')
        .insert(fallbackProfile);

      if (fallbackError) {
        console.error('Fallback student_profiles insert error:', fallbackError);
        await supabaseAdmin.from('profiles').delete().eq('id', userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json(
          { error: `Database error creating resident record: ${fallbackError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Hostel Admission Application submitted successfully! Your account is currently PENDING approval by the Warden/Admin. You will be able to log in once approved.',
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
    console.error('Unhandled exception in admission signup route:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
