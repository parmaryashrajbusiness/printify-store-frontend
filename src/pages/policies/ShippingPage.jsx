export default function ShippingPolicy() {
  return (
    <main className="min-h-screen bg-[#050805] px-4 py-24 text-white">
      <div className="mx-auto max-w-4xl rounded-[30px] border border-white/10 bg-white/[0.04] p-6 md:p-10">
        <p className="text-sm uppercase tracking-[0.22em] text-green-300">
          Store Policy
        </p>

        <h1 className="mt-3 text-4xl font-semibold">Shipping Policy</h1>

        <p className="mt-3 text-sm text-zinc-400">Last updated: May 4, 2026</p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-zinc-300">
          <p>
            Every item is printed after your order is placed. Your total
            delivery time includes production time plus shipping time.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-white">Production time</h2>
            <p className="mt-2">
              Most products require production before shipping. Production time
              can vary depending on the product, print provider, order volume,
              and destination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Shipping address</h2>
            <p className="mt-2">
              Customers are responsible for entering a complete and accurate
              shipping address. We cannot guarantee a replacement or refund if
              the order is delayed, lost, returned, or undeliverable because the
              customer entered an incorrect or incomplete address.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Returned packages</h2>
            <p className="mt-2">
              If a package is returned because of an incorrect address, failed
              delivery attempt, or customer pickup failure, additional shipping
              or reprint charges may apply.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}