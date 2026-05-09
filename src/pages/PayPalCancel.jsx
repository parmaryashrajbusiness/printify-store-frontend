import React from "react";
import { useNavigate } from "react-router-dom";
import { XCircle } from "lucide-react";
import Button from "@/components/ui/Button";

export default function PayPalCancel() {
  const navigate = useNavigate();

  return (
    <div className="grid min-h-screen place-items-center bg-[#050805] px-4 text-white">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center">
        <XCircle className="mx-auto h-14 w-14 text-yellow-400" />

        <h1 className="mt-5 text-2xl font-semibold">Payment Cancelled</h1>

        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Your PayPal payment was cancelled. No order was placed.
        </p>

        <Button onClick={() => navigate("/")} className="mt-6 h-12 w-full rounded-2xl">
          Back to Home
        </Button>
      </div>
    </div>
  );
}