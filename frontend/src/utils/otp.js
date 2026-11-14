// Pure string rules behind the 6-box OTP field, kept separate from React so they are easy to test.
// The code is always one string of digits, filled from left to right.
export const OTP_LENGTH = 6;

const onlyDigits = (text) => String(text ?? "").replace(/\D/g, "");

/**
 * Typing (or autofilling) into box `index`. `boxText` is what the box contains after the keystroke.
 * Returns the new code and the box that should get the cursor next (undefined = leave it where it is).
 */
export function typeIntoBox(value, index, boxText) {
  const typed = onlyDigits(boxText);

  // The digit was deleted: remove it and close the gap.
  if (!typed) {
    return { next: value.slice(0, index) + value.slice(index + 1), focusIndex: undefined };
  }

  // A filled box only takes the newest character; an empty box can take several (phone autofill).
  const replacing = index < value.length;
  const incoming = replacing ? typed.slice(-1) : typed;
  const next = (value.slice(0, index) + incoming + value.slice(replacing ? index + 1 : index)).slice(0, OTP_LENGTH);

  return { next, focusIndex: Math.min(index + incoming.length, OTP_LENGTH - 1) };
}

/** Backspace in an EMPTY box: step back one box and erase the digit that was there. */
export function backspaceInEmptyBox(value, index) {
  return { next: value.slice(0, index - 1), focusIndex: index - 1 };
}

/** Pasting text: keep the first 6 digits. Returns null when the clipboard has no digits at all. */
export function pasteCode(text) {
  const next = onlyDigits(text).slice(0, OTP_LENGTH);
  if (!next) return null;
  return { next, focusIndex: next.length >= OTP_LENGTH ? OTP_LENGTH - 1 : next.length };
}
