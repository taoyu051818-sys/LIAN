import { NextResponse } from "next/server"

const NODEBB_URL =
  process.env.NODEBB_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_NODEBB_URL ||
  "http://localhost:4567"

export const runtime = "nodejs"

export async function GET() {
  try {
    const response = await fetch(`${NODEBB_URL}/api/categories`, {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`NodeBB categories failed: ${response.status}`)
    }

    const data = await response.json()
    const categories = (data.categories || []).map(
      (category: {
        cid: number
        name: string
        icon?: string
      }) => ({
        cid: category.cid,
        name: category.name,
        icon: category.icon || "",
      })
    )

    const defaultCategory =
      categories.find((category: { cid: number }) => category.cid === 2) || categories[0] || null

    return NextResponse.json({
      categories,
      defaultCid: defaultCategory?.cid ?? 2,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load compose context",
      },
      { status: 500 }
    )
  }
}
