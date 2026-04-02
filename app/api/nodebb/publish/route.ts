import { spawn } from "node:child_process"
import { NextResponse } from "next/server"
import { existsSync } from "node:fs"
import { mirrorRemoteImageToCloudinary } from "@/lib/mirror-remote-image"

const nodebbRoot = process.env.NODEBB_INTERNAL_ROOT
const scriptPath = nodebbRoot ? `${nodebbRoot}/scripts/create_topic_from_frontend.js` : null

export const runtime = "nodejs"

type UploadedImage = {
  publicId?: string
  url?: string
  secureUrl?: string
}

type PublishPayload = {
  title?: string
  content?: string
  body?: string
  cid?: number
  uid?: number
  authorUid?: number
  anonymous?: boolean
  isAnonymous?: boolean
  images?: UploadedImage[]
  remoteImageUrls?: string[]
}

function normalizeLines(value: string) {
  return value.replace(/\r\n/g, "\n").trim()
}

async function buildPublishPayload(payload: PublishPayload) {
  const mirroredUrls: string[] = []
  const uploadedUrls = (payload.images || [])
    .map((image) => image?.secureUrl || image?.url || "")
    .filter(Boolean)

  for (const remoteUrl of payload.remoteImageUrls || []) {
    try {
      const mirrored = await mirrorRemoteImageToCloudinary(remoteUrl)
      mirroredUrls.push(mirrored.secureUrl)
    } catch {
      // Ignore single-image failures so publishing can still continue.
    }
  }

  const imageUrls = [...uploadedUrls, ...mirroredUrls].filter(Boolean)
  const imageBlock = imageUrls.map((url) => `![image](${url})`).join("\n\n")
  const rawContent = String(payload.content || payload.body || "")
  const content = normalizeLines([imageBlock, rawContent].filter(Boolean).join("\n\n"))

  return {
    title: String(payload.title || "").trim(),
    content,
    cid: Number(payload.cid || 1),
    uid: Number(payload.uid || payload.authorUid || 1),
    isAnonymous: Boolean(payload.isAnonymous ?? payload.anonymous),
  }
}

export async function POST(request: Request) {
  try {
    if (!nodebbRoot || !scriptPath || !existsSync(scriptPath)) {
      return NextResponse.json(
        {
          error: "Publish script unavailable",
          details:
            "NODEBB_INTERNAL_ROOT is required and must contain scripts/create_topic_from_frontend.js",
        },
        { status: 503 }
      )
    }

    const rawPayload = (await request.json()) as PublishPayload
    const payload = await buildPublishPayload(rawPayload)
    const stdout = await new Promise<string>((resolve, reject) => {
      const child = spawn(process.execPath, [scriptPath], {
        cwd: nodebbRoot,
        stdio: ["pipe", "pipe", "pipe"],
      })

      let output = ""
      let errorOutput = ""

      child.stdout.on("data", (chunk) => {
        output += chunk.toString()
      })

      child.stderr.on("data", (chunk) => {
        errorOutput += chunk.toString()
      })

      child.on("error", reject)

      child.on("close", (code) => {
        if (code === 0) {
          resolve(output)
          return
        }

        reject(new Error(errorOutput.trim() || `Publish script failed with code ${code}`))
      })

      child.stdin.write(JSON.stringify(payload))
      child.stdin.end()
    })

    const lines = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const jsonLine = [...lines].reverse().find((line) => line.startsWith("{") && line.endsWith("}")) || "{}"
    const result = JSON.parse(jsonLine)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to publish topic",
      },
      { status: 500 }
    )
  }
}
