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
  // Google's free tier (Gemini Developer API) allows about 1,500 requests a
  // day and 15 a minute for the Flash-Lite model - check the project's
  // limits in Google AI Studio and keep this below the daily figure.
  dailyAiLimit: 1000,
  // How many earlier messages of the conversation the AI sees.
  historyMessages: 8,
};
