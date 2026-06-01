import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, Building2, CheckCircle2, GraduationCap, Layers3, MapPin, Save } from "lucide-react";
import { loadAcademicSetup, upsertAcademicRecord } from "../../services/academicService";
import { useAuth } from "../../hooks/useAuth";

const sections = [
  { key: "faculties", table: "faculties", title: "Faculties", icon: Building2, fields: ["name", "code"] },
  { key: "departments", table: "departments", title: "Departments", icon: Layers3, fields: ["name", "faculty_id"] },
  { key: "programmes", table: "academic_programmes", title: "Programmes", icon: GraduationCap, fields: ["name", "award", "duration_years", "faculty_id", "department_id"] },
  { key: "courses", table: "courses", title: "Courses", icon: BookOpen, fields: ["name", "code", "level", "semester", "faculty_id", "department_id", "programme_id"] },
  { key: "levels", table: "academic_levels", title: "Levels", icon: CheckCircle2, fields: ["level", "sort_order"] },
  { key: "sessions", table: "academic_sessions", title: "Sessions", icon: CheckCircle2, fields: ["name"] },
  { key: "campuses", table: "campuses", title: "Campuses", icon: MapPin, fields: ["name", "location"] }
];

const emptyRecord = {
  name: "",
  code: "",
  level: "",
  sort_order: "",
  award: "",
  duration_years: "",
  semester: "",
  location: "",
  faculty_id: "",
  department_id: "",
  programme_id: ""
};

function labelFor(field) {
  return field
    .replace("_id", "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

export default function AcademicSetup() {
  const { profile } = useAuth();
  const [active, setActive] = useState("faculties");
  const [data, setData] = useState({});
  const [forms, setForms] = useState({});
  const [message, setMessage] = useState("");

  const activeSection = useMemo(() => sections.find(item => item.key === active), [active]);

  async function refresh() {
    if (!profile?.university_id) return;
    const result = await loadAcademicSetup(profile.university_id);
    setData({
      faculties: result.faculties.data || [],
      departments: result.departments.data || [],
      programmes: result.programmes.data || [],
      courses: result.courses.data || [],
      levels: result.levels.data || [],
      sessions: result.sessions.data || [],
      campuses: result.campuses.data || []
    });
  }

  useEffect(() => {
    refresh();
  }, [profile?.university_id]);

  function updateDraft(sectionKey, field, value) {
    setForms(prev => ({
      ...prev,
      [sectionKey]: {
        ...emptyRecord,
        ...(prev[sectionKey] || {}),
        [field]: value
      }
    }));
  }

  async function save(section) {
    const draft = forms[section.key] || {};
    const payload = {
      university_id: profile.university_id,
      source_status: "admin_modified"
    };
    if (draft.id) payload.id = draft.id;

    section.fields.forEach(field => {
      const value = draft[field];
      if (value !== "" && value !== undefined) {
        payload[field] = ["duration_years", "sort_order"].includes(field) ? Number(value) : value;
      }
    });

    if (!payload.name && !payload.level) {
      setMessage(`Add a ${section.title.toLowerCase()} name before saving.`);
      return;
    }

    const { error } = await upsertAcademicRecord(section.table, payload);
    if (error) {
      setMessage(error.message);
      return;
    }

    setForms(prev => ({ ...prev, [section.key]: emptyRecord }));
    setMessage(`${section.title} saved as admin_modified.`);
    await refresh();
  }

  function selectOptions(field) {
    if (field === "faculty_id") return data.faculties || [];
    if (field === "department_id") return data.departments || [];
    if (field === "programme_id") return data.programmes || [];
    return [];
  }

  function renderField(section, field) {
    const draft = forms[section.key] || emptyRecord;
    const options = selectOptions(field);
    if (field.endsWith("_id")) {
      return (
        <select key={field} className="input" value={draft[field] || ""} onChange={e => updateDraft(section.key, field, e.target.value)}>
          <option value="">{labelFor(field)}</option>
          {options.map(item => <option key={item.id} value={item.id}>{item.code ? `${item.name} (${item.code})` : item.name}</option>)}
        </select>
      );
    }

    return (
      <input
        key={field}
        className="input"
        type={["duration_years", "sort_order"].includes(field) ? "number" : "text"}
        placeholder={labelFor(field)}
        value={draft[field] || ""}
        onChange={e => updateDraft(section.key, field, e.target.value)}
      />
    );
  }

  const records = data[active] || [];

  return (
    <div>
      <h1 className="text-3xl font-black">Academic Setup</h1>
      <p className="muted mt-2">Start from the national dataset, then verify and correct your university structure.</p>

      {message && <div className="card mt-5">{message}</div>}

      <div className="grid lg:grid-cols-[240px_1fr] gap-5 mt-6">
        <div className="card grid gap-2 self-start">
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActive(section.key)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left ${active === section.key ? "bg-cyan-300 text-slate-950 font-black" : "hover:bg-white/10"}`}
              >
                <Icon size={18} />
                <span>{section.title}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-5">
          <div className="card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">{activeSection.title}</h2>
                <p className="muted text-sm mt-1">New records are marked admin_modified. Verified seed records remain school_verified.</p>
              </div>
              <button type="button" className="btn flex items-center gap-2" onClick={() => save(activeSection)}>
                <Save size={18} />
                Save
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-3 mt-5">
              {activeSection.fields.map(field => renderField(activeSection, field))}
            </div>
          </div>

          <div className="grid gap-3">
            {records.length === 0 && <div className="card muted">No records yet.</div>}
            {records.map(record => (
              <div key={record.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black">{record.name || `Level ${record.level}`}</p>
                    <p className="muted text-sm">
                      {[record.code, record.award, record.semester, record.location].filter(Boolean).join(" / ") || "No extra details"}
                    </p>
                  </div>
                  <span className="badge">{record.source_status || "system_default"}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary mt-4"
                  onClick={() => setForms(prev => ({ ...prev, [activeSection.key]: { ...emptyRecord, ...record } }))}
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
