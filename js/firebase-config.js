import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Shared admin identity for access checks.
export const ADMIN_EMAIL = "oluwatunmbipaul@gmail.com";

const firebaseConfig = {
  apiKey: "AIzaSyDxFye12aQe4oFKHDpwh4RVOjzkwUm4JhM",
  authDomain: "velocity-garage-b6535.firebaseapp.com",
  projectId: "velocity-garage-b6535",
  storageBucket: "velocity-garage-b6535.firebasestorage.app",
  messagingSenderId: "451025834191",
  appId: "1:451025834191:web:279b2ea8937d22155427ba"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();