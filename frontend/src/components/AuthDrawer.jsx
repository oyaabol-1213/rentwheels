import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { errorMessage } from "../api.js";

const EMPTY_SIGNUP = { name: "", phone: "", email: "", password: "", confirm: "" };
const SLIDE_MS = 500; // must match the animation time in app.css (.rw-card-* and .rw-overlay-*)

// Each card is always in one of these states. app.css has an animation for each one:
//   hidden - waiting off-screen on the right (a closed drawer)
//   enter  - slides in from the right and sits on top
//   exit   - slides back out to the right (the drawer closes)
// The card that is entering always gets the higher z-index, so it slides over the leaving one.
const CARD_CLASS = {
  hidden: "rw-card-hidden z-10",
  enter: "rw-card-enter is-active z-20",
  exit: "rw-card-exit z-10",
};
const isOnTop = (state) => state === "enter";

// Login/sign-up drawer state, panel switching, form submission, and dismissal.
// The login and sign-up panels are two "cards" stacked on the right side of the screen.
// - Opening: the card slides in from the right (hidden) to the left (visible).
// - Switching: the card that is open closes like a drawer (slides back to the right) while the
//   other card slides in, like shuffling a deck of cards.
// - Closing (click the blurred page or press Esc): the cards slide back to the right.
//
// The slides use CSS keyframe animations. They start the moment a card gets its class, so they
// do not depend on the browser having painted a "before" frame first (that is what made
// the first version unreliable).
export default function AuthDrawer() {
  const { drawer, openLogin, openSignup, closeDrawer, login, signup } = useAuth();
  const navigate = useNavigate();

  const [mounted, setMounted] = useState(false); // is the drawer in the page at all?
  const [cards, setCards] = useState({ login: "hidden", signup: "hidden" });
  const [lastPanel, setLastPanel] = useState("login"); // remembered so the right card stays on screen while closing
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState(EMPTY_SIGNUP);
  const loginEmailRef = useRef(null);
  const signupNameRef = useRef(null);

  const current = drawer || lastPanel; // the card that should be on top
  const isSignup = current === "signup";

  // Decide what every card should do whenever the drawer opens, switches or closes.
  useEffect(() => {
    if (drawer) {
      setLastPanel(drawer);
      setMounted(true);
      setCards((c) => ({
        // the card we are switching TO slides in; the other one (if it was open) closes
        login: drawer === "login" ? "enter" : isOnTop(c.login) ? "exit" : c.login,
        signup: drawer === "signup" ? "enter" : isOnTop(c.signup) ? "exit" : c.signup,
      }));
      return undefined;
    }

    // Closing: everything that is on screen slides out to the right, then the drawer is removed.
    setCards((c) => ({
      login: isOnTop(c.login) ? "exit" : c.login,
      signup: isOnTop(c.signup) ? "exit" : c.signup,
    }));
    const timer = setTimeout(() => {
      setMounted(false);
      setCards({ login: "hidden", signup: "hidden" });
    }, SLIDE_MS);
    return () => clearTimeout(timer);
  }, [drawer]);

  // Stop the page behind from scrolling and let Esc close the panel.
  useEffect(() => {
    if (!mounted) return undefined;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => event.key === "Escape" && closeDrawer();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mounted, closeDrawer]);

  // Put the cursor in the first field once the card has slid in.
  useEffect(() => {
    if (!drawer) return undefined;
    const timer = setTimeout(() => (drawer === "signup" ? signupNameRef : loginEmailRef).current?.focus({ preventScroll: true }), 400);
    return () => clearTimeout(timer);
  }, [drawer]);

  if (!mounted) return null;

  // Send login credentials and display API errors in the active panel.
  async function submitLogin(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await login(loginForm.email.trim(), loginForm.password);
      setLoginForm({ email: "", password: "" });
      closeDrawer();
      if (user.account_type === "admin") navigate("/admin");
    } catch (err) {
      setError(errorMessage(err, "Login failed."));
    } finally {
      setBusy(false);
    }
  }

  // Validate and submit a new customer account.
  async function submitSignup(e) {
    e.preventDefault();
    if (signupForm.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (signupForm.password !== signupForm.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signup({
        name: signupForm.name.trim(),
        email: signupForm.email.trim(),
        password: signupForm.password,
        phone: signupForm.phone.trim(),
      });
      setSignupForm(EMPTY_SIGNUP);
      closeDrawer();
    } catch (err) {
      setError(errorMessage(err, "Signup failed."));
    } finally {
      setBusy(false);
    }
  }

  function switchPanel(target) {
    setError("");
    if (target === "signup") openSignup();
    else openLogin();
  }

  const formInput = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100";
  const submitButton = "rw-btn w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white shadow-md shadow-orange-600/30 hover:bg-orange-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60";
  const cardBase = "rw-auth-card absolute inset-0 flex flex-col justify-center overflow-y-auto bg-white px-6 py-10 shadow-2xl sm:px-10";

  // Only a card on top of the stack can be clicked or tabbed into.
  const loginActive = isOnTop(cards.login);
  const signupActive = isOnTop(cards.signup);

  return createPortal(
    <div
      role="presentation"
      className={`fixed inset-0 z-[100] overflow-hidden bg-slate-950/50 backdrop-blur-sm ${drawer ? "rw-overlay-in" : "rw-overlay-out pointer-events-none"}`}
      onClick={(event) => event.target === event.currentTarget && closeDrawer()}
    >
      <div className="absolute right-0 top-0 h-full w-full max-w-md">
        {/* Login panel and customer sign-in form. */}
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-title"
          aria-hidden={!loginActive}
          inert={loginActive ? undefined : ""}
          className={`${cardBase} ${CARD_CLASS[cards.login]}`}
        >
          <button type="button" onClick={closeDrawer} aria-label="Close dialog" className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full text-2xl text-slate-500 transition hover:rotate-90 hover:bg-slate-100 hover:text-slate-900">×</button>
          <img style={{ "--i": 0 }} src="/needs/carIcon-removebg-preview.png" className="rw-auth-item mx-auto mb-4 h-16 w-16 object-contain" alt="RentWheels logo" />
          <p style={{ "--i": 1 }} className="rw-auth-item text-center text-xs font-bold uppercase tracking-[0.25em] text-orange-600">RentWheels</p>
          <h2 style={{ "--i": 2 }} id="login-title" className="rw-auth-item mt-2 text-center text-3xl font-bold text-slate-900">Welcome back</h2>
          <p style={{ "--i": 3 }} className="rw-auth-item mt-2 text-center text-sm text-slate-500">Log in to manage bookings and reserve a vehicle.</p>

          {error && !isSignup && <div role="alert" className="rw-pop mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

          <form onSubmit={submitLogin} className="mt-7 space-y-4">
            <label style={{ "--i": 4 }} className="rw-auth-item block text-sm font-medium text-slate-700">Email
              <input ref={loginEmailRef} className={`mt-1.5 ${formInput}`} type="email" required autoComplete="email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} />
            </label>
            <label style={{ "--i": 5 }} className="rw-auth-item block text-sm font-medium text-slate-700">Password
              <input className={`mt-1.5 ${formInput}`} type="password" required autoComplete="current-password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
            </label>
            <div style={{ "--i": 6 }} className="rw-auth-item">
              <button type="submit" disabled={busy} className={submitButton}>{busy ? "Please wait…" : "Log in"}</button>
            </div>
          </form>

          <p style={{ "--i": 7 }} className="rw-auth-item mt-6 text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <button type="button" onClick={() => switchPanel("signup")} className="font-semibold text-orange-700 underline underline-offset-2 transition hover:text-orange-900">Sign up</button>
          </p>
        </section>

        {/* Sign-up panel and new customer account form. */}
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="signup-title"
          aria-hidden={!signupActive}
          inert={signupActive ? undefined : ""}
          className={`${cardBase} ${CARD_CLASS[cards.signup]}`}
        >
          <button type="button" onClick={closeDrawer} aria-label="Close dialog" className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full text-2xl text-slate-500 transition hover:rotate-90 hover:bg-slate-100 hover:text-slate-900">×</button>
          <img style={{ "--i": 0 }} src="/needs/carIcon-removebg-preview.png" className="rw-auth-item mx-auto mb-4 h-16 w-16 object-contain" alt="RentWheels logo" />
          <p style={{ "--i": 1 }} className="rw-auth-item text-center text-xs font-bold uppercase tracking-[0.25em] text-orange-600">RentWheels</p>
          <h2 style={{ "--i": 2 }} id="signup-title" className="rw-auth-item mt-2 text-center text-3xl font-bold text-slate-900">Create your account</h2>
          <p style={{ "--i": 3 }} className="rw-auth-item mt-2 text-center text-sm text-slate-500">Sign up to start planning your trip.</p>

          {error && isSignup && <div role="alert" className="rw-pop mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

          <form onSubmit={submitSignup} className="mt-7 space-y-3">
            <input style={{ "--i": 4 }} ref={signupNameRef} className={`rw-auth-item ${formInput}`} type="text" placeholder="Full name" autoComplete="name" required value={signupForm.name} onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })} />
            <input style={{ "--i": 5 }} className={`rw-auth-item ${formInput}`} type="tel" placeholder="Phone number" autoComplete="tel" value={signupForm.phone} onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })} />
            <input style={{ "--i": 6 }} className={`rw-auth-item ${formInput}`} type="email" placeholder="Email" autoComplete="email" required value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} />
            <input style={{ "--i": 7 }} className={`rw-auth-item ${formInput}`} type="password" placeholder="Password (at least 6 characters)" autoComplete="new-password" minLength={6} required value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} />
            <input style={{ "--i": 8 }} className={`rw-auth-item ${formInput}`} type="password" placeholder="Confirm password" autoComplete="new-password" required value={signupForm.confirm} onChange={(e) => setSignupForm({ ...signupForm, confirm: e.target.value })} />
            <div style={{ "--i": 9 }} className="rw-auth-item">
              <button type="submit" disabled={busy} className={submitButton}>{busy ? "Please wait…" : "Create account"}</button>
            </div>
          </form>

          <p style={{ "--i": 10 }} className="rw-auth-item mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <button type="button" onClick={() => switchPanel("login")} className="font-semibold text-orange-700 underline underline-offset-2 transition hover:text-orange-900">Log in</button>
          </p>
        </section>
      </div>
    </div>,
    document.body
  );
}