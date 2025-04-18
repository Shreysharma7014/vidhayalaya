"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TeacherNav } from "@/components/teacher-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Bell } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Announcement {
  id: string
  title: string
  description: string
  imageUrl?: string
  createdAt: Date
  createdBy: string
  createdByName: string
}

export default function TeacherAnnouncementsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== "teacher")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setIsLoading(true)
        const announcementsQuery = query(collection(db, "announcements"), orderBy("createdAt", "desc"))

        const snapshot = await getDocs(announcementsQuery)

        const announcementsList: Announcement[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          announcementsList.push({
            id: doc.id,
            title: data.title,
            description: data.description,
            imageUrl: data.imageUrl,
            createdAt: data.createdAt.toDate(),
            createdBy: data.createdBy,
            createdByName: data.createdByName || "Principal",
          })
        })

        setAnnouncements(announcementsList)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching announcements:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "teacher") {
      fetchAnnouncements()
    }
  }, [user])

  if (loading || !user || user.role !== "teacher") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<TeacherNav />} title="Announcements">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-1 xl:ml-0">School Announcements</h1>
        <UserNav />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading announcements...</div>
      ) : announcements.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <Bell className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="mb-2 text-muted-foreground">No announcements found</p>
          <p className="text-sm text-muted-foreground">There are no announcements at this time. Check back later.</p>
        </Card>
      ) : (
        <div className="space-y-6 p-3">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="overflow-hidden">
              <div className="md:flex">
                {announcement.imageUrl && (
                  <div className="relative h-48 md:h-auto md:w-1/3">
                    <Image
                      src={announcement.imageUrl || "/placeholder.svg"}
                      alt={announcement.title}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        console.error("Error loading image:", announcement.imageUrl)
                        // Fallback to placeholder on error
                        ;(e.target as HTMLImageElement).src = "/placeholder.svg"
                      }}
                    />
                  </div>
                )}
                <div className={`flex-1 ${announcement.imageUrl ? "md:w-2/3" : "w-full"}`}>
                  <CardHeader>
                    <CardTitle>{announcement.title}</CardTitle>
                    <CardDescription>
                      Posted by {announcement.createdByName} on {format(announcement.createdAt, "PPP")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{announcement.description}</p>
                    <Link href={`/teacher/announcements/${announcement.id}`}>
                      <Button variant="outline" size="sm">
                        Read More
                      </Button>
                    </Link>
                  </CardContent>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}

