/**
 * Test Residents Seeding Utility
 * 
 * Prepares 10 test resident accounts in the Supabase database for testing on local or deployed Vercel.
 * Does NOT hardcode passwords or test users in the application bundle.
 * 
 * Usage:
 *   node scripts/seed-test-residents.js <password>
 * or:
 *   TEST_PASSWORD="YourSecurePassword" node scripts/seed-test-residents.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Load .env.local if present
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...rest] = trimmed.split('=');
        const val = rest.join('=').trim();
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const testPassword = process.env.TEST_PASSWORD || process.argv[2];

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in environment or .env.local.');
  process.exit(1);
}

if (!testPassword || testPassword.length < 6) {
  console.error('Error: Please provide a password of at least 6 characters.');
  console.error('Usage: node scripts/seed-test-residents.js <password>');
  console.error('   or: TEST_PASSWORD="your_password" node scripts/seed-test-residents.js');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testResidents = [
  { full_name: 'Aarav Sharma', mobile: '9800000001', room_number: '101' },
  { full_name: 'Bhavna Patel', mobile: '9800000002', room_number: '102' },
  { full_name: 'Chetan Rao', mobile: '9800000003', room_number: '103' },
  { full_name: 'Deepa Nair', mobile: '9800000004', room_number: '104' },
  { full_name: 'Eshwar Kumar', mobile: '9800000005', room_number: '105' },
  { full_name: 'Farhan Ali', mobile: '9800000006', room_number: '106' },
  { full_name: 'Gayathri Menon', mobile: '9800000007', room_number: '107' },
  { full_name: 'Harish Verma', mobile: '9800000008', room_number: '108' },
  { full_name: 'Ishita Roy', mobile: '9800000009', room_number: '109' },
  { full_name: 'Jayesh Pillai', mobile: '9800000010', room_number: '110' },
];

async function seed() {
  console.log('Connecting to Supabase at:', supabaseUrl);
  console.log(`Starting seeding of ${testResidents.length} test resident accounts...\n`);

  const { data: userData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list existing auth users:', listError.message);
    process.exit(1);
  }

  const existingUsers = userData?.users || [];
  let createdCount = 0;
  let backfilledCount = 0;
  let existingCount = 0;

  for (const resident of testResidents) {
    const internalEmail = `${resident.mobile}@shanthibavanam.local`;
    const existingUser = existingUsers.find(
      (u) => u.email?.toLowerCase() === internalEmail.toLowerCase() || u.user_metadata?.mobile === resident.mobile
    );

    let userId = existingUser?.id;

    try {
      if (!userId) {
        // 1. Create Auth user if missing
        const { data: newAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: internalEmail,
          password: testPassword,
          email_confirm: true,
          user_metadata: {
            role: 'student',
            approval_status: 'approved',
            mobile: resident.mobile,
            full_name: resident.full_name,
            room_number: resident.room_number,
          },
        });

        if (authError || !newAuth?.user) {
          console.error(`- [ERROR] Failed to create auth user for ${resident.full_name}:`, authError?.message);
          continue;
        }

        userId = newAuth.user.id;
        console.log(`+ [AUTH CREATED] ${resident.full_name} (${resident.mobile})`);
        createdCount++;
      } else {
        console.log(`- [AUTH EXISTS] ${resident.full_name} (${resident.mobile}) -> User ID: ${userId}`);
      }

      // 2. Ensure profiles record exists
      const { error: profError } = await supabaseAdmin.from('profiles').upsert({
        id: userId,
        full_name: resident.full_name,
        role: 'student',
      });

      if (profError) {
        console.error(`  -> [ERROR] Failed to upsert profiles for ${resident.full_name}:`, profError.message);
      }

      // 3. Ensure student_profiles record exists (WITHOUT non-existent approval_status column)
      const { data: existingSp, error: checkSpErr } = await supabaseAdmin
        .from('student_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingSp) {
        console.log(`  -> student_profiles already present (ID: ${existingSp.id})`);
        existingCount++;
      } else {
        const { data: newSp, error: spError } = await supabaseAdmin
          .from('student_profiles')
          .insert({
            user_id: userId,
            full_name: resident.full_name,
            room_number: resident.room_number,
            personal_contact: resident.mobile,
            permanent_address: 'Resident Hostel Block',
            emergency_contact: '9999999999',
            fee_status: 'paid',
          })
          .select()
          .single();

        if (spError) {
          console.error(`  -> [ERROR] student_profiles insert failed for ${resident.full_name}:`, spError.message);
        } else {
          console.log(`  -> [BACKFILLED] student_profiles row created (ID: ${newSp.id}) for Room ${resident.room_number}`);
          backfilledCount++;
        }
      }
    } catch (err) {
      console.error(`- [EXCEPTION] Error processing ${resident.full_name}:`, err.message);
    }
  }

  console.log(`\nOperation completed: ${createdCount} Auth users created, ${backfilledCount} student_profiles backfilled, ${existingCount} already complete.`);
  console.log('Login credentials: Use mobile number (e.g. 9800000001) and your test password.');
}

seed().catch((err) => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
