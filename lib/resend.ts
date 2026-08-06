import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

/**
 * Server-only Resend client — null until RESEND_API_KEY is configured, so an
 * empty key never crashes the module at import/build time.
 */
export const resend = apiKey && !apiKey.includes("your_") ? new Resend(apiKey) : null;
