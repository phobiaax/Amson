/**
 * Shared Cloudinary upload helper - used by payment.js now, and reusable
 * later for prescription uploads and product photos in the admin panel.
 */

async function uploadToCloudinary(file) {
  if (CLOUDINARY_CLOUD_NAME === "YOUR_CLOUDINARY_CLOUD_NAME") {
    throw new Error("Cloudinary is not configured yet. See README.md for setup steps.");
  }

  const formData = new FormData();
  formData.append("file", file);
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
