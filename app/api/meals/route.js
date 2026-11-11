import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isFoodWindowOpen, getTomorrowDateIndia } from '@/lib/config';
import { requireAdmin, requireResident } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin configuration is missing.' },
        { status: 500 }
      );
    }
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'daily-sheet'; // 'daily-sheet' | 'my-selection' | 'window-status'
    const dateParam = searchParams.get('date') || getTomorrowDateIndia();
    const queryUserId = searchParams.get('user_id');

    // Return current window status if requested (Public info)
    if (mode === 'window-status') {
      return NextResponse.json(isFoodWindowOpen());
    }

    // 1. My Selection (Resident - verified session)
    if (mode === 'my-selection') {
      const auth = await requireResident(request);
      if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }

      // If caller is admin, allow inspecting a specific user_id, otherwise enforce verified caller's ID
      const targetUserId = (auth.isAdmin && queryUserId) ? queryUserId : auth.user.id;

      // Find student profile by targetUserId
      const student = (targetUserId === auth.user.id && auth.studentProfile)
        ? auth.studentProfile
        : (await supabaseAdmin
            .from('student_profiles')
            .select('id')
            .eq('user_id', targetUserId)
            .maybeSingle())?.data;

      if (!student) {
        return NextResponse.json({
          breakfast: false,
          dinner: false,
          meal_date: dateParam,
          is_new: true,
          has_responded: false,
          windowStatus: isFoodWindowOpen(),
        });
      }

      const { data: selection } = await supabaseAdmin
        .from('meal_selections')
        .select('*')
        .eq('student_profile_id', student.id)
        .eq('meal_date', dateParam)
        .maybeSingle();

      if (!selection) {
        return NextResponse.json({
          breakfast: false,
          dinner: false,
          meal_date: dateParam,
          is_new: true,
          has_responded: false,
          windowStatus: isFoodWindowOpen(),
        });
      }

      return NextResponse.json({
        ...selection,
        is_new: false,
        has_responded: true,
        windowStatus: isFoodWindowOpen(),
      });
    }

    // 2. Admin Daily Tick Sheet & Aggregate Headcounts (Admin only)
    const authAdmin = await requireAdmin(request);
    if (authAdmin.error) {
      return NextResponse.json({ error: authAdmin.error }, { status: authAdmin.status });
    }

    // Fetch all student profiles
    const { data: allStudents, error: stErr } = await supabaseAdmin
      .from('student_profiles')
      .select('id, user_id, full_name, room_number, personal_contact')
      .order('room_number', { ascending: true });

    if (stErr) {
      return NextResponse.json({ error: stErr.message }, { status: 500 });
    }

    // Fetch meal selections for the target date
    const { data: selections, error: mErr } = await supabaseAdmin
      .from('meal_selections')
      .select('*')
      .eq('meal_date', dateParam);

    if (mErr) {
      return NextResponse.json({ error: mErr.message }, { status: 500 });
    }

    const selectionMap = new Map();
    (selections || []).forEach((s) => {
      selectionMap.set(s.student_profile_id, s);
    });

    let totalBreakfast = 0;
    let totalDinner = 0;
    let totalResponded = 0;

    const sheet = (allStudents || []).map((student) => {
      const userSel = selectionMap.get(student.id);
      const hasResponded = Boolean(userSel);
      // Opt-in (Default NO): If no selection saved, resident gets NO food (false / false)
      const bChoice = hasResponded ? Boolean(userSel.breakfast) : false;
      const dChoice = hasResponded ? Boolean(userSel.dinner) : false;

      if (bChoice) totalBreakfast++;
      if (dChoice) totalDinner++;
      if (hasResponded) totalResponded++;

      return {
        student_id: student.id,
        full_name: student.full_name,
        room_number: student.room_number,
        personal_contact: student.personal_contact,
        breakfast: bChoice,
        dinner: dChoice,
        has_responded: hasResponded,
        has_custom_choice: hasResponded,
        total_ticks: (bChoice ? 1 : 0) + (dChoice ? 1 : 0),
        updated_at: userSel?.updated_at || null,
      };
    });

    return NextResponse.json({
      meal_date: dateParam,
      total_students: allStudents.length,
      total_breakfast_count: totalBreakfast,
      total_dinner_count: totalDinner,
      total_responded: totalResponded,
      total_responded_count: totalResponded,
      total_defaulted: allStudents.length - totalResponded,
      windowStatus: isFoodWindowOpen(),
      sheet,
    });
  } catch (err) {
    console.error('Unhandled exception in meals GET:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin configuration is missing.' },
        { status: 500 }
      );
    }

    // Verify authenticated caller (Resident or Admin)
    const auth = await requireResident(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { user_id, breakfast, dinner, bypass_cutoff } = body || {};

    // For residents, strictly use their authenticated user ID (never trust body.user_id)
    const targetUserId = (auth.isAdmin && user_id) ? user_id : auth.user.id;

    // Only Admins are permitted to bypass cutoff window; residents cannot bypass it
    const canBypassCutoff = auth.isAdmin && Boolean(bypass_cutoff);
    if (!canBypassCutoff) {
      const windowCheck = isFoodWindowOpen();
      if (!windowCheck.isOpen) {
        return NextResponse.json(
          { error: windowCheck.message, is_locked: true },
          { status: 403 }
        );
      }
    }

    // Get student profile
    const student = (targetUserId === auth.user.id && auth.studentProfile)
      ? auth.studentProfile
      : (await supabaseAdmin
          .from('student_profiles')
          .select('id')
          .eq('user_id', targetUserId)
          .maybeSingle())?.data;

    if (!student) {
      return NextResponse.json({ error: 'Student record not found for this account.' }, { status: 404 });
    }

    const tomorrowStr = getTomorrowDateIndia();

    // Check if selection already exists for tomorrow
    const { data: existing } = await supabaseAdmin
      .from('meal_selections')
      .select('id')
      .eq('student_profile_id', student.id)
      .eq('meal_date', tomorrowStr)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('meal_selections')
        .update({
          breakfast: Boolean(breakfast),
          dinner: Boolean(dinner),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('meal_selections')
        .insert({
          student_profile_id: student.id,
          meal_date: tomorrowStr,
          breakfast: Boolean(breakfast),
          dinner: Boolean(dinner),
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({
      success: true,
      message: "Tomorrow's meal choices saved successfully!",
      selection: result,
      meal_date: tomorrowStr,
    });
  } catch (err) {
    console.error('Unhandled exception in meals POST:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
