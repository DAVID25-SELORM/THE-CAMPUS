import { supabase } from "./supabase";

export async function fetchInternships(universityId) {
  let query = supabase
    .from("internships")
    .select("*, companies(name, website, verified)")
    .order("created_at", { ascending: false });

  if (universityId) query = query.eq("university_id", universityId);
  return query;
}

export async function createInternship(payload) {
  return supabase.from("internships").insert(payload).select().single();
}

export async function fetchCompanies(universityId) {
  let query = supabase.from("companies").select("*").order("created_at", { ascending: false });
  if (universityId) query = query.eq("university_id", universityId);
  return query;
}

export async function createCompany(payload) {
  return supabase.from("companies").insert(payload).select().single();
}

export async function fetchRecruiterProfile(userId) {
  return supabase
    .from("recruiter_profiles")
    .select("*, companies(name, website, verified)")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function createRecruiterProfile(payload) {
  return supabase.from("recruiter_profiles").insert(payload).select().single();
}

export async function applyForInternship(payload) {
  return supabase.from("job_applications").insert(payload).select().single();
}

export async function fetchApplications(userId) {
  return supabase
    .from("job_applications")
    .select("*, internships(title, companies(name))")
    .eq("applicant_id", userId)
    .order("created_at", { ascending: false });
}

export async function fetchRecruiterApplications(companyId) {
  if (!companyId) return { data: [], error: null };
  return supabase
    .from("job_applications")
    .select("*, profiles:applicant_id(full_name, student_id, verification_status), internships!inner(title, company_id)")
    .eq("internships.company_id", companyId)
    .order("created_at", { ascending: false });
}

export async function updateApplicationStatus(id, status) {
  return supabase.from("job_applications").update({ status }).eq("id", id).select().single();
}

export async function createPortfolio(payload) {
  return supabase.from("portfolios").insert(payload).select().single();
}

export async function fetchPortfolios(userId) {
  return supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function saveResumeProfile(payload) {
  return supabase
    .from("resume_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();
}

export async function fetchResumeProfile(userId) {
  return supabase
    .from("resume_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function saveAiStudySession(payload) {
  return supabase.from("ai_study_sessions").insert(payload).select().single();
}

export async function fetchAiStudySessions(userId) {
  return supabase
    .from("ai_study_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function fetchSkills() {
  return supabase.from("skills").select("*").order("name", { ascending: true });
}

export async function addProfileSkill(payload) {
  return supabase.from("profile_skills").insert(payload).select().single();
}

export async function fetchProfileSkills(userId) {
  return supabase
    .from("profile_skills")
    .select("*, skills(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function endorseSkill(payload) {
  return supabase.from("skill_endorsements").insert(payload).select().single();
}

export async function fetchSkillEndorsements(userId) {
  return supabase
    .from("skill_endorsements")
    .select("*, skills(name), profiles:endorser_id(full_name)")
    .eq("endorsed_user_id", userId)
    .order("created_at", { ascending: false });
}

export async function fetchCampusCareerReputation(universityId) {
  return supabase
    .from("career_reputation")
    .select("*, profiles:user_id(full_name, student_id, avatar_url)")
    .eq("university_id", universityId)
    .order("total_score", { ascending: false })
    .limit(20);
}

export async function upsertCareerReputation(payload) {
  return supabase.from("career_reputation").upsert(payload, { onConflict: "user_id" }).select().single();
}

export function generateAiCareerResponse(mode, input, resume = {}) {
  if (mode === "summary") {
    return `AI Note Summary:

Core idea:
${input}

Summary:
- Identify the main concept and define it in simple language.
- Pull out supporting facts, formulas, names, or dates.
- Convert long paragraphs into short revision bullets.
- End with 3 questions you should be able to answer without notes.`;
  }

  if (mode === "quiz") {
    return `AI Quiz Generator:

Topic: ${input}

1. What is the central idea of this topic?
2. List two practical examples.
3. Explain one common mistake students make.
4. How would you apply this in a real campus or workplace situation?
5. Write a 60-second summary from memory.`;
  }

  if (mode === "flashcards") {
    return `AI Flashcards:

Front: What is the topic?
Back: ${input}

Front: Why does it matter?
Back: It helps connect theory with practice.

Front: How should I revise it?
Back: Use examples, short notes, and active recall.`;
  }

  if (mode === "mock_interview") {
    return `Mock Interview:

Role/Area: ${input}

1. Tell me about yourself and your interest in this field.
2. Describe a project or class experience that proves your ability.
3. What problem did you face, and how did you solve it?
4. Why should a recruiter choose you?
5. What are you currently learning to improve?`;
  }

  if (mode === "resume") {
    return `Resume Optimization:

Headline:
${resume.headline || "Student professional ready for internships and entry-level opportunities"}

Optimized Summary:
${resume.summary || input}

Suggestions:
- Start each experience bullet with an action verb.
- Add measurable results where possible.
- Put strongest projects near the top.
- Match keywords from the internship description.
- Keep the summary short, confident, and specific.`;
  }

  return `AI Study Assistant Response:

Topic: ${input}

Suggested Study Plan:
1. Break the topic into 3-5 core concepts.
2. Review lecture notes and trusted examples.
3. Create short flashcards for definitions and formulas.
4. Practice two real questions or case studies.
5. Teach the topic back in your own words.

Campus Tip:
Save this session and convert the strongest points into your academic resource notes.`;
}

export function generateStudyPlan(topic) {
  return generateAiCareerResponse("study_plan", topic);
}
