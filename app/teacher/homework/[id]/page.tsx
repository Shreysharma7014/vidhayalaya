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
import { ArrowLeft, Edit, Calendar, BookOpen, Users } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

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
  teacherName: string
}

export default function ViewHomeworkPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const homeworkId = params.id as string

  const [homework, setHomework] = useState<Homework | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== "teacher")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchHomework = async () => {
      if (!homeworkId) return

      try {
        setIsLoading(true)
        const docRef = doc(db, "homework", homeworkId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()

          // Verify this homework belongs to the current teacher
          if (data.teacherId !== user?.uid) {
            router.push("/teacher/homework")
            return
          }

          setHomework({
            id: docSnap.id,
            title: data.title,
            description: data.description,
            subject: data.subject,
            classSectionId: data.classSectionId,
            classSectionName: data.classSectionName,
            dueDate: data.dueDate.toDate(),
            createdAt: data.createdAt.toDate(),
            teacherId: data.teacherId,
            teacherName: data.teacherName,
          })
        } else {
          router.push("/teacher/homework")
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching homework:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "teacher") {
      fetchHomework()
    }
  }, [homeworkId, user, router])

  const isPastDue = (date: Date) => {
    return date < new Date()
  }

  if (loading || !user || user.role !== "teacher") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<TeacherNav />} title="Homework Details">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/teacher/homework">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Homework Details</h1>
        </div>
        <UserNav />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading homework details...</div>
      ) : !homework ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <h2 className="text-lg font-medium mb-2">Homework Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The homework you're looking for doesn't exist or has been deleted.
            </p>
            <Link href="/teacher/homework">
              <Button>Back to Homework</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl">{homework.title}</CardTitle>
                  {isPastDue(homework.dueDate) ? (
                    <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">
                      Past Due
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                      Active
                    </Badge>
                  )}
                </div>
                <CardDescription>Assigned on {format(homework.createdAt, "PPP")}</CardDescription>
              </div>
              <Link href={`/teacher/homework/edit/${homework.id}`}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose max-w-none">
                <p className="whitespace-pre-line">{homework.description}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Subject</p>
                <p className="flex items-center font-medium">
                  <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                  {homework.subject}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Class</p>
                <p className="flex items-center font-medium">
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  {homework.classSectionName}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="flex items-center font-medium">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  {format(homework.dueDate, "PPP")}
                </p>
              </div>

              <div className="pt-4">
                <Link href={`/teacher/homework/edit/${homework.id}`}>
                  <Button className="w-full">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Homework
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardShell>
  )
}

