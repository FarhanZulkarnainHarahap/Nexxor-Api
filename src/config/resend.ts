import "dotenv/config";
import { Resend } from "resend";

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const resendFromEmail =
  process.env.RESEND_FROM_EMAIL ?? "Nexxora <onboarding@resend.dev>";
