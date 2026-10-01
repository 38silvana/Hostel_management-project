import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { calculateMonthlyBill, BILLING_RATES } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = parseInt(searchParams.get('year') || now.getFullYear(), 10);
    const month = parseInt(searchParams.get('month') || (now.getMonth() + 1), 10);

    // 1. Fetch all student profiles
    const { data: students, error: stError } = await supabaseAdmin
      .from('student_profiles')
      .select('id, user_id, full_name, room_number, personal_contact')
      .order('room_number', { ascending: true });

    if (stError) {
      return NextResponse.json({ error: stError.message }, { status: 500 });
    }

    // Fallback: if any student is missing personal_contact, fetch auth metadata
    const missingContact = (students || []).some((s) => !s.personal_contact && s.user_id);
    let authMobileMap = new Map();
    if (missingContact) {
      try {
        const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
        (authData?.users || []).forEach((u) => {
          if (u.user_metadata?.mobile) {
            authMobileMap.set(u.id, u.user_metadata.mobile);
          }
        });
      } catch (aErr) {
        console.warn('Could not fetch auth users for fallback mobile:', aErr);
      }
    }

    // 2. Fetch existing generated mess_bills for this year & month
    const { data: storedBills } = await supabaseAdmin
      .from('mess_bills')
      .select('*')
      .eq('year', year)
      .eq('month', month);

    const storedBillMap = new Map();
    let isMonthFinalized = false;
    (storedBills || []).forEach((b) => {
      storedBillMap.set(b.student_profile_id, b);
      if (b.is_finalized) isMonthFinalized = true;
    });

    // 3. Query meal selections for the entire month to compute real ticks
    // Month range: YYYY-MM-01 to YYYY-MM-(28/30/31)
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

    const { data: monthlyMeals, error: mError } = await supabaseAdmin
      .from('meal_selections')
      .select('student_profile_id, breakfast, dinner, meal_date')
      .gte('meal_date', startDateStr)
      .lte('meal_date', endDateStr);

    if (mError) {
      console.warn('Error fetching monthly meals:', mError);
    }

    // Calculate ticks per student
    const studentTicksMap = new Map();
    (monthlyMeals || []).forEach((m) => {
      const current = studentTicksMap.get(m.student_profile_id) || 0;
      const count = (m.breakfast ? 1 : 0) + (m.dinner ? 1 : 0);
      studentTicksMap.set(m.student_profile_id, current + count);
    });

    let grandTotalRevenue = 0;
    let totalMessFee = 0;
    let totalHostelRent = 0;

    const bills = (students || []).map((student) => {
      const stored = storedBillMap.get(student.id);
      // Use stored ticks if finalized, else use live computed ticks
      const totalTicks = stored && isMonthFinalized ? stored.total_ticks : (studentTicksMap.get(student.id) || 0);
      const calc = calculateMonthlyBill(totalTicks);

      grandTotalRevenue += calc.totalBill;
      totalMessFee += calc.messFee;
      totalHostelRent += calc.hostelRent;

      const contact = student.personal_contact || (student.user_id ? authMobileMap.get(student.user_id) : '') || '';

      return {
        id: stored?.id || `draft-${student.id}`,
        student_id: student.id,
        student_name: student.full_name,
        room_number: student.room_number,
        personal_contact: contact,
        total_ticks: calc.totalTicks,
        extra_ticks: calc.extraTicks,
        mess_fee: calc.messFee,
        hostel_rent: calc.hostelRent,
        total_bill: calc.totalBill,
        is_finalized: stored?.is_finalized || false,
      };
    });

    return NextResponse.json({
      year,
      month,
      total_students_billed: bills.length,
      total_revenue: grandTotalRevenue,
      total_mess_revenue: totalMessFee,
      total_rent_revenue: totalHostelRent,
      is_finalized: isMonthFinalized,
      rates: BILLING_RATES,
      bills,
    });
  } catch (err) {
    console.error('Unhandled exception in bills GET:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { year, month, action } = body || {}; // action: 'generate' | 'finalize'

    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month are required' }, { status: 400 });
    }

    // 1. Check if finalized already
    const { data: existingBills } = await supabaseAdmin
      .from('mess_bills')
      .select('id, is_finalized')
      .eq('year', year)
      .eq('month', month);

    const isAlreadyFinalized = existingBills?.some((b) => b.is_finalized);
    if (isAlreadyFinalized && action !== 'finalize') {
      return NextResponse.json(
        { error: `Bills for ${month}/${year} are already finalized and locked.` },
        { status: 400 }
      );
    }

    // 2. Fetch all students
    const { data: students, error: stErr } = await supabaseAdmin
      .from('student_profiles')
      .select('id, full_name, room_number');

    if (stErr || !students?.length) {
      return NextResponse.json({ error: 'No student profiles found to calculate bills.' }, { status: 404 });
    }

    // 3. Query monthly meals
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

    const { data: monthlyMeals } = await supabaseAdmin
      .from('meal_selections')
      .select('student_profile_id, breakfast, dinner')
      .gte('meal_date', startDateStr)
      .lte('meal_date', endDateStr);

    const studentTicksMap = new Map();
    (monthlyMeals || []).forEach((m) => {
      const current = studentTicksMap.get(m.student_profile_id) || 0;
      const count = (m.breakfast ? 1 : 0) + (m.dinner ? 1 : 0);
      studentTicksMap.set(m.student_profile_id, current + count);
    });

    // 4. Upsert bills
    const willFinalize = action === 'finalize';
    for (const student of students) {
      const totalTicks = studentTicksMap.get(student.id) || 0;
      const calc = calculateMonthlyBill(totalTicks);

      const { data: existing } = await supabaseAdmin
        .from('mess_bills')
        .select('id')
        .eq('student_profile_id', student.id)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin
          .from('mess_bills')
          .update({
            total_ticks: totalTicks,
            amount: calc.totalBill,
            is_finalized: willFinalize ? true : undefined,
          })
          .eq('id', existing.id);
      } else {
        await supabaseAdmin
          .from('mess_bills')
          .insert({
            student_profile_id: student.id,
            year,
            month,
            total_ticks: totalTicks,
            amount: calc.totalBill,
            is_finalized: willFinalize,
          });
      }
    }

    return NextResponse.json({
      success: true,
      message: willFinalize
        ? `Bills for ${month}/${year} have been finalized and locked!`
        : `Bills for ${month}/${year} calculated successfully!`,
      year,
      month,
      is_finalized: willFinalize,
    });
  } catch (err) {
    console.error('Unhandled exception in bills POST:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
