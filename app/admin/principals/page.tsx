"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AdminNav } from "@/components/admin-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface Principal {
  id: string
  name: string
  email: string
  phone: string
  photoURL?: string
}

export default function PrincipalsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [principals, setPrincipals] = useState<Principal[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchPrincipals = async () => {
      try {
        setIsLoading(true)
        const principalQuery = query(collection(db, "users"), where("role", "==", "principal"))
        const snapshot = await getDocs(principalQuery)

        const principalsList: Principal[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          principalsList.push({
            id: doc.id,
            name: data.name || "Unknown",
            email: data.email || "",
            phone: data.phone || "",
            photoURL: data.photoURL,
          })
        })

        setPrincipals(principalsList)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching principals:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "admin") {
      fetchPrincipals()
    }
  }, [user])

  const filteredPrincipals = principals.filter(
    (principal) =>
      principal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      principal.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (loading || !user || user.role !== "admin") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<AdminNav />} title="Principals">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Principals</h1>
        <UserNav />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search principals..."
            className="w-full pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Link href="/admin/principals/new">
          <Button>Add Principal</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading principals...</div>
      ) : filteredPrincipals.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <p className="mb-2 text-muted-foreground">No principals found</p>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery ? "Try a different search term" : "Add a principal to get started"}
          </p>
          <Link href="/admin/principals/new">
            <Button>Add Principal</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPrincipals.map((principal) => (
            <Card key={principal.id} className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={principal.photoURL} alt={principal.name} />
                  <AvatarFallback>
                    {principal.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">{principal.name}</p>
                  <p className="text-sm text-muted-foreground">{principal.email}</p>
                  {principal.phone && <p className="text-sm text-muted-foreground">{principal.phone}</p>}
                </div>
                <Link href={`/admin/principals/${principal.id}`}>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}

