import { NextResponse } from 'next/server';
import { requireResident } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // 1. Verify the authenticated session token from Authorization header
    const auth = await requireResident(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // 2. Identify the resident strictly by the verified token user ID
    const student = auth.studentProfile;
    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const meta = auth.user?.user_metadata || {};

    // 3. Return verified resident profile fields
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
