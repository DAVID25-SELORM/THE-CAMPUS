import React, { useEffect, useMemo, useState } from "react";
import EmptyState from "../../components/EmptyState";
import { SearchableSelect } from "../../components/SearchableSelect";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../services/supabase";
import {
  addElectionVoter,
  castPollVote,
  castVote,
  createDebate,
  createElection,
  createManifesto,
  createPetition,
  createPoll,
  createPollOption,
  createPosition,
  fetchAuditLogs,
  fetchCampusProfiles,
  fetchCandidates,
  fetchDebates,
  fetchElectionVoters,
  fetchElections,
  fetchManifestos,
  fetchPetitions,
  fetchPollOptions,
  fetchPolls,
  fetchPollVotes,
  fetchPositions,
  fetchVotes,
  registerCandidate,
  subscribeElectionChanges,
  updateElection,
  updateElectionVoter,
  updatePetition
} from "../../services/electionService";
import { isProfileVerified } from "../../utils/profileStatus";

const initialElection = {
  title: "",
  description: "",
  election_type: "SRC",
  status: "draft",
  starts_at: "",
  ends_at: ""
};

const initialCandidate = {
  position: "",
  campaign_slogan: "",
  manifesto: ""
};

const tabs = ["Ballot", "Manifestos", "Debates", "Polls", "Admin"];

export default function Elections() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("Ballot");
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [votes, setVotes] = useState([]);
  const [petitions, setPetitions] = useState([]);
  const [manifestos, setManifestos] = useState([]);
  const [debates, setDebates] = useState([]);
  const [polls, setPolls] = useState([]);
  const [pollOptions, setPollOptions] = useState([]);
  const [pollVotes, setPollVotes] = useState([]);
  const [electionVoters, setElectionVoters] = useState([]);
  const [campusProfiles, setCampusProfiles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [electionForm, setElectionForm] = useState(initialElection);
  const [positionTitle, setPositionTitle] = useState("");
  const [candidateForm, setCandidateForm] = useState(initialCandidate);
  const [petitionForm, setPetitionForm] = useState({ title: "", details: "" });
  const [manifestoForm, setManifestoForm] = useState({ title: "", content: "" });
  const [debateForm, setDebateForm] = useState({ title: "", description: "", debate_date: "", meeting_link: "" });
  const [pollForm, setPollForm] = useState({ question: "", options: "Yes, No", closes_at: "" });
  const [voterProfileId, setVoterProfileId] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = ["super_admin", "university_admin"].includes(profile?.role);
  const selectedElection = elections.find(election => election.id === selectedElectionId) || elections[0] || null;
  const verifiedProfile = isProfileVerified(profile);
  const myCandidate = candidates.find(candidate => candidate.profile_id === user?.id);
  const myRegistry = electionVoters.find(voter => voter.voter_id === user?.id);
  const registryIsRequired = electionVoters.length > 0;
  const voterIsCleared = verifiedProfile && (!registryIsRequired || myRegistry?.verified);

  async function loadElections() {
    if (!profile?.university_id) return;
    const { data, error } = await fetchElections(profile.university_id);
    if (error) return alert(error.message);

    const nextElections = data || [];
    setElections(nextElections);
    setSelectedElectionId(current => current || nextElections[0]?.id || null);
  }

  async function loadElectionDetails(electionId) {
    if (!electionId) {
      setPositions([]);
      setCandidates([]);
      setVotes([]);
      setPetitions([]);
      setManifestos([]);
      setDebates([]);
      setPolls([]);
      setPollOptions([]);
      setPollVotes([]);
      setElectionVoters([]);
      return;
    }

    setLoading(true);
    const [
      { data: positionRows, error: positionError },
      { data: candidateRows, error: candidateError },
      { data: voteRows, error: voteError },
      { data: petitionRows, error: petitionError },
      { data: debateRows, error: debateError },
      { data: pollRows, error: pollError },
      { data: voterRows, error: voterError }
    ] = await Promise.all([
      fetchPositions(electionId),
      fetchCandidates(electionId),
      fetchVotes(electionId),
      fetchPetitions(electionId),
      fetchDebates(electionId),
      fetchPolls(electionId),
      fetchElectionVoters(electionId)
    ]);

    const error = positionError || candidateError || voteError || petitionError || debateError || pollError || voterError;
    if (error) {
      setLoading(false);
      return alert(error.message);
    }

    const nextCandidates = candidateRows || [];
    const nextPolls = pollRows || [];
    const [{ data: manifestoRows }, { data: optionRows }, { data: pollVoteRows }] = await Promise.all([
      fetchManifestos(nextCandidates.map(candidate => candidate.id)),
      fetchPollOptions(nextPolls.map(poll => poll.id)),
      fetchPollVotes(nextPolls.map(poll => poll.id))
    ]);

    setPositions(positionRows || []);
    setCandidates(nextCandidates);
    setVotes(voteRows || []);
    setPetitions(petitionRows || []);
    setDebates(debateRows || []);
    setPolls(nextPolls);
    setElectionVoters(voterRows || []);
    setManifestos(manifestoRows || []);
    setPollOptions(optionRows || []);
    setPollVotes(pollVoteRows || []);
    setLoading(false);
  }

  async function loadAdminData() {
    if (!profile?.university_id || !isAdmin) return;
    const [{ data: profileRows }, { data: auditRows }] = await Promise.all([
      fetchCampusProfiles(profile.university_id),
      fetchAuditLogs(profile.university_id)
    ]);
    setCampusProfiles(profileRows || []);
    setAuditLogs(auditRows || []);
  }

  useEffect(() => {
    loadElections();
  }, [profile?.university_id]);

  useEffect(() => {
    loadElectionDetails(selectedElection?.id);
  }, [selectedElection?.id]);

  useEffect(() => {
    loadAdminData();
  }, [profile?.university_id, isAdmin]);

  useEffect(() => {
    if (!selectedElection?.id) return undefined;

    const channel = subscribeElectionChanges(selectedElection.id, () => {
      loadElectionDetails(selectedElection.id);
      loadAdminData();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [selectedElection?.id]);

  useEffect(() => {
    if (!candidateForm.position && positions[0]?.title) {
      setCandidateForm(form => ({ ...form, position: positions[0].title }));
    }
  }, [positions, candidateForm.position]);

  const results = useMemo(() => {
    const totals = votes.reduce((acc, vote) => {
      acc[vote.candidate_id] = (acc[vote.candidate_id] || 0) + 1;
      return acc;
    }, {});

    return candidates
      .map(candidate => ({ ...candidate, vote_count: totals[candidate.id] || 0 }))
      .sort((a, b) => b.vote_count - a.vote_count);
  }, [candidates, votes]);

  const votedPositions = useMemo(() => {
    return new Set(votes.filter(vote => vote.voter_id === user?.id).map(vote => vote.position));
  }, [votes, user?.id]);

  const turnout = useMemo(() => {
    const eligible = electionVoters.length || campusProfiles.filter(row => isProfileVerified(row)).length || 0;
    const uniqueVoters = new Set(votes.map(vote => vote.voter_id)).size;
    return {
      eligible,
      voted: uniqueVoters,
      percent: eligible ? Math.round((uniqueVoters / eligible) * 100) : 0
    };
  }, [campusProfiles, electionVoters, votes]);

  const pollResults = useMemo(() => {
    return pollVotes.reduce((acc, vote) => {
      acc[vote.option_id] = (acc[vote.option_id] || 0) + 1;
      return acc;
    }, {});
  }, [pollVotes]);

  async function submitElection(e) {
    e.preventDefault();
    if (!profile?.university_id) return;

    const { data, error } = await createElection({
      ...electionForm,
      starts_at: electionForm.starts_at || null,
      ends_at: electionForm.ends_at || null,
      university_id: profile.university_id,
      created_by: user.id
    });

    if (error) return alert(error.message);

    setElectionForm(initialElection);
    await loadElections();
    setSelectedElectionId(data?.id || null);
  }

  async function submitPosition(e) {
    e.preventDefault();
    if (!selectedElection?.id || !positionTitle.trim()) return;

    const { error } = await createPosition({
      election_id: selectedElection.id,
      title: positionTitle.trim(),
      max_votes: 1
    });

    if (error) return alert(error.message);
    setPositionTitle("");
    loadElectionDetails(selectedElection.id);
  }

  async function submitCandidate(e) {
    e.preventDefault();
    if (!selectedElection?.id) return;

    const { error } = await registerCandidate({
      ...candidateForm,
      election_id: selectedElection.id,
      profile_id: user.id
    });

    if (error) return alert(error.message);
    setCandidateForm({ ...initialCandidate, position: positions[0]?.title || "" });
    loadElectionDetails(selectedElection.id);
  }

  async function submitVote(candidate) {
    if (!selectedElection?.id) return;
    if (!voterIsCleared) return alert("Your profile must be verified and cleared for this election before voting.");

    const { error } = await castVote({
      election_id: selectedElection.id,
      voter_id: user.id,
      candidate_id: candidate.id,
      position: candidate.position
    });

    if (error) return alert(error.message);
    loadElectionDetails(selectedElection.id);
  }

  async function submitPetition(e) {
    e.preventDefault();
    if (!selectedElection?.id) return;

    const { error } = await createPetition({
      ...petitionForm,
      election_id: selectedElection.id,
      petitioner_id: user.id
    });

    if (error) return alert(error.message);
    setPetitionForm({ title: "", details: "" });
    loadElectionDetails(selectedElection.id);
  }

  async function submitManifesto(e) {
    e.preventDefault();
    if (!myCandidate?.id) return alert("Register as a candidate before adding a manifesto.");

    const { error } = await createManifesto({
      candidate_id: myCandidate.id,
      title: manifestoForm.title,
      content: manifestoForm.content
    });

    if (error) return alert(error.message);
    setManifestoForm({ title: "", content: "" });
    loadElectionDetails(selectedElection.id);
  }

  async function submitDebate(e) {
    e.preventDefault();
    if (!selectedElection?.id) return;

    const { error } = await createDebate({
      ...debateForm,
      debate_date: debateForm.debate_date || null,
      election_id: selectedElection.id,
      created_by: user.id
    });

    if (error) return alert(error.message);
    setDebateForm({ title: "", description: "", debate_date: "", meeting_link: "" });
    loadElectionDetails(selectedElection.id);
  }

  async function submitPoll(e) {
    e.preventDefault();
    if (!selectedElection?.id || !profile?.university_id) return;

    const optionLabels = pollForm.options.split(",").map(option => option.trim()).filter(Boolean);
    if (optionLabels.length < 2) return alert("Add at least two poll options.");

    const { data, error } = await createPoll({
      question: pollForm.question,
      closes_at: pollForm.closes_at || null,
      university_id: profile.university_id,
      election_id: selectedElection.id,
      created_by: user.id,
      status: "open"
    });

    if (error) return alert(error.message);

    await Promise.all(optionLabels.map(label => createPollOption({ poll_id: data.id, label })));
    setPollForm({ question: "", options: "Yes, No", closes_at: "" });
    loadElectionDetails(selectedElection.id);
  }

  async function submitPollVote(poll, option) {
    const { error } = await castPollVote({
      poll_id: poll.id,
      option_id: option.id,
      voter_id: user.id
    });

    if (error) return alert(error.message);
    loadElectionDetails(selectedElection.id);
  }

  async function submitElectionVoter(e) {
    e.preventDefault();
    if (!selectedElection?.id || !voterProfileId) return;

    const { error } = await addElectionVoter({
      election_id: selectedElection.id,
      voter_id: voterProfileId,
      verified: true,
      has_voted: false
    });

    if (error) return alert(error.message);
    setVoterProfileId("");
    loadElectionDetails(selectedElection.id);
  }

  async function toggleVoter(voter) {
    const { error } = await updateElectionVoter(voter.id, { verified: !voter.verified });
    if (error) return alert(error.message);
    loadElectionDetails(selectedElection.id);
  }

  async function setPetitionStatus(petition, status) {
    const { error } = await updatePetition(petition.id, { status });
    if (error) return alert(error.message);
    loadElectionDetails(selectedElection.id);
  }

  async function changeStatus(status) {
    if (!selectedElection?.id) return;
    const { error } = await updateElection(selectedElection.id, { status });
    if (error) return alert(error.message);
    loadElections();
  }

  if (!profile?.university_id) {
    return (
      <EmptyState
        title="Verify your student profile"
        message="Choose your university before joining campus elections."
      />
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-black">Elections & Governance</h1>
      <p className="muted mt-2">
        Official campus elections with verified voting, manifestos, debates, live results, polling, petitions, and audit logs.
      </p>

      {isAdmin && (
        <form onSubmit={submitElection} className="card mt-6 grid md:grid-cols-3 gap-3">
          <input className="input" placeholder="Election title" value={electionForm.title} onChange={e => setElectionForm({ ...electionForm, title: e.target.value })} required />
          <select className="input" value={electionForm.election_type} onChange={e => setElectionForm({ ...electionForm, election_type: e.target.value })}>
            <option>SRC</option>
            <option>Department</option>
            <option>Faculty</option>
            <option>Association</option>
            <option>Fellowship</option>
          </select>
          <select className="input" value={electionForm.status} onChange={e => setElectionForm({ ...electionForm, status: e.target.value })}>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          <input className="input" type="datetime-local" value={electionForm.starts_at} onChange={e => setElectionForm({ ...electionForm, starts_at: e.target.value })} />
          <input className="input" type="datetime-local" value={electionForm.ends_at} onChange={e => setElectionForm({ ...electionForm, ends_at: e.target.value })} />
          <input className="input" placeholder="Description" value={electionForm.description} onChange={e => setElectionForm({ ...electionForm, description: e.target.value })} />
          <button className="btn md:col-span-3">Create Election</button>
        </form>
      )}

      <div className="grid lg:grid-cols-[320px_1fr] gap-5 mt-6">
        <aside className="grid gap-3 content-start">
          {elections.length === 0 && <EmptyState title="No elections yet" message="Admins can create the first campus election." />}

          {elections.map(election => (
            <button
              key={election.id}
              onClick={() => setSelectedElectionId(election.id)}
              className={`card text-left transition ${selectedElection?.id === election.id ? "ring-2 ring-cyan-300" : "hover:bg-white/10"}`}
            >
              <span className="badge">{election.status}</span>
              <h2 className="text-lg font-black mt-3">{election.title}</h2>
              <p className="muted text-sm mt-2">{election.election_type || "General"}</p>
            </button>
          ))}
        </aside>

        {selectedElection && (
          <section className="space-y-5">
            <div className="card">
              <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="badge">{selectedElection.status}</span>
                    <span className="badge">{selectedElection.election_type || "General"}</span>
                    <span className="badge">{voterIsCleared ? "Cleared voter" : "Verification needed"}</span>
                  </div>
                  <h2 className="text-2xl font-black mt-3">{selectedElection.title}</h2>
                  <p className="muted mt-2">{selectedElection.description || "No description yet."}</p>
                  <p className="muted text-sm mt-3">
                    {candidates.length} candidates / {votes.length} votes / {turnout.percent}% turnout / {petitions.length} petitions
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={() => changeStatus("draft")}>Draft</button>
                    <button className="btn" onClick={() => changeStatus("open")}>Open</button>
                    <button className="btn btn-secondary" onClick={() => changeStatus("closed")}>Close</button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 overflow-auto pb-1">
              {tabs.filter(tab => tab !== "Admin" || isAdmin).map(tab => (
                <button key={tab} className={`btn ${activeTab === tab ? "" : "btn-secondary"}`} onClick={() => setActiveTab(tab)}>
                  {tab}
                </button>
              ))}
            </div>

            {loading && <p className="muted">Loading election data...</p>}

            {activeTab === "Ballot" && (
              <BallotTab
                isAdmin={isAdmin}
                positions={positions}
                positionTitle={positionTitle}
                setPositionTitle={setPositionTitle}
                submitPosition={submitPosition}
                candidateForm={candidateForm}
                setCandidateForm={setCandidateForm}
                submitCandidate={submitCandidate}
                results={results}
                selectedElection={selectedElection}
                votedPositions={votedPositions}
                voterIsCleared={voterIsCleared}
                submitVote={submitVote}
              />
            )}

            {activeTab === "Manifestos" && (
              <ManifestoTab
                myCandidate={myCandidate}
                manifestoForm={manifestoForm}
                setManifestoForm={setManifestoForm}
                submitManifesto={submitManifesto}
                manifestos={manifestos}
                candidates={candidates}
              />
            )}

            {activeTab === "Debates" && (
              <DebateTab
                isAdmin={isAdmin}
                debates={debates}
                debateForm={debateForm}
                setDebateForm={setDebateForm}
                submitDebate={submitDebate}
              />
            )}

            {activeTab === "Polls" && (
              <PollTab
                isAdmin={isAdmin}
                polls={polls}
                pollForm={pollForm}
                setPollForm={setPollForm}
                submitPoll={submitPoll}
                pollOptions={pollOptions}
                pollVotes={pollVotes}
                pollResults={pollResults}
                submitPollVote={submitPollVote}
                userId={user?.id}
              />
            )}

            {activeTab === "Admin" && isAdmin && (
              <AdminTab
                turnout={turnout}
                campusProfiles={campusProfiles}
                electionVoters={electionVoters}
                voterProfileId={voterProfileId}
                setVoterProfileId={setVoterProfileId}
                submitElectionVoter={submitElectionVoter}
                toggleVoter={toggleVoter}
                petitions={petitions}
                setPetitionStatus={setPetitionStatus}
                auditLogs={auditLogs}
              />
            )}

            <form onSubmit={submitPetition} className="card grid md:grid-cols-[1fr_2fr_auto] gap-3">
              <input className="input" placeholder="Petition title" value={petitionForm.title} onChange={e => setPetitionForm({ ...petitionForm, title: e.target.value })} required />
              <input className="input" placeholder="Petition details" value={petitionForm.details} onChange={e => setPetitionForm({ ...petitionForm, details: e.target.value })} required />
              <button className="btn">Submit Petition</button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}

function BallotTab({ isAdmin, positions, positionTitle, setPositionTitle, submitPosition, candidateForm, setCandidateForm, submitCandidate, results, selectedElection, votedPositions, voterIsCleared, submitVote }) {
  return (
    <div className="space-y-5">
      {isAdmin && (
        <form onSubmit={submitPosition} className="card grid md:grid-cols-[1fr_auto] gap-3">
          <input className="input" placeholder="Add position, e.g. SRC President" value={positionTitle} onChange={e => setPositionTitle(e.target.value)} />
          <button className="btn">Add Position</button>
        </form>
      )}

      <form onSubmit={submitCandidate} className="card grid md:grid-cols-3 gap-3">
        <SearchableSelect
          id="candidate-position"
          placeholder="Type or choose position"
          value={candidateForm.position}
          options={positions.map(position => ({ value: position.title, label: position.title }))}
          onChange={value => setCandidateForm({ ...candidateForm, position: value })}
          required
        />
        <input className="input" placeholder="Campaign slogan" value={candidateForm.campaign_slogan} onChange={e => setCandidateForm({ ...candidateForm, campaign_slogan: e.target.value })} />
        <input className="input" placeholder="Short manifesto" value={candidateForm.manifesto} onChange={e => setCandidateForm({ ...candidateForm, manifesto: e.target.value })} />
        <button className="btn md:col-span-3" disabled={positions.length === 0}>Register as Candidate</button>
      </form>

      <div className="grid gap-4">
        {results.length === 0 && <EmptyState title="No candidates yet" message="Add positions, then students can register as candidates." />}
        {results.map(candidate => (
          <div className="card" key={candidate.id}>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <span className="badge">{candidate.position}</span>
                <h3 className="text-xl font-black mt-3">{candidate.profiles?.full_name || "Campus candidate"}</h3>
                <p className="muted mt-2">{candidate.campaign_slogan || candidate.manifesto || "Manifesto coming soon."}</p>
                <p className="mt-3 font-black">{candidate.vote_count} live votes</p>
              </div>
              <button className="btn" disabled={selectedElection.status !== "open" || votedPositions.has(candidate.position) || !voterIsCleared} onClick={() => submitVote(candidate)}>
                {votedPositions.has(candidate.position) ? "Voted" : "Vote"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManifestoTab({ myCandidate, manifestoForm, setManifestoForm, submitManifesto, manifestos, candidates }) {
  const byCandidate = Object.fromEntries(candidates.map(candidate => [candidate.id, candidate]));

  return (
    <div className="space-y-5">
      <form onSubmit={submitManifesto} className="card grid gap-3">
        <h3 className="font-black">Candidate Manifesto Editor</h3>
        <input className="input" placeholder="Manifesto title" value={manifestoForm.title} onChange={e => setManifestoForm({ ...manifestoForm, title: e.target.value })} required />
        <textarea className="input min-h-32" placeholder={myCandidate ? "Write your full manifesto" : "Register as a candidate before publishing a manifesto"} value={manifestoForm.content} onChange={e => setManifestoForm({ ...manifestoForm, content: e.target.value })} required disabled={!myCandidate} />
        <button className="btn" disabled={!myCandidate}>Publish Manifesto</button>
      </form>

      <div className="grid gap-4">
        {manifestos.length === 0 && <EmptyState title="No full manifestos yet" message="Candidate manifesto pages will appear here." />}
        {manifestos.map(manifesto => (
          <article className="card" key={manifesto.id}>
            <span className="badge">{byCandidate[manifesto.candidate_id]?.position || "Candidate"}</span>
            <h3 className="text-xl font-black mt-3">{manifesto.title}</h3>
            <p className="muted mt-2">{byCandidate[manifesto.candidate_id]?.profiles?.full_name || "Campus candidate"}</p>
            <p className="mt-4 whitespace-pre-wrap">{manifesto.content}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function DebateTab({ isAdmin, debates, debateForm, setDebateForm, submitDebate }) {
  return (
    <div className="space-y-5">
      {isAdmin && (
        <form onSubmit={submitDebate} className="card grid md:grid-cols-2 gap-3">
          <input className="input" placeholder="Debate title" value={debateForm.title} onChange={e => setDebateForm({ ...debateForm, title: e.target.value })} required />
          <input className="input" type="datetime-local" value={debateForm.debate_date} onChange={e => setDebateForm({ ...debateForm, debate_date: e.target.value })} />
          <input className="input" placeholder="Meeting or stream link" value={debateForm.meeting_link} onChange={e => setDebateForm({ ...debateForm, meeting_link: e.target.value })} />
          <input className="input" placeholder="Description" value={debateForm.description} onChange={e => setDebateForm({ ...debateForm, description: e.target.value })} />
          <button className="btn md:col-span-2">Schedule Debate</button>
        </form>
      )}

      <div className="grid gap-4">
        {debates.length === 0 && <EmptyState title="No debate sessions" message="Election debate pages and livestream links will appear here." />}
        {debates.map(debate => (
          <div className="card" key={debate.id}>
            <h3 className="text-xl font-black">{debate.title}</h3>
            <p className="muted mt-2">{debate.description || "No description."}</p>
            <p className="badge mt-3">{debate.debate_date ? new Date(debate.debate_date).toLocaleString() : "Date pending"}</p>
            {debate.meeting_link && <a className="btn mt-4 inline-flex" href={debate.meeting_link} target="_blank" rel="noreferrer">Open Debate</a>}
          </div>
        ))}
      </div>
    </div>
  );
}

function PollTab({ isAdmin, polls, pollForm, setPollForm, submitPoll, pollOptions, pollVotes, pollResults, submitPollVote, userId }) {
  return (
    <div className="space-y-5">
      {isAdmin && (
        <form onSubmit={submitPoll} className="card grid md:grid-cols-3 gap-3">
          <input className="input" placeholder="Poll question" value={pollForm.question} onChange={e => setPollForm({ ...pollForm, question: e.target.value })} required />
          <input className="input" placeholder="Options separated by commas" value={pollForm.options} onChange={e => setPollForm({ ...pollForm, options: e.target.value })} required />
          <input className="input" type="datetime-local" value={pollForm.closes_at} onChange={e => setPollForm({ ...pollForm, closes_at: e.target.value })} />
          <button className="btn md:col-span-3">Create Poll</button>
        </form>
      )}

      <div className="grid gap-4">
        {polls.length === 0 && <EmptyState title="No polls yet" message="Admins can run quick election polls here." />}
        {polls.map(poll => {
          const options = pollOptions.filter(option => option.poll_id === poll.id);
          const userVote = pollVotes.find(vote => vote.poll_id === poll.id && vote.voter_id === userId);
          const total = options.reduce((sum, option) => sum + (pollResults[option.id] || 0), 0);

          return (
            <div className="card" key={poll.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-black">{poll.question}</h3>
                <span className="badge">{poll.status}</span>
              </div>
              <div className="grid gap-3 mt-4">
                {options.map(option => {
                  const count = pollResults[option.id] || 0;
                  const percent = total ? Math.round((count / total) * 100) : 0;
                  return (
                    <button key={option.id} className="card text-left hover:bg-white/10" disabled={Boolean(userVote) || poll.status !== "open"} onClick={() => submitPollVote(poll, option)}>
                      <div className="flex justify-between gap-3">
                        <span className="font-bold">{option.label}</span>
                        <span>{count} votes / {percent}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-cyan-300" style={{ width: `${percent}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminTab({ turnout, campusProfiles, electionVoters, voterProfileId, setVoterProfileId, submitElectionVoter, toggleVoter, petitions, setPetitionStatus, auditLogs }) {
  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-4 gap-3">
        <Stat title="Eligible voters" value={turnout.eligible} />
        <Stat title="Votes cast" value={turnout.voted} />
        <Stat title="Turnout" value={`${turnout.percent}%`} />
        <Stat title="Petitions" value={petitions.length} />
      </div>

      <form onSubmit={submitElectionVoter} className="card grid md:grid-cols-[1fr_auto] gap-3">
        <SearchableSelect
          id="election-voter"
          placeholder="Type or choose verified election voter"
          value={voterProfileId}
          options={campusProfiles.map(row => ({
            value: row.id,
            label: `${row.full_name} / ${row.student_id || "No ID"} / ${row.verification_status}`
          }))}
          onChange={setVoterProfileId}
          required
        />
        <button className="btn">Add Voter</button>
      </form>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="font-black">Voter Verification</h3>
          <div className="grid gap-3 mt-4">
            {electionVoters.length === 0 && <p className="muted">No restricted voter list yet. Verified students can vote until a voter list is added.</p>}
            {electionVoters.map(voter => (
              <div key={voter.id} className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <p className="font-bold">{voter.profiles?.full_name || "Student"}</p>
                  <p className="muted text-sm">{voter.profiles?.student_id || "No student ID"} / {voter.has_voted ? "Voted" : "Not voted"}</p>
                </div>
                <button className="btn btn-secondary" onClick={() => toggleVoter(voter)}>{voter.verified ? "Revoke" : "Verify"}</button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-black">Petitions</h3>
          <div className="grid gap-3 mt-4">
            {petitions.length === 0 && <p className="muted">No petitions submitted.</p>}
            {petitions.map(petition => (
              <div key={petition.id} className="border-b border-white/10 pb-3">
                <span className="badge">{petition.status}</span>
                <h4 className="font-black mt-2">{petition.title}</h4>
                <p className="muted mt-1">{petition.details}</p>
                <div className="flex gap-2 mt-3">
                  <button className="btn btn-secondary" onClick={() => setPetitionStatus(petition, "reviewing")}>Review</button>
                  <button className="btn" onClick={() => setPetitionStatus(petition, "resolved")}>Resolve</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-black">Governance Audit Logs</h3>
        <div className="grid gap-3 mt-4">
          {auditLogs.length === 0 && <p className="muted">No audit events yet.</p>}
          {auditLogs.map(log => (
            <div key={log.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <p className="font-bold">{log.action}</p>
                <p className="muted text-sm">{log.profiles?.full_name || "System"} / {log.target_type || "record"}</p>
              </div>
              <span className="badge">{new Date(log.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="card">
      <p className="muted text-sm">{title}</p>
      <p className="text-2xl font-black mt-2">{value}</p>
    </div>
  );
}
