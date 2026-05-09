export default function Terms() {
  return (
    <main className="min-h-screen bg-[#050805] px-4 py-24 text-white">
      <div className="mx-auto max-w-4xl rounded-[30px] border border-white/10 bg-white/[0.04] p-6 md:p-10">
        <p className="text-sm uppercase tracking-[0.22em] text-green-300">
          Legal
        </p>

        <h1 className="mt-3 text-4xl font-semibold">Terms of Service</h1>

        <p className="mt-3 text-sm text-zinc-400">Last updated: May 4, 2026</p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-zinc-300">
          <p>
            By placing an order on our website, you agree to these terms and to
            our shipping, refund, and privacy policies.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-white">Made-to-order products</h2>
            <p className="mt-2">
              Products are produced only after payment is completed. Because
              each product is made for the customer, orders cannot be cancelled,
              returned, or exchanged because of wrong size, wrong color, change
              of mind, or customer ordering mistake.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Customer responsibility</h2>
            <p className="mt-2">
              Before completing payment, you are responsible for checking
              product name, variant, color, size, quantity, shipping address,
              phone number, and email address.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">
              Damaged or incorrect items
            </h2>
            <p className="mt-2">
              If an item arrives damaged, defective, misprinted, or incorrect,
              contact us within 30 days of delivery with your order ID and clear
              photo or video evidence.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}