import React, { useEffect, useRef, useState } from "react";
import { BookOpen, Download, FileText, Trash2, Upload } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  createResource,
  deleteResource,
  fetchResources,
  recordDownload,
  uploadResourceFile
} from "../../services/resourceService";
import { getDepartments, getFaculties } from "../../services/profileService";
import EmptyState from "../../components/EmptyState";

const RESOURCE_TYPES = ["notes", "past_paper", "textbook", "slides", "other"];
const LEVELS = ["100", "200", "300", "400", "500", "600", "postgraduate"];

const TYPE_ICONS = {
  notes: "📝", past_paper: "📋", textbook: "📚", slides: "📊", other: "📄"
};

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function StudyResources() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);

  const [resources, setResources] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [filters, setFilters] = useState({ resource_type: "", level: "", faculty_id: "", department_id: "" });
  const [form, setForm] = useState({
    title: "", description: "", resource_type: "notes",
    academic_year: "", level: "", faculty_id: "", department_id: ""
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    if (!profile?.university_id) return;
    const active = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const { data, error } = await fetchResources(profile.university_id, active);
    if (error) toast(error.message, "error");
    else setResources(data || []);
  }

  useEffect(() => { load(); }, [profile?.university_id, filters]);

  useEffect(() => {
    if (!profile?.university_id) return;
    getFaculties(profile.university_id).then(({ data }) => setFaculties(data || []));
    getDepartments(profile.university_id).then(({ data }) => setDepartments(data || []));
  }, [profile?.university_id]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!selectedFile || !form.title.trim()) {
      toast("Add a title and select a file.", "error");
      return;
    }

    setUploading(true);
    const { url, error: uploadError } = await uploadResourceFile(user.id, selectedFile);
    if (uploadError) { toast(uploadError.message, "error"); setUploading(false); return; }

    const { error } = await createResource({
      ...form,
      faculty_id:    form.faculty_id    || null,
      department_id: form.department_id || null,
      file_url:      url,
      file_name:     selectedFile.name,
      file_size:     selectedFile.size,
      university_id: profile.university_id,
      uploader_id:   user.id
    });

    setUploading(false);
    if (error) { toast(error.message, "error"); return; }
    toast("Resource uploaded successfully.", "success");
    setShowForm(false);
    setSelectedFile(null);
    setForm({ title: "", description: "", resource_type: "notes", academic_year: "", level: "", faculty_id: "", department_id: "" });
    load();
  }

  async function handleDownload(resource) {
    await recordDownload(resource.id, user.id);
    window.open(resource.file_url, "_blank");
  }

  async function handleDelete(id) {
    const { error } = await deleteResource(id);
    if (error) toast(error.message, "error");
    else { toast("Resource deleted.", "success"); load(); }
  }

  if (!profile?.university_id) {
    return <EmptyState title="Verify your student profile" message="Set your university to access study resources." />;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Study Resources</h1>
          <p className="muted mt-1">Past papers, notes, textbooks, and slides from your campus.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn flex items-center gap-2">
          <Upload size={18} /> Share Resource
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleUpload} className="card mt-6 grid md:grid-cols-2 gap-3">
          <h2 className="font-black md:col-span-2 flex items-center gap-2"><Upload size={18} /> Upload Resource</h2>

          <input className="input" placeholder="Resource title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />

          <select className="input" value={form.resource_type} onChange={e => setForm({ ...form, resource_type: e.target.value })}>
            {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
          </select>

          <input className="input" placeholder="Academic year (e.g. 2023/2024)" value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} />

          <select className="input" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
            <option value="">All levels</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          <select className="input" value={form.faculty_id} onChange={e => setForm({ ...form, faculty_id: e.target.value })}>
            <option value="">All faculties</option>
            {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>

          <select className="input" value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
            <option value="">All departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <textarea className="input md:col-span-2 min-h-20" placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

          <div className="md:col-span-2">
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
            <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-secondary w-full">
              {selectedFile ? `📎 ${selectedFile.name} (${formatSize(selectedFile.size)})` : "📎 Choose File (PDF, Word, PPT, etc.)"}
            </button>
          </div>

          <button className="btn md:col-span-2" disabled={uploading}>{uploading ? "Uploading…" : "Share Resource"}</button>
        </form>
      )}

      <div className="card mt-6 grid md:grid-cols-4 gap-3">
        <select className="input" value={filters.resource_type} onChange={e => setFilters({ ...filters, resource_type: e.target.value })}>
          <option value="">All types</option>
          {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
        </select>
        <select className="input" value={filters.level} onChange={e => setFilters({ ...filters, level: e.target.value })}>
          <option value="">All levels</option>
          {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select className="input" value={filters.faculty_id} onChange={e => setFilters({ ...filters, faculty_id: e.target.value })}>
          <option value="">All faculties</option>
          {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select className="input" value={filters.department_id} onChange={e => setFilters({ ...filters, department_id: e.target.value })}>
          <option value="">All departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
        {resources.length === 0 && <EmptyState title="No resources yet" message="Be the first to share notes or past papers for your campus." />}
        {resources.map(r => (
          <article key={r.id} className="card flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <span className="text-2xl">{TYPE_ICONS[r.resource_type] || "📄"}</span>
              <div className="flex gap-2 ml-auto">
                <span className="badge">{r.resource_type?.replace("_", " ")}</span>
                {r.level && <span className="badge">Lvl {r.level}</span>}
              </div>
            </div>

            <div className="flex-1">
              <h3 className="font-black">{r.title}</h3>
              {r.description && <p className="muted text-sm mt-1 line-clamp-2">{r.description}</p>}
              <div className="flex flex-wrap gap-2 mt-3 text-xs muted">
                {r.academic_year && <span>📅 {r.academic_year}</span>}
                {r.file_name && <span>📎 {formatSize(r.file_size)}</span>}
                <span>⬇ {r.download_count} downloads</span>
              </div>
              <p className="muted text-xs mt-2">by {r.profiles?.full_name || "Student"}</p>
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button onClick={() => handleDownload(r)} className="btn flex-1 flex items-center justify-center gap-2">
                <Download size={16} /> Download
              </button>
              {r.uploader_id === user?.id && (
                <button onClick={() => handleDelete(r.id)} className="btn btn-secondary px-3" title="Delete resource">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
