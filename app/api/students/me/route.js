import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data: student, error } = await supabaseAdmin
      .from('student_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const meta = authUserData?.user?.user_metadata || {};

    return NextResponse.json({
      ...student,
      profile_photo_url: student.profile_photo_url || meta.profile_photo_url || null,
      age: student.age ?? meta.age ?? null,
      date_of_birth: student.date_of_birth || meta.date_of_birth || '',
      programme_of_study: student.programme_of_study || meta.programme_of_study || '',
      institute: student.institute || meta.institute || '',
      firm_details: student.firm_details || meta.firm_details || '',
      parent_guardian_name: student.parent_guardian_name || meta.parent_guardian_name || '',
      relationship: student.relationship || meta.relationship || '',
      occupation: student.occupation || meta.occupation || '',
      parent_contact: student.parent_contact || meta.parent_contact || '',
      parent_address: student.parent_address || meta.parent_address || '',
      vehicle_usage: student.vehicle_usage || meta.vehicle_usage || 'No',
      date_of_admission: student.date_of_admission || meta.date_of_admission || '',
      declaration_accepted: student.declaration_accepted ?? meta.declaration_accepted ?? true,
    });
  } catch (err) {
    console.error('Error fetching student me profile:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
