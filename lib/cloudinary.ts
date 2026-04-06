import "server-only"

import { v2 as cloudinary } from "cloudinary"

let configured = false

function parseCloudinaryUrl(cloudinaryUrl: string) {
  let parsed: URL

  try {
    parsed = new URL(cloudinaryUrl)
  } catch {
    throw new Error("CLOUDINARY_URL format is invalid")
  }

  if (parsed.protocol !== "cloudinary:") {
    throw new Error("CLOUDINARY_URL must start with cloudinary://")
  }

  const apiKey = decodeURIComponent(parsed.username)
  const apiSecret = decodeURIComponent(parsed.password)
  const cloudName = parsed.hostname

  if (!apiKey || !apiSecret || !cloudName) {
    throw new Error("CLOUDINARY_URL is missing cloud name or credentials")
  }

  return {
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  }
}

export function getCloudinary() {
  const cloudinaryUrl = process.env.CLOUDINARY_URL

  if (!cloudinaryUrl) {
    throw new Error("CLOUDINARY_URL is not configured")
  }

  if (!configured) {
    cloudinary.config(parseCloudinaryUrl(cloudinaryUrl))
    configured = true
  }

  return cloudinary
}
