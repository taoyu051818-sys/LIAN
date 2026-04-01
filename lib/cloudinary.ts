import "server-only"

import { v2 as cloudinary } from "cloudinary"

let configured = false

export function getCloudinary() {
  const cloudinaryUrl = process.env.CLOUDINARY_URL

  if (!cloudinaryUrl) {
    throw new Error("CLOUDINARY_URL is not configured")
  }

  if (!configured) {
    cloudinary.config({
      cloudinary_url: cloudinaryUrl,
      secure: true,
    })
    configured = true
  }

  return cloudinary
}
