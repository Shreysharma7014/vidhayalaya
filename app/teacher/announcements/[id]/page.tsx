"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TeacherNav } from "@/components/teacher-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter, useParams } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Announcement {
  id: string
  title: string
  description: string
  imageUrl?: string
  createdAt: Date
  createdBy: string
  createdByName: string
}

export default function ViewAnnouncementPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const announcementId = params.id as string

  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== "teacher")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchAnnouncement = async () => {
      if (!announcementId) return

      try {
        setIsLoading(true)
        const docRef = doc(db, "announcements", announcementId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setAnnouncement({
            id: docSnap.id,
            title: data.title,
            description: data.description,
            imageUrl: data.imageUrl,
            createdAt: data.createdAt.toDate(),
            createdBy: data.createdBy,
            createdByName: data.createdByName || "Principal",
          })
        } else {
          router.push("/teacher/announcements")
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching announcement:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "teacher") {
      fetchAnnouncement()
    }
  }, [announcementId, user, router])

  if (loading || !user || user.role !== "teacher") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<TeacherNav />} title="Announcement">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/teacher/announcements">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Announcement Details</h1>
        </div>
        <UserNav />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading announcement...</div>
      ) : !announcement ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <h2 className="text-lg font-medium mb-2">Announcement Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The announcement you're looking for doesn't exist or has been deleted.
            </p>
            <Link href="/teacher/announcements">
              <Button>Back to Announcements</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="p-3">
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle className="text-2xl">{announcement.title}</CardTitle>
            <CardDescription>
              Posted by {announcement.createdByName} on {format(announcement.createdAt, "PPP")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {announcement.imageUrl && (
              <div className="relative h-80 w-full rounded-md overflow-hidden">
                <Image
                  src={announcement.imageUrl || "/placeholder.svg"}
                  alt={announcement.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <div className="prose max-w-none">
              <p className="whitespace-pre-line">{announcement.description}</p>
            </div>
          </CardContent>
        </Card>
        </div>
      )}
    </DashboardShell>
  )
}

