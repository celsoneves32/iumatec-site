// lib/resend.ts
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.warn("⚠️ RESEND_API_KEY não está definida.");
}

export const resend = new Resend(apiKey);
