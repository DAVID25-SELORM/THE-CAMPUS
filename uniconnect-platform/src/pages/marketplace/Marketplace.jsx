import React, { useEffect, useMemo, useState } from "react";
import { BadgeCheck, MessageCircle, ShoppingBag, Star } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  createMarketplaceItem,
  fetchMarketplaceCategories,
  fetchMarketplaceItems
} from "../../services/marketplaceService";
import {
  createOrder,
  createPaymentIntent,
  createReview,
  fetchItemReviews,
  fetchVendorVerifications,
  requestVendorVerification
} from "../../services/economyService";
import EmptyState from "../../components/EmptyState";
import { SearchableSelect } from "../../components/SearchableSelect";
import MarketplaceEconomyUpgrade from "./MarketplaceEconomyUpgrade";

const deliveryOptions = ["meetup", "pickup", "delivery", "digital"];

export default function Marketplace() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [busyItemId, setBusyItemId] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    item_type: "product",
    category_id: "",
    contact_phone: "",
    delivery_method: "meetup"
  });
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [vendorForm, setVendorForm] = useState({ business_name: "", contact_phone: "" });

  async function load() {
    if (!profile?.university_id) return;
    const [{ data: itemRows }, { data: categoryRows }, { data: vendorRows }] = await Promise.all([
      fetchMarketplaceItems(profile.university_id),
      fetchMarketplaceCategories(profile.university_id),
      fetchVendorVerifications(profile.university_id)
    ]);

    const nextItems = itemRows || [];
    setItems(nextItems);
    setCategories(categoryRows || []);
    setVendors(vendorRows || []);

    const reviewResult = await fetchItemReviews(nextItems.map(item => item.id));
    setReviews(reviewResult.data || []);
  }

  useEffect(() => { load(); }, [profile?.university_id]);

  const reviewsByItem = useMemo(() => {
    return reviews.reduce((acc, review) => {
      acc[review.item_id] = [...(acc[review.item_id] || []), review];
      return acc;
    }, {});
  }, [reviews]);

  const vendorsBySeller = useMemo(() => {
    return Object.fromEntries(vendors.map(vendor => [vendor.seller_id, vendor]));
  }, [vendors]);

  function getRating(itemId) {
    const itemReviews = reviewsByItem[itemId] || [];
    if (!itemReviews.length) return { average: 0, count: 0 };
    const total = itemReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
    return { average: total / itemReviews.length, count: itemReviews.length };
  }

  async function submit(e) {
    e.preventDefault();
    const { error } = await createMarketplaceItem({
      ...form,
      category_id: form.category_id || null,
      price: Number(form.price || 0),
      university_id: profile.university_id,
      seller_id: user.id
    });
    if (error) return toast(error.message, "error");
    setForm({ title: "", description: "", price: "", item_type: "product", category_id: "", contact_phone: "", delivery_method: "meetup" });
    load();
  }

  async function handleOrder(item) {
    setBusyItemId(item.id);
    setMessage("");

    const order = await createOrder({
      university_id: profile.university_id,
      item_id: item.id,
      buyer_id: user.id,
      seller_id: item.seller_id,
      quantity: 1,
      total_amount: Number(item.price || 0),
      delivery_method: item.delivery_method || "meetup",
      payment_status: Number(item.price || 0) > 0 ? "unpaid" : "free"
    });

    if (order.error) {
      setBusyItemId("");
      return setMessage(order.error.message);
    }

    const payment = await createPaymentIntent({
      university_id: profile.university_id,
      order_id: order.data.id,
      buyer_id: user.id,
      seller_id: item.seller_id,
      provider: "manual",
      amount: Number(item.price || 0),
      status: Number(item.price || 0) > 0 ? "pending" : "completed"
    });

    setBusyItemId("");
    if (payment.error) return setMessage(payment.error.message);

    setMessage(`Order created. Payment reference: ${payment.data.reference}`);
    load();
  }

  async function handleReview(e, item) {
    e.preventDefault();
    const draft = reviewDrafts[item.id] || { rating: 5, review: "" };
    const { error } = await createReview({
      university_id: profile.university_id,
      item_id: item.id,
      reviewer_id: user.id,
      rating: Number(draft.rating || 5),
      review: draft.review || ""
    });

    if (error) return setMessage(error.message);
    setReviewDrafts(prev => ({ ...prev, [item.id]: { rating: 5, review: "" } }));
    setMessage("Review saved.");
    load();
  }

  async function handleVendorRequest(e) {
    e.preventDefault();
    const { error } = await requestVendorVerification({
      university_id: profile.university_id,
      seller_id: user.id,
      business_name: vendorForm.business_name,
      contact_phone: vendorForm.contact_phone,
      status: "pending"
    });
    if (error) return setMessage(error.message);
    setMessage("Vendor verification request submitted.");
    load();
  }

  return (
    <div>
      <h1 className="text-3xl font-black">Marketplace</h1>
      <p className="muted mt-2">Buy, sell, and offer services within your university.</p>

      {message && <div className="card mt-5">{message}</div>}

      <MarketplaceEconomyUpgrade />

      <form onSubmit={submit} className="card mt-6 grid md:grid-cols-2 xl:grid-cols-4 gap-3">
        <input className="input" placeholder="Item/service title" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} required />
        <input className="input" placeholder="Description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
        <input className="input" type="number" placeholder="Price" value={form.price} onChange={e=>setForm({...form, price:e.target.value})} />
        <select className="input" value={form.item_type} onChange={e=>setForm({...form, item_type:e.target.value})}>
          <option value="product">Product</option>
          <option value="service">Student service</option>
          <option value="digital">Digital delivery</option>
        </select>
        <SearchableSelect
          id="marketplace-category"
          placeholder="Type or choose category"
          value={form.category_id}
          options={categories.map(category => ({ value: category.id, label: category.name }))}
          onChange={value => setForm({ ...form, category_id: value })}
        />
        <input className="input" placeholder="Contact phone" value={form.contact_phone} onChange={e=>setForm({...form, contact_phone:e.target.value})} />
        <select className="input" value={form.delivery_method} onChange={e=>setForm({...form, delivery_method:e.target.value})}>
          {deliveryOptions.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
        <button className="btn">Post Listing</button>
      </form>

      <form onSubmit={handleVendorRequest} className="card mt-4 grid md:grid-cols-[1fr_1fr_auto] gap-3">
        <input className="input" placeholder="Business or service name" value={vendorForm.business_name} onChange={e=>setVendorForm({...vendorForm, business_name:e.target.value})} required />
        <input className="input" placeholder="Verification contact" value={vendorForm.contact_phone} onChange={e=>setVendorForm({...vendorForm, contact_phone:e.target.value})} required />
        <button className="btn btn-secondary">Request Vendor Badge</button>
      </form>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
        {items.length === 0 && <EmptyState title="No items yet" message="Post the first campus item or service." />}
        {items.map(item => {
          const rating = getRating(item.id);
          const vendor = vendorsBySeller[item.seller_id];
          const verified = item.vendor_verified || vendor?.status === "approved";
          const draft = reviewDrafts[item.id] || { rating: 5, review: "" };

          return (
            <article className="card" key={item.id}>
              <div className="flex flex-wrap gap-2">
                <span className="badge">{item.status}</span>
                <span className="badge">{item.item_type || "product"}</span>
                {item.marketplace_categories?.name && <span className="badge">{item.marketplace_categories.name}</span>}
              </div>

              <h3 className="text-xl font-black mt-3">{item.title}</h3>
              <p className="muted mt-2">{item.description}</p>
              <p className="text-2xl font-black mt-4">GHS {Number(item.price || 0).toFixed(2)}</p>

              <div className="grid gap-2 mt-4 text-sm">
                <p className="muted">Seller: <span className="text-white font-bold">{item.profiles?.full_name || "Student"}</span></p>
                <p className="muted">Delivery: <span className="text-white font-bold">{item.delivery_method || "meetup"}</span></p>
                {item.contact_phone && <p className="muted">Contact: <span className="text-white font-bold">{item.contact_phone}</span></p>}
                <p className="muted flex items-center gap-2">
                  <Star size={16} /> {rating.count ? `${rating.average.toFixed(1)} from ${rating.count} review(s)` : "No reviews yet"}
                </p>
                {verified && (
                  <p className="text-cyan-100 font-bold flex items-center gap-2">
                    <BadgeCheck size={16} /> Verified campus vendor
                  </p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mt-5">
                <button onClick={() => handleOrder(item)} disabled={busyItemId === item.id || item.seller_id === user.id} className="btn flex items-center justify-center gap-2">
                  <ShoppingBag size={18} /> {busyItemId === item.id ? "Creating..." : "Order"}
                </button>
                <a className="btn btn-secondary flex items-center justify-center gap-2" href={item.contact_phone ? `tel:${item.contact_phone}` : "/messages"}>
                  <MessageCircle size={18} /> Contact
                </a>
              </div>

              <form onSubmit={e => handleReview(e, item)} className="mt-5 border-t border-white/10 pt-4">
                <div className="grid sm:grid-cols-[120px_1fr_auto] gap-2">
                  <select className="input" value={draft.rating} onChange={e=>setReviewDrafts(prev => ({...prev, [item.id]: {...draft, rating:e.target.value}}))}>
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>
                  <input className="input" placeholder="Leave a review" value={draft.review} onChange={e=>setReviewDrafts(prev => ({...prev, [item.id]: {...draft, review:e.target.value}}))} />
                  <button className="btn btn-secondary">Review</button>
                </div>
              </form>

              {(reviewsByItem[item.id] || []).slice(0, 2).map(review => (
                <div key={review.id} className="mt-3 rounded-2xl border border-white/10 p-3">
                  <p className="font-bold">{review.rating} Stars</p>
                  <p className="muted text-sm mt-1">{review.review || "No comment."}</p>
                  <p className="muted text-xs mt-2">{review.profiles?.full_name || "Student"}</p>
                </div>
              ))}
            </article>
          );
        })}
      </div>
    </div>
  );
}
