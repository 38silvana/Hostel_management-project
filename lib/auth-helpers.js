/**
 * Normalizes user identifier for authentication.
 * - If user enters an email address (e.g. for admin accounts), lowercases and keeps it intact.
 * - If user enters admin/warden alias, maps to admin email.
 * - If user enters a 10-digit mobile number, converts to internal standard email format:
 *   e.g., "9876543210" -> "9876543210@shanthibavanam.local"
 */
export function normalizeIdentifierToEmail(identifier) {
  if (!identifier) return '';
  const trimmed = identifier.trim();

  // If already an email address, normalize to lowercase
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }

  const lower = trimmed.toLowerCase();

  // Support direct administrator aliases entered in the identifier field
  if (lower === 'admin' || lower === 'administrator' || lower === 'warden') {
    return 'admin@shanthibavanam.local';
  }

  // Extract digits for mobile number normalization
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 10) {
    const cleanMobile = digits.slice(-10);
    return `${cleanMobile}@shanthibavanam.local`;
  }

  if (digits.length > 0) {
    return `${digits}@shanthibavanam.local`;
  }

  // Fallback for alphanumeric username identifiers
  return `${lower}@shanthibavanam.local`;
}

/**
 * Extracts 10-digit mobile number from string
 */
export function extractCleanMobile(input) {
  if (!input) return '';
  const digits = String(input).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}
