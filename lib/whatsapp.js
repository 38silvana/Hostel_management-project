/**
 * WhatsApp Helper Utilities for Shanthibavanam Hostel Management System
 */

/**
 * Normalizes and validates a phone number for WhatsApp wa.me links.
 * Returns the international format string (without '+' or leading zeros),
 * or null if the number is missing or invalid.
 *
 * Examples:
 * - "9876543210" -> "919876543210"
 * - "+91 98765 43210" -> "919876543210"
 * - "09876543210" -> "919876543210"
 * - "919876543210" -> "919876543210"
 * - "1234" -> null
 * - "" / null / undefined -> null
 *
 * @param {string|number} phone 
 * @returns {string|null}
 */
export function formatWhatsAppPhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');

  if (!digits || digits.length < 10) {
    return null;
  }

  // Reject invalid patterns (e.g. all zeros)
  if (/^0+$/.test(digits)) {
    return null;
  }

  // Standard 10-digit Indian mobile number: prefix with India country code 91
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // 11 digits starting with 0 (e.g. 09876543210): drop 0 and prepend 91
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }

  // 12 digits starting with 91: already in full Indian international format
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }

  // Valid international format (10 to 15 digits)
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  return null;
}

/**
 * Builds a clean, professional WhatsApp text message for an individual resident's monthly bill.
 * Only includes fields that are actually available in the current billing/resident data.
 *
 * @param {object} bill - The resident's bill record
 * @param {string} [monthName] - The billing month name (e.g. "March")
 * @param {number|string} [year] - The billing year (e.g. 2026)
 * @returns {string}
 */
export function buildResidentBillingMessage(bill = {}, monthName = '', year = '') {
  const {
    student_name,
    room_number,
    total_ticks,
    extra_ticks,
    mess_fee,
    hostel_rent,
    total_bill,
  } = bill;

  const lines = [];

  lines.push('*Shanthibavanam Hostel - Monthly Billing Statement*');

  if (monthName && year) {
    lines.push(`*Billing Month:* ${monthName} ${year}`);
  } else if (monthName) {
    lines.push(`*Billing Month:* ${monthName}`);
  }

  lines.push('');
  lines.push('*Resident Details:*');
  if (student_name) {
    lines.push(`• *Name:* ${student_name}`);
  }
  if (room_number) {
    lines.push(`• *Room No:* ${room_number}`);
  }

  lines.push('');
  lines.push('*Fee Breakdown:*');

  if (total_ticks !== undefined && total_ticks !== null) {
    lines.push(`• *Total Meal Ticks:* ${total_ticks}`);
  }

  if (extra_ticks !== undefined && extra_ticks !== null) {
    if (extra_ticks > 0) {
      lines.push(`• *Extra Ticks:* +${extra_ticks} (above 30 base limit)`);
    } else {
      lines.push(`• *Extra Ticks:* 0 (within 30 base limit)`);
    }
  }

  if (mess_fee !== undefined && mess_fee !== null) {
    lines.push(`• *Mess Fee:* ₹${Number(mess_fee).toLocaleString('en-IN')}`);
  }

  if (hostel_rent !== undefined && hostel_rent !== null) {
    lines.push(`• *Hostel Rent:* ₹${Number(hostel_rent).toLocaleString('en-IN')}`);
  }

  if (total_bill !== undefined && total_bill !== null) {
    lines.push('--------------------------------');
    lines.push(`*Total Amount Payable:* ₹${Number(total_bill).toLocaleString('en-IN')}`);
    lines.push('--------------------------------');
  }

  lines.push('');
  lines.push('_Please review and pay your dues on or before the due date._');
  lines.push('_Shanthibavanam Hostel Administration_');

  return lines.join('\n');
}

/**
 * Generates the standard wa.me URL for the resident's bill.
 * Returns null if the phone number is invalid or missing.
 *
 * @param {object} bill 
 * @param {string} monthName 
 * @param {number|string} year 
 * @returns {string|null}
 */
export function getWhatsAppBillingUrl(bill, monthName, year) {
  const phone = formatWhatsAppPhone(bill?.personal_contact);
  if (!phone) return null;

  const text = buildResidentBillingMessage(bill, monthName, year);
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * Triggers WhatsApp share for a resident's bill.
 * Validates the contact number first; if invalid/missing, invokes onError callback.
 * If valid, opens the standard wa.me URL in a new window/tab so admin can review and press Send.
 *
 * @param {object} bill 
 * @param {string} monthName 
 * @param {number|string} year 
 * @param {function} [onError] 
 * @returns {boolean} True if opened, false if validation failed
 */
export function shareResidentBillOnWhatsApp(bill, monthName, year, onError) {
  const phone = formatWhatsAppPhone(bill?.personal_contact);
  const studentName = bill?.student_name || 'Resident';

  if (!phone) {
    const errorMsg = `Cannot share on WhatsApp: Resident "${studentName}" does not have a valid registered mobile number. Please check their contact details in Resident Management.`;
    if (typeof onError === 'function') {
      onError(errorMsg);
    } else if (typeof window !== 'undefined') {
      alert(errorMsg);
    }
    return false;
  }

  const text = buildResidentBillingMessage(bill, monthName, year);
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return true;
}

/**
 * Builds a clean, professional WhatsApp text message for the daily meal & tick report.
 * Contains:
 * - Shanthibavanam Hostel header
 * - Selected date
 * - Breakfast total count & names of all residents who selected Breakfast
 * - Dinner total count & names of all residents who selected Dinner
 * - Overall total meal ticks
 *
 * @param {object} dailyData - Daily food sheet data (from /api/meals)
 * @param {string} [selectedDate] - Date string (YYYY-MM-DD)
 * @param {string} [dateLabel] - Human-readable date label
 * @returns {string}
 */
export function buildDailyMealReportMessage(dailyData = {}, selectedDate = '', dateLabel = '') {
  const sheet = dailyData.sheet || [];
  const totalBreakfast = dailyData.total_breakfast_count || 0;
  const totalDinner = dailyData.total_dinner_count || 0;
  const totalTicks = totalBreakfast + totalDinner;

  const breakfastResidents = sheet
    .filter((r) => r.breakfast)
    .map((r) => (r.room_number ? `${r.full_name} (Room ${r.room_number})` : r.full_name));

  const dinnerResidents = sheet
    .filter((r) => r.dinner)
    .map((r) => (r.room_number ? `${r.full_name} (Room ${r.room_number})` : r.full_name));

  const lines = [];

  lines.push('*Shanthibavanam Hostel - Daily Meal & Tick Report*');
  lines.push(`*Date:* ${dateLabel || selectedDate || 'Today'}`);
  lines.push('');
  lines.push('*Summary:*');
  lines.push(`• *Breakfast Total:* ${totalBreakfast}`);
  lines.push(`• *Dinner Total:* ${totalDinner}`);
  lines.push(`• *Overall Total Meal Ticks:* ${totalTicks}`);
  lines.push('');

  lines.push('--------------------------------');
  lines.push(`*Breakfast Selections (${breakfastResidents.length}):*`);
  if (breakfastResidents.length === 0) {
    lines.push('_No residents opted for Breakfast_');
  } else {
    breakfastResidents.forEach((name, idx) => {
      lines.push(`${idx + 1}. ${name}`);
    });
  }
  lines.push('');

  lines.push('--------------------------------');
  lines.push(`*Dinner Selections (${dinnerResidents.length}):*`);
  if (dinnerResidents.length === 0) {
    lines.push('_No residents opted for Dinner_');
  } else {
    dinnerResidents.forEach((name, idx) => {
      lines.push(`${idx + 1}. ${name}`);
    });
  }
  lines.push('');

  lines.push('--------------------------------');
  lines.push('_Report generated from Shanthibavanam Hostel Management System._');

  return lines.join('\n');
}

/**
 * Generates the standard wa.me URL for the daily meal report sent to Admin WhatsApp.
 * Returns null if the admin phone number is invalid or missing.
 *
 * @param {string|number} adminPhone 
 * @param {object} dailyData 
 * @param {string} selectedDate 
 * @param {string} dateLabel 
 * @returns {string|null}
 */
export function getDailyMealReportWhatsAppUrl(adminPhone, dailyData, selectedDate, dateLabel) {
  const phone = formatWhatsAppPhone(adminPhone);
  if (!phone) return null;

  const text = buildDailyMealReportMessage(dailyData, selectedDate, dateLabel);
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * Triggers WhatsApp share of the daily meal report to the Admin's WhatsApp number.
 * Validates the admin phone number first; if invalid/missing, invokes onError callback.
 * If valid, opens standard wa.me URL in a new window/tab so admin can review and press Send.
 *
 * @param {string|number} adminPhone 
 * @param {object} dailyData 
 * @param {string} selectedDate 
 * @param {string} dateLabel 
 * @param {function} [onError] 
 * @returns {boolean} True if opened, false if validation failed
 */
export function shareDailyMealReportOnWhatsApp(adminPhone, dailyData, selectedDate, dateLabel, onError) {
  const phone = formatWhatsAppPhone(adminPhone);

  if (!phone) {
    const errorMsg = 'Admin WhatsApp number is not configured or invalid. Please set your WhatsApp number to receive daily meal reports.';
    if (typeof onError === 'function') {
      onError(errorMsg);
    } else if (typeof window !== 'undefined') {
      alert(errorMsg);
    }
    return false;
  }

  const text = buildDailyMealReportMessage(dailyData, selectedDate, dateLabel);
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return true;
}

