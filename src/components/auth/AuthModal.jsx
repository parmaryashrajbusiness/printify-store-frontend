import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authApi } from "@/api/authApi";
import { useAuth } from "@/context/AuthContext";

export default function AuthModal({ open, onClose, defaultMode = "login" }) {
  const { login, register } = useAuth();

  const [mode, setMode] = useState(defaultMode); // login | register
  const [step, setStep] = useState("form"); // form | otp
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    otp: "",
  });

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetState = () => {
    setStep("form");
    setLoading(false);
    setMessage("");
    setError("");
    setForm({
      fullName: "",
      email: "",
      password: "",
      otp: "",
    });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSendOtp = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      await authApi.sendOtp(form.email);
      setStep("otp");
      setMessage("OTP sent to your email.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      await authApi.verifyOtp(form.email, form.otp);
      await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
      });

      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");
      await login({
        email: form.email,
        password: form.password,
      });
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    setMode(defaultMode);
    setStep("form");
    setError("");
    setMessage("");
  }, [open, defaultMode]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0a0f0a] p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-green-300">
                  {mode === "login" ? "Welcome back" : "Create account"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {mode === "login" ? "Login to your account" : "Register to continue"}
                </h2>
              </div>

              <button
                onClick={handleClose}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error ? (
              <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="mb-4 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-200">
                {message}
              </div>
            ) : null}

            <div className="space-y-4">
              {mode === "register" && step === "form" ? (
                <>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      value={form.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                      placeholder="Full name"
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-11 text-white placeholder:text-zinc-500"
                    />
                  </div>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="Email address"
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-11 text-white placeholder:text-zinc-500"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      placeholder="Password"
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-11 text-white placeholder:text-zinc-500"
                    />
                  </div>

                  <Button
                    onClick={handleSendOtp}
                    disabled={!form.fullName || !form.email || !form.password || loading}
                    className="h-12 w-full rounded-2xl"
                  >
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </Button>
                </>
              ) : null}

              {mode === "register" && step === "otp" ? (
                <>
                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      value={form.otp}
                      onChange={(e) => updateField("otp", e.target.value)}
                      placeholder="Enter OTP"
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-11 text-white placeholder:text-zinc-500"
                    />
                  </div>

                  <Button
                    onClick={handleVerifyAndRegister}
                    disabled={!form.otp || loading}
                    className="h-12 w-full rounded-2xl"
                  >
                    {loading ? "Verifying..." : "Verify OTP & Register"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="h-12 w-full rounded-2xl"
                  >
                    Resend OTP
                  </Button>
                </>
              ) : null}

              {mode === "login" ? (
                <>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="Email address"
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-11 text-white placeholder:text-zinc-500"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      placeholder="Password"
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-11 text-white placeholder:text-zinc-500"
                    />
                  </div>

                  <Button
                    onClick={handleLogin}
                    disabled={!form.email || !form.password || loading}
                    className="h-12 w-full rounded-2xl"
                  >
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                </>
              ) : null}
            </div>

            <div className="mt-6 text-center text-sm text-zinc-400">
              {mode === "login" ? (
                <>
                  Don’t have an account?{" "}
                  <button
                    onClick={() => {
                      setMode("register");
                      setStep("form");
                      setError("");
                      setMessage("");
                    }}
                    className="font-medium text-green-300 hover:text-green-200"
                  >
                    Register
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setMode("login");
                      setStep("form");
                      setError("");
                      setMessage("");
                    }}
                    className="font-medium text-green-300 hover:text-green-200"
                  >
                    Login
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}