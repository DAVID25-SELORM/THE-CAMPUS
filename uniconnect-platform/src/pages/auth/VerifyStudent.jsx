import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  fetchProfileUniversities,
  getDepartments,
  getUniversities,
  updateStudentProfile,
  upsertProfileUniversity
} from "../../services/profileService";

const currentYear = new Date().getFullYear();
const today = new Date().toISOString().slice(0, 10);

export default function VerifyStudent() {
  const { user, profile, refreshProfile } = useAuth();
  const [universities, setUniversities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    university_id: profile?.university_id || "",
    department_id: profile?.department_id || "",
    student_id: profile?.student_id || "",
    date_of_birth: profile?.date_of_birth || "",
    academic_start_year: profile?.academic_start_year || currentYear,
    starting_level: profile?.starting_level || 100,
    program_duration_years: profile?.program_duration_years || 4,
    program_name: "",
    relationship_type: "student"
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    getUniversities().then(({data}) => setUniversities(data || []));
  }, []);

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name || "",
      university_id: profile.university_id || "",
      department_id: profile.department_id || "",
      student_id: profile.student_id || "",
      date_of_birth: profile.date_of_birth || "",
      academic_start_year: profile.academic_start_year || currentYear,
      starting_level: profile.starting_level || 100,
      program_duration_years: profile.program_duration_years || 4,
      program_name: "",
      relationship_type: "student"
    });
  }, [profile?.id]);

  useEffect(() => {
    if (form.university_id) getDepartments(form.university_id).then(({data}) => setDepartments(data || []));
  }, [form.university_id]);

  useEffect(() => {
    if (user?.id) fetchProfileUniversities(user.id).then(({ data }) => setEnrollments(data || []));
  }, [user?.id, profile?.university_id]);

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    if (form.date_of_birth && form.date_of_birth > today) return setMessage("Date of birth cannot be in the future.");
    if (Number(form.academic_start_year) > currentYear) return setMessage("Academic start year cannot be in the future.");

    const academicPayload = {
      ...form,
      academic_start_year: Number(form.academic_start_year),
      starting_level: Number(form.starting_level),
      program_duration_years: Number(form.program_duration_years),
      level: String(form.starting_level)
    };

    const { error } = await updateStudentProfile(user.id, {
      ...academicPayload,
      verification_status: "pending"
    });
    if (error) return setMessage(error.message);

    await upsertProfileUniversity({
      user_id: user.id,
      university_id: form.university_id,
      department_id: form.department_id || null,
      student_id: form.student_id,
      program_name: form.program_name,
      academic_start_year: Number(form.academic_start_year),
      starting_level: Number(form.starting_level),
      program_duration_years: Number(form.program_duration_years),
      relationship_type: form.relationship_type,
      is_primary: true
    });

    await refreshProfile();
    const { data } = await fetchProfileUniversities(user.id);
    setEnrollments(data || []);
    setMessage("Profile submitted. Your level will update automatically each academic year.");
  }

  return (
    <div>
      <h1 className="text-3xl font-black">Account Verification</h1>
      <p className="muted mt-2">Assign your account to a university before using campus-scoped features.</p>

      {message && <div className="card mt-5">{message}</div>}

      <form onSubmit={submit} className="card mt-6 grid gap-4 max-w-2xl">
        <input className="input" placeholder="Full name" value={form.full_name} onChange={e=>setField("full_name", e.target.value)} required />

        <select className="input" value={form.university_id} onChange={e=>setField("university_id", e.target.value)} required>
          <option value="">Select university</option>
          {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>

        <select className="input" value={form.department_id || ""} onChange={e=>setField("department_id", e.target.value)}>
          <option value="">Select department</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <input className="input" placeholder="Student ID" value={form.student_id} onChange={e=>setField("student_id", e.target.value)} required />
        <input className="input" type="date" max={today} value={form.date_of_birth || ""} onChange={e=>setField("date_of_birth", e.target.value)} />
        <input className="input" placeholder="Program or course name" value={form.program_name} onChange={e=>setField("program_name", e.target.value)} />
        <select className="input" value={form.relationship_type} onChange={e=>setField("relationship_type", e.target.value)}>
          <option value="student">Student</option>
          <option value="course">Short course</option>
          <option value="alumni">Alumni</option>
          <option value="staff">Staff</option>
        </select>
        <input className="input" type="number" min="1950" max={currentYear} placeholder="Academic start year" value={form.academic_start_year} onChange={e=>setField("academic_start_year", e.target.value)} required />
        <select className="input" value={form.starting_level} onChange={e=>setField("starting_level", e.target.value)}>
          <option value="100">Started at Level 100</option>
          <option value="200">Started at Level 200</option>
          <option value="300">Started at Level 300</option>
          <option value="400">Started at Level 400</option>
        </select>
        <input className="input" type="number" min="1" max="10" placeholder="Program duration in years" value={form.program_duration_years} onChange={e=>setField("program_duration_years", e.target.value)} required />
        <button className="btn">Submit Verification</button>
      </form>

      <div className="card mt-6 max-w-2xl">
        <h2 className="text-xl font-black">Schools & Programs</h2>
        <p className="muted mt-2">You can keep more than one school, program, or course linked to the same account.</p>
        <div className="grid gap-3 mt-4">
          {enrollments.length === 0 && <p className="muted">No linked schools yet.</p>}
          {enrollments.map(item => (
            <div key={item.id} className="rounded-2xl border border-white/10 p-4">
              <p className="font-black">{item.universities?.name || "University"}</p>
              <p className="muted text-sm">{item.program_name || item.departments?.name || "Program not specified"}</p>
              <p className="muted text-xs mt-2">{item.relationship_type} / started {item.academic_start_year || "N/A"} / {item.is_primary ? "primary" : "secondary"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
