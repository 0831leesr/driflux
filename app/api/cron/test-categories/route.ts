import { NextResponse } from "next/server"
import { getPopularCategories } from "@/lib/chzzk"

/**
 * Test API: Get Popular Chzzk Categories
 * 
 * GET /api/cron/test-categories
 * 
 * This endpoint tests the Chzzk popular categories API
 * and returns the list of popular game categories.
 * 
 * Example:
 * GET /api/cron/test-categories
 * GET /api/cron/test-categories?size=10
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sizeParam = searchParams.get("size")
  const size = sizeParam ? parseInt(sizeParam, 10) : 20

  console.log("[Category Test] Fetching popular categories...")

  try {
    const categories = await getPopularCategories(size)

    return NextResponse.json({
      success: true,
      message: `Found ${categories.length} popular categories`,
      categories,
      note: "Use these categories as game titles in your database",
    })
  } catch (error) {
    console.error("[Category Test] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch categories",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
