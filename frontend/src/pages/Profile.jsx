import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { useDocumentTitle } from "../hooks.js";

const EMPTY_PASSWORD = { current_password: "", new_password: "", confirm_password: "" };

export default function Profile() {
  useDocumentTitle("My Profile | RentWheels");
  const { user, loading, isAdmin, setUser, logout, openLogin } = useAuth();
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState(EMPTY_PASSWORD);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const inputClass = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100";

  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true });
      openLogin();
    }
  }, [loading, user, navigate, openLogin]);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  async function saveProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    const body = new FormData();
    body.append("name", name);
    body.append("phone", phone);
    if (file) body.append("profile_image", file);
    try {
      const { data } = await api.post("/profile", body);
      setUser(data.user);
      setFile(null);
      setNotice({ type: "success", text: "Profile updated successfully." });
    } catch (error) {
      setNotice({ type: "error", text: errorMessage(error) });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setSavingPassword(true);
    try {
      const { data } = await api.post("/profile/password", password);
      setPassword(EMPTY_PASSWORD);
      setNotice({ type: "success", text: data.message });
    } catch (error) {
      setNotice({ type: "error", text: errorMessage(error) });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-slate-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3" to="/">
          <img className="h-12 w-12 object-contain" src="/needs/carIcon-removebg-preview.png" alt="RentWheels logo" />
          <span><strong className="block text-lg text-slate-900">RentWheels</strong><small className="text-xs uppercase tracking-[0.16em] text-slate-500">Account settings</small></span>
        </Link>
        <nav className="flex flex-wrap justify-end gap-2 text-sm font-semibold">
          {isAdmin && <Link className="rounded-full border border-slate-300 px-4 py-2 text-slate-700 hover:bg-white" to="/admin">Admin panel</Link>}
          <Link className="rounded-full border border-slate-300 px-4 py-2 text-slate-700 hover:bg-white" to="/my-bookings">My bookings</Link>
          <button type="button" onClick={handleLogout} className="rounded-full bg-slate-900 px-4 py-2 text-white hover:bg-slate-700">Log out</button>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        {notice && <div role="status" className={`mb-5 rounded-xl border px-4 py-3 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{notice.text}</div>}
        <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <section className="h-fit rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">
            <img className="mx-auto h-28 w-28 rounded-full border-4 border-orange-100 object-cover" src={user.avatar_url} alt="Profile" />
            <h1 className="mt-4 text-2xl font-bold text-slate-950">{user.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{user.email}</p>
            <p className="mt-1 text-sm text-slate-500">{user.phone || "No phone number yet"}</p>
            <span className="mt-4 inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-700">{user.role}</span>
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold text-slate-950">Edit profile</h2>
              <form className="mt-5 space-y-4" onSubmit={saveProfile}>
                <label className="block text-sm font-medium text-slate-700">Full name
                  <input className={inputClass} type="text" required maxLength={150} value={name} onChange={(event) => setName(event.target.value)} />
                </label>
                <label className="block text-sm font-medium text-slate-700">Phone number
                  <input className={inputClass} type="tel" maxLength={30} placeholder="09xx xxx xxxx" value={phone} onChange={(event) => setPhone(event.target.value)} />
                </label>
                <label className="block text-sm font-medium text-slate-700">Profile image
                  <input className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white p-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:font-semibold file:text-orange-700" type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                </label>
                <button type="submit" disabled={savingProfile} className="rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">{savingProfile ? "Saving…" : "Save profile"}</button>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold text-slate-950">Change password</h2>
              <form className="mt-5 space-y-4" onSubmit={changePassword}>
                {[
                  ["current_password", "Current password", "current-password"],
                  ["new_password", "New password", "new-password"],
                  ["confirm_password", "Confirm new password", "new-password"],
                ].map(([field, label, autocomplete]) => (
                  <label key={field} className="block text-sm font-medium text-slate-700">{label}
                    <input className={inputClass} type="password" autoComplete={autocomplete} required minLength={field === "current_password" ? undefined : 6} value={password[field]} onChange={(event) => setPassword({ ...password, [field]: event.target.value })} />
                  </label>
                ))}
                <button type="submit" disabled={savingPassword} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{savingPassword ? "Updating…" : "Update password"}</button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
