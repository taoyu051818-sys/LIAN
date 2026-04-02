import { getCloudinary } from "@/lib/cloudinary"

const DEFAULT_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  referer: "https://mp.weixin.qq.com/",
}

function guessExtension(contentType: string | null, sourceUrl: string) {
  if (contentType?.includes("png")) {
    return "png"
  }
  if (contentType?.includes("webp")) {
    return "webp"
  }
  if (contentType?.includes("gif")) {
    return "gif"
  }
  if (sourceUrl.includes("wx_fmt=png")) {
    return "png"
  }
  if (sourceUrl.includes("wx_fmt=webp")) {
    return "webp"
  }
  return "jpg"
}

export async function mirrorRemoteImageToCloudinary(
  sourceUrl: string,
  folder = "nodebb-frontend/imported"
) {
  const response = await fetch(sourceUrl, {
    headers: DEFAULT_HEADERS,
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Image fetch failed: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const contentType = response.headers.get("content-type") || "image/jpeg"
  const dataUri = `data:${contentType};base64,${buffer.toString("base64")}`
  const extension = guessExtension(contentType, sourceUrl)
  const cloudinary = getCloudinary()

  const uploadResult = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: "image",
    format: extension,
  })

  return {
    publicId: uploadResult.public_id,
    secureUrl: uploadResult.secure_url,
    width: uploadResult.width,
    height: uploadResult.height,
  }
}
