import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db, googleProvider, githubProvider, ADMIN_EMAIL } from "./firebase-config.js";

function avatarForName(name) {
  const safeName = encodeURIComponent(name || "Velocity Driver");
  return `https://ui-avatars.com/api/?name=${safeName}&background=0f172a&color=f8fafc`;
}

async function ensureUserDocument(user, preferredName = "") {
  try {
    const userRef = doc(db, "users", user.uid);
    const existing = await getDoc(userRef);

    if (existing.exists()) {
      console.log("✓ User document already exists:", user.uid);
      return existing.data();
    }

    const docData = {
      uid: user.uid,
      name: preferredName || user.displayName || "Velocity Driver",
      email: user.email || "",
      photo: user.photoURL || avatarForName(preferredName || user.displayName),
      createdAt: serverTimestamp(),
    };

    // Use merge: true to avoid overwriting if document somehow exists
    await setDoc(userRef, docData, { merge: true });
    console.log("✓ User document created successfully:", user.uid, docData);
    return docData;
  } catch (error) {
    console.error("✗ Error creating user document:", error);
    throw error;
  }
}

export async function signup({ name, email, password }) {
  console.log("📝 Signing up:", email);
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const user = result.user;
  console.log("✓ User created in Auth:", user.uid);

  await updateProfile(user, {
    displayName: name,
    photoURL: user.photoURL || avatarForName(name),
  });
  console.log("✓ Profile updated:", name);

  await ensureUserDocument(auth.currentUser || user, name);
  console.log("✓ Signup complete:", user.uid);
  return auth.currentUser || user;
}

export async function login({ email, password }) {
  console.log("🔐 Logging in:", email);
  const result = await signInWithEmailAndPassword(auth, email, password);
  console.log("✓ User authenticated:", result.user.uid);
  await ensureUserDocument(result.user);
  console.log("✓ Login complete:", result.user.uid);
  return result.user;
}

export async function loginWithGoogle() {
  console.log("🔐 Google login starting...");
  const result = await signInWithPopup(auth, googleProvider);
  console.log("✓ Google user authenticated:", result.user.uid);
  await ensureUserDocument(result.user);
  console.log("✓ Google login complete:", result.user.uid);
  return result.user;
}

export async function loginWithGithub() {
  console.log("🔐 GitHub login starting...");
  const result = await signInWithPopup(auth, githubProvider);
  console.log("✓ GitHub user authenticated:", result.user.uid);
  await ensureUserDocument(result.user);
  console.log("✓ GitHub login complete:", result.user.uid);
  return result.user;
}

export async function logout() {
  await signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function isAdmin(user) {
  return (user?.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export function watchUsers(callback, onError) {
  const usersQuery = query(collection(db, "users"));
  return onSnapshot(
    usersQuery,
    (snapshot) => {
      const users = snapshot.docs.map((snap) => ({ id: snap.id, ...snap.data() }));
      callback(users);
    },
    onError
  );
}
