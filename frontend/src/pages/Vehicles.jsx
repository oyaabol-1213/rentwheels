import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import AvailabilityCalendar, { rangeHasBookedDate } from "../components/AvailabilityCalendar.jsx";
import NavBar from "../components/NavBar.jsx";
import Footer from "../components/Footer.jsx";
import { BookingSuccessModal, ConfirmBookingModal } from "../components/BookingModals.jsx";
import { CATEGORY_TABS, needsUrl, withMeta } from "../data/vehicleCatalog.js";
import { formatDisplayDate, formatPeso, priceNumber, rentalDays, todayISO } from "../utils/money.js";
import { cleanPhone, formatLicenseNumber, formatTime, isValidLicense, isValidPhone } from "../utils/validators.js";
import { useDocumentTitle } from "../hooks.js";

// Quick suggestions for the pick-up location box (the customer can still type anything).
const PICKUP_SUGGESTIONS = ["RentWheels Legazpi City Service Hub", "Bicol International Airport, Daraga"];

// Colors for the status badge shown on each vehicle card.
const STATUS_BADGE = {
  Available: "bg-emerald-500 text-white",
  Limited: "bg-amber-400 text-amber-950",
  Unavailable: "bg-slate-800 text-white",
};

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition hover:border-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100";

const futureISO = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

// Vehicle catalog, availability lookup, and customer vehicle reservation form.
export default function Vehicles() {
  useDocumentTitle("Vehicles | RentWheels");
  const { user, isLoggedIn, isAdmin, openLogin } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabKey, setTabKey] = useState("featured");
  const [chosen, setChosen] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [license, setLicense] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [success, setSuccess] = useState(null);
  const [pickup, setPickup] = useState("");
  const [ret, setRet] = useState("");
  const [dateMode, setDateMode] = useState("pickup");
  const [bookedRanges, setBookedRanges] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    api.get("/vehicles")
      .then(({ data }) => setVehicles(data.vehicles.map(withMeta)))
      .catch((err) => setNotice({ type: "error", text: errorMessage(err, "Could not load vehicles.") }))
      .finally(() => setLoading(false));
  }, []);

  const tabs = useMemo(() => {
    const bookable = vehicles.filter((vehicle) => vehicle.type !== "Tour Van");
    const covered = new Set();
    CATEGORY_TABS.forEach((tab) => bookable.filter(tab.match).forEach((vehicle) => covered.add(vehicle.id)));
    const others = bookable.filter((vehicle) => !covered.has(vehicle.id));
    const list = CATEGORY_TABS.map((tab) => ({ ...tab, items: bookable.filter(tab.match) }));
    if (others.length) {
      list.push({ key: "other", label: "Other", icon: "carIcon-removebg-preview.png", hero: "background.jpg", items: others });
    }
    return list;
  }, [vehicles]);

  const currentTab = tabs.find((tab) => tab.key === tabKey) || tabs[0];
  const days = rentalDays(pickup, ret);
  const dailyRate = chosen ? priceNumber(chosen.price_per_day) : 0;
  const total = days * dailyRate;
  const rangeUnavailable = rangeHasBookedDate(pickup, ret, bookedRanges);

  async function openBooking(vehicle) {
    setNotice(null);
    if (!isLoggedIn) {
      openLogin();
      return;
    }
    if (isAdmin) {
      setNotice({ type: "error", text: "Admin accounts cannot make customer bookings." });
      return;
    }
    setChosen(vehicle);
    setName(user?.name || "");
    setPhone(user?.phone || "");
    setLicense("");
    setPickupTime("");
    setPickupLocation("");
    setNotes("");
    setFormError("");
    setPickup("");
    setRet("");
    setBookedRanges([]);
    setAvailabilityError("");
    setAvailabilityLoading(true);
    try {
      const { data } = await api.get(`/vehicles/${vehicle.id}/availability`, {
        params: { from: todayISO(), to: futureISO() },
      });
      setBookedRanges(data.booked_ranges);
    } catch (err) {
      setAvailabilityError(errorMessage(err, "Could not load availability. Please try again."));
    } finally {
      setAvailabilityLoading(false);
    }
  }

  function chooseCalendarDate(date) {
    if (dateMode === "pickup") {
      setPickup(date);
      if (!ret || ret < date) setRet(date);
      setDateMode("return");
      return;
    }
    if (date < pickup) {
      setPickup(date);
      setRet("");
      setDateMode("return");
      return;
    }
    setRet(date);
  }

  // Step 1: the form is checked, then the "Are you sure?" popup opens.
  function submitBooking(event) {
    event.preventDefault();
    setFormError("");
    if (!pickup || !ret || days < 1) {
      setFormError("Please choose valid pick-up and return dates.");
      return;
    }
    if (rangeUnavailable) {
      setFormError("The selected rental dates overlap another booking.");
      return;
    }
    if (!isValidPhone(phone)) {
      setFormError("Please enter a valid mobile number, like 09123456789.");
      return;
    }
    if (!isValidLicense(license)) {
      setFormError("Please enter your driver's license number (letters, numbers and dashes only).");
      return;
    }
    if (!pickupTime) {
      setFormError("Please choose a pick-up time.");
      return;
    }
    if (!pickupLocation.trim()) {
      setFormError("Please enter where you want to pick up the vehicle.");
      return;
    }
    setConfirmError("");
    setConfirming(true);
  }

  // The details shown in the popups (same list for "Are you sure?" and "Request sent").
  const summaryRows = chosen
    ? [
        ["Vehicle", chosen.name],
        ["Daily rate", chosen.price_per_day],
        ["Name", name.trim()],
        ["Mobile number", cleanPhone(phone)],
        ["Driver's license", license.trim().toUpperCase()],
        ["Pick-up date", `${formatDisplayDate(pickup)} at ${formatTime(pickupTime)}`],
        ["Return date", formatDisplayDate(ret)],
        ["Duration", `${days} ${days === 1 ? "day" : "days"}`],
        ["Pick-up location", pickupLocation.trim()],
        ["Notes", notes.trim()],
      ]
    : [];

  // Step 2: the customer pressed "Yes, send request".
  async function sendBooking() {
    setSaving(true);
    setConfirmError("");
    try {
      const { data } = await api.post("/vehicle-bookings", {
        customer_name: name.trim(),
        vehicle_id: chosen.id,
        pickup_date: pickup,
        return_date: ret,
        phone: cleanPhone(phone),
        license_number: license.trim(),
        pickup_time: pickupTime,
        pickup_location: pickupLocation.trim(),
        notes: notes.trim(),
      });
      setSuccess({ reference: data.booking.id, rows: summaryRows, total: data.booking.total_price });
      setConfirming(false);
      setChosen(null);
    } catch (err) {
      if (err.response?.status === 401) {
        setConfirming(false);
        setChosen(null);
        openLogin();
      } else {
        setConfirmError(errorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <NavBar />
      <main>
        {/* Fleet introduction and category filters. */}
        <section className="relative flex min-h-[300px] items-center justify-center overflow-hidden px-4 py-20 text-center text-white sm:min-h-[380px]">
          <img className="absolute inset-0 h-full w-full object-cover" src={needsUrl(currentTab?.hero || "featured-Picsart-AiImageEnhancer.jpg")} alt="" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/55 to-slate-950/25" />
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-300">RentWheels Fleet</p>
            <h1 className="mt-4 text-4xl font-extrabold sm:text-6xl">Find Your Perfect Ride</h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/85">Explore our curated collection of vehicles for city trips, family adventures, and the open road.</p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
            {tabs.map((tab) => {
              const active = currentTab?.key === tab.key;
              return (
                <button
                  type="button"
                  key={tab.key}
                  aria-pressed={active}
                  onClick={() => setTabKey(tab.key)}
                  className={`group flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-4 text-center transition duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                    active ? "border-orange-500 bg-orange-50 text-slate-950 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:bg-orange-50/60"
                  }`}
                >
                  <img className="h-9 w-9 object-contain transition duration-300 group-hover:scale-110" src={`/needs/${tab.icon}`} alt="" />
                  <span className="text-sm font-semibold">{tab.label}</span>
                  {active && <span className="h-0.5 w-12 rounded-full bg-orange-600" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Filtered fleet cards and links into a rental request. */}
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-600">Explore the fleet</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">{currentTab?.label || "Vehicles"}</h2>
            </div>
            <p className="text-sm text-slate-500">Choose dates to see availability before you reserve.</p>
          </div>

          {notice && <div role="status" className={`mb-5 rounded-xl border px-4 py-3 text-sm ${notice.type === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{notice.text}</div>}

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">Loading vehicles…</div>
          ) : !currentTab?.items.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">No vehicles in this category yet.</div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {currentTab.items.map((vehicle, index) => {
                const unavailable = vehicle.status?.toLowerCase() === "unavailable";
                return (
                  <article key={`${currentTab.key}-${vehicle.id}`} style={{ animationDelay: `${index * 70}ms` }} className="rw-fade-up group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl">
                    <div className="relative h-56 overflow-hidden bg-slate-100">
                      <img className="h-full w-full object-cover transition duration-500 group-hover:scale-105" src={vehicle.imageUrl} alt={vehicle.name} />
                      {vehicle.deal && <span className="absolute left-4 top-4 rounded-full bg-orange-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">Special deal</span>}
                      {vehicle.status && vehicle.status !== "Available" && (
                        <span className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold shadow ${STATUS_BADGE[vehicle.status] || "bg-white text-slate-700"}`}>{vehicle.status}</span>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">{vehicle.type} · {vehicle.category}</p>
                      <h3 className="mt-2 text-xl font-bold text-slate-900">{vehicle.name}</h3>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {[vehicle.seats, ...vehicle.specs].map((spec) => <span key={spec} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{spec}</span>)}
                      </div>
                      <div className="mt-6 flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
                        <p><span className="block text-xs text-slate-500">Rate per day</span><strong className="text-xl text-slate-900">{vehicle.price_per_day}</strong></p>
                        <button disabled={unavailable} type="button" onClick={() => openBooking(vehicle)} className="rw-btn rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-600/30 hover:bg-orange-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">
                          {unavailable ? "Unavailable" : "Reserve"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Reservation details, rental-date calendar, and price estimate. */}
      {chosen && (
        <div className="rw-fade-in fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" onClick={(event) => event.target === event.currentTarget && !confirming && setChosen(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="booking-title" className="rw-pop my-auto w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-600">Reservation request</p>
                <h2 id="booking-title" className="mt-1 text-2xl font-bold text-slate-900">{chosen.name}</h2>
                <p className="mt-1 text-sm text-slate-500">Daily rate: {chosen.price_per_day}</p>
              </div>
              <button type="button" aria-label="Close booking dialog" onClick={() => setChosen(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-xl text-slate-600 hover:bg-slate-200">×</button>
            </div>

            <form className="mt-5 space-y-5" onSubmit={submitBooking}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">Full name
                  <input className={inputClass} type="text" required maxLength={150} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
                </label>
                <label className="block text-sm font-medium text-slate-700">Mobile number
                  <input className={inputClass} type="tel" inputMode="tel" required placeholder="09123456789" maxLength={20} autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
                </label>
                <label className="block text-sm font-medium text-slate-700">Driver's license no.
                  <input className={inputClass} type="text" required placeholder="N01-23-456789" maxLength={13} value={license} onChange={(event) => setLicense(formatLicenseNumber(event.target.value))} />
                </label>
                <label className="block text-sm font-medium text-slate-700">Pick-up time
                  <input className={inputClass} type="time" required value={pickupTime} onChange={(event) => setPickupTime(event.target.value)} />
                </label>
                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Pick-up location
                  <input className={inputClass} type="text" required list="pickup-places" placeholder="Where do you want to get the vehicle?" maxLength={200} value={pickupLocation} onChange={(event) => setPickupLocation(event.target.value)} />
                  <datalist id="pickup-places">{PICKUP_SUGGESTIONS.map((place) => <option key={place} value={place} />)}</datalist>
                </label>
              </div>

              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">Choose your rental dates</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setDateMode("pickup")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${dateMode === "pickup" ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-600"}`}>Pick-up: {pickup || "Select"}</button>
                    <button type="button" onClick={() => setDateMode("return")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${dateMode === "return" ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-600"}`}>Return: {ret || "Select"}</button>
                  </div>
                </div>
                {availabilityLoading ? (
                  <div className="rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">Loading availability…</div>
                ) : availabilityError ? (
                  <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{availabilityError}</p>
                ) : (
                  <AvailabilityCalendar selectedDate={dateMode === "pickup" ? pickup : ret} onSelect={chooseCalendarDate} bookedRanges={bookedRanges} maxDate={futureISO()} />
                )}
              </div>

              {rangeUnavailable && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">The selected rental period includes dates that are already booked.</p>}

              <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
                <div><span className="block text-xs uppercase tracking-wide text-slate-500">Rental period</span><strong className="mt-1 block text-sm text-slate-900">{pickup && ret ? `${formatDisplayDate(pickup)} – ${formatDisplayDate(ret)}` : "Select dates"}</strong></div>
                <div><span className="block text-xs uppercase tracking-wide text-slate-500">Duration</span><strong className="mt-1 block text-sm text-slate-900">{days} {days === 1 ? "day" : "days"}</strong></div>
                <div><span className="block text-xs uppercase tracking-wide text-slate-500">Estimated total</span><strong className="mt-1 block text-sm text-slate-900">{formatPeso(total)}</strong></div>
              </div>

              <label className="block text-sm font-medium text-slate-700">Special requests <span className="font-normal text-slate-400">(optional)</span>
                <textarea className={`${inputClass} min-h-20`} placeholder="Child seat, early return, number of passengers, etc." maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} />
              </label>

              {formError && <p role="alert" className="rw-pop rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</p>}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setChosen(null)} className="rw-btn rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
                <button type="submit" disabled={saving || availabilityLoading || !!availabilityError || !pickup || !ret || rangeUnavailable} className="rw-btn rounded-full bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-600/30 hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">Review &amp; submit request</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {confirming && chosen && (
        <ConfirmBookingModal
          title="Confirm your rental request"
          rows={summaryRows}
          total={formatPeso(total)}
          busy={saving}
          error={confirmError}
          onConfirm={sendBooking}
          onCancel={() => setConfirming(false)}
        />
      )}

      {success && (
        <BookingSuccessModal
          title="Rental request sent!"
          reference={success.reference}
          rows={success.rows}
          total={success.total}
          onClose={() => setSuccess(null)}
          onViewBookings={() => navigate("/my-bookings")}
        />
      )}
      <Footer />
    </>
  );
}
