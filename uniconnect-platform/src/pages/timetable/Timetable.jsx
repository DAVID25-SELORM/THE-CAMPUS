import React, { useEffect, useState } from "react";
import { CalendarDays, Clock, MapPin, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  DAYS,
  ENTRY_COLORS,
  createExam,
  createTimetableEntry,
  deleteExam,
  deleteTimetableEntry,
  fetchExams,
  fetchTimetable
} from "../../services/timetableService";

const ENTRY_TYPES = ["lecture", "lab", "tutorial", "seminar", "other"];
const HOURS = Array.from({ length: 14 }, (_, i) => `${(i + 7).toString().padStart(2, "0")}:00`);

const emptyEntry = {
  course_name: "", course_code: "", lecturer: "", venue: "",
  day_of_week: 0, start_time: "08:00", end_time: "10:00",
  entry_type: "lecture", color: "#00f5ff"
};

const emptyExam = {
  course_name: "", course_code: "", exam_date: "", venue: "", duration_mins: 120, notes: ""
};

export default function Timetable() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [entries, setEntries] = useState([]);
  const [exams, setExams] = useState([]);
  const [tab, setTab] = useState("week");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyEntry);
  const [examForm, setExamForm] = useState(emptyExam);
  const [showExamAdd, setShowExamAdd] = useState(false);

  async function load() {
    if (!user?.id) return;
    const [t, e] = await Promise.all([fetchTimetable(user.id), fetchExams(user.id)]);
    setEntries(t.data || []);
    setExams(e.data || []);
  }

  useEffect(() => { load(); }, [user?.id]);

  async function handleAddEntry(ev) {
    ev.preventDefault();
    const { error } = await createTimetableEntry({
      ...form,
      user_id: user.id,
      university_id: profile.university_id
    });
    if (error) { toast(error.message, "error"); return; }
    toast("Class added to timetable.", "success");
    setShowAdd(false);
    setForm(emptyEntry);
    load();
  }

  async function handleDeleteEntry(id) {
    const { error } = await deleteTimetableEntry(id);
    if (error) toast(error.message, "error");
    else load();
  }

  async function handleAddExam(ev) {
    ev.preventDefault();
    const { error } = await createExam({
      ...examForm,
      user_id: user.id,
      university_id: profile.university_id
    });
    if (error) { toast(error.message, "error"); return; }
    toast("Exam added.", "success");
    setShowExamAdd(false);
    setExamForm(emptyExam);
    load();
  }

  async function handleDeleteExam(id) {
    const { error } = await deleteExam(id);
    if (error) toast(error.message, "error");
    else load();
  }

  // Group entries by day
  const byDay = DAYS.map((_, i) => entries.filter(e => e.day_of_week === i));

  // Upcoming exams (future only)
  const upcomingExams = exams
    .filter(e => new Date(e.exam_date) >= new Date())
    .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date));

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">My Timetable</h1>
          <p className="muted mt-1">Your weekly class schedule and exam countdown.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab("week")} className={`btn ${tab === "week" ? "" : "btn-secondary"}`}>Weekly</button>
          <button onClick={() => setTab("exams")} className={`btn ${tab === "exams" ? "" : "btn-secondary"}`}>
            Exams {upcomingExams.length > 0 && <span className="ml-1 badge">{upcomingExams.length}</span>}
          </button>
        </div>
      </div>

      {tab === "week" && (
        <>
          <button onClick={() => setShowAdd(!showAdd)} className="btn mt-6 flex items-center gap-2">
            <Plus size={18} /> Add Class
          </button>

          {showAdd && (
            <form onSubmit={handleAddEntry} className="card mt-4 grid md:grid-cols-3 gap-3">
              <input className="input" placeholder="Course name *" value={form.course_name} onChange={e => setForm({ ...form, course_name: e.target.value })} required />
              <input className="input" placeholder="Course code" value={form.course_code} onChange={e => setForm({ ...form, course_code: e.target.value })} />
              <input className="input" placeholder="Lecturer" value={form.lecturer} onChange={e => setForm({ ...form, lecturer: e.target.value })} />

              <select className="input" value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: Number(e.target.value) })}>
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
              <input className="input" type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
              <input className="input" type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />

              <input className="input" placeholder="Venue / Room" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} />
              <select className="input" value={form.entry_type} onChange={e => setForm({ ...form, entry_type: e.target.value })}>
                {ENTRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <label className="muted text-sm shrink-0">Colour</label>
                <div className="flex gap-1 flex-wrap">
                  {ENTRY_COLORS.map(c => (
                    <button key={c} type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className={`h-7 w-7 rounded-full border-2 transition ${form.color === c ? "border-white scale-110" : "border-transparent"}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <button className="btn md:col-span-3">Save Class</button>
            </form>
          )}

          <div className="mt-6 grid gap-4">
            {DAYS.map((day, i) => (
              <div key={day}>
                <h2 className="font-black mb-2 text-lg">{day}</h2>
                {byDay[i].length === 0
                  ? <p className="muted text-sm pl-2">No classes</p>
                  : (
                    <div className="grid gap-2">
                      {byDay[i].map(entry => (
                        <div key={entry.id} className="flex items-start gap-3 card py-3"
                             style={{ borderLeftColor: entry.color, borderLeftWidth: 4 }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-black">{entry.course_name}</h3>
                              {entry.course_code && <span className="badge">{entry.course_code}</span>}
                              <span className="badge">{entry.entry_type}</span>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-2 text-sm muted">
                              <span className="flex items-center gap-1"><Clock size={13} />{entry.start_time}–{entry.end_time}</span>
                              {entry.venue && <span className="flex items-center gap-1"><MapPin size={13} />{entry.venue}</span>}
                              {entry.lecturer && <span>👤 {entry.lecturer}</span>}
                            </div>
                          </div>
                          <button onClick={() => handleDeleteEntry(entry.id)} className="muted hover:text-red-300 transition shrink-0" title="Remove">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "exams" && (
        <>
          <button onClick={() => setShowExamAdd(!showExamAdd)} className="btn mt-6 flex items-center gap-2">
            <Plus size={18} /> Add Exam
          </button>

          {showExamAdd && (
            <form onSubmit={handleAddExam} className="card mt-4 grid md:grid-cols-2 gap-3">
              <input className="input" placeholder="Course name *" value={examForm.course_name} onChange={e => setExamForm({ ...examForm, course_name: e.target.value })} required />
              <input className="input" placeholder="Course code" value={examForm.course_code} onChange={e => setExamForm({ ...examForm, course_code: e.target.value })} />
              <input className="input" type="datetime-local" value={examForm.exam_date} onChange={e => setExamForm({ ...examForm, exam_date: e.target.value })} required />
              <input className="input" placeholder="Venue / Hall" value={examForm.venue} onChange={e => setExamForm({ ...examForm, venue: e.target.value })} />
              <input className="input" type="number" placeholder="Duration (minutes)" value={examForm.duration_mins} onChange={e => setExamForm({ ...examForm, duration_mins: Number(e.target.value) })} />
              <input className="input" placeholder="Notes" value={examForm.notes} onChange={e => setExamForm({ ...examForm, notes: e.target.value })} />
              <button className="btn md:col-span-2">Save Exam</button>
            </form>
          )}

          <div className="grid gap-4 mt-6">
            {upcomingExams.length === 0 && <p className="muted card text-center py-8">No upcoming exams. Add your exam schedule to get countdowns.</p>}
            {upcomingExams.map(exam => {
              const diff = new Date(exam.exam_date) - new Date();
              const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
              const urgent = days <= 3;
              return (
                <div key={exam.id} className={`card flex items-start justify-between gap-4 ${urgent ? "border-red-400/40" : ""}`}>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black">{exam.course_name}</h3>
                      {exam.course_code && <span className="badge">{exam.course_code}</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 muted text-sm">
                      <span>📅 {new Date(exam.exam_date).toLocaleString()}</span>
                      {exam.venue && <span>📍 {exam.venue}</span>}
                      {exam.duration_mins && <span>⏱ {exam.duration_mins} mins</span>}
                    </div>
                    {exam.notes && <p className="muted text-sm mt-2">{exam.notes}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`badge ${urgent ? "border-red-400/40 text-red-300" : ""}`}>
                      {days === 0 ? "TODAY" : days === 1 ? "Tomorrow" : `${days} days`}
                    </span>
                    <button onClick={() => handleDeleteExam(exam.id)} className="muted hover:text-red-300 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
