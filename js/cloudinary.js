/**
 * Shared Cloudinary upload helper.
 */

// Phone photos are often 3-8 MB. Shrinking them in the browser first keeps
// uploads fast on mobile data and keeps Cloudinary's free storage for many
// more photos. maxSize is the longest side in pixels: product photos need
// less, prescriptions and permits more (they must stay readable).
const CLOUDINARY_UPLOAD_SIZES = {
  product: 1200,
  profile: 600,
  payment: 1600,
  document: 2000,
};

// Returns a smaller JPEG of an image file, or the original file when it is
// already small, isn't a photo (PDF, GIF, SVG) or can't be read.
async function shrinkImageForUpload(file, maxSize) {
  if (!file || !/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) || file.size < 300 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    // White behind transparent PNGs, since JPEG has no transparency.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    if (bitmap.close) bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch (error) {
    console.warn("Couldn't shrink the image before upload; sending the original.", error);
    return file;
  }
}

async function uploadToCloudinary(file, { kind = "payment" } = {}) {
  if (CLOUDINARY_CLOUD_NAME === "YOUR_CLOUDINARY_CLOUD_NAME") {
    throw new Error("Cloudinary is not configured yet. See README.md for setup steps.");
  }

  const upload = await shrinkImageForUpload(file, CLOUDINARY_UPLOAD_SIZES[kind] || CLOUDINARY_UPLOAD_SIZES.payment);
  const formData = new FormData();
  formData.append("file", upload);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    throw new Error("Image upload failed. Please try again.");
  }

  const data = await response.json();
  return data.secure_url;
}
