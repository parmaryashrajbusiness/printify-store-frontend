export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#050805] px-4 py-24 text-white">
      <div className="mx-auto max-w-4xl rounded-[30px] border border-white/10 bg-white/[0.04] p-6 md:p-10">
        <p className="text-sm uppercase tracking-[0.22em] text-green-300">
          Privacy
        </p>

        <h1 className="mt-3 text-4xl font-semibold">Privacy Policy</h1>

        <p className="mt-3 text-sm text-zinc-400">Last updated: May 4, 2026</p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-zinc-300">
          <p>
            We collect the information needed to process your order, deliver your
            products, provide customer support, and improve our website.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-white">Information we collect</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Name, email, and phone number</li>
              <li>Shipping address</li>
              <li>Order details and product selections</li>
              <li>Payment status from payment providers</li>
              <li>Support messages sent through our contact form</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Payment information</h2>
            <p className="mt-2">
              Payments are processed through secure third-party payment
              providers. We do not store full card details on our website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Fulfillment partners</h2>
            <p className="mt-2">
              We may share order and shipping details with fulfillment partners
              only as needed to produce and ship your order.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}