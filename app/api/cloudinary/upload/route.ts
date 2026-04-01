import { NextResponse } from "next/server"
import { cloudinary } from "@/lib/cloudinary"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const mimeType = file.type || "application/octet-stream"
    const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`

    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: "nodebb-frontend/publish",
      resource_type: "image",
    })

    return NextResponse.json({
      publicId: uploadResult.public_id,
      secureUrl: uploadResult.secure_url,
      width: uploadResult.width,
      height: uploadResult.height,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 }
    )
  }
}
