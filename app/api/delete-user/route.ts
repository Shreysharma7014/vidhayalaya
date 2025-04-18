import { type NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Get the JSON payload from the request
    const { uid } = await request.json()

    // Check if UID is provided
    if (!uid) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Attempt to delete the user from Firebase Authentication
    await adminAuth.deleteUser(uid)

    // Respond with a success message
    return NextResponse.json({ success: true })
  } catch (error: any) {
    // Enhanced error logging for debugging
    console.error("Error deleting user:", error)

    // Return a detailed error message for the client
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: error.status || 500 } // Return specific error status if available
    )
  }
}
