import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { checkAuth } from "./auth-guard.js";
import { initAuthNavbar } from "./navbar-auth.js";

const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const profilePhoto = document.getElementById("profile-photo");
const profileJoined = document.getElementById("profile-joined");

function formatJoinDate(value) {
  if (!value) return "Not available";
  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleString();
  }
  return String(value);
}

async function initProfile() {
  const user = await checkAuth();
  initAuthNavbar();
  window.vgUserStore?.bindThemeToggle?.();

  profileName.textContent = user.displayName || "Velocity Driver";
  profileEmail.textContent = user.email || "No email";
  profilePhoto.src = user.photoURL || "https://ui-avatars.com/api/?name=Driver&background=0f172a&color=f8fafc";

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    profileJoined.textContent = formatJoinDate(data.createdAt);
  }
}

initProfile().catch((error) => {
  alert(error.message || "Unable to load profile.");
});
