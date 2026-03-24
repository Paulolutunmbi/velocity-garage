import { checkAdmin } from "./auth-guard.js";
import { initAuthNavbar } from "./navbar-auth.js";
import { watchUsers } from "./auth.js";

const loadingState = document.getElementById("admin-loading");
const errorState = document.getElementById("admin-error");
const emptyState = document.getElementById("admin-empty");
const tableBody = document.getElementById("user-list-body");

function formatJoinDate(value) {
  if (!value) return "Not available";
  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleString();
  }
  return String(value);
}

function renderUsers(users) {
  console.log("📢 Rendering users. Count:", users.length);
  
  loadingState.classList.add("hidden");
  errorState.classList.add("hidden");

  if (!users.length) {
    console.warn("⚠️ No users found in Firestore");
    emptyState.classList.remove("hidden");
    tableBody.innerHTML = "";
    return;
  }

  console.log("✓ Displaying users:", users.map(u => u.email));
  emptyState.classList.add("hidden");
  tableBody.innerHTML = users
    .map((user) => {
      const name = user.name || "Velocity Driver";
      const email = user.email || "No email";
      const photo = user.photo || "https://ui-avatars.com/api/?name=Driver&background=0f172a&color=f8fafc";
      const createdAt = formatJoinDate(user.createdAt);

      return `
        <tr class="border-b border-slate-700/70">
          <td class="px-4 py-3">
            <img src="${photo}" alt="${name}" class="h-10 w-10 rounded-full object-cover" referrerpolicy="no-referrer" />
          </td>
          <td class="px-4 py-3">
            <span class="font-semibold text-white">${name}</span>
          </td>
          <td class="px-4 py-3 text-slate-200">${email}</td>
          <td class="px-4 py-3 text-slate-300">${createdAt}</td>
        </tr>
      `;
    })
    .join("");
}

async function initAdmin() {
  try {
    console.log("🔐 Checking admin access...");
    await checkAdmin();
    console.log("✓ Admin access granted");
    initAuthNavbar();

    console.log("📊 Setting up real-time users listener...");
    watchUsers(
      (users) => {
        console.log("✓ Real-time users update. Count:", users.length);
        renderUsers(users);
      },
      (error) => {
        console.error("✗ Error fetching users:", error);
        loadingState.classList.add("hidden");
        errorState.textContent = error.message || "Unable to load users.";
        errorState.classList.remove("hidden");
      }
    );
  } catch (error) {
    console.error("✗ Admin init error:", error);
    loadingState.classList.add("hidden");
    errorState.textContent = error.message || "Unable to access admin.";
    errorState.classList.remove("hidden");
  }
}

initAdmin();
