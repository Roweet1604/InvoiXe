// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA19AwfeJxUvIZjVBNjerhqbnxKMxuxlOQ",
  authDomain: "truebill-2.firebaseapp.com",
  projectId: "truebill-2",
  storageBucket: "truebill-2.firebasestorage.app",
  messagingSenderId: "215518743481",
  appId: "1:215518743481:web:b78fd6c18370a9b60f4468",
  measurementId: "G-GVY25P0RGL",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
