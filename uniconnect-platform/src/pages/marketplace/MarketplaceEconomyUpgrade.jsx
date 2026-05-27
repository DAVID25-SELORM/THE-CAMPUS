import React, { useEffect, useState } from "react";
import { BadgeCheck, ShoppingBag, Star, Wallet } from "lucide-react";
import StatCard from "../../components/StatCard";
import { useAuth } from "../../hooks/useAuth";
import { fetchMarketplaceDashboard, fetchWallet } from "../../services/economyService";

export default function MarketplaceEconomyUpgrade() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ items: 0, orders: 0, reviews: 0 });
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    async function loadEconomy() {
      if (!profile?.university_id || !user?.id) return;

      try {
        const [dashboard, walletResult] = await Promise.all([
          fetchMarketplaceDashboard(profile.university_id),
          fetchWallet(user.id)
        ]);

        setStats(dashboard);
        setWallet(walletResult.data || null);
      } catch (error) {
        console.error("Marketplace economy load error:", error.message);
      }
    }

    loadEconomy();
  }, [profile?.university_id, user?.id]);

  return (
    <section className="mt-6">
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Listed Items" value={stats.items} note="Products and services" />
        <StatCard title="Orders" value={stats.orders} note="Campus transactions" />
        <StatCard title="Reviews" value={stats.reviews} note="Seller reputation" />
        <StatCard
          title="Wallet"
          value={`${wallet?.currency || "GHS"} ${Number(wallet?.balance || 0).toFixed(2)}`}
          note="Student balance"
        />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
        <div className="card flex gap-3 items-start">
          <ShoppingBag className="text-cyan-200 shrink-0" size={22} />
          <div>
            <h3 className="font-black">Orders</h3>
            <p className="muted text-sm mt-1">Buy products and request student services.</p>
          </div>
        </div>
        <div className="card flex gap-3 items-start">
          <Star className="text-cyan-200 shrink-0" size={22} />
          <div>
            <h3 className="font-black">Reviews</h3>
            <p className="muted text-sm mt-1">Rate sellers after campus transactions.</p>
          </div>
        </div>
        <div className="card flex gap-3 items-start">
          <Wallet className="text-cyan-200 shrink-0" size={22} />
          <div>
            <h3 className="font-black">Wallets</h3>
            <p className="muted text-sm mt-1">Track balances and payment history.</p>
          </div>
        </div>
        <div className="card flex gap-3 items-start">
          <BadgeCheck className="text-cyan-200 shrink-0" size={22} />
          <div>
            <h3 className="font-black">Reputation</h3>
            <p className="muted text-sm mt-1">Build trust as a campus seller.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
