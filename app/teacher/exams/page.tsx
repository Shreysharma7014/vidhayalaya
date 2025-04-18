"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-provider"
import { DashboardShell } from "@/components/dashboard-shell"
import { TeacherNav } from "@/components/teacher-nav"
import { UserNav } from "@/components/user-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Eye } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Define the Timetable type if not already defined
interface Timetable {
  id: string
  examName: string
  classSectionName: string
  examEntries: any[]  // Change `any` to the specific type of exam entries if available
  createdAt: Date
}

export default function TeacherExamTimetablesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [timetables, setTimetables] = useState<Timetable[]>([]) // Define state with Timetable type
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!loading && (!user || user.role !== "teacher")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchTimetables = async () => {
      try {
        setIsLoading(true)
        const timetablesQuery = query(collection(db, "examTimetables"), orderBy("createdAt", "desc"))
        const snapshot = await getDocs(timetablesQuery)

        const timetablesData: Timetable[] = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            examName: data.examName || "",  // Ensure examName is a string
            classSectionName: data.classSectionName || "",  // Ensure classSectionName is a string
            examEntries: data.examEntries || [],  // Ensure examEntries is an array
            createdAt: data.createdAt?.toDate() || new Date(),  // Ensure createdAt is a Date
          }
        })

        setTimetables(timetablesData)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching exam timetables:", error)
        toast.error("Failed to load exam timetables. Please try again.")
        setIsLoading(false)
      }
    }

    if (user && user.role === "teacher") {
      fetchTimetables()
    }
  }, [user])

  const filteredTimetables = timetables.filter(
    (timetable) =>
      timetable.examName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      timetable.classSectionName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading || !user || user.role !== "teacher") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<TeacherNav />} title="Exam Timetables">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-1 xl:ml-0">Exam Timetables</h1>
        <UserNav />
      </div>

      <div className="mb-6 p-3">
        <Input
          placeholder="Search by exam name or class..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="p-3">
      <Card>
        <CardHeader>
          <CardTitle>All Exam Timetables</CardTitle>
          <CardDescription>View exam timetables for all classes</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <p>Loading exam timetables...</p>
            </div>
          ) : filteredTimetables.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="mb-2 text-muted-foreground">No exam timetables found</p>
              {searchQuery && <p className="text-sm text-muted-foreground">Try adjusting your search query</p>}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTimetables.map((timetable) => (
                  <TableRow key={timetable.id}>
                    <TableCell className="font-medium">{timetable.examName}</TableCell>
                    <TableCell>{timetable.classSectionName}</TableCell>
                    <TableCell>{timetable.examEntries?.length || 0} subjects</TableCell>
                    <TableCell>
                      {timetable.createdAt instanceof Date ? format(timetable.createdAt, "PPP") : "Unknown date"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/teacher/exams/${timetable.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>
    </DashboardShell>
  )
}
