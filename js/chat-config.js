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
};
