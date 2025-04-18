"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TeacherNav } from "@/components/teacher-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Plus, Edit, Trash2, Calendar, BookOpen } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"  // Import sonner's toast function
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

interface Homework {
  id: string
  title: string
  description: string
  subject: string
  classSectionId: string
  classSectionName: string
  dueDate: Date
  createdAt: Date
  teacherId: string
}

export default function HomeworkPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [homework, setHomework] = useState<Homework[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && (!user || user.role !== "teacher")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchHomework = async () => {
      if (!user?.uid) return

      try {
        setIsLoading(true)
        // Remove the orderBy clause to avoid requiring a composite index
        const homeworkQuery = query(collection(db, "homework"), where("teacherId", "==", user.uid))

        const snapshot = await getDocs(homeworkQuery)

        const homeworkList: Homework[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          homeworkList.push({
            id: doc.id,
            title: data.title,
            description: data.description,
            subject: data.subject,
            classSectionId: data.classSectionId,
            classSectionName: data.classSectionName,
            dueDate: data.dueDate.toDate(),
            createdAt: data.createdAt.toDate(),
            teacherId: data.teacherId,
          })
        })

        // Sort the homework list by createdAt in memory
        homeworkList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        setHomework(homeworkList)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching homework:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "teacher") {
      fetchHomework()
    }
  }, [user])

  const handleDeleteHomework = async (id: string) => {
    try {
      setDeletingId(id)
      await deleteDoc(doc(db, "homework", id))
      setHomework(homework.filter((hw) => hw.id !== id))
      toast.success("Homework deleted successfully.") // Using sonner's success toast
    } catch (error) {
      console.error("Error deleting homework:", error)
      toast.error("Failed to delete the homework. Please try again.") // Using sonner's error toast
    } finally {
      setDeletingId(null)
    }
  }

  const isPastDue = (date: Date) => {
    return date < new Date()
  }

  if (loading || !user || user.role !== "teacher") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<TeacherNav />} title="Homework">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Homework Management</h1>
        <UserNav />
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-medium">All Homework</h2>
          <p className="text-sm text-muted-foreground">Manage homework assignments for your classes</p>
        </div>
        <Link href="/teacher/homework/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Assign Homework
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading homework...</div>
      ) : homework.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="mb-2 text-muted-foreground">No homework assignments found</p>
          <p className="text-sm text-muted-foreground mb-4">Create your first homework assignment for your students</p>
          <Link href="/teacher/homework/new">
            <Button>Assign Homework</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {homework.map((hw) => (
            <Card key={hw.id} className="overflow-hidden flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="line-clamp-1">{hw.title}</CardTitle>
                  {isPastDue(hw.dueDate) ? (
                    <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">
                      Past Due
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                      Active
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center">
                      <BookOpen className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <span>{hw.subject}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <span>Due: {format(hw.dueDate, "PPP")}</span>
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="text-sm text-muted-foreground line-clamp-3">{hw.description}</div>
                <div className="mt-3">
                  <Badge variant="secondary" className="mr-2">
                    {hw.classSectionName}
                  </Badge>
                </div>
              </CardContent>
              <div className="flex justify-between border-t p-4">
                <Link href={`/teacher/homework/${hw.id}`}>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
                <div className="flex gap-2">
                  <Link href={`/teacher/homework/edit/${hw.id}`}>
                    <Button variant="ghost" size="sm">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Homework</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this homework assignment? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteHomework(hw.id)} disabled={deletingId === hw.id}>
                          {deletingId === hw.id ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
