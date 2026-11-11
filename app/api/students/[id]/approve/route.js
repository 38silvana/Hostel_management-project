import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function POST(request, context) {
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
    const rawParams = await context?.params;
    let studentId = rawParams?.id ? parseInt(rawParams.id, 10) : null;

    if (!studentId) {
      const parts = new URL(request.url).pathname.split('/');
      const approveIdx = parts.indexOf('approve');
      if (approveIdx > 0) {
        studentId = parseInt(parts[approveIdx - 1], 10);
      }
    }

    if (!studentId || isNaN(studentId)) {
      return NextResponse.json({ error: 'Valid student ID is required.' }, { status: 400 });
    }

    // 1. Get student profile
    const { data: student, error: fetchError } = await supabaseAdmin
      .from('student_profiles')
      .select('*')
      .eq('id', studentId)
      .single();

    if (fetchError || !student) {
      return NextResponse.json({ error: 'Student profile not found.' }, { status: 404 });
    }

    if (!student.user_id) {
      return NextResponse.json({ error: 'No user account associated with this profile.' }, { status: 400 });
    }

    // 2. Fetch existing auth user metadata
    const { data: authUserData, error: userError } = await supabaseAdmin.auth.admin.getUserById(student.user_id);
    if (userError || !authUserData?.user) {
      return NextResponse.json({ error: 'Associated auth user could not be found.' }, { status: 404 });
    }

    const currentMeta = authUserData.user.user_metadata || {};
    const currentAppMeta = authUserData.user.app_metadata || {};

    // 3. Update approval_status to 'approved' in both app_metadata (security) and user_metadata (UI)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      student.user_id,
      {
        app_metadata: {
          ...currentAppMeta,
          approval_status: 'approved',
        },
        user_metadata: {
          ...currentMeta,
          approval_status: 'approved',
        },
      }
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Student "${student.full_name}" has been approved! They can now log into Shanthibavanam.`,
      student: {
        id: student.id,
        full_name: student.full_name,
        approval_status: 'approved',
      },
    });
  } catch (err) {
    console.error('Error approving student:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
