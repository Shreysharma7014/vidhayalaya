"use client"
import Link from "next/link"
import type React from "react"

import { useState } from "react"
import { UserIcon, CalendarIcon, School2 } from "lucide-react"
import { useAuth } from "@/lib/auth-provider"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { toast } from "sonner"

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { user } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      toast.success("Signed out successfully")
    } catch (error: any) {
      toast.error("Error signing out", {
        description: error.message,
      })
    }
  }

  const features = [
    {
      title: "Student Management",
      description: "Easily manage student records and profiles.",
      icon: UserIcon,
    },
    {
      title: "Attendance Tracking",
      description: "Track attendance with real-time updates.",
      icon: CalendarIcon,
    },
    {
      title: "Grade Reporting",
      description: "Generate and share grade reports effortlessly.",
      icon: School2,
    },
  ]

  const testimonials = [
    {
      name: "John Doe",
      role: "Teacher, ABC School",
      image: "/photo.jpg",
      text: "Vidhayalaya has helped us streamline our operations. The interface is user-friendly and the tools are powerful.",
    },
    {
      name: "Jane Smith",
      role: "Principal, XYZ Academy",
      image: "/photo.jpg",
      text: "The system has improved our attendance tracking and grade reporting significantly. Highly recommend it!",
    },
    {
      name: "Mark Lee",
      role: "Administrator, School of Excellence",
      image: "/photo.jpg",
      text: "A fantastic platform for managing student data and staff information. It has saved us so much time.",
    },
  ]

  const DemoModal = ({ onClose }: { onClose: () => void }) => {
    const [formData, setFormData] = useState({ name: "", email: "", school: "" })

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      console.log("Form submitted:", formData)
      alert("Demo request submitted!")
      onClose()
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4">Request a Demo</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full p-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full p-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-6">
              <input
                type="text"
                placeholder="School Name"
                value={formData.school}
                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                required
                className="w-full p-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-between">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200"
              >
                Submit
              </button>
              <button type="button" onClick={onClose} className="text-gray-300 hover:text-white">
                Close
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Navigation Bar */}
      <nav className="bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-white text-2xl font-bold">
                Vidhayalaya
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link href="/" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  Home
                </Link>
                <Link href="#features" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  Features
                </Link>
                <Link href="#pricing" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  Pricing
                </Link>
                <Link href="/about" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  About
                </Link>
                {user ? (
                  <>
                    <Link
                      href={`/${user.role}/dashboard`}
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md"
                    >
                      Dashboard
                    </Link>
                    <button onClick={handleSignOut} className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                    Login
                  </Link>
                )}
              </div>
            </div>
            <div className="md:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white focus:outline-none">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link href="/" className="block text-gray-300 hover:text-white px-3 py-2 rounded-md">
                Home
              </Link>
              <Link href="#features" className="block text-gray-300 hover:text-white px-3 py-2 rounded-md">
                Features
              </Link>
              <Link href="#pricing" className="block text-gray-300 hover:text-white px-3 py-2 rounded-md">
                Pricing
              </Link>
              <Link href="/about" className="block text-gray-300 hover:text-white px-3 py-2 rounded-md">
                About
              </Link>
              {user ? (
                <>
                  <Link
                    href={`/${user.role}/dashboard`}
                    className="block text-gray-300 hover:text-white px-3 py-2 rounded-md"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block text-gray-300 hover:text-white px-3 py-2 rounded-md w-full text-left"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link href="/login" className="block text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="bg-black py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Streamline Your School’s Operations</h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8">
              Efficiently manage students, staff, and resources in one place.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition duration-200"
            >
              Request a Demo
            </button>
          </div>
        </div>
        {isModalOpen && <DemoModal onClose={() => setIsModalOpen(false)} />}
      </section>

      {/* Features Section */}
      <section id="features" className="bg-black py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-white mb-12">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-800 p-6 rounded-lg shadow-lg transition duration-300 hover:-translate-y-1"
              >
                <feature.icon className="h-12 w-12 text-blue-500 mb-4 mx-auto" />
                <h3 className="text-xl font-semibold text-white text-center mb-2">{feature.title}</h3>
                <p className="text-gray-300 text-center">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="bg-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-white mb-12">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-700 p-6 rounded-lg shadow-lg">
                <div className="flex items-center mb-4">
                  <img
                    src={testimonial.image || "/placeholder.svg"}
                    alt={testimonial.name}
                    className="w-16 h-16 rounded-full mr-4"
                  />
                  <div>
                    <h3 className="text-xl font-semibold text-white">{testimonial.name}</h3>
                    <p className="text-gray-300">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-300 italic">"{testimonial.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-black py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold">
              Vidhayalaya
            </Link>
            <div className="space-x-6">
             
              <Link href="#pricing" className="hover:text-gray-300">
                Pricing
              </Link>
              <Link href="/about" className="hover:text-gray-300">
                About
              </Link>
              
            </div>
          </div>
          <div className="mt-6 text-center text-gray-400">
            <p>&copy; 2025 Vidhayalaya. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
