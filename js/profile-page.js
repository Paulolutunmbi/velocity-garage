import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { checkAuth } from "./auth-guard.js";
import { initAuthNavbar } from "./navbar-auth.js";

const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const profilePhoto = document.getElementById("profile-photo");
const profileJoined = document.getElementById("profile-joined");

function formatJoinDate(value) {
  if (!value) return "Joined recently";

  const rawDate = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(rawDate.getTime())) return "Joined recently";

  const diffMs = Date.now() - rawDate.getTime();
  if (diffMs < 0) return "Joined recently";

  const day = 24 * 60 * 60 * 1000;
  const month = 30 * day;
  const year = 365 * day;

  if (diffMs < day) return "Joined today";

  if (diffMs >= year) {
    const years = Math.floor(diffMs / year);
    return `Joined ${years} year${years > 1 ? "s" : ""} ago`;
  }

  if (diffMs >= month) {
    const months = Math.floor(diffMs / month);
    return `Joined ${months} month${months > 1 ? "s" : ""} ago`;
  }

  const days = Math.floor(diffMs / day);
  return `Joined ${days} day${days > 1 ? "s" : ""} ago`;
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
  if (!userSnap.exists()) {
    profileJoined.textContent = "Joined recently";
    return;
  }

  const data = userSnap.data();
  profileJoined.textContent = formatJoinDate(data.createdAt);
}

initProfile().catch((error) => {
  alert(error.message || "Unable to load profile.");
});
