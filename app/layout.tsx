import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"


import { AuthProvider } from "@/lib/auth-provider"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Vidhayalaya - School Management System",
  description: "A comprehensive school management system",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          
            {children}
            <Toaster />
          
        </AuthProvider>
      </body>
    </html>
  )
}

