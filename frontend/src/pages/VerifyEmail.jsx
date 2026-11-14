import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import OtpInput from "../components/OtpInput.jsx";
import { useDocumentTitle } from "../hooks.js";

const PENDING_KEY = "rw_pending_verification_email";
const RESEND_SECONDS = 60;

// Remember only the email (never the code) so a page refresh does not lose the verification screen.
function readPendingEmail() {
  try {
    return sessionStorage.getItem(PENDING_KEY) || "";
  } catch {
    return "";
  }
}
function savePendingEmail(email) {
  try {
    sessionStorage.setItem(PENDING_KEY, email);
  } catch {
    /* storage can be blocked; the screen still works for this visit */
  }
}
function clearPendingEmail() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* nothing to clear */
  }
}

// Email verification page: enter the 6-digit code sent after sign-up (or after a blocked login).
export default function VerifyEmail() {
  useDocumentTitle("Verify Email | RentWheels");
  const { state } = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const email = state?.email || readPendingEmail();
  const [code, setCode] = useState("");
  const [focusKey, setFocusKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resendSeconds, setResendSeconds] = useState(state?.resendIn ?? 0);

  useEffect(() => {
    if (state?.email) savePendingEmail(state.email);
  }, [state]);

  // Tick the resend countdown down once per second.
  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  // After a successful verification, show the success message briefly and then go home (already signed in).
  useEffect(() => {
    if (!verified) return undefined;
    const timer = setTimeout(() => navigate("/", { replace: true }), 1800);
    return () => clearTimeout(timer);
  }, [verified, navigate]);

  if (!email) return <Navigate to="/" replace />;

  // Send the code to the server, which is the only place that decides whether it is correct.
  async function verify(event) {
    event.preventDefault();
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.post("/verify-email-otp", { email, code });
      clearPendingEmail();
      setUser(data.user);
      setVerified(true);
    } catch (requestError) {
      setError(errorMessage(requestError, "We couldn't verify that code. Please try again."));
      setCode("");
      setFocusKey((key) => key + 1);
    } finally {
      setBusy(false);
    }
  }

  // Ask for a new code; the previous one stops working immediately.
  async function resend() {
    if (resendSeconds > 0 || resending) return;
    setResending(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.post("/resend-email-otp", { email });
      setMessage(`A new code was sent to ${email}. The previous code no longer works.`);
      setCode("");
      setFocusKey((key) => key + 1);
      setResendSeconds(data.resend_in ?? RESEND_SECONDS);
    } catch (requestError) {
      setError(errorMessage(requestError, "We couldn't resend the code. Please try again."));
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-orange-50 via-white to-slate-50 px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-10">
        <Link to="/" className="mx-auto mb-4 block w-fit">
          <img src="/needs/carIcon-removebg-preview.png" className="h-16 w-16 object-contain" alt="RentWheels logo" />
        </Link>
        <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-orange-600">RentWheels</p>
        <h1 className="mt-2 text-center text-3xl font-bold text-slate-900">{verified ? "Email verified" : "Verify your email"}</h1>

        {verified ? (
          <div role="status" className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center text-sm text-emerald-800">
            <p className="font-semibold">You're all set. Welcome to RentWheels!</p>
            <p className="mt-1">Taking you to the home page…</p>
            <Link to="/" replace className="mt-3 inline-block font-semibold underline underline-offset-2">Continue now</Link>
          </div>
        ) : (
          <>
            <p className="mt-3 text-center text-sm text-slate-500">
              We sent a 6-digit code to <span className="font-semibold text-slate-700">{email}</span>. It expires in 5 minutes.
            </p>

            {message && <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
            {error && <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

            <form onSubmit={verify} className="mt-7 space-y-6">
              <OtpInput value={code} onChange={setCode} disabled={busy} invalid={Boolean(error)} focusKey={focusKey} />
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white shadow-md shadow-orange-600/30 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Verifying…" : "Verify email"}
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-slate-500">Didn't get the code? Check your spam folder.</span>
              <button
                type="button"
                onClick={resend}
                disabled={resending || resendSeconds > 0}
                className="font-semibold text-orange-700 underline underline-offset-2 hover:text-orange-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resending ? "Sending…" : resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend code"}
              </button>
            </div>

            <Link to="/" className="mt-6 block text-center text-sm font-semibold text-orange-700 underline underline-offset-2 hover:text-orange-900">
              Back to home
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
