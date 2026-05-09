import { apiFetch } from "./http";

export const authApi = {
  sendOtp: async (email) =>
    apiFetch("/auth/send-otp", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, purpose: "REGISTER" }),
    }),

  verifyOtp: async (email, otp) =>
    apiFetch("/auth/verify-otp", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, otp, purpose: "REGISTER" }),
    }),

  register: async ({ fullName, email, password }) =>
    apiFetch("/auth/register", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ fullName, email, password }),
    }),

  login: async ({ email, password }) =>
    apiFetch("/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, password }),
    }),

  me: async () => apiFetch("/auth/me"),
};