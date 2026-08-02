/**
 * Cloudinary configuration for image uploads (payment proofs, and later
 * product photos / prescription uploads) — chosen over Firebase Storage
 * because it doesn't require a billing card. Sign up at
 * https://cloudinary.com, then go to Settings > Upload > Upload presets
 * > Add upload preset, set Signing Mode to "Unsigned", and fill in both
 * values below with your cloud name (shown on your Cloudinary dashboard)
 * and that preset's name.
 *
 * Note: files uploaded this way get a public URL — anyone with the link
 * can view them. That's an acceptable tradeoff for now, but worth
 * revisiting (e.g. migrating to Firebase Storage with real security
 * rules) once the business has revenue to justify the Blaze plan, since
 * proof-of-payment and prescription images are sensitive.
 */
const CLOUDINARY_CLOUD_NAME = "wb6wxped";
const CLOUDINARY_UPLOAD_PRESET = "Amson Web App";
