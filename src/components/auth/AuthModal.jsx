import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, ShieldCheck, ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authApi } from "@/api/authApi";
import { useAuth } from "@/context/AuthContext";

export default function AuthModal({ open, onClose, defaultMode = "login" }) {
  const { login, register } = useAuth();

  const [mode, setMode] = useState(defaultMode); // login | register | forgot
  const [step, setStep] = useState("form"); // form | otp | reset
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: "",
  });

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const clearStatus = () => {
    setError("");
    setMessage("");
  };

  const resetState = () => {
    setMode(defaultMode);
    setStep("form");
    setLoading(false);
    setMessage("");
    setError("");
    setForm({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      otp: "",
    });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateEmail = () => {
    if (!isValidEmail(form.email.trim())) {
      setError("Please enter a valid email address.");
      return false;
    }

    return true;
  };

  const handleSendRegisterOtp = async () => {
    if (form.fullName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!validateEmail()) return;

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      clearStatus();

      await authApi.sendOtp(form.email.trim());

      setStep("otp");
      setMessage("OTP sent to your email.");
    } catch (err) {
      setError(err.message || "Could not send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (!/^\d{6}$/.test(form.otp.trim())) {
      setError("Please enter the 6 digit OTP.");
      return;
    }

    try {
      setLoading(true);
      clearStatus();

      await authApi.verifyOtp(form.email.trim(), form.otp.trim());

      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      handleClose();
    } catch (err) {
      setError(err.message || "Could not complete registration.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!validateEmail()) return;

    if (!form.password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);
      clearStatus();

      await login({
        email: form.email.trim(),
        password: form.password,
      });

      handleClose();
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetOtp = async () => {
    if (!validateEmail()) return;

    try {
      setLoading(true);
      clearStatus();

      await authApi.sendPasswordResetOtp(form.email.trim());

      setStep("reset");
      setMessage("If this email is registered, an OTP has been sent.");
    } catch (err) {
      setError(err.message || "Could not send reset OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!/^\d{6}$/.test(form.otp.trim())) {
      setError("Please enter the 6 digit OTP.");
      return;
    }

    if (form.password.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      clearStatus();

      await authApi.verifyPasswordResetOtp(form.email.trim(), form.otp.trim());

      await authApi.resetPassword({
        email: form.email.trim(),
        newPassword: form.password,
      });

      setMode("login");
      setStep("form");
      setForm((prev) => ({
        ...prev,
        password: "",
        confirmPassword: "",
        otp: "",
      }));
      setMessage("Password reset successfully. Please login.");
    } catch (err) {
      setError(err.message || "Could not reset password.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setStep("form");
    setError("");
    setMessage("");
    setForm({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      otp: "",
    });
  };

  useEffect(() => {
    if (!open) return;

    setMode(defaultMode);
    setStep("form");
    setError("");
    setMessage("");
  }, [open, defaultMode]);

  const titleMeta = {
    login: {
      eyebrow: "Welcome back",
      title: "Login to your account",
    },
    register: {
      eyebrow: step === "otp" ? "Verify email" : "Create account",
      title: step === "otp" ? "Enter verification OTP" : "Register to continue",
    },
    forgot: {
      eyebrow: "Password help",
      title: step === "reset" ? "Reset your password" : "Forgot password?",
    },
  };

  const currentTitle = titleMeta[mode];

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
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[28px] border border-white/10 bg-[#0a0f0a] p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-green-300">
                  {currentTitle.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {currentTitle.title}
                </h2>
              </div>

              <button
                onClick={handleClose}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300 hover:bg-white/10"
                type="button"
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
                  <IconInput icon={User}>
                    <Input
                      value={form.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                      placeholder="Full name"
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-11 text-white placeholder:text-zinc-500"
                    />
                  </IconInput>

                  <IconInput icon={Mail}>
                    <Input
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value.trim())}
                      placeholder="Email address"
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-11 text-white placeholder:text-zinc-500"
                    />
                  </IconInput>

                  <IconInput icon={Lock}>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      placeholder="Password"
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-11 text-white placeholder:text-zinc-500"
                    />
                  </IconInput>

                  <Button
                    onClick={handleSendRegisterOtp}
                    disabled={!form.fullName || !form.email || !form.password || loading}
                    className="h-12 w-full rounded-2xl"
                  >
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </Button>
                </>
              ) : null}

              {mode === "register" && step === "otp" ? (
                <>
                  <p className="text-sm leading-6 text-zinc-400">
                    We sent a 6 digit OTP to{" "}
                    <span className="text-zinc-200">{form.email}</span>.
                  </p>

                  <IconInput icon={ShieldCheck}>
                    <Input
                      value={form.otp}
                      onChange={(e) =>
                        updateField("otp", e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="Enter 6 digit OTP"
                      inputMode="numeric"
                      maxLength={6}
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-11 text-white placeholder:text-zinc-500"
                    />
                  </IconInput>

                  <Button
                    onClick={handleVerifyAndRegister}
                    disabled={!form.otp || loading}
                    className="h-12 w-full rounded-2xl"
                  >
                    {loading ? "Verifying..." : "Verify OTP & Register"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleSendRegisterOtp}
                    disabled={loading}
                    className="h-12 w-full rounded-2xl"
                  >
                    Resend OTP
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("form");
                      clearStatus();
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Change details
                  </button>
                </>
              ) : null}

              {mode === "login" ? (
                <>
                  <IconInput icon={Mail}>
                    <Input
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value.trim())}
                      placeholder="Email address"
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-11 text-white placeholder:text-zinc-500"
                    />
                  </IconInput>

                  <IconInput icon={Lock}>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      placeholder="Password"
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-11 text-white placeholder:text-zinc-500"
                    />
                  </IconInput>

                  <div className="-mt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setStep("form");
                        setError("");
                        setMessage("");
                        setForm((prev) => ({
                          ...prev,
                          password: "",
                          confirmPassword: "",
                          otp: "",
                        }));
                      }}
                      className="text-sm font-medium text-green-300 hover:text-green-200"
                    >
                      Forgot password?
                    </button>
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

              {mode === "forgot" && step === "form" ? (
                <>
                  <p className="text-sm leading-6 text-zinc-400">
                    Enter your registered email. We will send an OTP to reset your password.
                  </p>

                  <IconInput icon={Mail}>
                    <Input
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value.trim())}
                      placeholder="Registered email address"
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-11 text-white placeholder:text-zinc-500"
                    />
                  </IconInput>

                  <Button
                    onClick={handleSendResetOtp}
                    disabled={!form.email || loading}
                    className="h-12 w-full rounded-2xl"
                  >
                    {loading ? "Sending OTP..." : "Send Reset OTP"}
                  </Button>

                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="inline-flex w-full items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                  </button>
                </>
              ) : null}

              {mode === "forgot" && step === "reset" ? (
                <>
                  <p className="text-sm leading-6 text-zinc-400">
                    Enter the OTP sent to{" "}
                    <span className="text-zinc-200">{form.email}</span> and create a new password.
                  </p>

                  <IconInput icon={ShieldCheck}>
                    <Input
                      value={form.otp}
                      onChange={(e) =>
                        updateField("otp", e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="Enter 6 digit OTP"
                      inputMode="numeric"
                      maxLength={6}
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-11 text-white placeholder:text-zinc-500"
                    />
                  </IconInput>

                  <IconInput icon={Lock}>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      placeholder="New password"
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-11 text-white placeholder:text-zinc-500"
                    />
                  </IconInput>

                  <IconInput icon={Lock}>
                    <Input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => updateField("confirmPassword", e.target.value)}
                      placeholder="Confirm new password"
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 pl-11 text-white placeholder:text-zinc-500"
                    />
                  </IconInput>

                  <Button
                    onClick={handleResetPassword}
                    disabled={
                      !form.otp ||
                      !form.password ||
                      !form.confirmPassword ||
                      loading
                    }
                    className="h-12 w-full rounded-2xl"
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleSendResetOtp}
                    disabled={loading}
                    className="h-12 w-full rounded-2xl"
                  >
                    Resend OTP
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("form");
                      setForm((prev) => ({
                        ...prev,
                        otp: "",
                        password: "",
                        confirmPassword: "",
                      }));
                      clearStatus();
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Change email
                  </button>
                </>
              ) : null}
            </div>

            <div className="mt-6 text-center text-sm text-zinc-400">
              {mode === "login" ? (
                <>
                  Don’t have an account?{" "}
                  <button
                    onClick={() => switchMode("register")}
                    className="font-medium text-green-300 hover:text-green-200"
                    type="button"
                  >
                    Register
                  </button>
                </>
              ) : mode === "register" ? (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => switchMode("login")}
                    className="font-medium text-green-300 hover:text-green-200"
                    type="button"
                  >
                    Login
                  </button>
                </>
              ) : (
                <>
                  Remember your password?{" "}
                  <button
                    onClick={() => switchMode("login")}
                    className="font-medium text-green-300 hover:text-green-200"
                    type="button"
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

function IconInput({ icon: Icon, children }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      {children}
    </div>
  );
}