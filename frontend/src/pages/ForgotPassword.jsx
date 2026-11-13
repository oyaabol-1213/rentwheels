import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api.js";
import { useDocumentTitle } from "../hooks.js";

// Password recovery page: request a code, verify it, and pass the reset token onward.
export default function ForgotPassword() {
  useDocumentTitle("Forgot Password | RentWheels");
  const navigate = useNavigate();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  // Request or resend the email verification code.
  async function sendCode(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.post("/forgot-password", { email: email.trim() });
      setMessage(data.message);
      setStep("code");
      setResendSeconds(60);
    } catch (requestError) {
      setError(errorMessage(requestError, "We couldn't send a reset code. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  // Verify the emailed code before allowing the password to be changed.
  async function verifyCode(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/verify-password-reset-code", {
        email: email.trim(),
        code,
      });
      navigate("/reset-password", {
        state: { email: email.trim(), resetToken: data.reset_token },
      });
    } catch (requestError) {
      setError(errorMessage(requestError, "That code is invalid or has expired."));
    } finally {
      setBusy(false);
    }
  }

  // Return to the email step and clear the previous verification state.
  function changeEmail() {
    setStep("email");
    setCode("");
    setMessage("");
    setError("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-orange-50 via-white to-slate-50 px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-10">
        <Link to="/" className="mx-auto mb-4 block w-fit">
          <img src="/needs/carIcon-removebg-preview.png" className="h-16 w-16 object-contain" alt="RentWheels logo" />
        </Link>
        <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-orange-600">RentWheels</p>
        <h1 className="mt-2 text-center text-3xl font-bold text-slate-900">{step === "email" ? "Forgot password?" : "Enter your 6-digit code"}</h1>
        <p className="mt-3 text-center text-sm text-slate-500">
          {step === "email"
            ? "Enter your email and we’ll send you a code to reset your password."
            : `If an account exists for ${email.trim()}, a reset code has been sent.`}
        </p>

        {message && <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
        {error && <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

        {step === "email" ? (
          <form onSubmit={sendCode} className="mt-7 space-y-5">
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white shadow-md shadow-orange-600/30 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? "Sending…" : "Send reset code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="mt-7 space-y-5">
            <label className="block text-sm font-medium text-slate-700">
              6-digit code
              <input
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-lg tracking-[0.45em] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </label>
            <button type="submit" disabled={busy || code.length !== 6} className="w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white shadow-md shadow-orange-600/30 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? "Verifying…" : "Verify code"}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={changeEmail} className="font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900">Change email</button>
              <button
                type="button"
                onClick={sendCode}
                disabled={busy || resendSeconds > 0}
                className="font-semibold text-orange-700 underline underline-offset-2 hover:text-orange-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}

        <Link to="/" className="mt-6 block text-center text-sm font-semibold text-orange-700 underline underline-offset-2 hover:text-orange-900">
          Return to log in
        </Link>
      </section>
    </main>
  );
}
