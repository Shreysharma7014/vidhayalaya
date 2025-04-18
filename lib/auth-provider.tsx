"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth, db } from "./firebase"
import { doc, getDoc } from "firebase/firestore"
import { useRouter, usePathname } from "next/navigation"

type UserType = {
  uid: string
  email: string | null
  role: "admin" | "principal" | "teacher" | "student" | null
  name?: string
  [key: string]: any
} | null

type AuthContextType = {
  user: UserType
  setUser: (user: UserType) => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  loading: true,
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserType>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: userData.role,
              ...userData,
            })
          } else {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: null,
            })
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: null,
          })
        }
      } else {
        setUser(null)

        // Redirect to login if trying to access protected routes
        const protectedRoutes = ["/admin", "/principal", "/teacher", "/student"]
        if (protectedRoutes.some((route) => pathname.startsWith(route))) {
          router.push("/login")
        }
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [pathname, router])

  return <AuthContext.Provider value={{ user, setUser, loading }}>{children}</AuthContext.Provider>
}

