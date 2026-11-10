import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import NavBar from "../components/NavBar.jsx";
import Footer from "../components/Footer.jsx";
import Reveal from "../components/Reveal.jsx";
import { useDocumentTitle } from "../hooks.js";

// Each featured card has its own badge color, a short description and three quick facts.
const FEATURED = [
  { img: "vios.jpg", tag: "Most Booked", tagClass: "from-orange-500 to-amber-500", kind: "Sedan", price: "Php 2,400", name: "Toyota Vios 2022", blurb: "A compact sedan that is easy to drive around town.", seats: "5 seats", transmission: "Automatic", fuel: "Gasoline" },
  { img: "crv.jpg", tag: "Best for city trips", tagClass: "from-sky-500 to-cyan-500", kind: "Compact SUV", price: "Php 2,700", name: "Honda CR-V 2021", blurb: "A roomy compact SUV for city errands and weekend drives.", seats: "5 seats", transmission: "Automatic", fuel: "Diesel" },
  { img: "montero.jpg", tag: "Family favorite", tagClass: "from-emerald-500 to-teal-500", kind: "SUV", price: "Php 2,200", name: "Mitsubishi Montero Sport 2020", blurb: "Seven seats with space for the whole family and your bags.", seats: "7 seats", transmission: "Automatic", fuel: "Diesel" },
  { img: "ninja.jpg", tag: "Ride the coast", tagClass: "from-rose-500 to-pink-500", kind: "Sport bike", price: "Php 1,700", name: "Kawasaki Ninja 400", blurb: "A lightweight sport bike for scenic rides along the coast.", seats: "2 seats", transmission: "Manual", fuel: "Gasoline" },
];

const BENEFITS = [
  ["affordable-removebg-preview.png", "Affordable", "Clear, competitive rental rates with no hidden surprises."],
  ["Easy_booking_process-removebg-preview.png", "Easy booking", "Request a vehicle or tour in just a few simple steps."],
  ["Well-maintained_Vehicles-removebg-preview.png", "Well-maintained", "Vehicles are checked regularly for a comfortable ride."],
  ["customer_support-removebg-preview.png", "Local support", "Our team is here to help plan your Bicol trip."],
];

const stars = (rating) => "★".repeat(Math.max(1, Math.min(5, Number(rating) || 1)));

// Home page: hero links, featured fleet, service benefits, and customer reviews.
export default function Home() {
  useDocumentTitle("RentWheels | Car Rentals & Bicol Tours");
  const { isLoggedIn, isAdmin, openLogin } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadReviews() {
    try {
      const { data } = await api.get("/reviews", { params: { limit: 6 } });
      setReviews(data.reviews);
    } catch (error) {
      setNotice(errorMessage(error, "Reviews could not be loaded."));
    }
  }

  useEffect(() => {
    loadReviews();
  }, []);

  async function submitReview(event) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      await api.post("/reviews", { rating: Number(rating), review_text: reviewText.trim() });
      setReviewOpen(false);
      setReviewText("");
      await loadReviews();
      setNotice("Thank you for sharing your review.");
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <NavBar />
      <main>
        {/* Home hero: primary links into vehicle rentals and tour reservations. */}
        <section className="relative flex min-h-[480px] items-center bg-slate-950 px-4 py-20 text-white sm:min-h-[560px]">
          <div className="absolute inset-0 bg-[url('/needs/background.jpg')] bg-cover bg-center opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-slate-950/10" />
          <div className="relative mx-auto w-full max-w-7xl sm:px-6 lg:px-8">
            <p className="rw-fade-up text-sm font-bold uppercase tracking-[0.3em] text-orange-300">Your trip starts here</p>
            <h1 style={{ animationDelay: "100ms" }} className="rw-fade-up mt-4 max-w-3xl text-4xl font-extrabold leading-tight sm:text-6xl">Book your ride in seconds.</h1>
            <p style={{ animationDelay: "200ms" }} className="rw-fade-up mt-5 max-w-xl text-lg text-white/80">Discover Bicol on your terms with dependable vehicles, friendly local service, and flexible tour options.</p>
            <div style={{ animationDelay: "300ms" }} className="rw-fade-up mt-8 flex flex-wrap gap-3">
              <Link to="/vehicles" className="rw-btn rounded-full bg-orange-600 px-6 py-3 font-semibold text-white shadow-lg shadow-orange-950/20 hover:bg-orange-700 hover:shadow-orange-600/40">Browse vehicles</Link>
              <Link to="/tour-van" className="rw-btn rounded-full border border-white/50 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur hover:bg-white/20">Plan a Bicol tour</Link>
            </div>
          </div>
        </section>

        {/* Featured vehicles introduce the fleet before the full catalog. */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-600">Ready for the road</p><h2 className="mt-2 text-3xl font-bold text-slate-950">Featured vehicles</h2></div>
            <Link to="/vehicles" className="font-semibold text-orange-700 hover:text-orange-900">View all vehicles →</Link>
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {FEATURED.map((vehicle, index) => (
              <Reveal key={vehicle.name} delay={index * 90} className="h-full">
                <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-900/10">
                  <div className="relative h-48 overflow-hidden bg-slate-100">
                    <img className="h-full w-full object-cover transition duration-700 group-hover:scale-110" src={`/needs/${vehicle.img}`} alt={vehicle.name} />
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/60 to-transparent" />
                    <span className={`absolute left-3 top-3 rounded-full bg-gradient-to-r ${vehicle.tagClass} px-3 py-1 text-xs font-bold text-white shadow-md`}>{vehicle.tag}</span>
                    <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur">{vehicle.kind}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-orange-700">{vehicle.name}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-slate-500">{vehicle.blurb}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-100">{vehicle.seats}</span>
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-100">{vehicle.transmission}</span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">{vehicle.fuel}</span>
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                      <p><span className="block text-xs text-slate-400">Starting at</span><strong className="text-xl text-orange-600">{vehicle.price}</strong><span className="text-sm text-slate-500"> / day</span></p>
                    </div>
                    <Link to="/vehicles" className="group/btn mt-4 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-orange-600/30 transition duration-300 hover:-translate-y-0.5 hover:from-orange-600 hover:to-red-600 hover:shadow-lg hover:shadow-orange-600/40 active:scale-[0.97]">
                      Reserve
                      <span aria-hidden="true" className="transition-transform duration-300 group-hover/btn:translate-x-1">→</span>
                    </Link>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Reasons to rent with RentWheels. */}
        <section className="bg-orange-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-600">Travel with confidence</p><h2 className="mt-2 text-3xl font-bold text-slate-950">Why choose RentWheels?</h2></div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map(([image, title, description]) => (
                <article key={title} className="group rounded-2xl border border-orange-100 bg-white p-5 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-900/10">
                  <img className="mx-auto h-16 w-16 object-contain transition duration-300 group-hover:scale-110" src={`/needs/${image}`} alt="" />
                  <h3 className="mt-3 font-bold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Customer reviews and the signed-in customer review form trigger. */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-600">Guest stories</p><h2 className="mt-2 text-3xl font-bold text-slate-950">Customer reviews</h2></div>
            {isLoggedIn && !isAdmin ? (
              <button type="button" onClick={() => setReviewOpen(true)} className="rw-btn rounded-full border border-orange-300 px-5 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-50">Write a review</button>
            ) : !isLoggedIn ? (
              <button type="button" onClick={openLogin} className="rw-btn rounded-full border border-orange-300 px-5 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-50">Log in to review</button>
            ) : null}
          </div>
          {notice && <p role="status" className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{notice}</p>}
          <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reviews.length ? reviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-orange-100 font-bold text-orange-700">{review.reviewer_name.charAt(0).toUpperCase()}</span>
                  <div><h3 className="font-semibold text-slate-900">{review.reviewer_name}</h3><span className="text-amber-500" aria-label={`${review.rating} out of 5 stars`}>{stars(review.rating)}</span></div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{review.review_text}</p>
              </article>
            )) : <p className="text-slate-500">Your customer reviews will appear here.</p>}
          </div>
        </section>

        {/* Service hub location and map. */}
        <section className="bg-slate-900 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-2 md:items-center lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-300">Visit our main branch</p>
              <h2 className="mt-2 text-3xl font-bold">Legazpi City Service Hub</h2>
              <p className="mt-4 max-w-xl leading-7 text-slate-300">Drop by for bookings, vehicle pick-up assistance, tour planning, and customer support in the heart of Albay.</p>
              <p className="mt-4 text-sm text-slate-300">Gov. Forbes St, Legazpi Port District, Legazpi City, Albay</p>
            </div>
            <div>
              <div className="overflow-hidden rounded-2xl border border-white/15 bg-slate-800 shadow-lg">
                <iframe
                  title="Map to RentWheels Legazpi City Service Hub"
                  src="https://maps.google.com/maps?q=Gov.%20Forbes%20St%2C%20Legazpi%20Port%20District%2C%20Legazpi%20City%2C%20Albay&output=embed"
                  className="h-72 w-full sm:h-96"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <a className="rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-700" href="https://maps.app.goo.gl/oaKRxMufFmDc8Z4r8" target="_blank" rel="noopener noreferrer">Open map</a>
                <Link className="rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10" to="/about">About our service</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {reviewOpen && (
        <div className="rw-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={(event) => event.target === event.currentTarget && setReviewOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="review-title" className="rw-pop w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between"><h2 id="review-title" className="text-2xl font-bold text-slate-950">Share your experience</h2><button type="button" aria-label="Close dialog" onClick={() => setReviewOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xl">×</button></div>
            <form className="mt-5 space-y-4" onSubmit={submitReview}>
              <label className="block text-sm font-medium text-slate-700">Rating
                <select className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3" value={rating} onChange={(event) => setRating(event.target.value)}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} star{value > 1 ? "s" : ""}</option>)}</select>
              </label>
              <label className="block text-sm font-medium text-slate-700">Review
                <textarea className="mt-1.5 min-h-32 w-full rounded-xl border border-slate-300 px-4 py-3" maxLength={2000} required value={reviewText} onChange={(event) => setReviewText(event.target.value)} />
              </label>
              <button disabled={busy} className="w-full rounded-full bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-50">{busy ? "Submitting…" : "Submit review"}</button>
            </form>
          </section>
        </div>
      )}
      <Footer />
    </>
  );
}
