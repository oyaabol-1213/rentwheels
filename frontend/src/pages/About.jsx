import NavBar from "../components/NavBar.jsx";
import Footer from "../components/Footer.jsx";
import { useDocumentTitle } from "../hooks.js";

const SERVICES = [
  ["🚘", "New Vehicles", "Find a vehicle for every journey, from compact city cars to family SUVs."],
  ["🏷️", "Special Offers", "Seasonal offers help you make the most of your next Bicol adventure."],
  ["🧭", "Tour Planning", "Plan a flexible local itinerary with the help of our team."],
  ["🛠️", "Vehicle Service", "Our fleet is checked regularly for performance, safety, and comfort."],
];

const TEAM = [
  { name: "Ian Anjelo Sabas", image: "man.jpg" },
  { name: "Athenna Mae Replan", image: "women.jpg" },
  { name: "Other One", image: "women.jpg" },
  { name: "Other Two", image: "man.jpg" },
];

export default function About() {
  useDocumentTitle("About Us | RentWheels");

  return (
    <>
      <NavBar />
      <main>
        <section className="relative flex min-h-72 items-center justify-center overflow-hidden bg-slate-950 px-4 py-20 text-center text-white">
          <img className="absolute inset-0 h-full w-full object-cover opacity-45" src="/needs/about us hero-Picsart-AiImageEnhancer.jpg" alt="" />
          <div className="absolute inset-0 bg-slate-950/45" />
          <h1 className="relative text-5xl font-extrabold sm:text-6xl">About <span className="text-orange-300">Us</span></h1>
        </section>

        <section className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-600">Welcome to RentWheels</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-950">Simple, affordable, and reliable ways to explore.</h2>
            <p className="mt-5 leading-7 text-slate-600">Whether you need a vehicle for commuting, weekend trips, or long road adventures, we aim to make the rental experience seamless while prioritizing your safety, comfort, and convenience.</p>
            <h3 className="mt-7 text-xl font-bold text-slate-900">What we offer</h3>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
              <li><strong className="text-slate-900">Cars:</strong> Compact cars and family SUVs maintained for safety and comfort.</li>
              <li><strong className="text-slate-900">Bikes:</strong> Motorbikes for city travel, adventure rides, or quick errands.</li>
              <li><strong className="text-slate-900">Flexible rentals:</strong> Options to fit your travel plans and schedule.</li>
              <li><strong className="text-slate-900">Easy booking:</strong> Request a reservation online and follow its status from your account.</li>
            </ul>
          </div>
          <div className="overflow-hidden rounded-3xl shadow-xl shadow-slate-900/10">
            <img className="h-80 w-full object-cover sm:h-[26rem]" src="/needs/welcome.jpg" alt="RentWheels vehicle ready for a trip" />
          </div>
        </section>

        <section className="bg-orange-50 px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-600">How we help</p><h2 className="mt-2 text-3xl font-bold text-slate-950">Our services</h2></div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SERVICES.map(([icon, title, text]) => (
                <article key={title} className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-orange-100 text-2xl" aria-hidden="true">{icon}</span>
                  <h3 className="mt-4 font-bold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-600">Our story</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-950">Travel made more accessible</h2>
            <p className="mt-5 leading-7 text-slate-600"><strong className="text-slate-900">RentWheels</strong> was founded by travel enthusiasts who wanted to make vehicle rentals accessible to everyone. Our vision is a trustworthy rental service that makes every journey safe, enjoyable, and hassle-free. That commitment drives our focus on quality vehicles and helpful service for customers.</p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {TEAM.map((person) => (
                <article key={person.name} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <img className="h-36 w-full object-cover" src={`/needs/${person.image}`} alt={person.name} />
                  <h3 className="p-3 text-sm font-semibold text-slate-800">{person.name}</h3>
                </article>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center gap-5">
            <article className="rounded-3xl bg-slate-900 p-7 text-white sm:p-9">
              <h2 className="text-2xl font-bold">Why choose us?</h2>
              <p className="mt-4 leading-7 text-slate-300">We combine convenience, reliability, and affordability to make your travels smooth and worry-free. Whether it’s a short city ride or an adventure across the region, we’re here to help you get there comfortably.</p>
            </article>
            <article className="rounded-3xl border border-orange-200 bg-orange-50 p-7 sm:p-9">
              <h2 className="text-2xl font-bold text-slate-950">Join our journey</h2>
              <p className="mt-4 leading-7 text-slate-600">Start your next adventure with RentWheels. Explore our fleet, request a booking, and experience the road around Bicol.</p>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
