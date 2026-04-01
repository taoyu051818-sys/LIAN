import { spawn } from "node:child_process"
import { NextResponse } from "next/server"

const nodebbRoot = process.env.NODEBB_INTERNAL_ROOT || "/home/ty/NodeBB"
const scriptPath = `${nodebbRoot}/scripts/create_topic_from_frontend.js`

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const payload = await request.json()
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
