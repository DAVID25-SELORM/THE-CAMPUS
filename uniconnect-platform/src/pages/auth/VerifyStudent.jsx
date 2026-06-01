import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  fetchProfileUniversities,
  getAcademicLevels,
  getAcademicSessions,
  getCourses,
  getDepartments,
  getFaculties,
  getProgrammes,
  getUniversities,
  updateStudentProfile,
  upsertProfileUniversity
} from "../../services/profileService";

const currentYear = new Date().getFullYear();
const currentAcademicYear = `${currentYear}/${currentYear + 1}`;
const sessionFallbacks = ["Regular", "Weekend", "Evening", "Distance"];

export default function VerifyStudent() {
  const { user, profile, refreshProfile } = useAuth();
  const [universities, setUniversities] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [levels, setLevels] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    university_id: profile?.university_id || "",
    faculty_id: profile?.faculty_id || "",
    department_id: profile?.department_id || "",
    programme_id: profile?.programme_id || "",
    course_id: profile?.course_id || "",
    level: profile?.level || "100",
    session: profile?.session || "",
    student_id: profile?.student_id || "",
    academic_year: profile?.academic_year || currentAcademicYear,
    semester: profile?.semester || "Semester 1",
    academic_start_year: profile?.academic_start_year || currentYear,
    starting_level: profile?.starting_level || 100,
    program_duration_years: profile?.program_duration_years || 4,
    relationship_type: "student"
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedFaculty = useMemo(
    () => faculties.find(item => item.id === form.faculty_id),
    [faculties, form.faculty_id]
  );
  const selectedCourse = useMemo(
    () => courses.find(item => item.id === form.course_id),
    [courses, form.course_id]
  );

  useEffect(() => {
    getUniversities().then(({ data }) => setUniversities(data || []));
  }, []);

  useEffect(() => {
    if (!profile) return;
    setForm(prev => ({
      ...prev,
      full_name: profile.full_name || "",
      university_id: profile.university_id || "",
      faculty_id: profile.faculty_id || "",
      department_id: profile.department_id || "",
      programme_id: profile.programme_id || "",
      course_id: profile.course_id || "",
      level: profile.level || "100",
      session: profile.session || "",
      student_id: profile.student_id || "",
      academic_year: profile.academic_year || currentAcademicYear,
      semester: profile.semester || "Semester 1",
      academic_start_year: profile.academic_start_year || currentYear,
      starting_level: profile.starting_level || 100,
      program_duration_years: profile.program_duration_years || 4
    }));
  }, [profile?.id]);

  useEffect(() => {
    if (!form.university_id) return;

    Promise.all([
      getFaculties(form.university_id),
      getDepartments(form.university_id),
      getAcademicLevels(form.university_id),
      getAcademicSessions(form.university_id)
    ]).then(([facultyResult, departmentResult, levelResult, sessionResult]) => {
      setFaculties(facultyResult.data || []);
      setDepartments(departmentResult.data || []);
      setLevels(levelResult.data || []);
      setSessions(sessionResult.data || []);
    });
  }, [form.university_id]);

  useEffect(() => {
    if (!form.university_id) return;
    getProgrammes(form.university_id, form.department_id).then(({ data }) => setProgrammes(data || []));
  }, [form.university_id, form.department_id]);

  useEffect(() => {
    if (!form.university_id) return;
    getCourses(form.university_id, {
      department_id: form.department_id,
      programme_id: form.programme_id,
      level: form.level
    }).then(({ data }) => setCourses(data || []));
  }, [form.university_id, form.department_id, form.programme_id, form.level]);

  useEffect(() => {
    if (user?.id) fetchProfileUniversities(user.id).then(({ data }) => setEnrollments(data || []));
  }, [user?.id, profile?.university_id]);

  function setField(key, value) {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === "university_id") {
        next.faculty_id = "";
        next.department_id = "";
        next.programme_id = "";
        next.course_id = "";
      }
      if (key === "faculty_id") {
        next.department_id = "";
        next.programme_id = "";
        next.course_id = "";
      }
      if (key === "department_id") {
        next.programme_id = "";
        next.course_id = "";
      }
      if (key === "programme_id" || key === "level") {
        next.course_id = "";
      }
      return next;
    });
  }

  function formatSupabaseError(error) {
    return [error?.message, error?.details, error?.hint].filter(Boolean).join(" ") || "Could not save your verification details.";
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setMessage("");

    if (!user?.id) {
      setMessage("Sign in before submitting verification.");
      return;
    }

    if (!form.university_id || !form.faculty_id || !form.department_id || !form.programme_id || !form.session || !form.student_id.trim()) {
      setMessage("Complete university, faculty, department, programme, session, and student ID before submitting.");
      return;
    }

    if (Number(form.academic_start_year) > currentYear) {
      setMessage("Academic start year cannot be in the future.");
      return;
    }

    const facultyCode = selectedFaculty?.code || "";
    const courseCode = selectedCourse?.code || "";
    const profileForm = { ...form };
    delete profileForm.relationship_type;

    setBusy(true);

    try {
      const payload = {
        ...profileForm,
        full_name: form.full_name.trim(),
        university_id: form.university_id,
        faculty_id: form.faculty_id || null,
        faculty_code: facultyCode || null,
        department_id: form.department_id || null,
        programme_id: form.programme_id || null,
        course_id: form.course_id || null,
        course_code: courseCode || null,
        level: String(form.level),
        session: form.session.trim(),
        student_id: form.student_id.trim(),
        academic_year: form.academic_year.trim(),
        semester: form.semester,
        academic_start_year: Number(form.academic_start_year),
        starting_level: Number(form.starting_level || form.level),
        program_duration_years: Number(form.program_duration_years),
        verification_status: "pending"
      };

      const { error } = await updateStudentProfile(user.id, payload);
      if (error) {
        setMessage(formatSupabaseError(error));
        return;
      }

      const { error: enrollmentError } = await upsertProfileUniversity({
        user_id: user.id,
        university_id: form.university_id,
        faculty_id: form.faculty_id || null,
        faculty_code: facultyCode || null,
        department_id: form.department_id || null,
        programme_id: form.programme_id || null,
        course_id: form.course_id || null,
        course_code: courseCode || null,
        level: String(form.level),
        session: form.session.trim(),
        student_id: form.student_id.trim(),
        academic_year: form.academic_year.trim(),
        semester: form.semester,
        academic_start_year: Number(form.academic_start_year),
        starting_level: Number(form.starting_level || form.level),
        program_duration_years: Number(form.program_duration_years),
        relationship_type: form.relationship_type,
        is_primary: true
      });
      if (enrollmentError) {
        setMessage(formatSupabaseError(enrollmentError));
        return;
      }

      await refreshProfile();
      const { data } = await fetchProfileUniversities(user.id);
      setEnrollments(data || []);
      setMessage("Profile submitted. Your academic structure is now linked to your verification request.");
    } catch (error) {
      setMessage(error?.message || "Could not submit verification.");
    } finally {
      setBusy(false);
    }
  }

  const visibleDepartments = form.faculty_id
    ? departments.filter(item => item.faculty_id === form.faculty_id)
    : departments;
  const visibleSessions = sessions.length ? sessions.map(item => item.name) : sessionFallbacks;

  return (
    <div>
      <h1 className="text-3xl font-black">Account Verification</h1>
      <p className="muted mt-2">Link your account to the academic structure used by your university.</p>

      {message && <div className="card mt-5">{message}</div>}

      <form onSubmit={submit} className="card mt-6 grid gap-4 max-w-3xl">
        <input className="input" placeholder="Full name" value={form.full_name} onChange={e => setField("full_name", e.target.value)} required />

        <select className="input" value={form.university_id} onChange={e => setField("university_id", e.target.value)} required>
          <option value="">University</option>
          {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>

        <select className="input" value={form.faculty_id || ""} onChange={e => setField("faculty_id", e.target.value)} required>
          <option value="">Faculty / School</option>
          {faculties.map(f => <option key={f.id} value={f.id}>{f.code ? `${f.name} (${f.code})` : f.name}</option>)}
        </select>

        <select className="input" value={form.department_id || ""} onChange={e => setField("department_id", e.target.value)} required>
          <option value="">Department</option>
          {visibleDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select className="input" value={form.programme_id || ""} onChange={e => setField("programme_id", e.target.value)} required>
          <option value="">Programme</option>
          {programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <div className="grid md:grid-cols-2 gap-4">
          <select className="input" value={form.level} onChange={e => setField("level", e.target.value)} required>
            <option value="">Level</option>
            {(levels.length ? levels.map(item => item.level) : ["100", "200", "300", "400"]).map(level => (
              <option key={level} value={level}>Level {level}</option>
            ))}
          </select>

          <select className="input" value={form.session} onChange={e => setField("session", e.target.value)} required>
            <option value="">Session</option>
            {visibleSessions.map(session => <option key={session} value={session}>{session}</option>)}
          </select>
        </div>

        <select className="input" value={form.course_id || ""} onChange={e => setField("course_id", e.target.value)}>
          <option value="">Course / module, if applicable</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>{course.code ? `${course.code} - ${course.name}` : course.name}</option>
          ))}
        </select>

        <div className="grid md:grid-cols-2 gap-4">
          <input className="input" placeholder="Student ID" value={form.student_id} onChange={e => setField("student_id", e.target.value)} required />
          <input className="input" placeholder="Academic Year" value={form.academic_year} onChange={e => setField("academic_year", e.target.value)} required />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <select className="input" value={form.semester} onChange={e => setField("semester", e.target.value)}>
            <option value="Semester 1">Semester 1</option>
            <option value="Semester 2">Semester 2</option>
            <option value="Trimester 1">Trimester 1</option>
            <option value="Trimester 2">Trimester 2</option>
            <option value="Trimester 3">Trimester 3</option>
          </select>
          <input className="input" type="number" min="1950" max={currentYear} placeholder="Academic start year" value={form.academic_start_year} onChange={e => setField("academic_start_year", e.target.value)} required />
        </div>

        <input className="input" type="number" min="1" max="10" placeholder="Programme duration in years" value={form.program_duration_years} onChange={e => setField("program_duration_years", e.target.value)} required />
        <button className="btn" disabled={busy}>{busy ? "Submitting..." : "Submit Verification"}</button>
      </form>

      <div className="card mt-6 max-w-3xl">
        <h2 className="text-xl font-black">Schools & Programmes</h2>
        <p className="muted mt-2">You can keep more than one school, programme, or course linked to the same account.</p>
        <div className="grid gap-3 mt-4">
          {enrollments.length === 0 && <p className="muted">No linked schools yet.</p>}
          {enrollments.map(item => (
            <div key={item.id} className="rounded-2xl border border-white/10 p-4">
              <p className="font-black">{item.universities?.name || "University"}</p>
              <p className="muted text-sm">
                {item.faculties?.code ? `${item.faculties.code} / ` : ""}
                {item.departments?.name || "Department not specified"}
                {item.academic_programmes?.name ? ` / ${item.academic_programmes.name}` : ""}
              </p>
              <p className="muted text-xs mt-2">
                Level {item.level || "N/A"} / {item.session || "session N/A"} / {item.academic_year || "academic year N/A"} / {item.is_primary ? "primary" : "secondary"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
