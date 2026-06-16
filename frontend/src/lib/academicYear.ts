// Academic-year configuration and roll-number → semester helpers.
//
// The portal tracks fee receipts per academic year. `CURRENT_ACADEMIC_YEAR`
// is the year students upload for now; older years are read-only history.
//
// Roll numbers encode the joining year in their first two digits
// (e.g. "23R21A1285" → joined 2023). For a given academic year a student's
// first (odd) semester is derived from how many years they've been studying.

export const CURRENT_ACADEMIC_YEAR = "2026-27";

// Newest first; drives the picker order.
export const SELECTABLE_ACADEMIC_YEARS = ["2026-27", "2025-26"];

/** "2026-27" -> 2026 */
export function academicStartYear(academicYear: string): number {
  return parseInt(academicYear.slice(0, 4), 10);
}

/**
 * Expected first (odd) semester for a roll number in a given academic year.
 * Examples for 2026-27: 23R2…→7, 24R2…→5, 25R2…→3.
 * Returns null when the roll prefix can't be parsed or the result is out of
 * the 1–8 range, so callers can fall back to manual selection.
 */
export function getSemesterForRoll(
  rollNo: string | undefined | null,
  academicYear: string
): number | null {
  if (!rollNo || rollNo.length < 2) return null;

  const joinYY = parseInt(rollNo.slice(0, 2), 10);
  const startYear = academicStartYear(academicYear);
  if (isNaN(joinYY) || isNaN(startYear)) return null;

  const studyYear = startYear - (2000 + joinYY) + 1; // 1st, 2nd, 3rd, 4th …
  const semester = (studyYear - 1) * 2 + 1; // first (odd) semester of that year

  if (semester < 1 || semester > 8) return null;
  return semester;
}
