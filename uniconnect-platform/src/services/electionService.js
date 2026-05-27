import { supabase } from "./supabase";

export async function fetchElections(universityId) {
  return supabase
    .from("elections")
    .select("*")
    .eq("university_id", universityId)
    .order("created_at", { ascending: false });
}

export async function createElection(payload) {
  return supabase.from("elections").insert(payload).select().single();
}

export async function updateElection(id, payload) {
  return supabase.from("elections").update(payload).eq("id", id).select().single();
}

export async function fetchPositions(electionId) {
  return supabase
    .from("election_positions")
    .select("*")
    .eq("election_id", electionId)
    .order("created_at", { ascending: true });
}

export async function createPosition(payload) {
  return supabase.from("election_positions").insert(payload).select().single();
}

export async function fetchCandidates(electionId) {
  return supabase
    .from("candidates")
    .select("*, profiles:profile_id(full_name, student_id, avatar_url)")
    .eq("election_id", electionId)
    .order("created_at", { ascending: true });
}

export async function registerCandidate(payload) {
  return supabase.from("candidates").insert(payload).select().single();
}

export async function updateCandidate(id, payload) {
  return supabase.from("candidates").update(payload).eq("id", id).select().single();
}

export async function fetchVotes(electionId) {
  return supabase
    .from("votes")
    .select("candidate_id, position, voter_id")
    .eq("election_id", electionId);
}

export async function castVote(payload) {
  return supabase.from("votes").insert(payload).select().single();
}

export async function fetchPetitions(electionId) {
  return supabase
    .from("election_petitions")
    .select("*, profiles:petitioner_id(full_name)")
    .eq("election_id", electionId)
    .order("created_at", { ascending: false });
}

export async function createPetition(payload) {
  return supabase.from("election_petitions").insert(payload).select().single();
}

export async function updatePetition(id, payload) {
  return supabase.from("election_petitions").update(payload).eq("id", id).select().single();
}

export async function fetchManifestos(candidateIds) {
  if (!candidateIds?.length) return { data: [], error: null };
  return supabase
    .from("manifestos")
    .select("*")
    .in("candidate_id", candidateIds)
    .order("created_at", { ascending: false });
}

export async function createManifesto(payload) {
  return supabase.from("manifestos").insert(payload).select().single();
}

export async function fetchDebates(electionId) {
  return supabase
    .from("debate_sessions")
    .select("*")
    .eq("election_id", electionId)
    .order("debate_date", { ascending: true });
}

export async function createDebate(payload) {
  return supabase.from("debate_sessions").insert(payload).select().single();
}

export async function fetchPolls(electionId) {
  return supabase
    .from("polls")
    .select("*")
    .eq("election_id", electionId)
    .order("created_at", { ascending: false });
}

export async function createPoll(payload) {
  return supabase.from("polls").insert(payload).select().single();
}

export async function createPollOption(payload) {
  return supabase.from("poll_options").insert(payload).select().single();
}

export async function fetchPollOptions(pollIds) {
  if (!pollIds?.length) return { data: [], error: null };
  return supabase
    .from("poll_options")
    .select("*")
    .in("poll_id", pollIds)
    .order("created_at", { ascending: true });
}

export async function fetchPollVotes(pollIds) {
  if (!pollIds?.length) return { data: [], error: null };
  return supabase
    .from("poll_votes")
    .select("*")
    .in("poll_id", pollIds);
}

export async function castPollVote(payload) {
  return supabase.from("poll_votes").insert(payload).select().single();
}

export async function fetchElectionVoters(electionId) {
  return supabase
    .from("election_voters")
    .select("*, profiles:voter_id(full_name, student_id, verification_status)")
    .eq("election_id", electionId)
    .order("created_at", { ascending: false });
}

export async function addElectionVoter(payload) {
  return supabase.from("election_voters").insert(payload).select().single();
}

export async function updateElectionVoter(id, payload) {
  return supabase.from("election_voters").update(payload).eq("id", id).select().single();
}

export async function fetchCampusProfiles(universityId) {
  return supabase
    .from("profiles")
    .select("id, full_name, student_id, verification_status")
    .eq("university_id", universityId)
    .order("full_name", { ascending: true });
}

export async function fetchAuditLogs(universityId) {
  return supabase
    .from("audit_logs")
    .select("*, profiles:actor_id(full_name)")
    .eq("university_id", universityId)
    .order("created_at", { ascending: false })
    .limit(50);
}

export function subscribeElectionChanges(electionId, onChange) {
  if (!electionId) return null;

  const channel = supabase
    .channel(`election-live-${electionId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: `election_id=eq.${electionId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "candidates", filter: `election_id=eq.${electionId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "election_petitions", filter: `election_id=eq.${electionId}` }, onChange)
    .subscribe();

  return channel;
}
