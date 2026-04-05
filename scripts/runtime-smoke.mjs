import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:5000";

const AUTH_GUARD_STUB = `
export async function checkAuth() {
  return { uid: "smoke-user", email: "smoke@example.com" };
}

export async function checkAdmin() {
  return { uid: "smoke-user", email: "smoke@example.com" };
}
`;

const NAVBAR_STUB = `
export function initAuthNavbar() {
  const target = document.getElementById("auth-controls");
  if (!target) return;
  if (target.querySelector("[data-smoke-auth]")) return;
  const badge = document.createElement("span");
  badge.dataset.smokeAuth = "1";
  badge.textContent = "Smoke User";
  badge.className = "text-xs text-white";
  target.appendChild(badge);
}
`;

const USER_STORE_STUB = `
const __state = {
  favorites: [1, 2, 3],
  wishlist: [1, 3],
  compare: [1, 2],
  darkMode: true,
};

const __userStateSubscribers = new Set();

function cloneState() {
  return {
    favorites: [...__state.favorites],
    wishlist: [...__state.wishlist],
    compare: [...__state.compare],
    darkMode: !!__state.darkMode,
  };
}

function notifyUserState() {
  const snapshot = cloneState();
  for (const cb of __userStateSubscribers) {
    try { cb(snapshot); } catch {}
  }
}

window.vgUserStore = {
  getLocalState() {
    return cloneState();
  },
  async waitForReady() {
    return undefined;
  },
  async updateUserState(payload = {}) {
    if (Array.isArray(payload.favorites)) __state.favorites = [...new Set(payload.favorites.map(Number).filter((n) => Number.isFinite(n) && n > 0))];
    if (Array.isArray(payload.wishlist)) __state.wishlist = [...new Set(payload.wishlist.map(Number).filter((n) => Number.isFinite(n) && n > 0))];
    if (Array.isArray(payload.compare)) __state.compare = [...new Set(payload.compare.map(Number).filter((n) => Number.isFinite(n) && n > 0))];
    if (typeof payload.darkMode === "boolean") __state.darkMode = payload.darkMode;
    notifyUserState();
    return cloneState();
  },
  async loadUserData() {
    return cloneState();
  },
  subscribeUserState(cb) {
    if (typeof cb !== "function") return () => {};
    __userStateSubscribers.add(cb);
    cb(cloneState());
    return () => __userStateSubscribers.delete(cb);
  },
  subscribeUsers(cb) {
    if (typeof cb !== "function") return () => {};
    cb([
      { id: "u1", firstName: "Lena", favorites: [1, 2, 3] },
      { id: "u2", firstName: "Ari", favorites: [2, 4] },
      { id: "u3", firstName: "Kai", favorites: [3] },
    ]);
    return () => {};
  },
  bindThemeToggle() {
    return undefined;
  },
  getCurrentUser() {
    return { uid: "smoke-user", email: "smoke@example.com" };
  },
};

export {};
`;

const FIREBASE_CONFIG_STUB = `
export const ADMIN_EMAIL = "admin@example.com";
export const app = {};
export const auth = { currentUser: { uid: "smoke-user", email: "smoke@example.com" } };
export const db = {};
export const storage = {};
export const googleProvider = {};
export const githubProvider = {};
`;

function isLocalRuntimeError(text) {
  const normalized = String(text || "").toLowerCase();
  return normalized.includes("http://127.0.0.1:5000") || normalized.includes("http://localhost:5000");
}

async function installRuntimeStubs(context) {
  await context.route(/\/js\/auth-guard\.js(?:\?.*)?$/, (route) => {
    route.fulfill({ status: 200, contentType: "application/javascript", body: AUTH_GUARD_STUB });
  });

  await context.route(/\/js\/navbar-auth\.js(?:\?.*)?$/, (route) => {
    route.fulfill({ status: 200, contentType: "application/javascript", body: NAVBAR_STUB });
  });

  await context.route(/\/js\/user-store\.js(?:\?.*)?$/, (route) => {
    route.fulfill({ status: 200, contentType: "application/javascript", body: USER_STORE_STUB });
  });

  await context.route(/\/js\/firebase-config\.js(?:\?.*)?$/, (route) => {
    route.fulfill({ status: 200, contentType: "application/javascript", body: FIREBASE_CONFIG_STUB });
  });
}

async function testPage(browser, path) {
  const context = await browser.newContext();
  await installRuntimeStubs(context);

  const page = await context.newPage();
  const report = {
    path,
    consoleErrors: [],
    pageErrors: [],
    localRequestFailures: [],
    checks: [],
    pass: true,
  };

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (isLocalRuntimeError(text)) report.consoleErrors.push(text);
  });

  page.on("pageerror", (error) => {
    report.pageErrors.push(String(error));
  });

  page.on("requestfailed", (request) => {
    const url = request.url();
    if (url.startsWith(BASE_URL)) {
      report.localRequestFailures.push(`${request.method()} ${url}`);
    }
  });

  const response = await page.goto(`${BASE_URL}/${path}`, { waitUntil: "domcontentloaded" });
  report.checks.push(`status:${response?.status() || "n/a"}`);

  await page.waitForTimeout(900);

  const hasModalRoot = await page.locator("#modal-root").count();
  report.checks.push(`modal-root:${hasModalRoot > 0}`);

  const hasModal = await page.locator("#modal").count();
  report.checks.push(`modal:${hasModal > 0}`);

  const hasDetailsButton = await page.locator("button[data-action='details']").count();
  report.checks.push(`details-buttons:${hasDetailsButton}`);

  if (hasDetailsButton > 0) {
    await page.locator("button[data-action='details']").first().click();
    await page.waitForTimeout(250);
    const modalVisible = await page.locator("#modal.flex").count();
    report.checks.push(`modal-opened:${modalVisible > 0}`);

    if (modalVisible > 0) {
      await page.locator("#modal-close").click();
      await page.waitForTimeout(150);
      const modalHidden = await page.locator("#modal.hidden").count();
      report.checks.push(`modal-closed:${modalHidden > 0}`);
    }
  }

  if (report.pageErrors.length || report.consoleErrors.length || report.localRequestFailures.length) {
    report.pass = false;
  }

  await context.close();
  return report;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const pages = ["home.html", "favorites.html", "wishlist.html", "compare.html"];

  const results = [];
  for (const page of pages) {
    results.push(await testPage(browser, page));
  }

  await browser.close();

  const failed = results.filter((result) => !result.pass);

  console.log("RUNTIME_SMOKE_RESULTS_START");
  console.log(JSON.stringify(results, null, 2));
  console.log("RUNTIME_SMOKE_RESULTS_END");

  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Runtime smoke test harness failed", error);
  process.exit(1);
});
