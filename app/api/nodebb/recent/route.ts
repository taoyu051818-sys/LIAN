import { NextResponse } from "next/server"
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"

const NODEBB_URL =
  process.env.NODEBB_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_NODEBB_URL ||
  "http://localhost:4567"
const nodebbRoot = process.env.NODEBB_INTERNAL_ROOT
const scriptPath = nodebbRoot ? `${nodebbRoot}/scripts/get_frontend_anonymous_topics.js` : null

type AnonymousMapResponse = {
  map?: Record<string, boolean>
}

async function getAnonymousMap(tids: string[]) {
  if (!tids.length || !nodebbRoot || !scriptPath || !existsSync(scriptPath)) {
    return {}
  }

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
      reject(new Error(errorOutput.trim() || `Anonymous script failed with code ${code}`))
    })

    child.stdin.write(JSON.stringify({ tids }))
    child.stdin.end()
  })

  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const jsonLine = [...lines].reverse().find((line) => line.startsWith("{") && line.endsWith("}")) || "{}"
  const payload = JSON.parse(jsonLine) as AnonymousMapResponse
  return payload.map || {}
}

export async function GET() {
  try {
    const response = await fetch(`${NODEBB_URL}/api/recent`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to load recent topics" },
        { status: response.status },
      )
    }

    const data = await response.json()
    const topics = Array.isArray(data.topics) ? data.topics : []
    const tids = topics.map((topic: { tid?: number | string }) => String(topic.tid || "")).filter(Boolean)
    let anonymousMap: Record<string, boolean> = {}
    try {
      anonymousMap = await getAnonymousMap(tids)
    } catch {
      anonymousMap = {}
    }

    data.topics = topics.map((topic: { tid?: number | string }) => ({
      ...topic,
      frontendAnonymous: !!anonymousMap[String(topic.tid || "")],
    }))

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to reach NodeBB",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
