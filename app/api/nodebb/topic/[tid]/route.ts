import { NextResponse } from "next/server"
import { spawn } from "node:child_process"

const NODEBB_URL =
  process.env.NODEBB_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_NODEBB_URL ||
  "http://localhost:4567"
const nodebbRoot = process.env.NODEBB_INTERNAL_ROOT || "/home/ty/NodeBB"
const scriptPath = `${nodebbRoot}/scripts/get_frontend_anonymous_topics.js`

type AnonymousMapResponse = {
  map?: Record<string, boolean>
}

async function getAnonymousFlag(tid: string) {
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

    child.stdin.write(JSON.stringify({ tids: [tid] }))
    child.stdin.end()
  })

  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const jsonLine = [...lines].reverse().find((line) => line.startsWith("{") && line.endsWith("}")) || "{}"
  const payload = JSON.parse(jsonLine) as AnonymousMapResponse
  return !!payload.map?.[String(tid)]
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ tid: string }> },
) {
  const { tid } = await context.params

  try {
    const response = await fetch(`${NODEBB_URL}/api/topic/${tid}`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to load topic" },
        { status: response.status },
      )
    }

    const data = await response.json()
    data.frontendAnonymous = await getAnonymousFlag(String(tid))
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
