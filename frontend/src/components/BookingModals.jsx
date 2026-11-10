import { useEffect } from "react";
import { createPortal } from "react-dom";

// Two popups shared by the vehicle rental form and the tour van form:
//   1. ConfirmBookingModal  - "Please review your details. Are you sure?"
//   2. BookingSuccessModal  - "Your request was sent" with the booking number.

function DetailList({ rows }) {
  return (
    <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50/70 text-sm">
      {rows
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 px-4 py-2.5">
            <dt className="shrink-0 text-slate-500">{label}</dt>
            <dd className="text-right font-semibold text-slate-900 [overflow-wrap:anywhere]">{value}</dd>
          </div>
        ))}
    </dl>
  );
}

// Shared dark backdrop. Clicking outside (or pressing Esc) closes it unless `locked` is true.
function Backdrop({ children, onClose, locked }) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && !locked && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, locked]);

  return createPortal(
    <div
      role="presentation"
      className="rw-fade-in fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={(event) => event.target === event.currentTarget && !locked && onClose()}
    >
      {children}
    </div>,
    document.body
  );
}

export function ConfirmBookingModal({ title, rows, totalLabel = "Estimated total", total, busy, error, onConfirm, onCancel }) {
  return (
    <Backdrop onClose={onCancel} locked={busy}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="rw-pop my-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-orange-100 text-3xl font-bold text-orange-600">?</div>
        <h2 id="confirm-title" className="mt-4 text-center text-2xl font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-center text-sm text-slate-500">Please check your details. Are you sure you want to send this request?</p>

        <div className="mt-5 max-h-[45vh] overflow-y-auto rounded-2xl">
          <DetailList rows={rows} />
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3">
          <span className="text-sm font-semibold text-slate-700">{totalLabel}</span>
          <strong className="text-xl text-orange-700">{total}</strong>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <button type="button" disabled={busy} onClick={onCancel} className="rw-btn flex-1 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">No, go back</button>
          <button type="button" disabled={busy} onClick={onConfirm} className="rw-btn flex-1 rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-orange-600/30 hover:bg-orange-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? "Sending…" : "Yes, send request"}
          </button>
        </div>
      </section>
    </Backdrop>
  );
}

export function BookingSuccessModal({ title, reference, rows, total, onClose, onViewBookings }) {
  return (
    <Backdrop onClose={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="success-title" className="rw-pop my-auto w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div className="relative mx-auto h-20 w-20">
          <span className="absolute inset-0 rounded-full bg-emerald-200" style={{ animation: "rw-ring 1.2s ease-out 0.7s 1 both" }} />
          <svg viewBox="0 0 56 56" className="relative h-20 w-20" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle className="rw-check-circle" cx="28" cy="28" r="26.5" />
            <path className="rw-check-mark" d="M16 29l8 8 16-17" />
          </svg>
        </div>
        <h2 id="success-title" className="mt-4 text-2xl font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">Booking no. <strong className="text-slate-800">#{reference}</strong> is now <span className="font-semibold text-amber-700">Pending</span>. Our team will review it and confirm.</p>

        <div className="mt-5 max-h-[40vh] overflow-y-auto rounded-2xl text-left">
          <DetailList rows={rows} />
        </div>
        <p className="mt-4 text-sm text-slate-600">Total: <strong className="text-slate-950">{total}</strong></p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <button type="button" onClick={onClose} className="rw-btn flex-1 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
          <button type="button" onClick={onViewBookings} className="rw-btn flex-1 rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-orange-600/30 hover:bg-orange-700">View my bookings</button>
        </div>
      </section>
    </Backdrop>
  );
}
