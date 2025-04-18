"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-provider"
import { DashboardShell } from "@/components/dashboard-shell"
import { PrincipalNav } from "@/components/principal-nav"
import { UserNav } from "@/components/user-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { collection, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { PlusCircle, Edit, Trash2, Eye } from "lucide-react"
import { toast } from "sonner"  // Import toast from sonner
import Link from "next/link"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Input } from "@/components/ui/input"

// Define the Timetable type
interface Timetable {
  id: string;
  examName: string;
  classSectionName: string;
  examEntries?: any[]; // Adjust based on your data structure for exam entries
  createdAt: Date;
}

export default function ExamTimetablesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [timetables, setTimetables] = useState<Timetable[]>([]) // Explicitly type as Timetable[]
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!loading && (!user || user.role !== "principal")) {
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
            examName: data.examName || "", // Default to empty string if not present
            classSectionName: data.classSectionName || "", // Default to empty string if not present
            examEntries: data.examEntries || [], // Default to empty array if not present
            createdAt: data.createdAt?.toDate() || new Date(), // Ensure createdAt is a Date object
          }
        })

        setTimetables(timetablesData)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching exam timetables:", error)
        toast.error("Failed to load exam timetables. Please try again.")  // Use sonner's toast
        setIsLoading(false)
      }
    }

    if (user && user.role === "principal") {
      fetchTimetables()
    }
  }, [user])

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "examTimetables", id))
      setTimetables(timetables.filter((timetable) => timetable.id !== id))
      toast.success("Exam Time Table deleted successfully.") // Using sonner's success toast
    } catch (error) {
      console.error("Error deleting Time Table:", error)
      toast.error("Failed to delete the time table. Please try again.") // Using sonner's error toast
    }
  }

  const filteredTimetables = timetables.filter(
    (timetable) =>
      timetable.examName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      timetable.classSectionName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading || !user || user.role !== "principal") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="Exam Timetables">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-1 xl:ml-0">Exam Timetables</h1>
        <UserNav />
      </div>

      <div className="flex items-center p-3 justify-between mb-6">
        <div className="w-full max-w-sm">
          <Input
            placeholder="Search by exam name or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48"
          />
        </div>
        <Link href="/principal/exams/new">
          <Button className="cursor-pointer">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Timetable
          </Button>
        </Link>
      </div>

    
      <div className="p-3">
      <Card>
        <CardHeader>
          <CardTitle>All Exam Timetables</CardTitle>
          <CardDescription>Manage exam timetables for all classes</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <p>Loading exam timetables...</p>
            </div>
          ) : filteredTimetables.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="mb-2 text-muted-foreground">No exam timetables found</p>
              {searchQuery ? (
                <p className="text-sm text-muted-foreground">Try adjusting your search query</p>
              ) : (
                <Link href="/principal/exams/new">
                  <Button variant="outline" size="sm">
                    Create your first exam timetable
                  </Button>
                </Link>
              )}
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
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/principal/exams/${timetable.id}`}>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/principal/exams/edit/${timetable.id}`}>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="cursor-pointer">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Exam Timetable</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this exam timetable? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(timetable.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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
