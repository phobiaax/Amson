/**
 * Live chat settings.
 *
 * aiProvider:
 *   "gemini" - AI replies from Google's Gemini through Firebase AI Logic
 *              (no API key in the code; enable "AI Logic" with the Gemini
 *              Developer API in the Firebase console first - see README).
 *   "none"   - built-in answers only; everything else goes to staff.
 *
 * dailyAiLimit is the branch's own cap on AI replies per day, kept below
 * Google's free daily quota. When it's reached, chats go to staff.
 */
const CHAT_CONFIG = {
  aiProvider: "gemini",
  geminiModel: "gemini-3.5-flash-lite",
  firebaseModularSdkVersion: "12.17.1",
  // Google's free tier for this project allows 500 requests a day for
  // gemini-3.5-flash-lite (Google Cloud -> Generative Language API ->
  // Quotas). 400 leaves room for retries and staff "Test AI" checks.
  dailyAiLimit: 400,
  // How many earlier messages of the conversation the AI sees.
  historyMessages: 8,
  // Firebase App Check for the AI (reCAPTCHA Enterprise / Fraud Defense,
  // score-based - not the login checkbox key). Firebase AI Logic only
  // answers requests that prove they come from this site. The key is
  // public; it's registered under Firebase > App Check > Apps. On the local
  // server a debug token is printed in the browser console instead - add it
  // under App Check > Apps > Manage debug tokens. Empty = no App Check.
  appCheckSiteKey: "6LdUdw8uAAAAANEQGQEw-Q2l7gaj9ouqz-aK8ZFd",
};
