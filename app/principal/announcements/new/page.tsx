"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PrincipalNav } from "@/components/principal-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db, storage } from "@/lib/firebase"
import { collection, addDoc, Timestamp } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { toast } from "sonner" // Import Sonner toast
import { ImageIcon, X, Upload } from "lucide-react"
import Image from "next/image"

export default function NewAnnouncementPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && (!user || user.role !== "principal")) {
      router.push("/login")
    }
  }, [user, loading, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Please select an image smaller than 5MB.") // Use Sonner for error
        return
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file.") // Use Sonner for error
        return
      }

      setImageFile(file)

      // Create preview
      const reader = new FileReader()
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error("Please enter a title for the announcement.") // Use Sonner for error
      return
    }

    setIsSubmitting(true)

    try {
      let imageUrl = ""

      // Upload image if selected
      if (imageFile) {
        try {
          console.log("Uploading image:", imageFile.name)
          const storageRef = ref(storage, `announcements/${Date.now()}_${imageFile.name}`)
          const uploadResult = await uploadBytes(storageRef, imageFile)
          console.log("Upload successful, getting download URL")
          imageUrl = await getDownloadURL(uploadResult.ref)
          console.log("Image URL obtained:", imageUrl)
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError)
          toast.error("Failed to upload image, but announcement will be created without it.") // Use Sonner for error
        }
      }

      // Add announcement to Firestore
      console.log("Creating announcement with data:", {
        title: formData.title,
        description: formData.description,
        imageUrl: imageUrl || null,
      })

      await addDoc(collection(db, "announcements"), {
        title: formData.title,
        description: formData.description,
        imageUrl: imageUrl || null,
        createdAt: Timestamp.now(),
        createdBy: user?.uid,
        createdByName: user?.name || "Principal",
      })

      toast.success("Your announcement has been published successfully.") // Use Sonner for success

      router.push("/principal/announcements")
    } catch (error: any) {
      console.error("Error creating announcement:", error)
      toast.error(error.message || "An unexpected error occurred") // Use Sonner for error
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || !user || user.role !== "principal") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="New Announcement">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-1 xl:ml-0">Create Announcement</h1>
        <UserNav />
      </div>

      <div className="p-3">
      <Card className="max-w-3xl">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>New Announcement</CardTitle>
            <CardDescription>Create a new announcement for students and teachers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter announcement title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter announcement details"
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Image (Optional)</Label>
              {imagePreview ? (
                <div className="relative mt-2 rounded-md overflow-hidden">
                  <div className="relative h-64 w-full">
                    <Image src={imagePreview || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium mb-1">Click to upload an image</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG or GIF (max. 5MB)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex mt-5 gap-2 justify-between">
            <Button type="button" variant="outline" className="cursor-pointer" onClick={() => router.push("/principal/announcements")}>
              Cancel
            </Button>
            <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Publishing...
                </>
              ) : (
                "Publish Announcement"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
      </div>
    </DashboardShell>
  )
}
