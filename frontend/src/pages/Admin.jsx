import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { withMeta } from "../data/vehicleCatalog.js";
import { useDocumentTitle } from "../hooks.js";

const EMPTY_ADMIN = { name: "", email: "", password: "" };
const EMPTY_VEHICLE = { name: "", type: "", category: "", price_per_day: "", status: "Available" };
const STATUS_OPTIONS = ["Available", "Limited", "Unavailable"];
const MAX_PHOTO_MB = 4;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Colors for the status pill (green = ready, amber = few left, grey = not rentable).
const STATUS_PILL = {
  Available: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  Limited: "bg-amber-100 text-amber-800 ring-amber-200",
  Unavailable: "bg-slate-200 text-slate-700 ring-slate-300",
};
// Buttons used in the Actions column to change a vehicle's status.
const STATUS_BUTTON = {
  Available: "hover:bg-emerald-100 hover:text-emerald-800",
  Limited: "hover:bg-amber-100 hover:text-amber-800",
  Unavailable: "hover:bg-slate-200 hover:text-slate-800",
};
const dash = (value) => (value === null || value === undefined || value === "" ? "—" : value);
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition hover:border-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100";

function Table({ title, headers, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-bold text-slate-950">{title}</h2></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{headers.map((header) => <th className="px-4 py-3 font-semibold" key={header}>{header}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{children}</tbody>
        </table>
      </div>
    </section>
  );
}

function Cell({ children, className = "" }) {
  return <td className={`whitespace-nowrap px-4 py-3 text-slate-700 ${className}`}>{children}</td>;
}

function BookingStatus({ value, onChange }) {
  return (
    <select className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm transition hover:border-orange-400 focus:border-orange-500 focus:outline-none" value={value || "Pending"} onChange={(event) => onChange(event.target.value)}>
      {["Pending", "Confirmed", "Cancelled", "Completed"].map((status) => <option key={status}>{status}</option>)}
    </select>
  );
}

// Admin panel: dashboard data, booking management, fleet management, and accounts.
export default function Admin() {
  useDocumentTitle("Admin Panel | RentWheels");
  const { user, loading, isAdmin, isSuperAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState(null);
  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN);
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE);
  const [vehicleDetails, setVehicleDetails] = useState([]);
  const [vehicleDetailsInput, setVehicleDetailsInput] = useState("");
  const [confirmingVehicle, setConfirmingVehicle] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [photo, setPhoto] = useState(null); // the chosen File
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoInputKey, setPhotoInputKey] = useState(0); // changing this empties the file box

  const load = useCallback(async () => {
    try {
      const { data: dashboard } = await api.get("/admin/dashboard");
      setData(dashboard);
    } catch (error) {
      setNotice({ type: "error", text: errorMessage(error) });
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      navigate("/", { replace: true });
      return;
    }
    load();
  }, [loading, isAdmin, load, navigate]);

  async function run(request, onSuccess) {
    try {
      const { data: response } = await request();
      setNotice({ type: "success", text: response.message });
      onSuccess?.();
      await load();
    } catch (error) {
      setNotice({ type: "error", text: errorMessage(error) });
    }
  }

  async function updateBookingStatus(type, id, status) {
    await run(() => api.patch(`/admin/${type}-bookings/${id}/status`, { status }));
  }

  function choosePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setNotice({ type: "error", text: "Please choose a JPG, PNG, or WEBP photo." });
      event.target.value = "";
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setNotice({ type: "error", text: `The photo must be ${MAX_PHOTO_MB} MB or smaller.` });
      event.target.value = "";
      return;
    }
    setNotice(null);
    setPhoto(file);
  }

  function clearPhoto() {
    setPhoto(null);
    setPhotoInputKey((key) => key + 1);
  }

  // Show a small preview of the chosen photo, and free the memory when it changes.
  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  // Save vehicle data and the comma-separated detail chips to the fleet API.
  function addVehicle(event) {
    event.preventDefault();
    setNotice(null);
    setConfirmingVehicle(true);
  }

  function getVehicleDetailsValue() {
    return [...vehicleDetails, vehicleDetailsInput.trim()].filter(Boolean).join(", ");
  }

  // Submit the vehicle only after the admin confirms the details in the review dialog.
  async function confirmAddVehicle() {
    // A photo means the data is sent as a form (multipart), not plain JSON.
    const body = new FormData();
    Object.entries(vehicleForm).forEach(([key, value]) => body.append(key, value));
    body.append("details", getVehicleDetailsValue());
    if (photo) body.append("image", photo);
    setSavingVehicle(true);
    await run(() => api.post("/admin/vehicles", body), () => {
      setVehicleForm(EMPTY_VEHICLE);
      setVehicleDetails([]);
      setVehicleDetailsInput("");
      clearPhoto();
      setConfirmingVehicle(false);
    });
    setSavingVehicle(false);
  }

  // Turn each comma-delimited entry into a removable chip, including pasted text.
  function updateVehicleDetailsInput(value) {
    const parts = value.split(",");
    if (parts.length > 1) {
      const tags = parts.slice(0, -1).map((part) => part.trim()).filter(Boolean);
      setVehicleDetails((current) => [...current, ...tags]);
      setVehicleDetailsInput(parts[parts.length - 1].trimStart());
    } else {
      setVehicleDetailsInput(value);
    }
  }

  // Enter commits the current chip; Backspace removes the last chip when input is empty.
  function handleVehicleDetailsKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      const tag = vehicleDetailsInput.trim();
      if (tag) setVehicleDetails((current) => [...current, tag]);
      setVehicleDetailsInput("");
    } else if (event.key === "Backspace" && !vehicleDetailsInput && vehicleDetails.length) {
      setVehicleDetails((current) => current.slice(0, -1));
    }
  }

  function setVehicleStatus(vehicle, status) {
    if (vehicle.status === status) return;
    run(() => api.patch(`/admin/vehicles/${vehicle.id}/status`, { status }));
  }

  async function logoutAdmin() {
    await logout();
    navigate("/");
  }

  if (!user || !isAdmin) return null;

  const stats = data?.stats;

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3" to="/">
            <img className="h-11 w-11 object-contain brightness-0 invert" src="/needs/carIcon-removebg-preview.png" alt="RentWheels logo" />
            <span><strong className="block font-bold">RentWheels Admin</strong><small className="text-xs text-slate-400">{isSuperAdmin ? "Super Admin dashboard" : "Admin dashboard"}</small></span>
          </Link>
          <div className="flex items-center gap-4 text-sm"><span className="hidden text-slate-300 sm:inline">Signed in as {user.name}</span><Link className="hover:text-orange-300" to="/profile">Profile</Link><button type="button" className="font-semibold text-orange-300 hover:text-orange-200" onClick={logoutAdmin}>Log out</button></div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {notice && <div role="status" className={`rw-pop rounded-xl border px-4 py-3 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{notice.text}</div>}

        {/* Dashboard summary counts. */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Total users", stats?.users],
            ["Vehicles and tour units", stats?.vehicles],
            ["Vehicle bookings", stats?.vehicle_bookings],
            ["Tour bookings", stats?.tour_bookings],
          ].map(([label, value]) => (
            <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"><strong className="block text-3xl font-bold text-slate-950">{value ?? "—"}</strong><span className="mt-1 block text-sm text-slate-500">{label}</span></article>
          ))}
        </section>

        {/* Super-admin account creation and vehicle entry forms. */}
        <section className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Create admin account</h2>
            {isSuperAdmin ? (
              <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); run(() => api.post("/admin/admins", adminForm), () => setAdminForm(EMPTY_ADMIN)); }}>
                <label className="block text-sm font-medium text-slate-700">Full name<input className={`mt-1 ${inputClass}`} required value={adminForm.name} onChange={(event) => setAdminForm({ ...adminForm, name: event.target.value })} /></label>
                <label className="block text-sm font-medium text-slate-700">Email<input className={`mt-1 ${inputClass}`} type="email" required value={adminForm.email} onChange={(event) => setAdminForm({ ...adminForm, email: event.target.value })} /></label>
                <label className="block text-sm font-medium text-slate-700">Password<input className={`mt-1 ${inputClass}`} type="password" minLength={6} required value={adminForm.password} onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })} /></label>
                <button className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Create admin</button>
              </form>
            ) : <p className="mt-3 text-sm text-slate-500">Only the Super Admin can create another admin account.</p>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Add a vehicle</h2>
            {isSuperAdmin ? (
              <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={addVehicle}>
                <label className="text-sm font-medium text-slate-700">Name<input className={`mt-1 ${inputClass}`} required value={vehicleForm.name} onChange={(event) => setVehicleForm({ ...vehicleForm, name: event.target.value })} /></label>
                <label className="text-sm font-medium text-slate-700">Type<input className={`mt-1 ${inputClass}`} placeholder="Car, Bike, Tour Van" required value={vehicleForm.type} onChange={(event) => setVehicleForm({ ...vehicleForm, type: event.target.value })} /></label>
                <label className="text-sm font-medium text-slate-700">Category<input className={`mt-1 ${inputClass}`} required value={vehicleForm.category} onChange={(event) => setVehicleForm({ ...vehicleForm, category: event.target.value })} /></label>
                <label className="text-sm font-medium text-slate-700">Rate per day<input className={`mt-1 ${inputClass}`} placeholder="Php 2,400.00" required value={vehicleForm.price_per_day} onChange={(event) => setVehicleForm({ ...vehicleForm, price_per_day: event.target.value })} /></label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Availability<select className={`mt-1 ${inputClass}`} value={vehicleForm.status} onChange={(event) => setVehicleForm({ ...vehicleForm, status: event.target.value })}>{STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select></label>
                <div className="sm:col-span-2">
                  <label htmlFor="vehicle-details" className="block text-sm font-medium text-slate-700">Vehicle details <span className="font-normal text-slate-400">(separate each detail with a comma)</span></label>
                  <div className="mt-1 flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 transition hover:border-slate-400 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-100">
                    {vehicleDetails.map((detail, index) => (
                      <span key={`${detail}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                        {detail}
                        <button type="button" aria-label={`Remove ${detail}`} className="font-bold text-slate-400 hover:text-rose-600" onClick={() => setVehicleDetails((current) => current.filter((_, tagIndex) => tagIndex !== index))}>×</button>
                      </span>
                    ))}
                    <input id="vehicle-details" className="min-w-32 flex-1 border-0 bg-transparent p-1 text-sm text-slate-900 outline-none placeholder:text-slate-400" placeholder="2 seats | Gasoline, 150cc, etc." value={vehicleDetailsInput} onChange={(event) => updateVehicleDetailsInput(event.target.value)} onKeyDown={handleVehicleDetailsKeyDown} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Example: 2 seats | Gasoline, 150cc, 6-Speed, Underbone</p>
                </div>

                <div className="sm:col-span-2">
                  <span className="block text-sm font-medium text-slate-700">Vehicle photo <span className="font-normal text-slate-400">(JPG, PNG or WEBP, up to {MAX_PHOTO_MB} MB)</span></span>
                  <input key={photoInputKey} id="vehicle-photo" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} />
                  {photo && photoPreview ? (
                    <div className="rw-pop mt-1 flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <img className="h-20 w-28 rounded-lg object-cover shadow-sm" src={photoPreview} alt="Selected vehicle preview" />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="truncate font-semibold text-slate-800">{photo.name}</p>
                        <p className="text-xs text-slate-500">{(photo.size / 1024 / 1024).toFixed(2)} MB</p>
                        <div className="mt-2 flex gap-2">
                          <label htmlFor="vehicle-photo" className="cursor-pointer rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-100">Change</label>
                          <button type="button" onClick={clearPhoto} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">Remove</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="vehicle-photo" className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-orange-400 hover:bg-orange-50">
                      <span className="text-2xl">📷</span>
                      <span className="text-sm font-semibold text-slate-700">Click to choose a photo</span>
                      <span className="text-xs text-slate-500">If you skip this, a default photo is shown</span>
                    </label>
                  )}
                </div>

                <div className="sm:col-span-2"><button className="rw-btn rounded-full bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-600/30 hover:bg-orange-700">Review and add vehicle</button></div>
              </form>
            ) : <p className="mt-3 text-sm text-slate-500">Only the Super Admin can manage vehicles.</p>}
          </section>
        </section>

        {/* Fleet list and super-admin vehicle availability/delete actions. */}
        <Table title="Vehicles" headers={["Photo", "Name", "Type", "Category", "Rate", "Status", ...(isSuperAdmin ? ["Actions"] : [])]}>
          {data?.vehicles.map((vehicle) => (
            <tr key={vehicle.id} className="transition-colors hover:bg-orange-50/40">
              <Cell><img className="h-12 w-[4.5rem] rounded-lg object-cover shadow-sm" src={withMeta(vehicle).imageUrl} alt={vehicle.name} /></Cell>
              <Cell className="font-medium text-slate-900">{vehicle.name}</Cell><Cell>{vehicle.type}</Cell><Cell>{vehicle.category}</Cell><Cell>{vehicle.price_per_day}</Cell>
              <Cell><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${STATUS_PILL[vehicle.status] || "bg-slate-100 text-slate-700 ring-slate-200"}`}>{vehicle.status}</span></Cell>
              {isSuperAdmin && (
                <Cell>
                  <div className="flex items-center gap-1.5">
                    <div className="inline-flex overflow-hidden rounded-lg ring-1 ring-slate-200" role="group" aria-label={`Set status of ${vehicle.name}`}>
                      {STATUS_OPTIONS.map((status) => {
                        const active = vehicle.status === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            disabled={active}
                            aria-pressed={active}
                            onClick={() => setVehicleStatus(vehicle, status)}
                            className={`px-3 py-1.5 text-xs font-semibold transition ${active ? "cursor-default bg-slate-900 text-white" : `bg-white text-slate-600 ${STATUS_BUTTON[status]}`}`}
                          >
                            {status}
                          </button>
                        );
                      })}
                    </div>
                    <button type="button" onClick={() => { if (window.confirm("Delete this vehicle?")) run(() => api.delete(`/admin/vehicles/${vehicle.id}`)); }} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">Delete</button>
                  </div>
                </Cell>
              )}
            </tr>
          ))}
        </Table>

        {/* Vehicle and Tour Van reservation lists, including status updates. */}
        <Table title="Vehicle bookings" headers={["Customer", "Email", "Phone", "License no.", "Vehicle", "Rate", "Pick-up", "Pick-up time", "Pick-up location", "Return", "Days", "Add-ons", "Total", "Notes", "Status"]}>
          {data?.vehicle_bookings.map((booking) => (
            <tr key={booking.id} className="transition-colors hover:bg-orange-50/40"><Cell>{booking.customer_name}</Cell><Cell>{dash(booking.email)}</Cell><Cell>{dash(booking.phone)}</Cell><Cell>{dash(booking.license_number)}</Cell><Cell>{booking.vehicle_name}</Cell><Cell>{booking.vehicle_price}</Cell><Cell>{booking.pickup_date?.slice(0, 10)}</Cell><Cell>{dash(booking.pickup_time)}</Cell><Cell className="max-w-xs whitespace-normal">{dash(booking.pickup_location)}</Cell><Cell>{booking.return_date?.slice(0, 10)}</Cell><Cell>{booking.rental_days}</Cell><Cell>{booking.addon_total ?? "Php 0.00"}</Cell><Cell>{booking.total_price}</Cell><Cell className="max-w-xs whitespace-normal">{dash(booking.notes)}</Cell><Cell><BookingStatus value={booking.status} onChange={(status) => updateBookingStatus("vehicle", booking.id, status)} /></Cell></tr>
          ))}
        </Table>

        {/* Tour Van booking table. */}
        <Table title="Tour van bookings" headers={["Name", "Email", "Phone", "Tour date", "Guests", "Route", "Pick-up time", "Pick-up location", "Emergency contact", "Add-ons", "Total", "Notes", "Status"]}>
          {data?.tour_bookings.map((booking) => (
            <tr key={booking.id} className="transition-colors hover:bg-orange-50/40"><Cell>{booking.full_name}</Cell><Cell>{dash(booking.email)}</Cell><Cell>{booking.phone}</Cell><Cell>{booking.tour_date?.slice(0, 10)}</Cell><Cell>{booking.guests}</Cell><Cell>{booking.route_name}</Cell><Cell>{dash(booking.pickup_time)}</Cell><Cell className="max-w-xs whitespace-normal">{dash(booking.pickup_location)}</Cell><Cell>{booking.emergency_contact ? `${booking.emergency_contact} (${dash(booking.emergency_phone)})` : "—"}</Cell><Cell>{(booking.add_ons || []).map((addon) => `${addon.label} × ${addon.quantity}`).join(", ") || "—"}</Cell><Cell>{booking.total_price || "—"}</Cell><Cell className="max-w-xs whitespace-normal">{dash(booking.notes)}</Cell><Cell><BookingStatus value={booking.status} onChange={(status) => updateBookingStatus("tour", booking.id, status)} /></Cell></tr>
          ))}
        </Table>

        {/* Customer/admin account directory and submitted reviews. */}
        <Table title="User information" headers={["ID", "Name", "Email", "Phone", "Joined"]}>
          {data?.users.map((customer) => <tr key={customer.id}><Cell>{customer.id}</Cell><Cell>{customer.name}</Cell><Cell>{customer.email}</Cell><Cell>{dash(customer.phone)}</Cell><Cell>{customer.created_at}</Cell></tr>)}
        </Table>

        <Table title="Admin accounts" headers={["ID", "Name", "Email", "Phone", "Role", "Joined"]}>
          {data?.admins.map((admin) => <tr key={admin.id}><Cell>{admin.id}</Cell><Cell>{admin.name}</Cell><Cell>{admin.email}</Cell><Cell>{dash(admin.phone)}</Cell><Cell>{admin.role}</Cell><Cell>{admin.created_at}</Cell></tr>)}
        </Table>

        <Table title="User reviews" headers={["Name", "Email", "Rating", "Review", "Created at"]}>
          {data?.reviews.map((review) => <tr key={review.id}><Cell>{review.reviewer_name}</Cell><Cell>{dash(review.email)}</Cell><Cell>{review.rating}/5</Cell><Cell className="max-w-lg whitespace-normal">{review.review_text}</Cell><Cell>{review.created_at}</Cell></tr>)}
        </Table>
      </div>

      {confirmingVehicle && (
        <div className="rw-fade-in fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-vehicle-title" className="rw-pop my-auto w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 id="confirm-vehicle-title" className="text-center text-2xl font-bold text-slate-950">Confirm vehicle details</h2>
            <p className="mt-1 text-center text-sm text-slate-500">Review this information before adding the vehicle to the fleet.</p>
            {photoPreview && <img className="mt-5 h-40 w-full rounded-2xl object-cover" src={photoPreview} alt={`Preview of ${vehicleForm.name || "vehicle"}`} />}
            <dl className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50/70 text-sm">
              {[
                ["Name", vehicleForm.name],
                ["Type", vehicleForm.type],
                ["Category", vehicleForm.category],
                ["Rate per day", vehicleForm.price_per_day],
                ["Availability", vehicleForm.status],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 px-4 py-2.5">
                  <dt className="shrink-0 text-slate-500">{label}</dt>
                  <dd className="text-right font-semibold text-slate-900">{value || "—"}</dd>
                </div>
              ))}
              <div className="flex items-start justify-between gap-4 px-4 py-2.5">
                <dt className="shrink-0 text-slate-500">Details</dt>
                <dd className="flex flex-wrap justify-end gap-1.5">
                  {getVehicleDetailsValue()
                    ? getVehicleDetailsValue().split(",").map((detail) => detail.trim()).filter(Boolean).map((detail, index) => (
                        <span key={`${detail}-${index}`} className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200">{detail}</span>
                      ))
                    : <span className="font-semibold text-slate-900">Details on request</span>}
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <button type="button" disabled={savingVehicle} onClick={() => setConfirmingVehicle(false)} className="rw-btn flex-1 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Back to edit</button>
              <button type="button" disabled={savingVehicle} onClick={confirmAddVehicle} className="rw-btn flex-1 rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-orange-600/30 hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60">
                {savingVehicle ? "Adding…" : "Confirm and add"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
