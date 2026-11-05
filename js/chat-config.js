// live chat settings
const CHAT_CONFIG = {
  aiProvider: "gemini",
  geminiModel: "gemini-3.5-flash-lite",
  firebaseModularSdkVersion: "12.17.1",
  // free tier is 500 a day, 400 leaves room for retries
  dailyAiLimit: 400,
  // how many old messages the ai sees
  historyMessages: 8,
  // app check key for the ai (score based, not the login checkbox)
  appCheckSiteKey: "6LdUdw8uAAAAANEQGQEw-Q2l7gaj9ouqz-aK8ZFd",
};
