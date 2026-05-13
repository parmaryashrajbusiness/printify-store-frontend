import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { storefrontApi } from "@/api/storefrontApi";

export default function PayPalSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("Confirming your PayPal payment...");

  useEffect(() => {
    async function capture() {
      try {
        const paypalOrderId = searchParams.get("token");

        if (!paypalOrderId) {
          throw new Error("PayPal order token missing.");
        }

        const savedShipping = JSON.parse(
          sessionStorage.getItem("paypalCheckoutShipping") || "{}"
        );

        await storefrontApi.capturePayPalOrder({
          paypalOrderId,
          shipping: savedShipping,
        });

        sessionStorage.removeItem("paypalCheckoutShipping");

        sessionStorage.removeItem("paypalCheckoutShipping");

        setStatus("success");
        setMessage("Payment successful. Your order has been placed.");
      } catch (err) {
        console.error(err);
        setStatus("error");
        setMessage(
          "We could not confirm the payment on this page. If PayPal charged you, your order may still be processing. Please check Track Order or contact support."
        );
      }
    }

    capture();
  }, [searchParams]);

  return (
    <div className="grid min-h-screen place-items-center bg-[#050805] px-4 text-white">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center">
        {status === "success" ? (
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-400" />
        ) : status === "error" ? (
          <XCircle className="mx-auto h-14 w-14 text-red-400" />
        ) : (
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-white/10 border-t-green-400" />
        )}

        <h1 className="mt-5 text-2xl font-semibold">
          {status === "processing"
            ? "Processing Payment"
            : status === "success"
              ? "Order Placed"
              : "Payment Failed"}
        </h1>

        <p className="mt-3 text-sm leading-6 text-zinc-400">{message}</p>

        <Button
          onClick={() => navigate("/")}
          className="mt-6 h-12 w-full rounded-2xl"
          disabled={status === "processing"}
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
}