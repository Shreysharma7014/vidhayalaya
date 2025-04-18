import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyDE2zQ9tPCDiUM_3vmbmb1vnACzoCS_zaY",
  authDomain: "vidhayalaya-5ee43.firebaseapp.com",
  projectId: "vidhayalaya-5ee43",
  storageBucket: "vidhayalaya-5ee43.firebasestorage.app",
  messagingSenderId: "681892856839",
  appId: "1:681892856839:web:8e184b44779861d58816a2",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app

