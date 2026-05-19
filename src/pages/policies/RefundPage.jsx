import PolicyNav from "@/pages/policies/PolicyNav";

export default function RefundPolicy() {
  return (
    <main className="min-h-screen bg-[#050805] px-4 py-24 text-white">
      <div className="mx-auto max-w-4xl rounded-[30px] border border-white/10 bg-white/[0.04] p-6 md:p-10">
        <p className="text-sm uppercase tracking-[0.22em] text-green-300">
          Store Policy
        </p>

        <h1 className="mt-3 text-4xl font-semibold">Refund & Return Policy</h1>

        <p className="mt-3 text-sm text-zinc-400">Last updated: May 4, 2026</p>
        <PolicyNav />
        <div className="mt-8 space-y-7 text-sm leading-7 text-zinc-300">
          <p>
            Our products are made to order. Once an order is placed, the item is
            produced specially for you. Because of this, we do not accept
            returns, exchanges, or cancellations for customer ordering mistakes.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-white">Eligible issues</h2>
            <p className="mt-2">
              You may contact us for support if your item arrives damaged,
              defective, misprinted, or if you receive the wrong product.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Reporting window</h2>
            <p className="mt-2">
              Product issues must be reported within 30 days of delivery. Please
              include your order ID and clear photo or video proof showing the
              issue.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">
              Not eligible for return, exchange, refund, or reprint
            </h2>

            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Wrong size selected by the customer</li>
              <li>Wrong color selected by the customer</li>
              <li>Wrong quantity selected by the customer</li>
              <li>Change of mind after placing the order</li>
              <li>Incorrect or incomplete shipping address entered by customer</li>
              <li>Customer not available to receive the package</li>
              <li>Minor color differences caused by screen/device settings</li>
              <li>Minor print placement variations within normal production tolerance</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Size responsibility</h2>
            <p className="mt-2">
              Please check the product size guide carefully before ordering. We
              cannot provide a return or exchange if the selected size does not
              fit, unless the product itself was manufactured incorrectly.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}