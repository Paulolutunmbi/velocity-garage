import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth } from "./firebase-config.js";
import { isAdmin } from "./auth.js";

function currentPath() {
  const name = window.location.pathname.split("/").pop() || "index.html";
  return name + window.location.search;
}

function waitForAuth() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

export async function checkAuth({ redirectTo = "index.html" } = {}) {
  const user = await waitForAuth();
  if (user) return user;

  const next = encodeURIComponent(currentPath());
  window.location.href = `${redirectTo}?next=${next}`;
  throw new Error("Authentication required");
}

export async function checkAdmin({ redirectTo = "index.html" } = {}) {
  const user = await checkAuth({ redirectTo: "index.html" });
  if (isAdmin(user)) return user;

  window.location.href = redirectTo;
  throw new Error("Admin access required");
}
