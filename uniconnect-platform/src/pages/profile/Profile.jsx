import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { fetchProfileUniversities } from "../../services/profileService";

export default function Profile() {
  const { profile, user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);

  useEffect(() => {
    if (user?.id) fetchProfileUniversities(user.id).then(({ data }) => setEnrollments(data || []));
  }, [user?.id]);

  return (
    <div>
      <h1 className="text-3xl font-black">Profile</h1>
      <p className="muted mt-2">Your student identity and reputation profile.</p>

      <div className="card mt-6 max-w-2xl">
        <div className="h-24 w-24 rounded-[30px] bg-white/10 grid place-items-center text-4xl font-black">
          {profile?.full_name?.[0] || "U"}
        </div>
        <h2 className="text-3xl font-black mt-5">{profile?.full_name || "Unnamed Student"}</h2>
        <p className="muted">{user?.email}</p>
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div><p className="muted text-sm">University</p><p className="font-bold">{profile?.universities?.name || "Not selected"}</p></div>
          <div><p className="muted text-sm">Department</p><p className="font-bold">{profile?.departments?.name || "Not selected"}</p></div>
          <div><p className="muted text-sm">Student ID</p><p className="font-bold">{profile?.student_id || "N/A"}</p></div>
          <div><p className="muted text-sm">Status</p><p className="font-bold">{profile?.verification_status || "pending"}</p></div>
          <div><p className="muted text-sm">Current Level</p><p className="font-bold">{profile?.level || "N/A"}</p></div>
          <div><p className="muted text-sm">Academic Status</p><p className="font-bold">{profile?.academic_status || "student"}</p></div>
          <div><p className="muted text-sm">Start Year</p><p className="font-bold">{profile?.academic_start_year || "N/A"}</p></div>
          <div><p className="muted text-sm">Duration</p><p className="font-bold">{profile?.program_duration_years || "N/A"} years</p></div>
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
              <p className="muted text-sm">{item.program_name || item.departments?.name || "Program not specified"}</p>
              <p className="muted text-xs mt-2">{item.relationship_type} / started {item.academic_start_year || "N/A"} / {item.is_primary ? "primary" : "secondary"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
