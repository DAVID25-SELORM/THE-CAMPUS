import React, { useEffect, useMemo, useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { averageRating, createCourseReview, deleteCourseReview, fetchCourseReviews } from "../../services/reviewService";
import { getCourses } from "../../services/profileService";
import EmptyState from "../../components/EmptyState";
import { SearchableSelect } from "../../components/SearchableSelect";

function Stars({ value, max = 5 }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} size={14} className={i < Math.round(value) ? "text-amber-400 fill-amber-400" : "text-white/20"} />
      ))}
    </span>
  );
}

function RatingInput({ label, value, onChange }) {
  return (
    <div>
      <p className="muted text-xs mb-1">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}>
            <Star size={20} className={n <= value ? "text-amber-400 fill-amber-400" : "text-white/20"} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CourseReviews() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    course_id: "", course_name: "", lecturer_name: "",
    rating: 4, difficulty: 3, workload: 3,
    review: "", academic_year: "", anonymous: true
  });

  async function load() {
    if (!profile?.university_id) return;
    const { data, error } = await fetchCourseReviews(profile.university_id, selectedCourse || null);
    if (error) toast(error.message, "error");
    else setReviews(data || []);
  }

  useEffect(() => { load(); }, [profile?.university_id, selectedCourse]);

  useEffect(() => {
    if (!profile?.university_id) return;
    getCourses(profile.university_id, {}).then(({ data }) => setCourses(data || []));
  }, [profile?.university_id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.rating) { toast("Rating is required.", "error"); return; }
    const { error } = await createCourseReview({
      ...form,
      course_id:    form.course_id    || null,
      reviewer_id:  user.id,
      university_id: profile.university_id
    });
    if (error) { toast(error.message, "error"); return; }
    toast("Review submitted. Thank you!", "success");
    setShowForm(false);
    setForm({ course_id: "", course_name: "", lecturer_name: "", rating: 4, difficulty: 3, workload: 3, review: "", academic_year: "", anonymous: true });
    load();
  }

  async function handleDelete(id) {
    const { error } = await deleteCourseReview(id);
    if (error) toast(error.message, "error");
    else { toast("Review removed.", "success"); load(); }
  }

  const avg = useMemo(() => averageRating(reviews), [reviews]);

  const courseOptions = useMemo(() =>
    courses.map(c => ({ value: c.id, label: c.code ? `${c.name} (${c.code})` : c.name })),
    [courses]
  );

  if (!profile?.university_id) {
    return <EmptyState title="Verify your student profile" message="Set your university to see course reviews." />;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Course Reviews</h1>
          <p className="muted mt-1">Anonymous ratings and reviews for courses on your campus.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn flex items-center gap-2">
          <Star size={18} /> Write a Review
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mt-6 grid md:grid-cols-2 gap-4">
          <SearchableSelect
            id="review-course"
            placeholder="Type or choose course (optional)"
            value={form.course_id}
            options={courseOptions}
            onChange={value => setForm({ ...form, course_id: value })}
          />
          <input className="input" placeholder="Course name (if not in list)" value={form.course_name} onChange={e => setForm({ ...form, course_name: e.target.value })} />
          <input className="input" placeholder="Lecturer name" value={form.lecturer_name} onChange={e => setForm({ ...form, lecturer_name: e.target.value })} />
          <input className="input" placeholder="Academic year (e.g. 2023/2024)" value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} />

          <div className="md:col-span-2 grid md:grid-cols-3 gap-4">
            <RatingInput label="Overall rating" value={form.rating} onChange={v => setForm({ ...form, rating: v })} />
            <RatingInput label="Difficulty" value={form.difficulty} onChange={v => setForm({ ...form, difficulty: v })} />
            <RatingInput label="Workload" value={form.workload} onChange={v => setForm({ ...form, workload: v })} />
          </div>

          <textarea className="input md:col-span-2 min-h-28" placeholder="Your review (optional but helpful!)" value={form.review} onChange={e => setForm({ ...form, review: e.target.value })} />

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.anonymous} onChange={e => setForm({ ...form, anonymous: e.target.checked })} />
            <span className="muted text-sm">Post anonymously</span>
          </label>

          <button className="btn md:col-span-2">Submit Review</button>
        </form>
      )}

      <div className="grid md:grid-cols-[280px_1fr] gap-5 mt-6">
        <aside className="card self-start">
          <h2 className="font-black mb-3">Filter by Course</h2>
          <button
            onClick={() => setSelectedCourse("")}
            className={`w-full text-left px-3 py-2 rounded-xl mb-1 ${!selectedCourse ? "bg-cyan-300/20 text-cyan-100 font-bold" : "hover:bg-white/10"}`}
          >
            All courses
          </button>
          {courses.slice(0, 20).map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCourse(c.id)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm mb-1 ${selectedCourse === c.id ? "bg-cyan-300/20 text-cyan-100 font-bold" : "hover:bg-white/10 muted"}`}
            >
              {c.code ? `${c.code}: ` : ""}{c.name}
            </button>
          ))}
        </aside>

        <section>
          {reviews.length > 0 && (
            <div className="card mb-4 flex items-center gap-4">
              <div>
                <p className="text-4xl font-black">{avg.toFixed(1)}</p>
                <Stars value={avg} />
                <p className="muted text-sm mt-1">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            {reviews.length === 0 && <EmptyState title="No reviews yet" message="Be the first to review a course." />}
            {reviews.map(r => (
              <article key={r.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Stars value={r.rating} />
                      {r.courses?.code && <span className="badge">{r.courses.code}</span>}
                      {r.courses?.name && <span className="muted text-sm">{r.courses.name}</span>}
                      {r.course_name && !r.courses && <span className="muted text-sm">{r.course_name}</span>}
                    </div>
                    {r.lecturer_name && <p className="muted text-sm">Lecturer: {r.lecturer_name}</p>}
                    <div className="flex gap-4 mt-2 text-xs muted">
                      {r.difficulty && <span>Difficulty: <Stars value={r.difficulty} /></span>}
                      {r.workload   && <span>Workload: <Stars value={r.workload} /></span>}
                    </div>
                    {r.review && <p className="mt-3 whitespace-pre-wrap">{r.review}</p>}
                    <p className="muted text-xs mt-3">
                      {r.anonymous ? "Anonymous student" : r.profiles?.full_name}
                      {r.academic_year ? ` · ${r.academic_year}` : ""}
                      {" · "}{new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {r.reviewer_id === user?.id && (
                    <button onClick={() => handleDelete(r.id)} className="muted hover:text-red-300 transition shrink-0">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
