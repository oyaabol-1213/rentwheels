import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

const statusClass = {
  Pending: "bg-amber-100 text-amber-800 ring-amber-200",
  Confirmed: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  Cancelled: "bg-rose-100 text-rose-800 ring-rose-200",
  Completed: "bg-sky-100 text-sky-800 ring-sky-200",
};

// "14:30" -> "2:30 PM"
function formatTime(value) {
  if (!value) return "";
  const [hour, minute] = value.split(":").map(Number);
  if (Number.isNaN(hour)) return value;
  return `${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

// One small "label + value" line; hidden when the booking has no value (older bookings).
function Detail({ label, value }) {
  if (!value) return null;
  return <div><span className="block text-xs uppercase tracking-[0.2em] text-slate-400">{label}</span>{value}</div>;
}

function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Customer booking history with status display and pending-booking cancellation.
export default function MyBookings() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [bookings, setBookings] = useState({ vehicle_bookings: [], tour_bookings: [] });
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [notice, setNotice] = useState(null);

  const loadBookings = async () => {
    try {
      const { data } = await api.get("/my-bookings");
      setBookings(data);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/", { replace: true });
        return;
      }
      setNotice({ type: "error", text: errorMessage(err, "Unable to load your bookings.") });
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true });
      return;
    }

    if (user) {
      loadBookings();
    }
  }, [loading, user, navigate]);

  const cancelBooking = async (type, id) => {
    if (!window.confirm("Cancel this booking?")) return;
    setUpdating(id);
    setNotice(null);
    try {
      await api.patch(`/${type}-bookings/${id}/cancel`);
      await loadBookings();
    } catch (err) {
      setNotice({ type: "error", text: errorMessage(err, "Unable to cancel this booking.") });
    } finally {
      setUpdating(null);
    }
  };

  async function handleLogout(e) {
    e.preventDefault();
    await logout();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-slate-50 text-slate-800">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3" to="/">
          <img src="/needs/carIcon-removebg-preview.png" alt="RentWheels logo" className="h-12 w-12" />
          <div>
            <div className="text-lg font-bold text-slate-900">RentWheels</div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">My Bookings</div>
          </div>
        </Link>

        <nav className="flex items-center gap-3 text-sm font-medium">
          <Link to="/profile" className="rounded-full border border-slate-300 px-3 py-2 text-slate-700 hover:border-slate-500">Profile</Link>
          <Link to="/" className="rounded-full border border-orange-300 bg-orange-50 px-3 py-2 text-orange-700 hover:bg-orange-100">Back Home</Link>
          <button type="button" onClick={handleLogout} className="rounded-full bg-slate-900 px-3 py-2 text-white hover:bg-slate-700">Log out</button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Account</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Your booking history</h1>
          <p className="mt-2 text-slate-600">Track your vehicle and tour bookings and cancel pending requests before they are approved.</p>
        </div>

        {notice && <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${notice.type === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{notice.text}</div>}

        {loadingBookings ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading bookings…</div>
        ) : (
          <>
            {/* Vehicle reservation history and cancellation controls. */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Vehicle bookings</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">{bookings.vehicle_bookings.length} total</span>
              </div>

              {bookings.vehicle_bookings.length === 0 ? (
                <p className="text-slate-500">No vehicle bookings yet.</p>
              ) : (
                <div className="space-y-4">
                  {bookings.vehicle_bookings.map((booking) => (
                    <article key={booking.id} className="rw-fade-up rounded-2xl border border-slate-200 bg-slate-50 p-4 transition duration-300 hover:border-orange-200 hover:bg-white hover:shadow-md">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Vehicle rental</div>
                          <h3 className="mt-1 text-xl font-semibold text-slate-900">{booking.vehicle_name}</h3>
                          <p className="mt-1 text-sm text-slate-600">Booked for {booking.customer_name}</p>
                        </div>

                        <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClass[booking.status] || "bg-slate-100 text-slate-700 ring-slate-200"}`}>
                          {booking.status}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-4">
                        <div><span className="block text-xs uppercase tracking-[0.2em] text-slate-400">Pick-up</span>{formatDate(booking.pickup_date)}</div>
                        <div><span className="block text-xs uppercase tracking-[0.2em] text-slate-400">Return</span>{formatDate(booking.return_date)}</div>
                        <div><span className="block text-xs uppercase tracking-[0.2em] text-slate-400">Duration</span>{booking.rental_days} day(s)</div>
                        <div><span className="block text-xs uppercase tracking-[0.2em] text-slate-400">Total</span>{booking.total_price}</div>
                      </div>
                      <div className="mt-3 grid gap-3 border-t border-slate-200 pt-3 text-sm text-slate-600 md:grid-cols-4">
                        <Detail label="Mobile" value={booking.phone} />
                        <Detail label="Driver's license" value={booking.license_number} />
                        <Detail label="Pick-up time" value={formatTime(booking.pickup_time)} />
                        <Detail label="Pick-up location" value={booking.pickup_location} />
                        <div className="md:col-span-4"><Detail label="Special requests" value={booking.notes} /></div>
                      </div>
                      {booking.add_ons?.length > 0 && <p className="mt-3 text-sm text-slate-600">Add-ons: {booking.add_ons.map((addon) => `${addon.label} × ${addon.quantity}`).join(", ")} <span className="font-semibold">({booking.addon_total})</span></p>}

                      {booking.status === "Pending" && (
                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            disabled={updating === booking.id}
                            onClick={() => cancelBooking("vehicle", booking.id)}
                            className="rw-btn rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {updating === booking.id ? "Cancelling…" : "Cancel booking"}
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Tour reservation history and cancellation controls. */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Tour bookings</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">{bookings.tour_bookings.length} total</span>
              </div>

              {bookings.tour_bookings.length === 0 ? (
                <p className="text-slate-500">No tour bookings yet.</p>
              ) : (
                <div className="space-y-4">
                  {bookings.tour_bookings.map((booking) => (
                    <article key={booking.id} className="rw-fade-up rounded-2xl border border-slate-200 bg-slate-50 p-4 transition duration-300 hover:border-orange-200 hover:bg-white hover:shadow-md">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tour van</div>
                          <h3 className="mt-1 text-xl font-semibold text-slate-900">{booking.vehicle_name}</h3>
                          <p className="mt-1 text-sm text-slate-600">Booked by {booking.customer_name}</p>
                        </div>

                        <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClass[booking.status] || "bg-slate-100 text-slate-700 ring-slate-200"}`}>
                          {booking.status}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-4">
                        <div><span className="block text-xs uppercase tracking-[0.2em] text-slate-400">Tour date</span>{formatDate(booking.pickup_date)}</div>
                        <div><span className="block text-xs uppercase tracking-[0.2em] text-slate-400">Guests</span>{booking.guests}</div>
                        <div><span className="block text-xs uppercase tracking-[0.2em] text-slate-400">Phone</span>{booking.phone}</div>
                        <div><span className="block text-xs uppercase tracking-[0.2em] text-slate-400">Total</span>{booking.total_price}</div>
                      </div>
                      <div className="mt-3 grid gap-3 border-t border-slate-200 pt-3 text-sm text-slate-600 md:grid-cols-4">
                        <Detail label="Pick-up time" value={formatTime(booking.pickup_time)} />
                        <Detail label="Pick-up location" value={booking.pickup_location} />
                        <Detail label="Emergency contact" value={booking.emergency_contact ? `${booking.emergency_contact} (${booking.emergency_phone || "—"})` : ""} />
                        <div className="md:col-span-4"><Detail label="Special requests" value={booking.notes} /></div>
                      </div>
                      {booking.add_ons?.length > 0 && <p className="mt-3 text-sm text-slate-600">Add-ons: {booking.add_ons.map((addon) => `${addon.label} × ${addon.quantity}`).join(", ")} <span className="font-semibold">({booking.addon_total})</span></p>}

                      {booking.status === "Pending" && (
                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            disabled={updating === booking.id}
                            onClick={() => cancelBooking("tour", booking.id)}
                            className="rw-btn rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {updating === booking.id ? "Cancelling…" : "Cancel booking"}
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
