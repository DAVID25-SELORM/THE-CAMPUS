import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { fetchProfileUniversities, updateStudentProfile } from "../../services/profileService";
import { uploadAvatar } from "../../services/storageService";
import { getProfileVerificationStatus } from "../../utils/profileStatus";

export default function Profile() {
  const { profile, user, refreshProfile } = useAuth();
  const toast = useToast();
  const [enrollments, setEnrollments] = useState([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef(null);
  const verificationStatus = getProfileVerificationStatus(profile);

  useEffect(() => {
    if (user?.id) fetchProfileUniversities(user.id).then(({ data }) => setEnrollments(data || []));
  }, [user?.id]);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast("Only JPEG, PNG, WebP, or GIF images are allowed.", "error");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast("Image must be under 3 MB.", "error");
      return;
    }

    setUploadingAvatar(true);
    const { url, error: uploadError } = await uploadAvatar(user.id, file);

    if (uploadError) {
      toast(uploadError.message, "error");
      setUploadingAvatar(false);
      return;
    }

    const { error: profileError } = await updateStudentProfile(user.id, { avatar_url: url });
    if (profileError) {
      toast(profileError.message, "error");
    } else {
      toast("Profile picture updated.", "success");
      await refreshProfile();
    }
    setUploadingAvatar(false);
  }

  const avatarInitial = profile?.full_name?.[0]?.toUpperCase() || "U";

  return (
    <div>
      <h1 className="text-3xl font-black">Profile</h1>
      <p className="muted mt-2">Your student identity and reputation profile.</p>

      <div className="card mt-6 max-w-2xl">
        <div className="flex items-start gap-5">
          <div className="relative shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="h-24 w-24 rounded-[28px] object-cover"
              />
            ) : (
              <div className="h-24 w-24 rounded-[28px] bg-white/10 grid place-items-center text-4xl font-black">
                {avatarInitial}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-cyan-300 text-slate-950 grid place-items-center shadow-lg hover:bg-cyan-200 transition"
              title="Change profile picture"
              aria-label="Change profile picture"
            >
              {uploadingAvatar ? (
                <span className="text-[10px] font-black">...</span>
              ) : (
                <Camera size={14} />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />
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
          <div><p className="muted text-sm">Academic Status</p><p className="font-bold">{profile?.academic_status || "student"}</p></div>
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
    </div>
  );
}
