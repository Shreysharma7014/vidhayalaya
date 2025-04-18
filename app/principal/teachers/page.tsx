"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PrincipalNav } from "@/components/principal-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore"
import { PlusCircle, Search, Edit, Trash2, Eye } from "lucide-react"
import Link from "next/link"
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
import { toast } from "sonner"  // Importing sonner toast
import { Badge } from "@/components/ui/badge"

interface Teacher {
  id: string
  name: string
  email: string
  phone: string
  subject: string
  isClassTeacher: boolean
  classSectionName: string
}

export default function TeachersPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== "principal")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchTeachers = async () => {
      if (!user || user.role !== "principal") return

      try {
        setIsLoading(true)
        const q = query(collection(db, "users"), where("role", "==", "teacher"))
        const querySnapshot = await getDocs(q)

        const teachersList: Teacher[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          teachersList.push({
            id: doc.id,
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            subject: data.subject || "",
            isClassTeacher: data.isClassTeacher || false,
            classSectionName: data.classSectionName || "",
          })
        })

        setTeachers(teachersList)
        setFilteredTeachers(teachersList)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching teachers:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "principal") {
      fetchTeachers()
    }
  }, [user, loading])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTeachers(teachers)
    } else {
      const filtered = teachers.filter(
        (teacher) =>
          teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          teacher.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          teacher.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          teacher.classSectionName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredTeachers(filtered)
    }
  }, [searchQuery, teachers])

  const handleDeleteTeacher = async (teacherId: string) => {
    try {
      await deleteDoc(doc(db, "users", teacherId))

      setTeachers((prev) => prev.filter((teacher) => teacher.id !== teacherId))
      toast.success("Teacher deleted", {
        description: "The teacher has been removed from the system.",
      })
    } catch (error) {
      console.error("Error deleting teacher:", error)
      toast.error("Error", {
        description: "Failed to delete teacher. Please try again.",
      })
    }
  }

  if (loading || !user || user.role !== "principal") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="Teachers">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-0 xl:ml-0">Teachers</h1>
        <UserNav />
      </div>

      <div className="flex items-center justify-between gap-2 mb-6 p-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search teachers..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Link href="/principal/teachers/new">
          <Button className="cursor-pointer">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Teacher
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading teachers...</div>
      ) : filteredTeachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="text-muted-foreground mb-2">No teachers found</div>
          {searchQuery ? (
            <p className="text-sm text-muted-foreground">
              No teachers match your search query. Try a different search term.
            </p>
          ) : (
            <Link href="/principal/teachers/new">
              <Button variant="outline" className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add your first teacher
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="border rounded-md ml-2.5 md:ml-0 xl:ml-0 mr-2 ">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Class Teacher</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell>{teacher.subject}</TableCell>
                  <TableCell>
                    {teacher.isClassTeacher ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                        {teacher.classSectionName}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell>{teacher.phone}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/principal/teachers/${teacher.id}`}>
                        <Button variant="ghost" size="icon" className="cursor-pointer">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/principal/teachers/edit/${teacher.id}`}>
                        <Button variant="ghost" size="icon" className="cursor-pointer">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {teacher.name}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteTeacher(teacher.id)} className="cursor-pointer">
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
        </div>
      )}
    </DashboardShell>
  )
}
