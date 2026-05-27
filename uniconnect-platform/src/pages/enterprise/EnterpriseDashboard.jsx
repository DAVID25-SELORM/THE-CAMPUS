import React, { useEffect, useState } from "react";
import { BarChart3, BadgeDollarSign, Building2, CreditCard, Fingerprint, KeyRound, Megaphone, Palette, PiggyBank, Smartphone, Target, Users } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import {
  createAdCreative,
  createAdEvent,
  createFinancialSettlement,
  createNationalIdVerification,
  createSponsorCampaign,
  createSubscriptionPayment,
  fetchAdCreatives,
  fetchAdEvents,
  fetchAdPlacements,
  fetchApiClients,
  fetchFinancialSettlements,
  fetchNationalIdVerifications,
  fetchPlatformOverview,
  fetchSponsorCampaigns,
  fetchSubscriptionPlans,
  fetchSubscriptionPayments,
  fetchUniversitySubscription,
  fetchWhiteLabelSettings,
  saveWhiteLabelSettings
} from "../../services/enterpriseService";

const initialBrand = {
  portal_name: "",
  primary_color: "#00f5ff",
  secondary_color: "#8b5cf6",
  custom_domain: "",
  logo_url: ""
};

const initialCampaign = {
  sponsor_name: "",
  title: "",
  body: "",
  budget: "",
  status: "draft"
};

const initialPayment = {
  provider: "manual",
  amount: "",
  currency: "GHS"
};

const initialAd = {
  campaign_id: "",
  placement_id: "",
  title: "",
  body: "",
  image_url: "",
  target_url: "",
  status: "draft"
};

const initialSettlement = {
  settlement_type: "platform",
  provider: "manual",
  gross_amount: "",
  platform_fee: "",
  currency: "GHS"
};

export default function EnterpriseDashboard() {
  const { profile, user } = useAuth();
  const [overview, setOverview] = useState({});
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [apiClients, setApiClients] = useState([]);
  const [nationalIds, setNationalIds] = useState([]);
  const [payments, setPayments] = useState([]);
  const [adPlacements, setAdPlacements] = useState([]);
  const [adCreatives, setAdCreatives] = useState([]);
  const [adEvents, setAdEvents] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [brand, setBrand] = useState(initialBrand);
  const [campaign, setCampaign] = useState(initialCampaign);
  const [payment, setPayment] = useState(initialPayment);
  const [nationalIdRef, setNationalIdRef] = useState("");
  const [ad, setAd] = useState(initialAd);
  const [settlement, setSettlement] = useState(initialSettlement);
  const [message, setMessage] = useState("");

  async function load() {
    if (!profile?.university_id) return;

    const [overviewData, plansData, subscriptionData, brandData, campaignData, apiData, nationalIdData, paymentData, placementData, creativeData, adEventData, settlementData] = await Promise.all([
      fetchPlatformOverview(),
      fetchSubscriptionPlans(),
      fetchUniversitySubscription(profile.university_id),
      fetchWhiteLabelSettings(profile.university_id),
      fetchSponsorCampaigns(profile.university_id),
      fetchApiClients(profile.university_id),
      fetchNationalIdVerifications(profile.university_id),
      fetchSubscriptionPayments(profile.university_id),
      fetchAdPlacements(profile.university_id),
      fetchAdCreatives(),
      fetchAdEvents(profile.university_id),
      fetchFinancialSettlements(profile.university_id)
    ]);

    setOverview(overviewData);
    setPlans(plansData.data || []);
    setSubscription(subscriptionData.data || null);
    setCampaigns(campaignData.data || []);
    setApiClients(apiData.data || []);
    setNationalIds(nationalIdData.data || []);
    setPayments(paymentData.data || []);
    setAdPlacements(placementData.data || []);
    setAdCreatives(creativeData.data || []);
    setAdEvents(adEventData.data || []);
    setSettlements(settlementData.data || []);

    if (brandData.data) {
      setBrand({ ...initialBrand, ...brandData.data });
    } else {
      setBrand({
        ...initialBrand,
        portal_name: profile?.universities?.name || "Campus Portal"
      });
    }
  }

  useEffect(() => {
    load();
  }, [profile?.university_id]);

  async function handleBrand(e) {
    e.preventDefault();

    const { error } = await saveWhiteLabelSettings({
      ...brand,
      university_id: profile.university_id
    });

    if (error) return setMessage(error.message);
    setMessage("White-label settings saved.");
    load();
  }

  async function handleCampaign(e) {
    e.preventDefault();

    const { error } = await createSponsorCampaign({
      ...campaign,
      university_id: profile.university_id,
      budget: Number(campaign.budget || 0)
    });

    if (error) return setMessage(error.message);

    setCampaign(initialCampaign);
    setMessage("Sponsor campaign created.");
    load();
  }

  async function handleNationalId(e) {
    e.preventDefault();
    if (!nationalIdRef.trim()) return;

    const { error } = await createNationalIdVerification({
      user_id: user.id,
      university_id: profile.university_id,
      provider: "national_student_id",
      verification_reference: nationalIdRef.trim(),
      national_id_hash: `pending:${nationalIdRef.trim().slice(-4)}`,
      status: "pending"
    });

    if (error) return setMessage(error.message);
    setNationalIdRef("");
    setMessage("National student ID verification request created.");
    load();
  }

  async function handlePayment(e) {
    e.preventDefault();

    const { error } = await createSubscriptionPayment({
      university_id: profile.university_id,
      subscription_id: subscription?.id || null,
      provider: payment.provider,
      amount: Number(payment.amount || 0),
      currency: payment.currency,
      status: "pending"
    });

    if (error) return setMessage(error.message);
    setPayment(initialPayment);
    setMessage("Subscription payment intent recorded.");
    load();
  }

  async function handleAd(e) {
    e.preventDefault();

    const { error } = await createAdCreative(ad);
    if (error) return setMessage(error.message);
    setAd(initialAd);
    setMessage("Ad creative created.");
    load();
  }

  async function handleAdEvent(creative, eventType) {
    const { error } = await createAdEvent({
      creative_id: creative.id,
      university_id: profile.university_id,
      user_id: user.id,
      event_type: eventType,
      revenue: eventType === "click" ? 0.25 : 0.05
    });

    if (error) return setMessage(error.message);
    setMessage(`Ad ${eventType} recorded.`);
    load();
  }

  async function handleSettlement(e) {
    e.preventDefault();
    const gross = Number(settlement.gross_amount || 0);
    const fee = Number(settlement.platform_fee || 0);

    const { error } = await createFinancialSettlement({
      ...settlement,
      university_id: profile.university_id,
      gross_amount: gross,
      platform_fee: fee,
      net_amount: Math.max(gross - fee, 0),
      status: "pending"
    });

    if (error) return setMessage(error.message);
    setSettlement(initialSettlement);
    setMessage("Financial settlement recorded.");
    load();
  }

  return (
    <div>
      <h1 className="text-3xl font-black">Enterprise & National Expansion</h1>
      <p className="muted mt-2">
        Scale UniConnect across universities with subscriptions, analytics, white-label portals, sponsors, ambassadors, and APIs.
      </p>

      {message && <div className="card mt-4">{message}</div>}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
        <Stat title="Universities" value={overview.universities || 0} />
        <Stat title="Students" value={overview.students || 0} />
        <Stat title="Posts" value={overview.posts || 0} />
        <Stat title="Events" value={overview.events || 0} />
        <Stat title="Marketplace Items" value={overview.marketplace || 0} />
        <Stat title="Elections" value={overview.elections || 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mt-6">
        <section className="card">
          <Header icon={Smartphone} title="Mobile App Readiness" />
          <div className="grid gap-3 mt-4">
            <Readiness icon={Smartphone} title="PWA Manifest" message="Installable app metadata is configured for mobile homescreens." />
            <Readiness icon={KeyRound} title="Offline Shell" message="Service worker caches the app shell for fast repeat loads." />
          </div>
        </section>

        <form onSubmit={handleNationalId} className="card">
          <Header icon={Fingerprint} title="National Student ID" />
          <div className="grid gap-3 mt-4">
            <input className="input" placeholder="Verification reference" value={nationalIdRef} onChange={e => setNationalIdRef(e.target.value)} />
            <button className="btn">Create Verification Request</button>
          </div>
          <p className="muted mt-4">{nationalIds.length} verification records</p>
        </form>

        <form onSubmit={handlePayment} className="card">
          <Header icon={CreditCard} title="Subscription Payments" />
          <div className="grid gap-3 mt-4">
            <select className="input" value={payment.provider} onChange={e => setPayment({ ...payment, provider: e.target.value })}>
              <option value="manual">Manual</option>
              <option value="paystack">Paystack</option>
              <option value="hubtel">Hubtel</option>
              <option value="mtn_momo">MTN MoMo</option>
            </select>
            <input className="input" type="number" placeholder="Amount" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} />
            <button className="btn">Record Payment Intent</button>
          </div>
          <p className="muted mt-4">{payments.length} payment records</p>
        </form>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <section className="card">
          <Header icon={BadgeDollarSign} title="University Subscription" />
          <div className="rounded-lg border border-white/10 p-4 mt-4">
            <p className="muted text-sm">Current Plan</p>
            <h3 className="text-2xl font-black mt-2">{subscription?.subscription_plans?.name || "No active plan"}</h3>
            <p className="muted mt-2">Status: {subscription?.status || "not subscribed"}</p>
          </div>

          <div className="grid gap-3 mt-4">
            {plans.map(plan => (
              <div className="rounded-lg border border-white/10 p-4" key={plan.id}>
                <h3 className="font-black">{plan.name}</h3>
                <p className="muted mt-1">GHS {Number(plan.price || 0).toFixed(2)} / {plan.billing_cycle}</p>
                <p className="muted text-sm mt-2">Max students: {plan.max_students || "Unlimited"}</p>
              </div>
            ))}
          </div>
        </section>

        <form onSubmit={handleBrand} className="card">
          <Header icon={Palette} title="White-Label Portal" />
          <div className="grid gap-3 mt-4">
            <input className="input" placeholder="Portal name" value={brand.portal_name || ""} onChange={e => setBrand({ ...brand, portal_name: e.target.value })} />
            <input className="input" placeholder="Primary color" value={brand.primary_color || ""} onChange={e => setBrand({ ...brand, primary_color: e.target.value })} />
            <input className="input" placeholder="Secondary color" value={brand.secondary_color || ""} onChange={e => setBrand({ ...brand, secondary_color: e.target.value })} />
            <input className="input" placeholder="Custom domain e.g. connect.school.edu.gh" value={brand.custom_domain || ""} onChange={e => setBrand({ ...brand, custom_domain: e.target.value })} />
            <input className="input" placeholder="Logo URL" value={brand.logo_url || ""} onChange={e => setBrand({ ...brand, logo_url: e.target.value })} />
            <button className="btn">Save Branding</button>
          </div>
        </form>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <form onSubmit={handleCampaign} className="card">
          <Header icon={Megaphone} title="Sponsor Campaign" />
          <div className="grid gap-3 mt-4">
            <input className="input" placeholder="Sponsor name" value={campaign.sponsor_name} onChange={e => setCampaign({ ...campaign, sponsor_name: e.target.value })} required />
            <input className="input" placeholder="Campaign title" value={campaign.title} onChange={e => setCampaign({ ...campaign, title: e.target.value })} required />
            <textarea className="input min-h-24" placeholder="Campaign message" value={campaign.body} onChange={e => setCampaign({ ...campaign, body: e.target.value })} />
            <input className="input" type="number" placeholder="Budget" value={campaign.budget} onChange={e => setCampaign({ ...campaign, budget: e.target.value })} />
            <select className="input" value={campaign.status} onChange={e => setCampaign({ ...campaign, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
            <button className="btn">Create Campaign</button>
          </div>
        </form>

        <section className="card">
          <Header icon={BarChart3} title="Expansion Readiness" />
          <div className="grid gap-3 mt-4">
            <Readiness icon={Building2} title="Multi-University Scaling" message="Each university remains isolated by university_id." />
            <Readiness icon={Users} title="Campus Ambassador Growth" message="Referral and ambassador tables are ready." />
            <Readiness icon={KeyRound} title="API Ecosystem" message={`${apiClients.length} API clients configured for this university.`} />
          </div>
        </section>
      </div>

      <section className="card mt-6">
        <h2 className="font-black">Sponsor Campaigns</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
          {campaigns.length === 0 && <p className="muted">No campaigns yet.</p>}
          {campaigns.map(item => (
            <div className="rounded-lg border border-white/10 p-4" key={item.id}>
              <span className="badge">{item.status}</span>
              <h3 className="font-black mt-3">{item.title}</h3>
              <p className="muted mt-2">{item.body}</p>
              <p className="muted text-sm mt-2">Sponsor: {item.sponsor_name}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <form onSubmit={handleAd} className="card">
          <Header icon={Target} title="Ad Engine" />
          <div className="grid gap-3 mt-4">
            <select className="input" value={ad.campaign_id} onChange={e => setAd({ ...ad, campaign_id: e.target.value })} required>
              <option value="">Choose campaign</option>
              {campaigns.map(row => <option key={row.id} value={row.id}>{row.title}</option>)}
            </select>
            <select className="input" value={ad.placement_id} onChange={e => setAd({ ...ad, placement_id: e.target.value })}>
              <option value="">Choose placement</option>
              {adPlacements.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
            <input className="input" placeholder="Ad title" value={ad.title} onChange={e => setAd({ ...ad, title: e.target.value })} required />
            <input className="input" placeholder="Target URL" value={ad.target_url} onChange={e => setAd({ ...ad, target_url: e.target.value })} />
            <textarea className="input min-h-24" placeholder="Ad body" value={ad.body} onChange={e => setAd({ ...ad, body: e.target.value })} />
            <select className="input" value={ad.status} onChange={e => setAd({ ...ad, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
            <button className="btn">Create Ad Creative</button>
          </div>
        </form>

        <form onSubmit={handleSettlement} className="card">
          <Header icon={PiggyBank} title="Financial Settlements" />
          <div className="grid gap-3 mt-4">
            <select className="input" value={settlement.settlement_type} onChange={e => setSettlement({ ...settlement, settlement_type: e.target.value })}>
              <option value="platform">Platform</option>
              <option value="marketplace">Marketplace</option>
              <option value="ticketing">Ticketing</option>
              <option value="sponsorship">Sponsorship</option>
            </select>
            <input className="input" placeholder="Provider" value={settlement.provider} onChange={e => setSettlement({ ...settlement, provider: e.target.value })} />
            <input className="input" type="number" placeholder="Gross amount" value={settlement.gross_amount} onChange={e => setSettlement({ ...settlement, gross_amount: e.target.value })} />
            <input className="input" type="number" placeholder="Platform fee" value={settlement.platform_fee} onChange={e => setSettlement({ ...settlement, platform_fee: e.target.value })} />
            <button className="btn">Record Settlement</button>
          </div>
          <p className="muted mt-4">{settlements.length} settlement records</p>
        </form>
      </div>

      <section className="card mt-6">
        <h2 className="font-black">Ad Creatives & Tracking</h2>
        <p className="muted mt-2">{adEvents.length} ad events recorded.</p>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
          {adCreatives.length === 0 && <p className="muted">No ad creatives yet.</p>}
          {adCreatives.map(item => (
            <div className="rounded-lg border border-white/10 p-4" key={item.id}>
              <span className="badge">{item.status}</span>
              <h3 className="font-black mt-3">{item.title}</h3>
              <p className="muted mt-2">{item.body}</p>
              <p className="muted text-sm mt-2">{item.ad_placements?.name || "No placement"}</p>
              <div className="flex gap-2 mt-3">
                <button className="btn btn-secondary" onClick={() => handleAdEvent(item, "impression")}>Impression</button>
                <button className="btn" onClick={() => handleAdEvent(item, "click")}>Click</button>
              </div>
            </div>
          ))}
        </div>
      </section>
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

function Stat({ title, value }) {
  return (
    <div className="card">
      <p className="muted text-sm">{title}</p>
      <h3 className="text-3xl font-black mt-2">{value}</h3>
    </div>
  );
}

function Readiness({ icon: Icon, title, message }) {
  return (
    <div className="rounded-lg border border-white/10 p-4">
      <h3 className="font-black flex items-center gap-2"><Icon size={16} /> {title}</h3>
      <p className="muted mt-2">{message}</p>
    </div>
  );
}
