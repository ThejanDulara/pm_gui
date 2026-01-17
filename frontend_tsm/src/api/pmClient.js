// src/api/pmClient.js

const hostname = window.location.hostname;
const isLocal = hostname.includes("localhost") || hostname.includes("127.");

const PM_API_BASE =
  import.meta.env.VITE_PM_API_BASE ||
  (isLocal ? "http://localhost:5000/api" : "https://pmgui-production.up.railway.app/api");

function authPayload() {
  const a = window.__AUTH__ || {};
  return {
    user_id: a.user_id,
    first_name: a.first_name,
    last_name: a.last_name,
    is_admin: a.is_admin ? 1 : 0,
  };
}

async function jsonFetch(url, opts = {}) {
  try {
    const res = await fetch(url, {
      ...opts,
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, ...data };
    return { ok: true, ...data };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function listProjects({ status = "", user_id = "" } = {}) {
  return jsonFetch(`${PM_API_BASE}/projects/list`, {
    method: "POST",
    body: JSON.stringify({
      auth: authPayload(),
      filters: { status, user_id },
    }),
  });
}

export async function createProject({ project_name, description }) {
  return jsonFetch(`${PM_API_BASE}/projects`, {
    method: "POST",
    body: JSON.stringify({
      auth: authPayload(),
      project_name,
      description,
    }),
  });
}

export async function updateProjectStatus(id, status) {
  return jsonFetch(`${PM_API_BASE}/projects/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      auth: authPayload(),
      status,
    }),
  });
}
