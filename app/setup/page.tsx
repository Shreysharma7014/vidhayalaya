"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { toast } from "sonner"

export default function SetupPage() {
  const [isCreating, setIsCreating] = useState(false)
  const [isCreated, setIsCreated] = useState(false)

  const createAdminUser = async () => {
    setIsCreating(true)
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, "harshitsharma3492@gmail.com", "12345678")

      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: "Admin User",
        email: "harshitsharma3492@gmail.com",
        role: "admin",
        createdAt: new Date().toISOString(),
      })

      toast.success("Admin created successfully", {
        description: "You can now log in with the admin credentials.",
      })

      setIsCreated(true)
    } catch (error: any) {
      toast.error("Error creating admin", {
        description: error.message || "An unexpected error occurred",
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Admin User</CardTitle>
          <CardDescription>Create an admin user with the following credentials:</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-4">
            <p className="text-sm font-medium">Email: harshitsharma3492@gmail.com</p>
            <p className="text-sm font-medium">Password: 12345678</p>
          </div>
          {isCreated && (
            <div className="rounded-md bg-green-50 p-4 text-green-800">
              <p className="text-sm font-medium">Admin user created successfully!</p>
              <p className="text-sm">You can now log in with the admin credentials.</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={createAdminUser} disabled={isCreating || isCreated}>
            {isCreating ? "Creating..." : isCreated ? "Admin Created" : "Create Admin User"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
