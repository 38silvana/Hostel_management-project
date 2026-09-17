// Shanthibavanam Hostel Configuration Settings

export const HOSTEL_NAME = 'Shanthibavanam';
export const HOSTEL_SUBTITLE = 'Hostel Management & Meal Tracking System';

/**
 * Configurable Evening Food Marking Window.
 * Default: 5:00 PM (17:00) until 10:00 PM (22:00) IST.
 * 
 * To change cutoff time in the future:
 * - For 11:00 PM cutoff: change CUTOFF_HOUR to 23
 * - For 12:00 AM (midnight) cutoff: change CUTOFF_HOUR to 24 (or 0)
 */
export const FOOD_WINDOW_CONFIG = {
  START_HOUR: 17,       // 5:00 PM (24-hour format)
  START_MINUTE: 0,
  CUTOFF_HOUR: 22,      // 10:00 PM (24-hour format)
  CUTOFF_MINUTE: 0,
  START_LABEL: '5:00 PM',
  CUTOFF_LABEL: '10:00 PM',
  WINDOW_LABEL: '5:00 PM to 10:00 PM',
};

/**
 * Returns current date & time components in Indian Standard Time (Asia/Kolkata).
 * Works consistently across both client browser and Vercel/Node.js servers regardless of host timezone.
 */
export function getIndiaTime(referenceDate = new Date()) {
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = istFormatter.formatToParts(referenceDate);
  const partMap = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  let hour = parseInt(partMap.hour, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(partMap.minute, 10);
  const second = parseInt(partMap.second, 10);
  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10); // 1-12
  const day = parseInt(partMap.day, 10);

  const displayHours = hour % 12 || 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formatted12Hr = `${displayHours}:${minute.toString().padStart(2, '0')} ${ampm}`;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    formatted24Hr: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
    formatted12Hr,
  };
}

/**
 * Computes tomorrow's date string (YYYY-MM-DD) based on India Standard Time.
 */
export function getTomorrowDateIndia(referenceDate = new Date()) {
  const ist = getIndiaTime(referenceDate);
  const d = new Date(Date.UTC(ist.year, ist.month - 1, ist.day));
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split('T')[0];
}

/**
 * Checks if the current time in Asia/Kolkata is within the configured evening window.
 * Requirement:
 * - Before 5:00 PM (17:00 IST) -> CLOSED (opens at 5:00 PM)
 * - 5:00 PM to before 10:00 PM (17:00 - 21:59 IST) -> OPEN
 * - At or after 10:00 PM (>= 22:00 IST) -> CLOSED & LOCKED
 *
 * @param {Date} [referenceDate] - Optional reference date
 * @returns {{ isOpen: boolean, message: string, currentTimeIST: string, status: string, startLabel: string, cutoffLabel: string, windowLabel: string }}
 */
export function isFoodWindowOpen(referenceDate = new Date()) {
  const ist = getIndiaTime(referenceDate);
  const currentMinutes = ist.hour * 60 + ist.minute;
  const startMinutes = FOOD_WINDOW_CONFIG.START_HOUR * 60 + FOOD_WINDOW_CONFIG.START_MINUTE;
  const cutoffMinutes = FOOD_WINDOW_CONFIG.CUTOFF_HOUR * 60 + FOOD_WINDOW_CONFIG.CUTOFF_MINUTE;

  // Case 1: Before 5:00 PM IST
  if (currentMinutes < startMinutes) {
    return {
      isOpen: false,
      currentTimeIST: ist.formatted12Hr,
      message: `Food selection is currently closed. It will open at ${FOOD_WINDOW_CONFIG.START_LABEL} today (Evening window: ${FOOD_WINDOW_CONFIG.WINDOW_LABEL}).`,
      status: 'before_window',
      startLabel: FOOD_WINDOW_CONFIG.START_LABEL,
      cutoffLabel: FOOD_WINDOW_CONFIG.CUTOFF_LABEL,
      windowLabel: FOOD_WINDOW_CONFIG.WINDOW_LABEL,
    };
  }

  // Case 2: At or after 10:00 PM IST
  if (currentMinutes >= cutoffMinutes) {
    return {
      isOpen: false,
      currentTimeIST: ist.formatted12Hr,
      message: `The ${FOOD_WINDOW_CONFIG.CUTOFF_LABEL} cutoff time has passed. Tomorrow's food selection is closed and locked.`,
      status: 'cutoff_passed',
      startLabel: FOOD_WINDOW_CONFIG.START_LABEL,
      cutoffLabel: FOOD_WINDOW_CONFIG.CUTOFF_LABEL,
      windowLabel: FOOD_WINDOW_CONFIG.WINDOW_LABEL,
    };
  }

  // Case 3: Within open window (5:00 PM to before 10:00 PM IST)
  return {
    isOpen: true,
    currentTimeIST: ist.formatted12Hr,
    message: `Food selection is OPEN until ${FOOD_WINDOW_CONFIG.CUTOFF_LABEL} today (Evening window: ${FOOD_WINDOW_CONFIG.WINDOW_LABEL}).`,
    status: 'open',
    startLabel: FOOD_WINDOW_CONFIG.START_LABEL,
    cutoffLabel: FOOD_WINDOW_CONFIG.CUTOFF_LABEL,
    windowLabel: FOOD_WINDOW_CONFIG.WINDOW_LABEL,
  };
}

// Monthly Mess Billing Rates
export const BILLING_RATES = {
  HOSTEL_RENT: 2700,     // ₹2700 fixed monthly hostel rent
  BASE_MESS_FEE: 1800,   // ₹1800 base mess fee for up to 30 ticks
  BASE_TICK_LIMIT: 30,   // Up to 30 ticks included in base
  EXTRA_TICK_RATE: 55,   // ₹55 per extra tick above 30
};

/**
 * Calculates monthly fee breakdown given total meal ticks.
 * @param {number} totalTicks 
 * @returns {{ totalTicks: number, extraTicks: number, messFee: number, hostelRent: number, totalBill: number }}
 */
export function calculateMonthlyBill(totalTicks = 0) {
  const validTicks = Math.max(0, parseInt(totalTicks, 10) || 0);
  const extraTicks = Math.max(0, validTicks - BILLING_RATES.BASE_TICK_LIMIT);
  const messFee = BILLING_RATES.BASE_MESS_FEE + (extraTicks * BILLING_RATES.EXTRA_TICK_RATE);
  const hostelRent = BILLING_RATES.HOSTEL_RENT;
  const totalBill = hostelRent + messFee;

  return {
    totalTicks: validTicks,
    extraTicks,
    messFee,
    hostelRent,
    totalBill,
  };
}
