import { useEffect, useRef } from "react";
import { backspaceInEmptyBox, OTP_LENGTH as LENGTH, pasteCode, typeIntoBox } from "../utils/otp.js";

// Six single-digit boxes that behave like one code field:
// typing moves forward, Backspace moves back, and pasting a full code fills every box.
// `value` is the code typed so far (a string of up to 6 digits); `onChange` receives the new string.
// Change `focusKey` to move the cursor back to the first empty box (used after an error or a resend).
export default function OtpInput({ value, onChange, disabled = false, invalid = false, focusKey = 0 }) {
  const refs = useRef([]);
  const digits = Array.from({ length: LENGTH }, (_, index) => value[index] || "");

  // React state only updates after an event handler finishes, but we move focus *inside* the handler.
  // This ref always holds the newest code length so the focus rule below never uses a stale value.
  const lengthRef = useRef(value.length);
  lengthRef.current = value.length;

  useEffect(() => {
    refs.current[Math.min(value.length, LENGTH - 1)]?.focus();
    // Only re-run when the parent asks for focus, not on every digit typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  const focusBox = (index) => refs.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus();

  // Save the new code and (optionally) move the cursor.
  function commit(next, focusIndex) {
    lengthRef.current = next.length;
    onChange(next);
    if (focusIndex !== undefined) focusBox(focusIndex);
  }

  function handleChange(index, event) {
    const { next, focusIndex } = typeIntoBox(value, index, event.target.value);
    commit(next, focusIndex);
  }

  function handleKeyDown(index, event) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const { next, focusIndex } = backspaceInEmptyBox(value, index);
      commit(next, focusIndex);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(Math.min(index + 1, lengthRef.current));
    }
  }

  function handlePaste(event) {
    const pasted = pasteCode(event.clipboardData.getData("text"));
    if (!pasted) return;
    event.preventDefault();
    commit(pasted.next, pasted.focusIndex);
  }

  // Boxes fill left to right: clicking a box past the end jumps to the first empty one.
  function handleFocus(index, event) {
    if (index > lengthRef.current) focusBox(lengthRef.current);
    else event.target.select();
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label="6-digit verification code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          aria-invalid={invalid || undefined}
          value={digit}
          disabled={disabled}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => handleFocus(index, event)}
          className={`h-12 w-11 rounded-xl border bg-white text-center text-xl font-semibold text-slate-900 outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 sm:h-14 sm:w-12 ${
            invalid
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
              : "border-slate-300 hover:border-slate-400 focus:border-orange-500 focus:ring-orange-100"
          }`}
        />
      ))}
    </div>
  );
}
