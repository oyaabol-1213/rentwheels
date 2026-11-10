import { Link } from "react-router-dom";
import NavBar from "../components/NavBar.jsx";
import Footer from "../components/Footer.jsx";
import { useDocumentTitle } from "../hooks.js";

const QUESTIONS = [
  {
    question: "When is my booking confirmed?",
    answer: "A submitted booking is a request and remains Pending until the RentWheels team reviews and confirms it. You can check its status on the My Bookings page.",
  },
  {
    question: "Can I cancel a booking?",
    answer: "You can cancel a booking yourself while it is Pending. For a confirmed booking or a change to your trip, contact RentWheels as soon as possible.",
  },
  {
    question: "How do I know if a vehicle or tour date is available?",
    answer: "Use the availability calendar on the booking page. Dates may be reserved by another customer before you submit, so availability is checked again when your request is received.",
  },
  {
    question: "How are tour prices calculated?",
    answer: "The estimate uses the selected route's listed rate. Hotel or airport pickup and extra tour stops are optional add-ons with their prices shown on the booking form. The RentWheels team confirms final details.",
  },
  {
    question: "Can I pay online or request a refund online?",
    answer: "Online payment is not currently enabled. Any payment, deposit, or refund arrangement must be agreed directly with RentWheels.",
  },
  {
    question: "Where can I find the cancellation rules?",
    answer: "See the Terms & Cancellation Policy page for the current booking, availability, cancellation, and payment information.",
  },
];

export default function FAQ() {
  useDocumentTitle("Frequently Asked Questions | RentWheels");

  return (
    <>
      <NavBar />
      <main className="min-h-[65vh] bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-600">Help center</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Frequently Asked Questions</h1>
          <p className="mt-4 leading-7 text-slate-600">Quick answers about booking vehicles and Bicol tours with RentWheels.</p>

          <div className="mt-8 divide-y divide-slate-200">
            {QUESTIONS.map(({ question, answer }) => (
              <details key={question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900 marker:content-none">
                  {question}
                  <span className="text-xl text-orange-600 transition group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 pr-8 leading-7 text-slate-600">{answer}</p>
              </details>
            ))}
          </div>

          <p className="mt-8 border-t border-slate-100 pt-5 text-sm text-slate-600">
            For full policy details, read our{" "}
            <Link className="font-semibold text-orange-700 underline" to="/terms">Terms &amp; Cancellation Policy</Link>.
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}
