import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import AvailabilityCalendar from "../components/AvailabilityCalendar.jsx";
import NavBar from "../components/NavBar.jsx";
import Footer from "../components/Footer.jsx";
import { BookingSuccessModal, ConfirmBookingModal } from "../components/BookingModals.jsx";
import { ROUTE_OPTIONS, STOP_NOTES, TOUR_ROUTES } from "../data/tourRoutes.js";
import { formatDisplayDate, formatPeso, priceNumber, todayISO } from "../utils/money.js";
import { cleanPhone, formatTime, isValidPhone } from "../utils/validators.js";
import { useDocumentTitle } from "../hooks.js";

const EMPTY_FORM = {
  full_name: "",
  phone: "",
  tour_date: "",
  guests: "1-4 guests",
  route_name: ROUTE_OPTIONS[0],
  notes: "",
  pickup_location: "",
  pickup_time: "",
  emergency_contact: "",
  emergency_phone: "",
};
const ADDON_PICKUP_PRICE = 500;
const ADDON_STOP_PRICE = 500;
const PICKUP_SUGGESTIONS = ["Bicol International Airport, Daraga", "Legazpi City Grand Central Terminal"];

function futureISO() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function TourVan() {
  useDocumentTitle("Bicol Tourist Van | RentWheels");
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(TOUR_ROUTES[0].id);
  const [form, setForm] = useState(EMPTY_FORM);
  const [vanPrice, setVanPrice] = useState("PHP 5,800");
  const [saving, setSaving] = useState(false);
  const [bookedDates, setBookedDates] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState("");
  const [notice, setNotice] = useState(null);
  const [pickupIncluded, setPickupIncluded] = useState(false);
  const [extraStops, setExtraStops] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    api.get("/vehicles")
      .then(({ data }) => {
        const van = data.vehicles.find((vehicle) => vehicle.type === "Tour Van");
        if (van?.price_per_day) setVanPrice(van.price_per_day);
      })
      .catch((err) => setNotice({ type: "error", text: errorMessage(err, "Could not load the tour van rate.") }));

    api.get("/tour-bookings/availability", { params: { from: todayISO(), to: futureISO() } })
      .then(({ data }) => setBookedDates(data.booked_dates))
      .catch((err) => setAvailabilityError(errorMessage(err, "Could not load tour availability.")))
      .finally(() => setAvailabilityLoading(false));
  }, []);

  useEffect(() => {
    if (user && !isAdmin) {
      setForm((current) => ({
        ...current,
        full_name: current.full_name || user.name || "",
        phone: current.phone || user.phone || "",
      }));
    }
  }, [user, isAdmin]);

  const visible = TOUR_ROUTES.filter((route) => filter === "all" || route.status === filter);
  const selected = TOUR_ROUTES.find((route) => route.id === selectedId) || TOUR_ROUTES[0];
  const selectedBookingRoute = TOUR_ROUTES.find((route) => route.title === form.route_name);
  const routePrice = selectedBookingRoute ? priceNumber(selectedBookingRoute.price) : 0;
  const basePrice = routePrice || priceNumber(vanPrice);
  const addonTotal = (pickupIncluded ? ADDON_PICKUP_PRICE : 0) + extraStops * ADDON_STOP_PRICE;
  const total = basePrice + addonTotal;
  const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100";

  const bookedDatesSet = useMemo(() => new Set(bookedDates.map((date) => date.slice(0, 10))), [bookedDates]);

  function chooseFilter(key) {
    setFilter(key);
    const first = TOUR_ROUTES.find((route) => key === "all" || route.status === key);
    if (first) {
      setSelectedId(first.id);
      if (ROUTE_OPTIONS.includes(first.title)) {
        setForm((current) => ({ ...current, route_name: first.title }));
      }
    }
  }

  function setField(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function selectRoute(route) {
    setSelectedId(route.id);
    if (ROUTE_OPTIONS.includes(route.title)) {
      setForm((current) => ({ ...current, route_name: route.title }));
    }
  }

  // Step 1: check the form, then open the "Are you sure?" popup.
  function submit(event) {
    event.preventDefault();
    setNotice(null);
    if (isAdmin) {
      setNotice({ type: "error", text: "Admin accounts cannot make customer bookings." });
      return;
    }
    if (availabilityError) {
      setNotice({ type: "error", text: availabilityError });
      return;
    }
    if (bookedDatesSet.has(form.tour_date)) {
      setNotice({ type: "error", text: "The tour van is already booked for this date." });
      return;
    }
    if (!isValidPhone(form.phone)) {
      setNotice({ type: "error", text: "Please enter a valid mobile number, like 09123456789." });
      return;
    }
    if (form.emergency_contact.trim() && !isValidPhone(form.emergency_phone)) {
      setNotice({ type: "error", text: "Please enter a valid emergency contact number, like 09123456789." });
      return;
    }
    setConfirmError("");
    setConfirming(true);
  }

  // The details shown in both popups ("Are you sure?" and "Request sent").
  const addonLines = [];
  if (pickupIncluded) addonLines.push("Hotel or airport pickup");
  if (extraStops > 0) addonLines.push(`${extraStops} extra stop${extraStops > 1 ? "s" : ""}`);
  const summaryRows = [
    ["Route", form.route_name],
    ["Tour date", formatDisplayDate(form.tour_date)],
    ["Guests", form.guests],
    ["Name", form.full_name.trim()],
    ["Mobile number", cleanPhone(form.phone)],
    ["Pick-up", form.pickup_time ? `${formatTime(form.pickup_time)} at ${form.pickup_location.trim()}` : ""],
    ["Emergency contact", form.emergency_contact.trim() ? `${form.emergency_contact.trim()} (${cleanPhone(form.emergency_phone)})` : ""],
    ["Special requests", form.notes.trim()],
    ["Add-ons", addonLines.join(", ")],
  ];

  // Step 2: the customer pressed "Yes, send request".
  async function sendBooking() {
    setSaving(true);
    setConfirmError("");
    try {
      const { data } = await api.post("/tour-bookings", {
        full_name: form.full_name.trim(),
        phone: cleanPhone(form.phone),
        tour_date: form.tour_date,
        guests: form.guests,
        route_name: form.route_name,
        notes: form.notes.trim(),
        pickup_location: form.pickup_location.trim(),
        pickup_time: form.pickup_time,
        emergency_contact: form.emergency_contact.trim(),
        emergency_phone: cleanPhone(form.emergency_phone),
        add_ons: { pickup: pickupIncluded, extra_stops: Number(extraStops) },
      });
      setSuccess({ reference: data.booking.id, rows: summaryRows, total: data.booking.total_price });
      setConfirming(false);
      setForm({ ...EMPTY_FORM, full_name: user?.name || "", phone: user?.phone || "" });
      setPickupIncluded(false);
      setExtraStops(0);
      const availability = await api.get("/tour-bookings/availability", { params: { from: todayISO(), to: futureISO() } });
      setBookedDates(availability.data.booked_dates);
    } catch (err) {
      setConfirmError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <NavBar />
      <main className="bg-gradient-to-b from-orange-50 via-white to-slate-50">
        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-16">
          <div className="flex flex-col justify-center">
            <span className="w-fit rounded-full border border-orange-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-700">Explore Bicol with RentWheels</span>
            <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight text-slate-950 sm:text-5xl">Private van rental for memorable Bicol trips.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Plan a flexible day trip with a local driver, clear pricing, and a live calendar that helps you find an open tour date.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a className="rw-btn rounded-full bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-600/30 hover:bg-orange-700" href="#routes">Explore routes</a>
              <a className="rw-btn rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" href="#booking">Check availability</a>
            </div>
            <div className="mt-9 grid max-w-lg grid-cols-3 gap-3">
              {[["10–12", "Guests per van"], ["6", "Sample routes"], ["1 day+", "Flexible trips"]].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
                  <strong className="block text-xl text-slate-900">{value}</strong>
                  <span className="mt-1 block text-xs text-slate-500">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <section id="booking" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-orange-950/5 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-600">Tour van reservation</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">Plan your tour</h2>
                <p className="mt-1 text-sm text-slate-500">Starting at {vanPrice} per day</p>
              </div>
              <img src="/needs/Hyundai Palisade-Picsart-AiImageEnhancer.jpg" alt="RentWheels tour vehicle" className="h-16 w-20 rounded-xl object-cover sm:h-20 sm:w-28" />
            </div>


            <form onSubmit={submit} className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">Full name
                  <input className={`mt-1.5 ${inputClass}`} type="text" placeholder="Your name" required value={form.full_name} onChange={setField("full_name")} />
                </label>
                <label className="text-sm font-medium text-slate-700">Phone number
                  <input className={`mt-1.5 ${inputClass}`} type="tel" placeholder="09xx xxx xxxx" required value={form.phone} onChange={setField("phone")} />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">Preferred route
                <select className={`mt-1.5 ${inputClass}`} value={form.route_name} onChange={(event) => {
                  setField("route_name")(event);
                  const route = TOUR_ROUTES.find((item) => item.title === event.target.value);
                  if (route) setSelectedId(route.id);
                }}>
                  {ROUTE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">Guests
                  <select className={`mt-1.5 ${inputClass}`} value={form.guests} onChange={setField("guests")}>
                    <option>1-4 guests</option>
                    <option>5-8 guests</option>
                    <option>9-12 guests</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">Tour date
                  <span className="mt-1.5 block rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-3 text-sm text-slate-800">{form.tour_date || "Select a date below"}</span>
                </label>
              </div>
              {availabilityLoading ? (
                <div className="rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">Loading tour calendar…</div>
              ) : availabilityError ? (
                <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{availabilityError}</p>
              ) : (
                <AvailabilityCalendar selectedDate={form.tour_date} onSelect={(date) => setForm((current) => ({ ...current, tour_date: date }))} bookedDates={bookedDates} maxDate={futureISO()} />
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">Pick-up time
                  <input className={`mt-1.5 ${inputClass}`} type="time" required value={form.pickup_time} onChange={setField("pickup_time")} />
                </label>
                <label className="text-sm font-medium text-slate-700">Pick-up location
                  <input className={`mt-1.5 ${inputClass}`} type="text" required list="tour-pickup-places" placeholder="Hotel, airport, address…" maxLength={200} value={form.pickup_location} onChange={setField("pickup_location")} />
                  <datalist id="tour-pickup-places">{PICKUP_SUGGESTIONS.map((place) => <option key={place} value={place} />)}</datalist>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">Emergency contact <span className="font-normal text-slate-400">(optional)</span>
                  <input className={`mt-1.5 ${inputClass}`} type="text" placeholder="Name of a family member" maxLength={150} value={form.emergency_contact} onChange={setField("emergency_contact")} />
                </label>
                <label className="text-sm font-medium text-slate-700">Emergency contact number
                  <input className={`mt-1.5 ${inputClass}`} type="tel" inputMode="tel" placeholder="09123456789" maxLength={20} required={!!form.emergency_contact.trim()} value={form.emergency_phone} onChange={setField("emergency_phone")} />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">Special requests
                <textarea className={`mt-1.5 min-h-20 ${inputClass}`} placeholder="Accessibility needs, food allergies, preferred stops, etc." value={form.notes} onChange={setField("notes")} />
              </label>

              <fieldset className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <legend className="px-2 text-sm font-semibold text-slate-800">Optional add-ons</legend>
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input className="mt-1 h-4 w-4 accent-orange-600" type="checkbox" checked={pickupIncluded} onChange={(event) => setPickupIncluded(event.target.checked)} />
                  <span className="flex flex-1 items-start justify-between gap-3"><span><strong className="block text-slate-800">Hotel or airport pickup</strong><span className="text-xs text-slate-500">Convenient pickup at your lodging or the airport</span></span><span className="whitespace-nowrap font-semibold text-slate-700">+{formatPeso(ADDON_PICKUP_PRICE)}</span></span>
                </label>
                <label className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span><strong className="block text-slate-800">Extra tour stops</strong><span className="text-xs text-slate-500">Add custom stops to your itinerary</span></span>
                  <span className="flex items-center gap-2"><input className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-center" type="number" min="0" max="20" value={extraStops} onChange={(event) => setExtraStops(Math.max(0, Math.min(20, Number(event.target.value) || 0)))} /><span className="text-xs text-slate-600">× {formatPeso(ADDON_STOP_PRICE)} / stop</span></span>
                </label>
              </fieldset>

              {notice && <div role="alert" className={`rw-pop rounded-xl border px-4 py-3 text-sm ${notice.type === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{notice.text}</div>}

              <div className="flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-700">Estimated total for {form.route_name}</span>
                <strong className="text-lg text-slate-950">{formatPeso(total)}</strong>
              </div>
              <button className="rw-btn w-full rounded-full bg-orange-600 px-5 py-3.5 font-semibold text-white shadow-md shadow-orange-600/30 hover:bg-orange-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none" type="submit" disabled={saving || availabilityLoading || !!availabilityError || !form.tour_date || bookedDatesSet.has(form.tour_date)}>
                Review &amp; send booking request
              </button>
              <p className="text-center text-xs text-slate-500">A booking request is pending until the team confirms it.</p>
            </form>
          </section>
        </section>

        <section id="routes" className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-600">Local route ideas</p><h2 className="mt-1 text-3xl font-bold text-slate-950">Bicol route board</h2></div>
            <p className="max-w-xl text-sm text-slate-500">Availability in the calendar reflects the tour van schedule. Route details can be tailored when you send a request.</p>
          </div>
          <div className="mb-5 flex flex-wrap gap-2">
            {[
              ["all", "All routes"], ["available", "Available"], ["limited", "Limited"], ["unavailable", "Paused"],
            ].map(([key, label]) => (
              <button key={key} type="button" onClick={() => chooseFilter(key)} className={`rw-btn rounded-full px-4 py-2 text-sm font-semibold ${filter === key ? "bg-orange-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"}`}>{label}</button>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-[.95fr_1.05fr]">
            <div className="space-y-3">
              {visible.map((route) => (
                <button key={route.id} type="button" onClick={() => selectRoute(route)} className={`w-full rounded-2xl border p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:shadow-md ${selected.id === route.id ? "border-orange-400 bg-orange-50 shadow-sm" : "border-slate-200 bg-white hover:border-orange-200"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${route.status === "available" ? "bg-emerald-100 text-emerald-700" : route.status === "limited" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{route.statusText}</span>
                    <span className="text-xs text-slate-500">{route.duration}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-slate-900">{route.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{route.route}</p>
                  <p className="mt-3 text-sm font-semibold text-orange-700">{route.price}</p>
                </button>
              ))}
            </div>

            <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="relative min-h-56 overflow-hidden p-6 text-white">
                <img className="absolute inset-0 h-full w-full object-cover" src={`/needs/${selected.image}`} alt="" aria-hidden="true" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 to-slate-950/40" />
                <div className="relative">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-200">{selected.label}</p>
                  <h3 className="mt-2 text-2xl font-bold">{selected.title}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/85">{selected.copy}</p>
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-sm leading-6 text-slate-600">{selected.summary}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[[selected.duration, "Estimated duration"], [selected.price, "Starting rate"], [selected.best, "Recommended for"]].map(([value, label]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-3"><strong className="block text-sm text-slate-900">{value}</strong><span className="mt-1 block text-xs text-slate-500">{label}</span></div>
                  ))}
                </div>
                <h4 className="mt-6 font-semibold text-slate-900">Suggested stops</h4>
                <ol className="mt-3 space-y-3">
                  {selected.stops.map((stop, index) => (
                    <li key={stop} className="flex gap-3 text-sm">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">{index + 1}</span>
                      <span><strong className="text-slate-800">{stop}</strong><span className="mt-0.5 block text-slate-500">{STOP_NOTES[index]}</span></span>
                    </li>
                  ))}
                </ol>
                <div className="mt-6 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2">
                  <div><h4 className="font-semibold text-slate-900">Helpful notes</h4><ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">{selected.tips.map((tip) => <li key={tip}>{tip}</li>)}<li>Bring light rain gear for changing weather.</li></ul></div>
                  <div><h4 className="font-semibold text-slate-900">Trip planning</h4><ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600"><li>Hotel or airport pickup is available as an add-on.</li><li>Extra food, souvenir, and photo stops can be added.</li><li>Private groups can request a flexible pace.</li></ul></div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>

      {confirming && (
        <ConfirmBookingModal
          title="Confirm your tour request"
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
          title="Tour request sent!"
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
