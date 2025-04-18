import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

// Your service account credentials
const serviceAccount = {
    apiKey: "AIzaSyDE2zQ9tPCDiUM_3vmbmb1vnACzoCS_zaY",
    authDomain: "vidhayalaya-5ee43.firebaseapp.com",
    projectId: "vidhayalaya-5ee43",
    storageBucket: "vidhayalaya-5ee43.firebasestorage.app",
    messagingSenderId: "681892856839",
    appId: "1:681892856839:web:8e184b44779861d58816a2",
}

// Initialize Firebase Admin if it hasn't been initialized
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

export const adminAuth = getAuth()
export const adminDb = getFirestore()

