import { Link } from "react-router-dom";

// Shared website contact details, social links, and help/policy navigation.
export default function Footer() {
  return (
    <footer id="footer" className="bg-slate-950 text-slate-200">
      <div className="mx-auto grid max-w-7xl gap-x-10 gap-y-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        {/* Business contact details. */}
        <section>
          <h2 className="text-lg font-bold text-white">Contact Us</h2>
          <address className="mt-4 space-y-3 text-sm not-italic leading-6 text-slate-300">
            <p><span className="mr-2 text-orange-400" aria-hidden="true">⌖</span>Gov. Forbes St, Legazpi Port District, Legazpi City, Albay</p>
            <p><span className="mr-2 text-orange-400" aria-hidden="true">☎</span>+123-456-7890</p>
            <p><span className="mr-2 text-orange-400" aria-hidden="true">✉</span>support@rentwheels.com</p>
          </address>
        </section>

        {/* Social media links. */}
        <section className="text-center">
          <h2 className="text-lg font-bold text-white">Follow Us</h2>
          <div className="mt-4 flex justify-center gap-3">
            {[
              ["Facebook", "fb-removebg-preview.png"],
              ["Instagram", "ig-removebg-preview.png"],
              ["TikTok", "tiktok-removebg-preview.png"],
            ].map(([label, image]) => (
              <a key={label} href="#" aria-label={label} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 transition hover:bg-orange-600">
                <img className="h-6 w-6 object-contain" src={`/needs/${image}`} alt="" />
              </a>
            ))}
          </div>
        </section>

        {/* Help center and booking policy links. */}
        <section className="flex flex-col gap-5 md:items-end md:pt-10">
          <nav aria-label="Help and policies" className="flex flex-col gap-3 md:items-end">
            <Link className="text-sm font-semibold text-slate-300 underline decoration-orange-500 underline-offset-4 hover:text-white" to="/faq">Frequently Asked Questions</Link>
            <Link className="text-sm font-semibold text-slate-300 underline decoration-orange-500 underline-offset-4 hover:text-white" to="/terms">Terms &amp; Cancellation Policy</Link>
          </nav>
        </section>

        <p className="text-center text-sm text-slate-500 md:col-span-3">&copy; 2026 RentWheels. All rights reserved.</p>
      </div>
    </footer>
  );
}
