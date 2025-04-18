"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PrincipalNav } from "@/components/principal-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs, query } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { PlusCircle, Calendar, Edit, Eye } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ClassSection {
  id: string
  name: string
  class: string
  section: string
}

interface Schedule {
  id: string
  classSectionId: string
  classSectionName: string
  createdAt: Date
  updatedAt: Date
}

export default function SchedulePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [classSections, setClassSections] = useState<ClassSection[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== "principal")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchClassSections = async () => {
      try {
        const snapshot = await getDocs(collection(db, "classSections"))
        const sections: ClassSection[] = []
        snapshot.forEach((doc) => {
          sections.push({
            id: doc.id,
            ...(doc.data() as Omit<ClassSection, "id">),
          })
        })
        setClassSections(sections)
      } catch (error) {
        console.error("Error fetching class sections:", error)
      }
    }

    const fetchSchedules = async () => {
      try {
        setIsLoading(true)
        const schedulesQuery = query(collection(db, "schedules"))
        const snapshot = await getDocs(schedulesQuery)

        const schedulesList: Schedule[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          schedulesList.push({
            id: doc.id,
            classSectionId: data.classSectionId || "",
            classSectionName: data.classSectionName || "",
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          })
        })

        setSchedules(schedulesList)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching schedules:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "principal") {
      fetchClassSections()
      fetchSchedules()
    }
  }, [user])

  const filteredSchedules = selectedClass
    ? schedules.filter((schedule) => schedule.classSectionId === selectedClass)
    : schedules

  if (loading || !user || user.role !== "principal") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="Class Schedules">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-1 xl:ml-0">Class Schedules</h1>
        <UserNav />
      </div>

      <Tabs defaultValue="class" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="class" className="cursor-pointer">Class Schedules</TabsTrigger>
          <TabsTrigger value="teacher" className="cursor-pointer">Teacher Schedules</TabsTrigger>
        </TabsList>

        <TabsContent value="class">
          <div className="flex items-center p-3 justify-between mb-6">
            <div className="w-full max-w-sm">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classSections.map((cs) => (
                    <SelectItem key={cs.id} value={cs.id} className="cursor-pointer">
                      {cs.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Link href="/principal/schedule/new">
              <Button className="cursor-pointer">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Schedule
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8">Loading schedules...</div>
          ) : filteredSchedules.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="mb-2 text-muted-foreground">No schedules found</p>
              <p className="text-sm text-muted-foreground mb-4">
                {selectedClass
                  ? "No schedule has been created for this class yet."
                  : "Create your first class schedule to get started."}
              </p>
              <Link href="/principal/schedule/new">
                <Button className="cursor-pointer">Create Schedule</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid gap-6 p-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredSchedules.map((schedule) => (
                <Card key={schedule.id}>
                  <CardHeader>
                    <CardTitle>{schedule.classSectionName}</CardTitle>
                    <CardDescription>Weekly Class Schedule</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Last updated: {schedule.updatedAt.toLocaleDateString()}
                    </p>
                    <div className="flex justify-between">
                      <Link href={`/principal/schedule/view/${schedule.id}`}>
                        <Button variant="outline" size="sm" className="cursor-pointer">
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </Link>
                      <Link href={`/principal/schedule/edit/${schedule.id}`}>
                        <Button variant="outline" size="sm" className="cursor-pointer">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="teacher" className="p-3">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Schedules</CardTitle>
              <CardDescription>View and manage teacher timetables</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center p-8 text-center">
                <div>
                  <p className="mb-2 text-muted-foreground">
                    Teacher schedules are automatically generated from class schedules
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create class schedules and assign teachers to view their schedules
                  </p>
                  <Link href="/principal/schedule/teachers">
                    <Button className="cursor-pointer">View Teacher Schedules</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
