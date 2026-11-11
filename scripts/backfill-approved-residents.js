/**
 * ============================================================================
 * SHANTHIBAVANAM HOSTEL MANAGEMENT SYSTEM
 * One-Time Safe Approval Backfill Utility
 * ============================================================================
 * 
 * Purpose:
 *   Backfills `app_metadata.approval_status = 'approved'` for existing residents
 *   whose approval was recorded in `user_metadata.approval_status === 'approved'`
 *   prior to the strict server authorization overhaul.
 * 
 * Safety Guarantees:
 *   - Runs in DRY-RUN mode by default. No data is changed without `--commit`.
 *   - Only updates users where `user_metadata.approval_status === 'approved'`.
 *   - Strictly preserves all existing `app_metadata` keys (...currentAppMeta).
 *   - Does NOT touch user_metadata, passwords, emails, phones, or database rows.
 *   - Leaves legitimate pending applicants (user_metadata !== 'approved') untouched.
 * 
 * Usage:
 *   Dry-Run (Safe Inspection, No Writes):
 *     node scripts/backfill-approved-residents.js
 *     or: node scripts/backfill-approved-residents.js --dry-run
 * 
 *   Execute Backfill (Applies Updates):
 *     node scripts/backfill-approved-residents.js --commit
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Safely load .env.local without external dependencies
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
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

// 2. Validate Supabase Admin credentials
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in environment or .env.local.');
  process.exit(1);
}

// 3. Initialize server-only Supabase Admin Client
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 4. Fetch all users using complete pagination
async function fetchAllAuthUsers() {
  let allUsers = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Failed to list Supabase auth users: ${error.message}`);
    }

    const users = data?.users || [];
    allUsers = allUsers.concat(users);

    if (users.length < perPage) {
      break;
    }
    page++;
  }

  return allUsers;
}

// 5. Main Execution Function
async function main() {
  const isCommitMode = process.argv.includes('--commit');
  const isDryRun = !isCommitMode;

  console.log('\n======================================================================');
  console.log(` SHANTHIBAVANAM: RESIDENT APPROVAL BACKFILL UTILITY`);
  console.log(` Mode: ${isCommitMode ? '⚠️  COMMIT MODE (Live Database Updates)' : '🔍 DRY-RUN MODE (No Changes Will Be Made)'}`);
  console.log('======================================================================\n');

  console.log('📡 Connecting to Supabase and fetching all user accounts...');
  const users = await fetchAllAuthUsers();
  console.log(`✓ Retrieved ${users.length} total user accounts from Supabase Auth.\n`);

  // Classify users
  const candidatesToUpdate = [];
  const alreadyApproved = [];
  const pendingApplicants = [];
  const adminUsers = [];

  for (const user of users) {
    const role = user.app_metadata?.role || user.user_metadata?.role || '';
    const isAdmin = String(role).trim().toLowerCase() === 'admin';
    const userMetaApproval = user.user_metadata?.approval_status;
    const appMetaApproval = user.app_metadata?.approval_status;

    if (isAdmin) {
      adminUsers.push(user);
    } else if (appMetaApproval === 'approved') {
      alreadyApproved.push(user);
    } else if (userMetaApproval === 'approved') {
      // Candidate: user was seeded/approved in user_metadata, but app_metadata is missing 'approved'
      candidatesToUpdate.push(user);
    } else {
      // Legitimate pending applicants (or unapproved accounts)
      pendingApplicants.push(user);
    }
  }

  // Summary breakdown
  console.log('--- USER ACCOUNT AUDIT BREAKDOWN ---');
  console.log(`• Administrator accounts:                           ${adminUsers.length}`);
  console.log(`• Already approved in app_metadata:                ${alreadyApproved.length}`);
  console.log(`• Pending admission applicants (will NOT be touched): ${pendingApplicants.length}`);
  console.log(`• Eligible existing residents to backfill:          ${candidatesToUpdate.length}`);
  console.log('------------------------------------\n');

  if (candidatesToUpdate.length === 0) {
    console.log('✨ All existing approved residents already have app_metadata.approval_status = "approved".');
    console.log('   No backfill updates are required.\n');
    return;
  }

  // List candidate details
  console.log(`📋 Found ${candidatesToUpdate.length} existing resident(s) needing app_metadata backfill:\n`);
  candidatesToUpdate.forEach((user, idx) => {
    const meta = user.user_metadata || {};
    const appMeta = user.app_metadata || {};
    const name = meta.full_name || 'N/A';
    const mobile = meta.mobile || user.phone || 'N/A';
    const room = meta.room_number ? `Room ${meta.room_number}` : 'No Room';
    console.log(`  [${String(idx + 1).padStart(2, '0')}] ${name.padEnd(26)} | Mobile: ${mobile.padEnd(12)} | ${room.padEnd(10)} | User ID: ${user.id}`);
    console.log(`       Current app_metadata: ${JSON.stringify(appMeta)}`);
    console.log(`       Target app_metadata:  ${JSON.stringify({ ...appMeta, approval_status: 'approved' })}\n`);
  });

  if (isDryRun) {
    console.log('======================================================================');
    console.log('ℹ️  DRY-RUN COMPLETE: No changes have been applied to the database.');
    console.log(`   To update all ${candidatesToUpdate.length} accounts, execute the command with --commit:`);
    console.log('   ');
    console.log('   node scripts/backfill-approved-residents.js --commit');
    console.log('======================================================================\n');
    return;
  }

  // Execute commit updates
  console.log('======================================================================');
  console.log(`⚡ APPLYING UPDATES TO ${candidatesToUpdate.length} RESIDENT ACCOUNTS...`);
  console.log('======================================================================\n');

  let successCount = 0;
  let failureCount = 0;

  for (const user of candidatesToUpdate) {
    const currentAppMeta = user.app_metadata || {};
    const updatedAppMeta = {
      ...currentAppMeta,
      approval_status: 'approved',
    };

    try {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        {
          app_metadata: updatedAppMeta,
        }
      );

      if (updateError) {
        console.error(`❌ [FAIL] ${user.user_metadata?.full_name || user.id}: ${updateError.message}`);
        failureCount++;
      } else {
        console.log(`✅ [UPDATED] ${user.user_metadata?.full_name || 'Resident'} (${user.user_metadata?.mobile || user.id})`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ [EXCEPTION] ${user.id}: ${err.message}`);
      failureCount++;
    }
  }

  console.log('\n======================================================================');
  console.log(' BACKFILL EXECUTION SUMMARY');
  console.log(` • Successfully updated: ${successCount}`);
  console.log(` • Failed updates:        ${failureCount}`);
  console.log('======================================================================\n');
}

main().catch((err) => {
  console.error('\n❌ Fatal execution error:', err.message);
  process.exit(1);
});

