import { Link } from "react-router-dom";
import NavBar from "../components/NavBar.jsx";
import Footer from "../components/Footer.jsx";
import { useDocumentTitle } from "../hooks.js";

export default function Terms() {
  useDocumentTitle("Terms & Cancellation Policy | RentWheels");

  return (
    <>
      <NavBar />
      <main className="min-h-[65vh] bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-600">Booking information</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Terms &amp; Cancellation Policy</h1>
          <p className="mt-4 leading-7 text-slate-600">A booking submitted through RentWheels is a request, not a confirmed reservation. It becomes confirmed when an administrator updates its status. Check <Link className="font-semibold text-orange-700 underline" to="/my-bookings">My Bookings</Link> for the current status.</p>

          <section className="mt-8">
            <h2 className="text-xl font-bold text-slate-900">Cancellations</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-slate-600">
              <li>Customers can cancel their own bookings while the status is Pending.</li>
              <li>For confirmed bookings or changes to a trip, contact RentWheels directly as soon as possible.</li>
              <li>Any payment, deposit, or refund arrangement must be agreed with RentWheels directly; online payment is not currently enabled.</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-bold text-slate-900">Availability and pricing</h2>
            <p className="mt-3 leading-7 text-slate-600">Availability is checked when a booking request is submitted. The displayed vehicle and tour prices are estimates based on the selected dates and optional services; the final reservation details are confirmed by the RentWheels team.</p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-bold text-slate-900">Need help?</h2>
            <p className="mt-3 leading-7 text-slate-600">Contact the RentWheels team before travel if you need to change a confirmed reservation or have questions about a booking.</p>
            <a className="mt-4 inline-flex rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-700" href="#footer">Contact RentWheels</a>
          </section>
          <p className="mt-10 border-t border-slate-100 pt-4 text-xs text-slate-400">This page describes the current booking workflow. Confirm any additional business policies with RentWheels before accepting payments.</p>
        </article>
      </main>
      <Footer />
    </>
  );
}
