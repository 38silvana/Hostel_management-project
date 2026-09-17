import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function extractStudentId(request, context) {
  if (context?.params?.id) {
    return parseInt(context.params.id, 10);
  }
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  const lastPart = parts[parts.length - 1];
  return parseInt(lastPart, 10);
}

export async function PUT(request, context) {
  try {
    const rawParams = await context?.params;
    const studentId = rawParams?.id ? parseInt(rawParams.id, 10) : extractStudentId(request, context);

    if (!studentId || isNaN(studentId)) {
      return NextResponse.json({ error: 'Valid student ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      full_name,
      room_number,
      permanent_address,
      personal_contact,
      emergency_contact,
      fee_status,
    } = body;

    const { data: updated, error } = await supabaseAdmin
      .from('student_profiles')
      .update({
        full_name,
        room_number,
        permanent_address,
        personal_contact,
        emergency_contact,
        fee_status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also update profile table full_name
    if (updated?.user_id && full_name) {
      await supabaseAdmin
        .from('profiles')
        .update({ full_name })
        .eq('id', updated.user_id);
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error('Error updating student profile:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const rawParams = await context?.params;
    const studentId = rawParams?.id ? parseInt(rawParams.id, 10) : extractStudentId(request, context);

    if (!studentId || isNaN(studentId)) {
      return NextResponse.json({ error: 'Valid student ID is required' }, { status: 400 });
    }

    // Get user_id before deleting
    const { data: student } = await supabaseAdmin
      .from('student_profiles')
      .select('user_id')
      .eq('id', studentId)
      .single();

    // Delete meal selections & bills for this student
    await supabaseAdmin.from('meal_selections').delete().eq('student_profile_id', studentId);
    await supabaseAdmin.from('mess_bills').delete().eq('student_profile_id', studentId);

    // Delete student profile
    const { error: spError } = await supabaseAdmin
      .from('student_profiles')
      .delete()
      .eq('id', studentId);

    if (spError) {
      return NextResponse.json({ error: spError.message }, { status: 500 });
    }

    // If user_id exists, delete profiles and auth user
    if (student?.user_id) {
      await supabaseAdmin.from('profiles').delete().eq('id', student.user_id);
      await supabaseAdmin.auth.admin.deleteUser(student.user_id);
    }

    return NextResponse.json({ message: 'Student successfully removed.' });
  } catch (err) {
    console.error('Error deleting student:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
