import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Download, IdCard, Moon, Sun, User } from "lucide-react";
import QRCode from "qrcode";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { fetchProfileUniversities, updateStudentProfile } from "../../services/profileService";
import { uploadAvatar } from "../../services/storageService";
import { upsertAlumniProfile, fetchMyAlumniProfile } from "../../services/alumniService";
import { getProfileVerificationStatus } from "../../utils/profileStatus";

const TABS = ["Profile", "ID Card", "Alumni"];

export default function Profile() {
  const { profile, user, refreshProfile } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("Profile");
  const [enrollments, setEnrollments] = useState([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [qrUrl, setQrUrl] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("uc-theme") || "dark");
  const [alumniProfile, setAlumniProfile] = useState(null);
  const [alumniForm, setAlumniForm] = useState({
    graduation_year: "", programme_name: "", current_role: "",
    current_company: "", current_location: "", linkedin_url: "",
    open_to_mentoring: false, bio: ""
  });
  const fileRef = useRef(null);
  const verificationStatus = getProfileVerificationStatus(profile);

  useEffect(() => {
    if (user?.id) {
      fetchProfileUniversities(user.id).then(({ data }) => setEnrollments(data || []));
      fetchMyAlumniProfile(user.id).then(({ data }) => {
        if (data) { setAlumniProfile(data); setAlumniForm(data); }
      });
    }
  }, [user?.id]);

  // Generate QR code for digital ID
  useEffect(() => {
    if (!profile) return;
    const idData = JSON.stringify({
      name: profile.full_name,
      id: profile.student_id,
      university: profile.universities?.name,
      level: profile.level,
      status: verificationStatus
    });
    QRCode.toDataURL(idData, { width: 220, margin: 1, color: { dark: "#001016", light: "#ffffff" } })
      .then(url => setQrUrl(url))
      .catch(() => {});
  }, [profile?.id, profile?.student_id]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("uc-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(t => t === "dark" ? "light" : "dark");
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast("Only JPEG, PNG, WebP, or GIF images allowed.", "error"); return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast("Image must be under 3 MB.", "error"); return;
    }
    setUploadingAvatar(true);
    const { url, error: uploadError } = await uploadAvatar(user.id, file);
    if (uploadError) { toast(uploadError.message, "error"); setUploadingAvatar(false); return; }
    const { error } = await updateStudentProfile(user.id, { avatar_url: url });
    if (error) toast(error.message, "error");
    else { toast("Profile picture updated.", "success"); await refreshProfile(); }
    setUploadingAvatar(false);
  }

  async function handleSaveAlumni(e) {
    e.preventDefault();
    const { error } = await upsertAlumniProfile({
      id: user.id,
      university_id: profile.university_id,
      ...alumniForm,
      graduation_year: Number(alumniForm.graduation_year) || null
    });
    if (error) { toast(error.message, "error"); return; }
    toast("Alumni profile saved.", "success");
    fetchMyAlumniProfile(user.id).then(({ data }) => { if (data) setAlumniProfile(data); });
  }

  function downloadID() {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `${profile?.full_name || "student"}-id.png`;
    a.click();
  }

  const avatarInitial = profile?.full_name?.[0]?.toUpperCase() || "U";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Profile</h1>
        <button onClick={toggleTheme} className="btn btn-secondary flex items-center gap-2" title="Toggle theme">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>
      <p className="muted mt-1">Your student identity and campus reputation.</p>

      <div className="flex gap-2 mt-6 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`btn ${tab === t ? "" : "btn-secondary"}`}>{t}</button>
        ))}
      </div>

      {tab === "Profile" && (
        <>
          <div className="card mt-6 max-w-2xl">
            <div className="flex items-start gap-5">
              <div className="relative shrink-0">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt={profile.full_name} className="h-24 w-24 rounded-[28px] object-cover" />
                  : <div className="h-24 w-24 rounded-[28px] bg-white/10 grid place-items-center text-4xl font-black">{avatarInitial}</div>
                }
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-cyan-300 text-slate-950 grid place-items-center shadow-lg hover:bg-cyan-200 transition"
                  title="Change profile picture"
                >
                  {uploadingAvatar ? <span className="text-[10px] font-black">…</span> : <Camera size={14} />}
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-black">{profile?.full_name || "Unnamed Student"}</h2>
                <p className="muted text-sm mt-1">{user?.email}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div><p className="muted text-sm">University</p><p className="font-bold">{profile?.universities?.name || "Not selected"}</p></div>
              <div><p className="muted text-sm">Department</p><p className="font-bold">{profile?.departments?.name || "Not selected"}</p></div>
              <div><p className="muted text-sm">Student ID</p><p className="font-bold">{profile?.student_id || "N/A"}</p></div>
              <div><p className="muted text-sm">Status</p><p className="font-bold">{verificationStatus}</p></div>
              <div><p className="muted text-sm">Current Level</p><p className="font-bold">{profile?.level || "N/A"}</p></div>
              <div><p className="muted text-sm">Academic Status</p><p className="font-bold">{profile?.is_alumni ? "Alumni" : "Student"}</p></div>
              <div><p className="muted text-sm">Start Year</p><p className="font-bold">{profile?.academic_start_year || "N/A"}</p></div>
              <div><p className="muted text-sm">Duration</p><p className="font-bold">{profile?.program_duration_years ? `${profile.program_duration_years} years` : "N/A"}</p></div>
            </div>
            <Link to="/verify" className="btn inline-flex mt-6">Update Verification</Link>
          </div>

          <div className="card mt-6 max-w-2xl">
            <h2 className="text-xl font-black">Linked Schools & Programs</h2>
            <div className="grid gap-3 mt-4">
              {enrollments.length === 0 && <p className="muted">No linked schools yet.</p>}
              {enrollments.map(item => (
                <div key={item.id} className="rounded-2xl border border-white/10 p-4">
                  <p className="font-black">{item.universities?.name || "University"}</p>
                  <p className="muted text-sm">{item.academic_programmes?.name || item.departments?.name || "Program not specified"}</p>
                  <p className="muted text-xs mt-2">{item.relationship_type} / started {item.academic_start_year || "N/A"} / {item.is_primary ? "primary" : "secondary"}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "ID Card" && (
        <div className="card mt-6 max-w-md">
          <div className="flex items-center gap-2 mb-4">
            <IdCard size={20} className="text-cyan-300" />
            <h2 className="font-black text-xl">Digital Student ID</h2>
          </div>

          <div className="rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900 to-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} className="h-16 w-16 rounded-2xl object-cover" alt="" />
                : <div className="h-16 w-16 rounded-2xl bg-white/10 grid place-items-center text-2xl font-black">{avatarInitial}</div>
              }
              <div>
                <p className="font-black text-lg">{profile?.full_name || "Student"}</p>
                <p className="muted text-sm">{profile?.universities?.short_name || profile?.universities?.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div><p className="muted text-xs">Student ID</p><p className="font-black">{profile?.student_id || "N/A"}</p></div>
              <div><p className="muted text-xs">Level</p><p className="font-black">{profile?.level || "N/A"}</p></div>
              <div><p className="muted text-xs">Programme</p><p className="font-black text-xs">{profile?.academic_programmes?.name || profile?.departments?.name || "N/A"}</p></div>
              <div><p className="muted text-xs">Status</p><p className={`font-black text-xs ${verificationStatus === "verified" ? "text-emerald-300" : "text-amber-300"}`}>{verificationStatus.toUpperCase()}</p></div>
            </div>

            {qrUrl && (
              <div className="flex justify-center">
                <img src={qrUrl} alt="Student ID QR Code" className="rounded-xl w-[160px] h-[160px]" />
              </div>
            )}

            <p className="muted text-xs text-center mt-3">Scan QR code to verify student identity</p>
          </div>

          <button onClick={downloadID} className="btn w-full mt-4 flex items-center justify-center gap-2">
            <Download size={18} /> Download ID Card
          </button>
        </div>
      )}

      {tab === "Alumni" && (
        <div className="card mt-6 max-w-2xl">
          <h2 className="text-xl font-black">Alumni Profile</h2>
          <p className="muted mt-1">Share your career journey and mentor current students.</p>

          <form onSubmit={handleSaveAlumni} className="grid md:grid-cols-2 gap-4 mt-5">
            <input className="input" type="number" placeholder="Graduation year" value={alumniForm.graduation_year} onChange={e => setAlumniForm({ ...alumniForm, graduation_year: e.target.value })} />
            <input className="input" placeholder="Programme name" value={alumniForm.programme_name} onChange={e => setAlumniForm({ ...alumniForm, programme_name: e.target.value })} />
            <input className="input" placeholder="Current job title / role" value={alumniForm.current_role} onChange={e => setAlumniForm({ ...alumniForm, current_role: e.target.value })} />
            <input className="input" placeholder="Current company / organisation" value={alumniForm.current_company} onChange={e => setAlumniForm({ ...alumniForm, current_company: e.target.value })} />
            <input className="input" placeholder="Current location / city" value={alumniForm.current_location} onChange={e => setAlumniForm({ ...alumniForm, current_location: e.target.value })} />
            <input className="input" placeholder="LinkedIn URL" value={alumniForm.linkedin_url} onChange={e => setAlumniForm({ ...alumniForm, linkedin_url: e.target.value })} />
            <textarea className="input md:col-span-2 min-h-24" placeholder="Short bio / career summary" value={alumniForm.bio} onChange={e => setAlumniForm({ ...alumniForm, bio: e.target.value })} />
            <label className="flex items-center gap-2 cursor-pointer md:col-span-2">
              <input type="checkbox" checked={alumniForm.open_to_mentoring} onChange={e => setAlumniForm({ ...alumniForm, open_to_mentoring: e.target.checked })} />
              <span>I'm open to mentoring current students</span>
            </label>
            <button className="btn md:col-span-2">Save Alumni Profile</button>
          </form>
        </div>
      )}
    </div>
  );
}
