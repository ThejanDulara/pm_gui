import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { createProject, listProjects, updateProjectStatus } from "../api/pmClient";

const tz = "Asia/Colombo";

function fmtDT(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-LK", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export default function ProjectsPage() {
  const auth = window.__AUTH__ || {};
  const isAdmin = !!auth.is_admin;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterUserId, setFilterUserId] = useState("");

  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState({ project_name: "", description: "" });

  const [editingId, setEditingId] = useState(null);
  const [editingStatus, setEditingStatus] = useState("ONGOING");

  const load = async () => {
    setLoading(true);
    const res = await listProjects({
      status: filterStatus,
      user_id: isAdmin ? filterUserId : "",
    });

    if (res.ok) setItems(res.items || []);
    else toast.error(res.error || "Failed to load projects");
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterUserId]);

  const usersForAdmin = useMemo(() => {
    if (!isAdmin) return [];
    const map = new Map();
    (items || []).forEach((p) => {
      if (!map.has(p.user_id)) {
        map.set(p.user_id, `${p.user_first_name} ${p.user_last_name}`);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, isAdmin]);

  const onAddClick = () => {
    setAdding(true);
    setNewRow({ project_name: "", description: "" });
  };

  const onSaveNew = async () => {
    const name = (newRow.project_name || "").trim();
    if (!name) {
      toast.warning("Project name is required");
      return;
    }

    const res = await createProject({
      project_name: name,
      description: (newRow.description || "").trim(),
    });

    if (!res.ok) {
      toast.error(res.error || "Failed to create project");
      return;
    }

    toast.success("Project added");
    setAdding(false);
    setNewRow({ project_name: "", description: "" });
    load();
  };

  const onCancelNew = () => {
    setAdding(false);
    setNewRow({ project_name: "", description: "" });
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditingStatus(p.status);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingStatus("ONGOING");
  };

  const saveEdit = async (id) => {
    const res = await updateProjectStatus(id, editingStatus);
    if (!res.ok) {
      toast.error(res.error || "Failed to update status");
      return;
    }
    toast.success("Status updated");
    setEditingId(null);
    load();
  };

  const getStatusStyle = (status) => {
    if (status === "COMPLETED") {
      return {
        background: "#d1fae5",
        color: "#065f46",
        border: "1px solid #a7f3d0",
      };
    }
    return {
      background: "#dbeafe",
      color: "#1e40af",
      border: "1px solid #bfdbfe",
    };
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #d5e9f7 0%, #d5e9f7 100%)",
      padding: "24px 16px",
      fontFamily: "system-ui, -apple-system, BlinkMacOSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>

        {/* Header */}
        <div style={{
          background: "white",
          borderRadius: 16,
          padding: "24px 28px",
          marginBottom: 24,
          boxShadow: "0 10px 30px -12px rgba(0,0,0,0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: "2.1rem",
              fontWeight: 700,
              color: "#1e293b",
            }}>
             Manage Projects
            </h1>
            <p style={{
              margin: "8px 0 0",
              color: "#64748b",
              fontSize: "0.95rem",
            }}>
              • Manage your projects • Track progress • Mark completion
            </p>
          </div>

          <button
            onClick={onAddClick}
            style={{
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "12px 24px",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(59,130,246,0.35)",
              transition: "all 0.2s",
            }}
            onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            + New Project
          </button>
        </div>

        {/* Filters */}
        <div style={{
          background: "white",
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          boxShadow: "0 10px 30px -12px rgba(0,0,0,0.08)",
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
          }}>
            <FilterSelect
              label="Status"
              value={filterStatus}
              onChange={setFilterStatus}
              options={["ONGOING", "COMPLETED"]}
            />

            {isAdmin && (
              <FilterSelect
                label="User"
                value={filterUserId}
                onChange={setFilterUserId}
                options={usersForAdmin.map(u => ({ value: String(u.id), label: u.name }))}
                isObj
              />
            )}
          </div>

          <div style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}>
            <button
              onClick={() => {
                setFilterStatus("");
                setFilterUserId("");
              }}
              style={{
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "10px 18px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Clear Filters
            </button>

            <div style={{ color: "#64748b", fontSize: "0.9rem" }}>
              {loading ? "Loading..." : `${items.length} project${items.length !== 1 ? "s" : ""}`}
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div style={{
          background: "white",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 10px 30px -12px rgba(0,0,0,0.08)",
        }}>
          {/* Table Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isAdmin
              ? "180px 2fr 2.4fr 160px 160px 140px 200px"
              : "2fr 2.4fr 160px 160px 140px 200px",
            gap: 16,
            padding: "16px 24px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "#475569",
            textTransform: "uppercase",
            letterSpacing: "0.4px",
          }}>
            {isAdmin && <div>User</div>}
            <div>Project</div>
            <div>Description</div>
            <div>Started</div>
            <div>Ended</div>
            <div>Status</div>
            <div style={{ textAlign: "right" }}>Actions</div>
          </div>

          {/* New Project Row */}
          {adding && (
            <div style={{
              display: "grid",
            gridTemplateColumns: isAdmin
              ? "180px 2fr 2.4fr 160px 160px 140px 200px"
              : "2fr 2.4fr 160px 160px 140px 200px",
              gap: 16,
              padding: "16px 24px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              alignItems: "center",
            }}>
              {isAdmin && <div style={{ color: "#94a3b8" }}>—</div>}

              <div>
                <input
                  style={styles.input}
                  placeholder="Project name *"
                  value={newRow.project_name}
                  onChange={(e) => setNewRow(p => ({ ...p, project_name: e.target.value }))}
                  autoFocus
                />
              </div>

              <div>
                <input
                  style={styles.input}
                  placeholder="Description (optional)"
                  value={newRow.description}
                  onChange={(e) => setNewRow(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Auto</div>
              <div style={{ color: "#94a3b8" }}>—</div>

              <div>
                <span style={{
                  ...styles.badge,
                  background: "#dbeafe",
                  color: "#1e40af",
                  border: "1px solid #bfdbfe",
                }}>
                  ONGOING
                </span>
              </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                whiteSpace: "nowrap",
              }}
            >
              <button style={styles.btnSave} onClick={onSaveNew}>Save</button>
              <button style={styles.btnCancel} onClick={onCancelNew}>Cancel</button>
            </div>
            </div>
          )}

          {/* Table Body */}
          {loading ? (
            <div style={styles.empty}>Loading projects...</div>
          ) : items.length === 0 ? (
            <div style={styles.empty}>No projects found.</div>
          ) : (
            items.map((p) => {
              const isEditing = editingId === p.id;
              const userName = `${p.user_first_name} ${p.user_last_name}`;

              return (
                <div
                  key={p.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: isAdmin
                      ? "180px 2fr 2.4fr 160px 160px 140px 200px"
                      : "2fr 2.4fr 160px 160px 140px 200px",
                    gap: 16,
                    padding: "18px 24px",
                    borderBottom: "1px solid #f1f5f9",
                    background: "white",
                    transition: "background 0.15s",
                    ':hover': { background: "#f8fafc" },
                  }}
                >
                  {isAdmin && (
                    <div style={{ fontWeight: 500, color: "#334155" }}>
                      {userName}
                    </div>
                  )}

                  <div style={{ fontWeight: 600, color: "#1e293b" }}>
                    {p.project_name}
                  </div>

                  <div style={{ color: "#475569" }}>
                    {p.description || <span style={{ color: "#94a3b8" }}>-</span>}
                  </div>

                  <div style={{ color: "#64748b" }}>{fmtDT(p.started_at)}</div>
                  <div style={{ color: "#64748b" }}>
                    {p.ended_at ? fmtDT(p.ended_at) : "—"}
                  </div>

                  <div>
                    {isEditing ? (
                      <select
                        style={styles.input}
                        value={editingStatus}
                        onChange={(e) => setEditingStatus(e.target.value)}
                      >
                        <option value="ONGOING">ONGOING</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    ) : (
                      <span style={{ ...styles.badge, ...getStatusStyle(p.status) }}>
                        {p.status}
                      </span>
                    )}
                  </div>

                  <div style={{ textAlign: "right" }}>
                    {isEditing ? (
                      <>
                        <button style={styles.btnSave} onClick={() => saveEdit(p.id)}>
                          Save
                        </button>
                        <button style={styles.btnCancel} onClick={cancelEdit}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        style={styles.btnEdit}
                        onClick={() => startEdit(p)}
                      >
                        Edit Status
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
input: {
  width: "100%",
  minWidth: 0,          // 🔑 REQUIRED for CSS Grid
  boxSizing: "border-box",
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: "0.92rem",
  outline: "none",
  transition: "border-color 0.2s",
  background: "white",
},

  badge: {
    display: "inline-block",
    padding: "5px 12px",
    borderRadius: 999,
    fontSize: "0.8rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },

  btnSave: {
    background: "#10b981",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: "0.88rem",
    fontWeight: 600,
    cursor: "pointer",
    marginRight: 8,
  },

  btnCancel: {
    background: "#f1f5f9",
    color: "#475569",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: "0.88rem",
    fontWeight: 600,
    cursor: "pointer",
  },

  btnEdit: {
    background: "#f1f5f9",
    color: "#475569",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: "0.88rem",
    fontWeight: 500,
    cursor: "pointer",
  },

  empty: {
    padding: "60px 24px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "1.1rem",
  },
};

function FilterSelect({ label, value, onChange, options, isObj = false }) {
  return (
    <div>
      <label style={{
        display: "block",
        marginBottom: 6,
        fontSize: "0.82rem",
        fontWeight: 600,
        color: "#475569",
        textTransform: "uppercase",
        letterSpacing: "0.4px",
      }}>
        {label}
      </label>
      <select
        style={{
          width: "100%",
          padding: "11px 14px",
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          background: "white",
          fontSize: "0.92rem",
          outline: "none",
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All</option>
        {isObj
          ? options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))
          : options.map(x => (
              <option key={x} value={x}>{x}</option>
            ))}
      </select>
    </div>
  );
}