"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PrincipalNav } from "@/components/principal-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db, storage } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore"
import { ref, deleteObject } from "firebase/storage"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Bell, Plus, Trash2, Edit, Eye } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"  // Import Sonner's toast function

interface Announcement {
  id: string
  title: string
  description: string
  imageUrl?: string
  createdAt: Date
  createdBy: string
  createdByName: string
}

export default function AnnouncementsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && (!user || user.role !== "principal")) {
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

    if (user && user.role === "principal") {
      fetchAnnouncements()
    }
  }, [user])

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      setDeletingId(id)

      // Find the announcement to get the image URL
      const announcement = announcements.find((a) => a.id === id)

      // Delete the document from Firestore
      await deleteDoc(doc(db, "announcements", id))

      // If there's an image, delete it from storage
      if (announcement?.imageUrl) {
        const imageRef = ref(storage, announcement.imageUrl)
        await deleteObject(imageRef)
      }

      // Update the state
      setAnnouncements(announcements.filter((a) => a.id !== id))

      toast.success("Announcement deleted successfully")  // Sonner success toast
    } catch (error) {
      console.error("Error deleting announcement:", error)
      toast.error("Failed to delete the announcement. Please try again.")  // Sonner error toast
    } finally {
      setDeletingId(null)
    }
  }

  if (loading || !user || user.role !== "principal") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="Announcements">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-1 xl:ml-0">Announcements</h1>
        <UserNav />
      </div>

      <div className="flex justify-between p-3 items-center mb-6">
        <div>
          <h2 className="text-sm md:text-md xl:text-lg font-medium ">All Announcements</h2>
          <p className="text-sm md:text-md xl:text-lg text-muted-foreground">Manage school announcements for students and teachers</p>
        </div>
        <Link href="/principal/announcements/new">
          <Button className="cursor-pointer">
            <Plus className="md:mr-2 h-4 w-4" />
             <span className="hidden md:block">New Announcement</span>
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading announcements...</div>
      ) : announcements.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <Bell className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="mb-2 text-muted-foreground">No announcements found</p>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first announcement to inform students and teachers
          </p>
          <Link href="/principal/announcements/new">
            <Button className="cursor-pointer">Create Announcement</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-6 p-3 md:grid-cols-2 lg:grid-cols-3">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="overflow-hidden flex flex-col">
              {announcement.imageUrl && (
                <div className="relative h-48 w-full">
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
              <CardHeader>
                <CardTitle className="line-clamp-1">{announcement.title}</CardTitle>
                <CardDescription>Posted on {format(announcement.createdAt, "PPP")}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">{announcement.description}</p>
              </CardContent>
              <CardFooter className="flex justify-between border-t p-4">
                <Link href={`/principal/announcements/${announcement.id}`}>
                  <Button variant="ghost" size="sm" className="cursor-pointer">
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                </Link>
                <div className="flex gap-2">
                  <Link href={`/principal/announcements/edit/${announcement.id}`}>
                    <Button variant="ghost" size="sm" className="cursor-pointer">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 cursor-pointer">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this announcement? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteAnnouncement(announcement.id)}
                          disabled={deletingId === announcement.id}
                        >
                          {deletingId === announcement.id ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
