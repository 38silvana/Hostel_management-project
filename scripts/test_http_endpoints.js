const fs = require('fs');
const path = require('path');

// Load env
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

const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const BASE_URL = 'http://localhost:3009';

async function testHttpEndpoints() {
  console.log('='.repeat(70));
  console.log(' LIVE HTTP ENDPOINT INTEGRATION TESTS (PORT 3009)');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  const testMobile = '9876543777';
  const testEmail = `${testMobile}@shanthibavanam.local`;
  const testPassword = 'AdmissionPass123!';

  // Clean up any existing test user with this mobile
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const prevUser = existingUsers?.users?.find((u) => u.email === testEmail || u.user_metadata?.mobile === testMobile);
  if (prevUser) {
    await supabaseAdmin.from('student_profiles').delete().eq('user_id', prevUser.id);
    await supabaseAdmin.from('profiles').delete().eq('id', prevUser.id);
    await supabaseAdmin.auth.admin.deleteUser(prevUser.id);
  }

  // 1. Food Window Status Endpoint
  console.log('\n--- 1. Testing GET /api/meals?mode=window-status ---');
  try {
    const res = await fetch(`${BASE_URL}/api/meals?mode=window-status`);
    const data = await res.json();
    assert(res.status === 200, 'HTTP 200 from meals window-status endpoint');
    assert(data.windowLabel === '10:00 AM to 10:00 PM', `Window label is "10:00 AM to 10:00 PM": ${data.windowLabel}`);
    assert(data.startLabel === '10:00 AM', `Start label is "10:00 AM": ${data.startLabel}`);
    assert(data.cutoffLabel === '10:00 PM', `Cutoff label is "10:00 PM": ${data.cutoffLabel}`);
  } catch (err) {
    assert(false, `Window status exception: ${err.message}`);
  }

  // 2. Photo Upload Endpoint
  console.log('\n--- 2. Testing POST /api/upload-photo ---');
  let uploadedPhotoUrl = null;
  try {
    const dummyJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xFF, 0xD9]);
    const blob = new Blob([dummyJpeg], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('photo', blob, 'applicant_passport.jpg');

    const res = await fetch(`${BASE_URL}/api/upload-photo`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    assert(res.status === 200 && data.success && data.photo_url, `Photo uploaded successfully to Supabase Storage: ${data.photo_url}`);
    uploadedPhotoUrl = data.photo_url;
  } catch (err) {
    assert(false, `Photo upload exception: ${err.message}`);
  }

  // 3. Signup Rejection Without Declaration
  console.log('\n--- 3. Testing POST /api/auth/signup Without Declaration ---');
  try {
    const payloadNoDecl = {
      full_name: 'Suresh Kumar',
      mobile: testMobile,
      age: 21,
      date_of_birth: '2005-04-10',
      permanent_address: 'Kozhikode, Kerala',
      parent_guardian_name: 'K. Kumar',
      emergency_contact: '9876543000',
      room_number: '102',
      password: testPassword,
      declaration_accepted: false, // NOT ACCEPTED
    };

    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadNoDecl),
    });

    const data = await res.json();
    assert(res.status === 400 && data.error && data.error.includes('declaration'), `Signup blocked when declaration not accepted (HTTP 400): ${data.error}`);
  } catch (err) {
    assert(false, `Declaration test exception: ${err.message}`);
  }

  // 4. Complete Admission Application Submission
  console.log('\n--- 4. Testing POST /api/auth/signup With Full Admission Details ---');
  let createdUserId = null;
  try {
    const admissionPayload = {
      full_name: 'Suresh Kumar',
      mobile: testMobile,
      age: 21,
      date_of_birth: '2005-04-10',
      permanent_address: 'Door 15/42, Green Valley, Calicut, Kerala - 673001',
      profile_photo_url: uploadedPhotoUrl,
      programme_of_study: 'B.Com Finance',
      institute: 'Devagiri College, Calicut',
      firm_details: 'Accounts Trainee at ABC Financial Services',
      parent_guardian_name: 'K. Kumar',
      relationship: 'Father',
      occupation: 'Bank Officer',
      parent_contact: '9876543111',
      parent_address: 'Door 15/42, Green Valley, Calicut, Kerala',
      emergency_contact: '9876543222',
      vehicle_usage: 'Yes',
      date_of_admission: '2026-10-01',
      room_number: '104A',
      password: testPassword,
      declaration_accepted: true,
    };

    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(admissionPayload),
    });

    const data = await res.json();
    assert(res.status === 201 && data.success, `Admission Application submitted (HTTP 201): ${data.message}`);
    assert(data.user && data.user.approval_status === 'pending', 'User created in PENDING approval status');
    createdUserId = data.user.id;
  } catch (err) {
    assert(false, `Admission submission exception: ${err.message}`);
  }

  // 5. Test Login Before Approval
  console.log('\n--- 5. Testing POST /api/auth/login As Pending Resident ---');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testMobile, password: testPassword }),
    });

    const data = await res.json();
    assert(res.status === 403 && data.isPending === true, `Pending resident blocked from logging in (HTTP 403): ${data.error}`);
  } catch (err) {
    assert(false, `Pending login exception: ${err.message}`);
  }

  // 6. Test Admin Retrieval of Admission Details
  console.log('\n--- 6. Testing GET /api/students ---');
  let studentProfileId = null;
  try {
    const res = await fetch(`${BASE_URL}/api/students?search=${testMobile}`);
    const list = await res.json();
    assert(res.status === 200 && Array.isArray(list), 'Admin students API returned HTTP 200');

    const resident = list.find((s) => s.user_id === createdUserId || s.personal_contact === testMobile);
    assert(resident !== undefined, `Found resident in admin list (Profile ID #${resident?.id})`);
    studentProfileId = resident?.id;

    assert(resident?.full_name === 'Suresh Kumar', `Admin sees Full Name: ${resident?.full_name}`);
    assert(resident?.personal_contact === testMobile, `Admin sees Mobile: ${resident?.personal_contact}`);
    assert(resident?.age === 21, `Admin sees Age: ${resident?.age}`);
    assert(resident?.date_of_birth === '2005-04-10', `Admin sees DOB: ${resident?.date_of_birth}`);
    assert(resident?.programme_of_study === 'B.Com Finance', `Admin sees Programme: ${resident?.programme_of_study}`);
    assert(resident?.institute === 'Devagiri College, Calicut', `Admin sees Institute: ${resident?.institute}`);
    assert(resident?.firm_details === 'Accounts Trainee at ABC Financial Services', `Admin sees Firm Details: ${resident?.firm_details}`);
    assert(resident?.parent_guardian_name === 'K. Kumar', `Admin sees Parent: ${resident?.parent_guardian_name}`);
    assert(resident?.relationship === 'Father', `Admin sees Relationship: ${resident?.relationship}`);
    assert(resident?.vehicle_usage === 'Yes', `Admin sees Vehicle: ${resident?.vehicle_usage}`);
    assert(resident?.declaration_accepted === true, 'Admin sees Declaration Accepted: true');
    assert(resident?.approval_status === 'pending', 'Admin sees Status: pending');
    assert(resident?.profile_photo_url && resident.profile_photo_url.includes('resident-photos'), `Admin sees Photo URL: ${resident?.profile_photo_url}`);
    assert(resident?.password === undefined, 'Resident password is NOT returned');
  } catch (err) {
    assert(false, `Admin students list exception: ${err.message}`);
  }

  // 7. Test Admin Approval
  console.log('\n--- 7. Testing POST /api/students/:id/approve ---');
  try {
    const res = await fetch(`${BASE_URL}/api/students/${studentProfileId}/approve`, {
      method: 'POST',
    });
    const data = await res.json();
    assert(res.status === 200 && data.success, `Admin approved resident (HTTP 200): ${data.message}`);
  } catch (err) {
    assert(false, `Approve exception: ${err.message}`);
  }

  // 8. Test Approved Resident Login
  console.log('\n--- 8. Testing POST /api/auth/login As Approved Resident ---');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testMobile, password: testPassword }),
    });

    const data = await res.json();
    assert(res.status === 200 && data.session, `Approved resident logged in with mobile number (HTTP 200): Welcome ${data.user?.full_name}`);
    assert(data.user?.approval_status === 'approved', 'User session approval_status is approved');
  } catch (err) {
    assert(false, `Approved login exception: ${err.message}`);
  }

  // 9. Test /api/students/me
  console.log('\n--- 9. Testing GET /api/students/me ---');
  try {
    const res = await fetch(`${BASE_URL}/api/students/me?user_id=${createdUserId}`);
    const data = await res.json();
    assert(res.status === 200, 'Resident me profile endpoint returned HTTP 200');
    assert(data.full_name === 'Suresh Kumar', `Profile full_name matches: ${data.full_name}`);
    assert(data.programme_of_study === 'B.Com Finance', `Profile programme matches: ${data.programme_of_study}`);
    assert(data.vehicle_usage === 'Yes', `Profile vehicle matches: ${data.vehicle_usage}`);
  } catch (err) {
    assert(false, `Students me exception: ${err.message}`);
  }

  // Clean up
  console.log('\n--- Cleaning up test user ---');
  if (createdUserId) {
    await supabaseAdmin.from('student_profiles').delete().eq('user_id', createdUserId);
    await supabaseAdmin.from('profiles').delete().eq('id', createdUserId);
    await supabaseAdmin.auth.admin.deleteUser(createdUserId);
    console.log(`Cleaned up test user ${createdUserId}.`);
  }

  console.log('\n' + '='.repeat(70));
  console.log(` HTTP INTEGRATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

testHttpEndpoints().catch((e) => {
  console.error('Fatal HTTP test error:', e);
  process.exit(1);
});
