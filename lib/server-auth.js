import 'server-only';
import { supabaseAdmin } from './supabase-admin';

/**
 * Extracts and verifies the Supabase access token from the request Authorization header.
 * Resolves the authenticated user, their role (from profiles and metadata), and approval status.
 *
 * @param {Request} request
 * @returns {Promise<{ user: any, role: string, isAdmin: boolean, isApproved: boolean, approvalStatus: string } | { error: string, status: number }>}
 */
export async function getAuthenticatedUser(request) {
  if (!supabaseAdmin) {
    return {
      error: 'Supabase admin configuration is missing on server.',
      status: 500,
    };
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

  if (!token) {
    return {
      error: 'Authentication required. Please log in.',
      status: 401,
    };
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return {
      error: 'Invalid or expired session. Please log in again.',
      status: 401,
    };
  }

  const user = userData.user;

  // 1. Strictly query public.profiles table for admin role verification
  let dbRole = null;
  try {
    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!pErr && profile?.role) {
      dbRole = profile.role;
    }
  } catch (err) {
    console.warn('Could not query profiles in server-auth:', err?.message);
  }

  // SECURITY: Only a verified 'admin' record in public.profiles grants administrative access.
  // We NEVER trust user_metadata.role for authorization or privilege escalation.
  const isAdmin = String(dbRole || '').trim().toLowerCase() === 'admin';
  const role = isAdmin ? 'admin' : 'student';

  // SECURITY: Server-controlled app_metadata.approval_status is the SOLE authority for approval.
  // We NEVER trust user_metadata.approval_status for authorization.
  // Missing or non-approved approval_status defaults strictly to 'pending'.
  const rawApproval = user.app_metadata?.approval_status;
  const approvalStatus = isAdmin
    ? 'approved'
    : (rawApproval === 'approved' ? 'approved' : 'pending');

  const isApproved = isAdmin || approvalStatus === 'approved';

  return {
    user,
    role,
    isAdmin,
    isApproved,
    approvalStatus,
  };
}

/**
 * Enforces that the request is made by an authenticated Administrator.
 *
 * @param {Request} request
 * @returns {Promise<{ user: any, role: string, isAdmin: true } | { error: string, status: number }>}
 */
export async function requireAdmin(request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) {
    return auth;
  }

  if (!auth.isAdmin) {
    return {
      error: 'Access forbidden: Administrator privileges required.',
      status: 403,
    };
  }

  return auth;
}

/**
 * Enforces that the request is made by an authenticated, approved Resident (or Admin).
 * Also returns their associated student_profiles record.
 *
 * @param {Request} request
 * @returns {Promise<{ user: any, role: string, isAdmin: boolean, studentProfile: any } | { error: string, status: number }>}
 */
export async function requireResident(request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) {
    return auth;
  }

  if (!auth.isAdmin && !auth.isApproved) {
    return {
      error: 'Access forbidden: Your account is pending administrator approval.',
      status: 403,
    };
  }

  // Retrieve student profile for this authenticated user
  const { data: studentProfile, error: spErr } = await supabaseAdmin
    .from('student_profiles')
    .select('*')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (spErr) {
    console.warn('Error fetching student profile in requireResident:', spErr.message);
  }

  // Fails closed if student profile record is missing or query fails
  if (!auth.isAdmin && (!studentProfile || spErr)) {
    return {
      error: 'Access forbidden: Student profile record not found or could not be loaded.',
      status: 403,
    };
  }

  return {
    ...auth,
    studentProfile: studentProfile || null,
  };
}

