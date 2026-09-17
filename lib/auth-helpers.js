/**
 * Normalizes user identifier for authentication.
 * If user enters a 10-digit mobile number, converts to internal standard email format:
 * e.g., "9876543210" -> "9876543210@shanthibavanam.local"
 * If user enters an email address (e.g. for admin accounts), keeps it intact.
 */
export function normalizeIdentifierToEmail(identifier) {
  if (!identifier) return '';
  const trimmed = identifier.trim();

  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }

  // Extract clean 10-digit mobile number
  const digits = trimmed.replace(/\D/g, '');
  const cleanMobile = digits.length >= 10 ? digits.slice(-10) : digits;

  return `${cleanMobile}@shanthibavanam.local`;
}

/**
 * Extracts 10-digit mobile number from string
 */
export function extractCleanMobile(input) {
  if (!input) return '';
  const digits = String(input).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}
