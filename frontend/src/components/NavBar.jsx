import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import AuthDrawer from "./AuthDrawer.jsx";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/vehicles", label: "Vehicles" },
  { to: "/tour-van", label: "Tour Van" },
  { to: "/about", label: "About Us" },
];

export default function NavBar() {
  const { user, isLoggedIn, isAdmin, logout, openLogin } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8" aria-label="Main navigation">
          <Link className="flex min-w-0 items-center gap-3" to="/">
            <img className="h-11 w-11 shrink-0 object-contain" src="/needs/carIcon-removebg-preview.png" alt="RentWheels logo" />
            <span className="min-w-0">
              <span className="block truncate text-lg font-bold leading-tight text-slate-900">RentWheels</span>
              <span className="block truncate text-[10px] uppercase tracking-[0.18em] text-slate-500">Bicol Tourist Van Rental</span>
            </span>
          </Link>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-700 sm:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="text-xl" aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
          </button>

          <div className={`${menuOpen ? "flex" : "hidden"} absolute left-0 right-0 top-full flex-col gap-1 border-b border-slate-200 bg-white p-4 shadow-lg sm:static sm:flex sm:flex-1 sm:flex-row sm:items-center sm:justify-center sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none`}>
            {LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                aria-current={pathname === to ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  pathname === to ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {label}
              </Link>
            ))}
            <a href="#footer" onClick={() => setMenuOpen(false)} className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Contact</a>
          </div>

          <div className={`${menuOpen ? "flex" : "hidden"} items-center gap-2 sm:flex`}>
            {isLoggedIn ? (
              <div className="relative">
                <button
                  type="button"
                  aria-expanded={profileOpen}
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-orange-300"
                >
                  <img className="h-8 w-8 rounded-full object-cover" src={user.avatar_url} alt="" />
                  <span className="max-w-28 truncate">Hi, {user.first_name}</span>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    <Link onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100" to="/profile">Edit profile</Link>
                    <Link onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100" to="/my-bookings">My bookings</Link>
                    {isAdmin && <Link onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100" to="/admin">Admin panel</Link>}
                    <button onClick={handleLogout} type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50">Log out</button>
                  </div>
                )}
              </div>
            ) : (
              <button type="button" onClick={openLogin} className="rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700">Log in</button>
            )}
          </div>
        </nav>
      </header>
      <AuthDrawer />
    </>
  );
}
