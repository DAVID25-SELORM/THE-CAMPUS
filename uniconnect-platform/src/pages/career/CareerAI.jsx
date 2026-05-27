import React, { useEffect, useMemo, useState } from "react";
import { Brain, Briefcase, Building2, FileText, FolderKanban, Sparkles, Trophy, Users } from "lucide-react";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../hooks/useAuth";
import {
  addProfileSkill,
  applyForInternship,
  createCompany,
  createInternship,
  createRecruiterProfile,
  createPortfolio,
  endorseSkill,
  fetchAiStudySessions,
  fetchApplications,
  fetchCampusCareerReputation,
  fetchCompanies,
  fetchInternships,
  fetchPortfolios,
  fetchProfileSkills,
  fetchRecruiterApplications,
  fetchRecruiterProfile,
  fetchResumeProfile,
  fetchSkills,
  fetchSkillEndorsements,
  generateAiCareerResponse,
  saveAiStudySession,
  saveResumeProfile,
  updateApplicationStatus,
  upsertCareerReputation
} from "../../services/careerService";

const initialResume = {
  headline: "",
  summary: "",
  experience: "",
  education: "",
  achievements: "",
  linkedin_url: ""
};

const initialPortfolio = {
  title: "",
  description: "",
  project_url: "",
  github_url: ""
};

const initialInternship = {
  company_id: "",
  title: "",
  description: "",
  location: "",
  employment_type: "internship",
  deadline: ""
};

const initialCompany = {
  name: "",
  description: "",
  website: ""
};

export default function CareerAI() {
  const { user, profile } = useAuth();
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [recruiterApplications, setRecruiterApplications] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [aiSessions, setAiSessions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [recruiterProfile, setRecruiterProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [profileSkills, setProfileSkills] = useState([]);
  const [endorsements, setEndorsements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [resume, setResume] = useState(initialResume);
  const [portfolio, setPortfolio] = useState(initialPortfolio);
  const [internship, setInternship] = useState(initialInternship);
  const [company, setCompany] = useState(initialCompany);
  const [recruiterTitle, setRecruiterTitle] = useState("");
  const [skillForm, setSkillForm] = useState({ skill_id: "", proficiency: "beginner" });
  const [endorsementForm, setEndorsementForm] = useState({ skill_id: "", note: "" });
  const [aiMode, setAiMode] = useState("study_plan");
  const [aiPrompt, setAiPrompt] = useState("");
  const [message, setMessage] = useState("");

  const isAdmin = ["super_admin", "university_admin"].includes(profile?.role);
  const canRecruit = isAdmin || recruiterProfile?.status === "approved";
  const appliedIds = useMemo(() => new Set(applications.map(app => app.internship_id)), [applications]);
  const reputationScore = useMemo(() => {
    return (portfolios.length * 20) + (profileSkills.length * 10) + (endorsements.length * 15) + (applications.length * 5);
  }, [applications.length, endorsements.length, portfolios.length, profileSkills.length]);

  async function load() {
    if (!user?.id) return;

    const [
      internshipsResult,
      portfolioResult,
      aiResult,
      resumeResult,
      applicationsResult,
      skillsResult,
      profileSkillsResult,
      companiesResult,
      recruiterResult,
      endorsementsResult,
      leaderboardResult
    ] = await Promise.all([
      fetchInternships(profile?.university_id),
      fetchPortfolios(user.id),
      fetchAiStudySessions(user.id),
      fetchResumeProfile(user.id),
      fetchApplications(user.id),
      fetchSkills(),
      fetchProfileSkills(user.id),
      fetchCompanies(profile?.university_id),
      fetchRecruiterProfile(user.id),
      fetchSkillEndorsements(user.id),
      profile?.university_id ? fetchCampusCareerReputation(profile.university_id) : Promise.resolve({ data: [] })
    ]);

    setInternships(internshipsResult.data || []);
    setPortfolios(portfolioResult.data || []);
    setAiSessions(aiResult.data || []);
    setApplications(applicationsResult.data || []);
    setSkills(skillsResult.data || []);
    setProfileSkills(profileSkillsResult.data || []);
    setCompanies(companiesResult.data || []);
    setRecruiterProfile(recruiterResult.data || null);
    setEndorsements(endorsementsResult.data || []);
    setLeaderboard(leaderboardResult.data || []);

    if (resumeResult.data) setResume({ ...initialResume, ...resumeResult.data });

    if (recruiterResult.data?.company_id) {
      const recruiterApps = await fetchRecruiterApplications(recruiterResult.data.company_id);
      setRecruiterApplications(recruiterApps.data || []);
    } else {
      setRecruiterApplications([]);
    }
  }

  useEffect(() => {
    load();
  }, [user?.id, profile?.university_id]);

  async function handlePortfolio(e) {
    e.preventDefault();

    const { error } = await createPortfolio({
      ...portfolio,
      user_id: user.id,
      university_id: profile?.university_id || null
    });

    if (error) return setMessage(error.message);

    setPortfolio(initialPortfolio);
    setMessage("Portfolio added.");
    load();
  }

  async function handleResume(e) {
    e.preventDefault();

    const { error } = await saveResumeProfile({
      ...resume,
      user_id: user.id,
      university_id: profile?.university_id || null,
      updated_at: new Date().toISOString()
    });

    if (error) return setMessage(error.message);
    setMessage("Resume profile saved.");
    load();
  }

  async function handleAi(e) {
    e.preventDefault();
    const response = generateAiCareerResponse(aiMode, aiPrompt, resume);

    const { error } = await saveAiStudySession({
      user_id: user.id,
      university_id: profile?.university_id || null,
      topic: aiPrompt,
      prompt: aiPrompt,
      session_type: aiMode,
      source_text: aiPrompt,
      ai_response: response
    });

    if (error) return setMessage(error.message);

    setAiPrompt("");
    setMessage("AI study session saved.");
    load();
  }

  async function handleApply(id) {
    const { error } = await applyForInternship({
      internship_id: id,
      applicant_id: user.id,
      cover_letter: resume.summary || "Interested in this opportunity."
    });

    if (error) return setMessage(error.message);

    setMessage("Application submitted.");
    load();
  }

  async function handleSkill(e) {
    e.preventDefault();
    if (!skillForm.skill_id) return;

    const { error } = await addProfileSkill({
      user_id: user.id,
      skill_id: skillForm.skill_id,
      proficiency: skillForm.proficiency
    });

    if (error) return setMessage(error.message);

    setSkillForm({ skill_id: "", proficiency: "beginner" });
    setMessage("Skill added.");
    load();
  }

  async function handleEndorsement(e) {
    e.preventDefault();
    if (!endorsementForm.skill_id) return;

    const { error } = await endorseSkill({
      endorsed_user_id: user.id,
      endorser_id: user.id,
      skill_id: endorsementForm.skill_id,
      note: endorsementForm.note || "Self-confirmed skill evidence"
    });

    if (error) return setMessage(error.message);

    setEndorsementForm({ skill_id: "", note: "" });
    setMessage("Skill evidence saved.");
    load();
  }

  async function handleCompany(e) {
    e.preventDefault();
    if (!profile?.university_id) return;

    const { data, error } = await createCompany({
      ...company,
      university_id: profile.university_id,
      verified: false
    });

    if (error) return setMessage(error.message);

    const recruiter = await createRecruiterProfile({
      user_id: user.id,
      company_id: data.id,
      university_id: profile.university_id,
      title: recruiterTitle || "Recruiter",
      status: isAdmin ? "approved" : "pending"
    });

    if (recruiter.error) return setMessage(recruiter.error.message);

    setCompany(initialCompany);
    setRecruiterTitle("");
    setMessage(isAdmin ? "Recruiter workspace created." : "Recruiter request submitted for approval.");
    load();
  }

  async function handleInternship(e) {
    e.preventDefault();
    if (!profile?.university_id) return;

    const { error } = await createInternship({
      ...internship,
      university_id: profile.university_id,
      company_id: internship.company_id || recruiterProfile?.company_id || null,
      deadline: internship.deadline || null,
      created_by: user.id
    });

    if (error) return setMessage(error.message);

    setInternship(initialInternship);
    setMessage("Internship posted.");
    load();
  }

  async function handleApplicationStatus(application, status) {
    const { error } = await updateApplicationStatus(application.id, status);
    if (error) return setMessage(error.message);
    setMessage(`Application marked ${status}.`);
    load();
  }

  async function refreshReputation() {
    if (!profile?.university_id) return;

    const { error } = await upsertCareerReputation({
      user_id: user.id,
      university_id: profile.university_id,
      portfolio_score: portfolios.length * 20,
      skills_score: profileSkills.length * 10,
      endorsements_score: endorsements.length * 15,
      applications_score: applications.length * 5,
      total_score: reputationScore,
      updated_at: new Date().toISOString()
    });

    if (error) return setMessage(error.message);
    setMessage("Career reputation refreshed.");
    load();
  }

  return (
    <div>
      <h1 className="text-3xl font-black">Career & AI Ecosystem</h1>
      <p className="muted mt-2">
        Build your student portfolio, prepare resumes, apply for internships, and save AI-powered study plans.
      </p>

      {message && <div className="card mt-4">{message}</div>}

      <div className="grid md:grid-cols-5 gap-3 mt-6">
        <Stat title="Internships" value={internships.length} icon={Briefcase} />
        <Stat title="Applications" value={applications.length} icon={FileText} />
        <Stat title="Portfolio Items" value={portfolios.length} icon={FolderKanban} />
        <Stat title="AI Sessions" value={aiSessions.length} icon={Brain} />
        <Stat title="Career Score" value={reputationScore} icon={Trophy} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <section className="card">
          <Header icon={Building2} title="Recruiter Workspace" />
          {recruiterProfile ? (
            <div className="mt-4">
              <span className="badge">{recruiterProfile.status}</span>
              <h3 className="font-black mt-3">{recruiterProfile.companies?.name || "Company profile"}</h3>
              <p className="muted mt-2">{recruiterProfile.title || "Recruiter"}</p>
            </div>
          ) : (
            <form onSubmit={handleCompany} className="grid gap-3 mt-4">
              <input className="input" placeholder="Company name" value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} required />
              <input className="input" placeholder="Your recruiter title" value={recruiterTitle} onChange={e => setRecruiterTitle(e.target.value)} />
              <input className="input" placeholder="Website" value={company.website} onChange={e => setCompany({ ...company, website: e.target.value })} />
              <textarea className="input min-h-24" placeholder="Company description" value={company.description} onChange={e => setCompany({ ...company, description: e.target.value })} />
              <button className="btn">Create Recruiter Profile</button>
            </form>
          )}
        </section>

        <section className="card">
          <Header icon={Trophy} title="Career Reputation" />
          <p className="muted mt-3">
            Reputation combines portfolios, skills, endorsements, and applications into a campus career score.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <MiniStat title="Portfolio" value={portfolios.length * 20} />
            <MiniStat title="Skills" value={profileSkills.length * 10} />
            <MiniStat title="Endorsements" value={endorsements.length * 15} />
            <MiniStat title="Applications" value={applications.length * 5} />
          </div>
          <button className="btn mt-4" onClick={refreshReputation}>Refresh Reputation</button>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <section className="card">
          <Header icon={Briefcase} title="Internships" />

          {canRecruit && (
            <form onSubmit={handleInternship} className="grid gap-3 mt-4">
              <select className="input" value={internship.company_id} onChange={e => setInternship({ ...internship, company_id: e.target.value })}>
                <option value="">No company selected</option>
                {companies.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
              <input className="input" placeholder="Opportunity title" value={internship.title} onChange={e => setInternship({ ...internship, title: e.target.value })} required />
              <input className="input" placeholder="Location" value={internship.location} onChange={e => setInternship({ ...internship, location: e.target.value })} />
              <select className="input" value={internship.employment_type} onChange={e => setInternship({ ...internship, employment_type: e.target.value })}>
                <option value="internship">Internship</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="volunteer">Volunteer</option>
              </select>
              <input className="input" type="datetime-local" value={internship.deadline} onChange={e => setInternship({ ...internship, deadline: e.target.value })} />
              <textarea className="input min-h-24" placeholder="Description" value={internship.description} onChange={e => setInternship({ ...internship, description: e.target.value })} />
              <button className="btn">Post Opportunity</button>
            </form>
          )}

          <div className="grid gap-3 mt-5">
            {internships.length === 0 && <EmptyState title="No internships available" message="Campus opportunities will appear here." />}
            {internships.map(job => (
              <article className="border-b border-white/10 pb-4" key={job.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black">{job.title}</h3>
                    <p className="muted mt-2">{job.description}</p>
                    <p className="mt-2">{job.companies?.name || job.location || "Campus opportunity"}</p>
                  </div>
                  <span className="badge">{job.employment_type}</span>
                </div>
                <button onClick={() => handleApply(job.id)} disabled={appliedIds.has(job.id)} className="btn mt-4">
                  {appliedIds.has(job.id) ? "Applied" : "Apply"}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="card">
          <Header icon={FolderKanban} title="Portfolio Builder" />
          <form onSubmit={handlePortfolio} className="grid gap-3 mt-4">
            <input className="input" placeholder="Project title" value={portfolio.title} onChange={e => setPortfolio({ ...portfolio, title: e.target.value })} required />
            <textarea className="input min-h-24" placeholder="Description" value={portfolio.description} onChange={e => setPortfolio({ ...portfolio, description: e.target.value })} />
            <input className="input" placeholder="Project URL" value={portfolio.project_url} onChange={e => setPortfolio({ ...portfolio, project_url: e.target.value })} />
            <input className="input" placeholder="GitHub URL" value={portfolio.github_url} onChange={e => setPortfolio({ ...portfolio, github_url: e.target.value })} />
            <button className="btn">Add Portfolio</button>
          </form>

          <div className="grid gap-3 mt-5">
            {portfolios.map(item => (
              <article key={item.id} className="border-b border-white/10 pb-3">
                <h4 className="font-black">{item.title}</h4>
                <p className="muted mt-2">{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <section className="card">
          <Header icon={FileText} title="Resume Builder" />
          <form onSubmit={handleResume} className="grid gap-3 mt-4">
            <input className="input" placeholder="Professional headline" value={resume.headline || ""} onChange={e => setResume({ ...resume, headline: e.target.value })} />
            <textarea className="input min-h-24" placeholder="Summary" value={resume.summary || ""} onChange={e => setResume({ ...resume, summary: e.target.value })} />
            <textarea className="input min-h-24" placeholder="Experience" value={resume.experience || ""} onChange={e => setResume({ ...resume, experience: e.target.value })} />
            <textarea className="input min-h-24" placeholder="Education" value={resume.education || ""} onChange={e => setResume({ ...resume, education: e.target.value })} />
            <textarea className="input min-h-24" placeholder="Achievements" value={resume.achievements || ""} onChange={e => setResume({ ...resume, achievements: e.target.value })} />
            <input className="input" placeholder="LinkedIn URL" value={resume.linkedin_url || ""} onChange={e => setResume({ ...resume, linkedin_url: e.target.value })} />
            <button className="btn">Save Resume</button>
          </form>
        </section>

        <section className="card">
          <Header icon={Sparkles} title="Skills & AI Study Assistant" />
          <form onSubmit={handleSkill} className="grid md:grid-cols-[1fr_160px_auto] gap-3 mt-4">
            <select className="input" value={skillForm.skill_id} onChange={e => setSkillForm({ ...skillForm, skill_id: e.target.value })}>
              <option value="">Choose skill</option>
              {skills.map(skill => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
            </select>
            <select className="input" value={skillForm.proficiency} onChange={e => setSkillForm({ ...skillForm, proficiency: e.target.value })}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <button className="btn">Add</button>
          </form>

          <div className="flex flex-wrap gap-2 mt-4">
            {profileSkills.map(row => <span className="badge" key={row.id}>{row.skills?.name} / {row.proficiency}</span>)}
          </div>

          <form onSubmit={handleEndorsement} className="grid md:grid-cols-[1fr_1fr_auto] gap-3 mt-5">
            <select className="input" value={endorsementForm.skill_id} onChange={e => setEndorsementForm({ ...endorsementForm, skill_id: e.target.value })}>
              <option value="">Add skill evidence</option>
              {skills.map(skill => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
            </select>
            <input className="input" placeholder="Evidence or endorser note" value={endorsementForm.note} onChange={e => setEndorsementForm({ ...endorsementForm, note: e.target.value })} />
            <button className="btn">Save</button>
          </form>

          <div className="flex flex-wrap gap-2 mt-4">
            {endorsements.map(row => <span className="badge" key={row.id}>{row.skills?.name} endorsed</span>)}
          </div>

          <form onSubmit={handleAi} className="grid gap-3 mt-5">
            <select className="input" value={aiMode} onChange={e => setAiMode(e.target.value)}>
              <option value="study_plan">Study plan</option>
              <option value="summary">Note summary</option>
              <option value="quiz">Quiz generation</option>
              <option value="flashcards">Flashcards</option>
              <option value="mock_interview">Mock interview</option>
              <option value="resume">Resume optimization</option>
            </select>
            <textarea className="input min-h-28" placeholder="Ask AI to help with a topic..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} required />
            <button className="btn">Generate AI Study Session</button>
          </form>

          <div className="grid gap-3 mt-5">
            {aiSessions.map(session => (
              <article key={session.id} className="border-b border-white/10 pb-3">
                <h4 className="font-black">{session.topic}</h4>
                <pre className="muted mt-3 whitespace-pre-wrap font-sans">{session.ai_response}</pre>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <section className="card">
          <Header icon={Users} title="Recruiter Applications" />
          <div className="grid gap-3 mt-4">
            {recruiterApplications.length === 0 && <p className="muted">Applications for your company will appear here.</p>}
            {recruiterApplications.map(application => (
              <article key={application.id} className="border-b border-white/10 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black">{application.profiles?.full_name || "Applicant"}</h3>
                    <p className="muted mt-1">{application.internships?.title || "Opportunity"} / {application.profiles?.student_id || "No student ID"}</p>
                    <p className="mt-2">{application.cover_letter}</p>
                  </div>
                  <span className="badge">{application.status}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="btn btn-secondary" onClick={() => handleApplicationStatus(application, "shortlisted")}>Shortlist</button>
                  <button className="btn" onClick={() => handleApplicationStatus(application, "accepted")}>Accept</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="card">
          <Header icon={Trophy} title="Campus Career Ranking" />
          <div className="grid gap-3 mt-4">
            {leaderboard.length === 0 && <p className="muted">Refresh your reputation to start the campus ranking.</p>}
            {leaderboard.map((row, index) => (
              <div key={row.user_id} className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <p className="font-black">#{index + 1} {row.profiles?.full_name || "Student"}</p>
                  <p className="muted text-sm">{row.profiles?.student_id || "No student ID"}</p>
                </div>
                <span className="badge">{row.total_score} pts</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Header({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={18} />
      <h2 className="font-black">{title}</h2>
    </div>
  );
}

function Stat({ icon: Icon, title, value }) {
  return (
    <div className="card">
      <Icon size={18} />
      <p className="muted text-sm mt-3">{title}</p>
      <p className="text-2xl font-black mt-1">{value}</p>
    </div>
  );
}

function MiniStat({ title, value }) {
  return (
    <div className="rounded-lg border border-white/10 p-3">
      <p className="muted text-xs">{title}</p>
      <p className="text-xl font-black mt-1">{value}</p>
    </div>
  );
}
