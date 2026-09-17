import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isFoodWindowOpen, getTomorrowDateIndia } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'daily-sheet'; // 'daily-sheet' | 'my-selection' | 'window-status'
    const dateParam = searchParams.get('date') || getTomorrowDateIndia();
    const userId = searchParams.get('user_id');

    // Return current window status if requested
    if (mode === 'window-status') {
      return NextResponse.json(isFoodWindowOpen());
    }

    // 1. My Selection (Resident)
    if (mode === 'my-selection') {
      if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      }

      // Find student profile by user_id
      const { data: student, error: sErr } = await supabaseAdmin
        .from('student_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (sErr || !student) {
        return NextResponse.json({
          breakfast: true,
          dinner: true,
          meal_date: dateParam,
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
          breakfast: true,
          dinner: true,
          meal_date: dateParam,
          is_new: true,
          windowStatus: isFoodWindowOpen(),
        });
      }

      return NextResponse.json({
        ...selection,
        windowStatus: isFoodWindowOpen(),
      });
    }

    // 2. Admin Daily Tick Sheet & Aggregate Headcounts
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
      const sel = selectionMap.get(student.id);
      const hasResponded = Boolean(sel);
      const breakfast = sel ? Boolean(sel.breakfast) : false;
      const dinner = sel ? Boolean(sel.dinner) : false;

      if (breakfast) totalBreakfast++;
      if (dinner) totalDinner++;
      if (hasResponded) totalResponded++;

      return {
        student_id: student.id,
        full_name: student.full_name,
        room_number: student.room_number,
        personal_contact: student.personal_contact,
        has_responded: hasResponded,
        breakfast,
        dinner,
      };
    });

    return NextResponse.json({
      meal_date: dateParam,
      total_students: (allStudents || []).length,
      total_breakfast_count: totalBreakfast,
      total_dinner_count: totalDinner,
      total_responded_count: totalResponded,
      sheet,
      windowStatus: isFoodWindowOpen(),
    });
  } catch (err) {
    console.error('Unhandled exception in meals GET:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { user_id, breakfast, dinner, bypass_cutoff } = body || {};

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check cutoff window (Asia/Kolkata)
    if (!bypass_cutoff) {
      const windowCheck = isFoodWindowOpen();
      if (!windowCheck.isOpen) {
        return NextResponse.json(
          { error: windowCheck.message, is_locked: true },
          { status: 403 }
        );
      }
    }

    // Get student profile
    const { data: student, error: sErr } = await supabaseAdmin
      .from('student_profiles')
      .select('id')
      .eq('user_id', user_id)
      .single();

    if (sErr || !student) {
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
