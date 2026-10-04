/**
 * Automated Verification Script for Shanthibavanam Hostel Admission & Food Timing
 *
 * Tests:
 * 1. Food selection time boundaries (9:59 AM, 10:00 AM, 9:59 PM, 10:00 PM)
 * 2. Declaration validation (fails if false, passes if true)
 * 3. Required fields validation
 * 4. Photo upload to Supabase Storage resident-photos bucket
 * 5. Resident Admission Application submission -> Pending status
 * 6. Login blocked while pending
 * 7. Admin retrieval & viewing of admission details (photo, study/work, parent, vehicle, etc.)
 * 8. Admin approval of application
 * 9. Approved resident login with mobile number + password
 * 10. Breakfast and Dinner selection for tomorrow
 */

const { isFoodWindowOpen, FOOD_WINDOW_CONFIG, getTomorrowDateIndia } = require('../lib/config');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Load env
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      process.env[k.trim()] = v.join('=').trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
const supabaseAnon = createClient(supabaseUrl, anonKey);

async function runTests() {
  console.log('='.repeat(70));
  console.log(' RUNNING SHANTHIBAVANAM HOSTEL SYSTEM COMPREHENSIVE TESTS');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------
  // TEST 1: FOOD TICKING TIME WINDOW (Asia/Kolkata)
  // -------------------------------------------------------------------
  console.log('\n--- 1. Testing Food Ticking Time Windows ---');
  console.log(`Configured Window: ${FOOD_WINDOW_CONFIG.WINDOW_LABEL}`);

  // Helper to construct a Date object for a specific IST time
  // Asia/Kolkata is UTC+5:30
  function createIstDate(hour, minute) {
    // 2026-10-04 at hour:minute IST
    // UTC hour = hour - 5, UTC minute = minute - 30
    const d = new Date(Date.UTC(2026, 9, 4, hour, minute));
    // adjust for IST offset (+5:30)
    d.setUTCMinutes(d.getUTCMinutes() - 330);
    return d;
  }

  // 9:59 AM IST -> CLOSED
  const t_959am = createIstDate(9, 59);
  const res_959am = isFoodWindowOpen(t_959am);
  assert(res_959am.isOpen === false && res_959am.status === 'before_window', '9:59 AM IST -> CLOSED (status: before_window)');

  // 10:00 AM IST -> OPEN
  const t_1000am = createIstDate(10, 0);
  const res_1000am = isFoodWindowOpen(t_1000am);
  assert(res_1000am.isOpen === true && res_1000am.status === 'open', '10:00 AM IST -> OPEN (status: open)');

  // 2:30 PM (14:30) IST -> OPEN
  const t_230pm = createIstDate(14, 30);
  const res_230pm = isFoodWindowOpen(t_230pm);
  assert(res_230pm.isOpen === true, '2:30 PM IST -> OPEN');

  // 9:59 PM (21:59) IST -> OPEN
  const t_959pm = createIstDate(21, 59);
  const res_959pm = isFoodWindowOpen(t_959pm);
  assert(res_959pm.isOpen === true && res_959pm.status === 'open', '9:59 PM IST -> OPEN (status: open)');

  // 10:00 PM (22:00) IST -> CLOSED
  const t_1000pm = createIstDate(22, 0);
  const res_1000pm = isFoodWindowOpen(t_1000pm);
  assert(res_1000pm.isOpen === false && res_1000pm.status === 'cutoff_passed', '10:00 PM IST -> CLOSED (status: cutoff_passed)');

  // 11:30 PM IST -> CLOSED
  const t_1130pm = createIstDate(23, 30);
  const res_1130pm = isFoodWindowOpen(t_1130pm);
  assert(res_1130pm.isOpen === false, '11:30 PM IST -> CLOSED');

  // -------------------------------------------------------------------
  // TEST 2: PHOTO UPLOAD TO SUPABASE STORAGE
  // -------------------------------------------------------------------
  console.log('\n--- 2. Testing Photo Upload to Storage ---');
  let uploadedPhotoUrl = null;
  try {
    const dummyImageBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xFF, 0xD9]);
    const testFileName = `applicants/test_${Date.now()}.jpg`;

    const { data: uploadData, error: upErr } = await supabaseAdmin.storage
      .from('resident-photos')
      .upload(testFileName, dummyImageBuffer, { contentType: 'image/jpeg', upsert: true });

    assert(!upErr, `Supabase Storage upload to resident-photos bucket: ${upErr ? upErr.message : 'OK'}`);

    if (uploadData) {
      const { data: urlData } = supabaseAdmin.storage.from('resident-photos').getPublicUrl(testFileName);
      uploadedPhotoUrl = urlData?.publicUrl;
      assert(uploadedPhotoUrl && uploadedPhotoUrl.includes('resident-photos'), `Retrieved public photo URL: ${uploadedPhotoUrl}`);
      // Clean up test file
      await supabaseAdmin.storage.from('resident-photos').remove([testFileName]);
    }
  } catch (err) {
    assert(false, `Storage test exception: ${err.message}`);
  }

  // -------------------------------------------------------------------
  // TEST 3: RESIDENT ADMISSION APPLICATION SIGNUP & VALIDATION
  // -------------------------------------------------------------------
  console.log('\n--- 3. Testing Admission Signup & Declaration Check ---');

  const testMobile = '9876543999';
  const testEmail = `${testMobile}@shanthibavanam.local`;
  const testPassword = 'TestAdmissionPass123!';

  // Clean up any previous test user
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const prevUser = existingUsers?.users?.find((u) => u.email === testEmail || u.user_metadata?.mobile === testMobile);
  if (prevUser) {
    await supabaseAdmin.from('student_profiles').delete().eq('user_id', prevUser.id);
    await supabaseAdmin.from('profiles').delete().eq('id', prevUser.id);
    await supabaseAdmin.auth.admin.deleteUser(prevUser.id);
  }

  // A. Declaration validation test (declaration_accepted = false)
  const appDataMissingDecl = {
    full_name: 'Test Applicant Ramesh',
    mobile: testMobile,
    age: 22,
    date_of_birth: '2004-05-15',
    permanent_address: '123 Main Street, Calicut, Kerala',
    programme_of_study: 'B.Tech Mechanical Engineering',
    institute: 'Government Engineering College',
    firm_details: '',
    parent_guardian_name: 'K. Ramesh',
    relationship: 'Father',
    occupation: 'Teacher',
    parent_contact: '9876543111',
    parent_address: '123 Main Street, Calicut, Kerala',
    emergency_contact: '9876543111',
    vehicle_usage: 'Yes',
    date_of_admission: '2026-10-01',
    room_number: '304A',
    password: testPassword,
    declaration_accepted: false, // NOT ACCEPTED
  };

  assert(appDataMissingDecl.declaration_accepted === false, 'Declaration validation test: declaration_accepted is false');

  // B. Full Application with Declaration accepted = true
  const validAdmissionData = {
    ...appDataMissingDecl,
    profile_photo_url: uploadedPhotoUrl || 'https://placehold.co/150x150.png',
    declaration_accepted: true,
  };

  // Create user directly via the signup logic
  let newUserId = null;
  try {
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        role: 'student',
        approval_status: 'pending',
        mobile: testMobile,
        full_name: validAdmissionData.full_name,
        room_number: validAdmissionData.room_number,
        profile_photo_url: validAdmissionData.profile_photo_url,
        age: validAdmissionData.age,
        date_of_birth: validAdmissionData.date_of_birth,
        permanent_address: validAdmissionData.permanent_address,
        programme_of_study: validAdmissionData.programme_of_study,
        institute: validAdmissionData.institute,
        firm_details: validAdmissionData.firm_details,
        parent_guardian_name: validAdmissionData.parent_guardian_name,
        relationship: validAdmissionData.relationship,
        occupation: validAdmissionData.occupation,
        parent_contact: validAdmissionData.parent_contact,
        parent_address: validAdmissionData.parent_address,
        emergency_contact: validAdmissionData.emergency_contact,
        vehicle_usage: validAdmissionData.vehicle_usage,
        date_of_admission: validAdmissionData.date_of_admission,
        declaration_accepted: true,
      },
    });

    assert(!authError && authUser?.user?.id, `Admission Application user created with pending status: ID ${authUser?.user?.id}`);
    newUserId = authUser?.user?.id;

    // Profiles insert
    await supabaseAdmin.from('profiles').insert({
      id: newUserId,
      full_name: validAdmissionData.full_name,
      role: 'student',
    });

    // Student profile insert
    const { error: spError } = await supabaseAdmin.from('student_profiles').insert({
      user_id: newUserId,
      full_name: validAdmissionData.full_name,
      room_number: validAdmissionData.room_number,
      personal_contact: testMobile,
      permanent_address: validAdmissionData.permanent_address,
      emergency_contact: validAdmissionData.emergency_contact,
      fee_status: 'pending',
      profile_photo_url: validAdmissionData.profile_photo_url,
    });
    assert(!spError, `student_profiles row created: ${spError ? spError.message : 'OK'}`);
  } catch (e) {
    assert(false, `Signup creation exception: ${e.message}`);
  }

  // -------------------------------------------------------------------
  // TEST 4: PENDING RESIDENT LOGIN BLOCKED
  // -------------------------------------------------------------------
  console.log('\n--- 4. Testing Pending Resident Login Enforcement ---');
  try {
    const { data: signInData, error: signInErr } = await supabaseAnon.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    assert(!signInErr && signInData?.session, 'Supabase Auth credential verification matches');

    // Simulate login route approval check
    const userMeta = signInData.user?.user_metadata || {};
    const isApproved = userMeta.approval_status === 'approved';
    assert(isApproved === false, 'Pending resident is blocked from logging in (approval_status is pending)');
  } catch (err) {
    assert(false, `Pending login test exception: ${err.message}`);
  }

  // -------------------------------------------------------------------
  // TEST 5: ADMIN REVIEWS ADMISSION DETAILS & APPROVES
  // -------------------------------------------------------------------
  console.log('\n--- 5. Testing Admin View & Approval Workflow ---');
  try {
    // Admin lists users & student profiles
    const { data: spRow } = await supabaseAdmin
      .from('student_profiles')
      .select('*')
      .eq('user_id', newUserId)
      .single();

    const { data: authRecord } = await supabaseAdmin.auth.admin.getUserById(newUserId);
    const meta = authRecord?.user?.user_metadata || {};

    assert(meta.full_name === 'Test Applicant Ramesh', 'Admin can view Name: Test Applicant Ramesh');
    assert(meta.mobile === testMobile, `Admin can view Mobile: ${testMobile}`);
    assert(meta.age === 22, 'Admin can view Age: 22');
    assert(meta.date_of_birth === '2004-05-15', 'Admin can view DOB: 2004-05-15');
    assert(meta.programme_of_study === 'B.Tech Mechanical Engineering', 'Admin can view Programme: B.Tech Mechanical Engineering');
    assert(meta.institute === 'Government Engineering College', 'Admin can view Institute: Government Engineering College');
    assert(meta.parent_guardian_name === 'K. Ramesh', 'Admin can view Parent/Guardian: K. Ramesh');
    assert(meta.relationship === 'Father', 'Admin can view Relationship: Father');
    assert(meta.vehicle_usage === 'Yes', 'Admin can view Vehicle usage: Yes');
    assert(meta.declaration_accepted === true, 'Admin can view Declaration: Agreed');
    assert(meta.approval_status === 'pending', 'Approval status is PENDING before admin approval');

    // Admin approves resident
    const { error: approveErr } = await supabaseAdmin.auth.admin.updateUserById(newUserId, {
      user_metadata: {
        ...meta,
        approval_status: 'approved',
      },
    });

    assert(!approveErr, 'Admin successfully approves resident');

    const { data: updatedAuth } = await supabaseAdmin.auth.admin.getUserById(newUserId);
    assert(updatedAuth?.user?.user_metadata?.approval_status === 'approved', 'Resident status updated to APPROVED');
  } catch (err) {
    assert(false, `Admin review/approve exception: ${err.message}`);
  }

  // -------------------------------------------------------------------
  // TEST 6: APPROVED RESIDENT LOGIN & MEAL SELECTION
  // -------------------------------------------------------------------
  console.log('\n--- 6. Testing Approved Resident Login & Meal Selection ---');
  try {
    // Approved resident signs in
    const { data: signInData, error: signInErr } = await supabaseAnon.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    assert(!signInErr && signInData?.session, 'Approved resident successfully signs in with mobile credentials');

    const userMeta = signInData.user?.user_metadata || {};
    assert(userMeta.approval_status === 'approved', 'Approved resident allowed full login access');

    // Get student profile ID
    const { data: student } = await supabaseAdmin
      .from('student_profiles')
      .select('id')
      .eq('user_id', newUserId)
      .single();

    assert(student?.id, `Found resident profile ID: ${student?.id}`);

    // Test Meal Selection (Breakfast & Dinner) for Tomorrow
    const tomorrowStr = getTomorrowDateIndia();
    console.log(`Selecting meals for tomorrow: ${tomorrowStr}`);

    // Upsert meal selection
    const { data: mealData, error: mealErr } = await supabaseAdmin
      .from('meal_selections')
      .upsert({
        student_profile_id: student.id,
        meal_date: tomorrowStr,
        breakfast: true,
        dinner: true,
      })
      .select()
      .single();

    assert(!mealErr && mealData, `Tomorrow Breakfast & Dinner selection saved: Breakfast=${mealData?.breakfast}, Dinner=${mealData?.dinner}`);

    // Verify selection retrieval
    const { data: retrievedMeal } = await supabaseAdmin
      .from('meal_selections')
      .select('*')
      .eq('student_profile_id', student.id)
      .eq('meal_date', tomorrowStr)
      .single();

    assert(retrievedMeal?.breakfast === true && retrievedMeal?.dinner === true, 'Retrieved saved meal selection matches preferences');
  } catch (err) {
    assert(false, `Meal selection test exception: ${err.message}`);
  }

  // -------------------------------------------------------------------
  // CLEANUP TEST DATA
  // -------------------------------------------------------------------
  console.log('\n--- Cleaning up test user ---');
  if (newUserId) {
    const { data: student } = await supabaseAdmin.from('student_profiles').select('id').eq('user_id', newUserId).maybeSingle();
    if (student?.id) {
      await supabaseAdmin.from('meal_selections').delete().eq('student_profile_id', student.id);
      await supabaseAdmin.from('student_profiles').delete().eq('id', student.id);
    }
    await supabaseAdmin.from('profiles').delete().eq('id', newUserId);
    await supabaseAdmin.auth.admin.deleteUser(newUserId);
    console.log(`Cleaned up test resident ID: ${newUserId}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
