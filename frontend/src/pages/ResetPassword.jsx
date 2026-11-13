import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import api, { errorMessage } from "../api.js";
import { useDocumentTitle } from "../hooks.js";

// Set a new password using the short-lived token issued after code verification.
export default function ResetPassword() {
  useDocumentTitle("Reset Password | RentWheels");
  const { state } = useLocation();
  const email = state?.email || "";
  const token = state?.resetToken || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!email || !token) return <Navigate to="/forgot-password" replace />;

  // Submit and confirm the new password through the password-reset API.
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.post("/reset-password", {
        token,
        email,
        password,
        password_confirmation: confirmPassword,
      });
      setMessage(data.message);
      setPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(errorMessage(requestError, "We couldn't reset your password. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-orange-50 via-white to-slate-50 px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-10">
        <Link to="/" className="mx-auto mb-4 block w-fit">
          <img src="/needs/carIcon-removebg-preview.png" className="h-16 w-16 object-contain" alt="RentWheels logo" />
        </Link>
        <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-orange-600">RentWheels</p>
        <h1 className="mt-2 text-center text-3xl font-bold text-slate-900">Set a new password</h1>
        <p className="mt-3 text-center text-sm text-slate-500">Choose a new password for {email}.</p>

        {message && (
          <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message} <Link to="/" className="font-semibold underline">Return to log in</Link>
          </div>
        )}
        {error && <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

        {!message && (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              New password
              <input
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Confirm new password
              <input
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white shadow-md shadow-orange-600/30 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? "Resetting…" : "Reset password"}
            </button>
          </form>
        )}

        {!message && <Link to="/" className="mt-6 block text-center text-sm font-semibold text-orange-700 underline underline-offset-2 hover:text-orange-900">Return to log in</Link>}
      </section>
    </main>
  );
}
