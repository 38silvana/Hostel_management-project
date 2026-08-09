'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UtensilsCrossed, Calendar, Save, Coffee, Sun, Moon, ChefHat } from 'lucide-react';

export default function AdminMealsPage() {
  const [prices, setPrices] = useState({ breakfast_price: 40, lunch_price: 70, dinner_price: 60 });
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [kitchenCounts, setKitchenCounts] = useState({ total_breakfast: 0, total_lunch: 0, total_dinner: 0 });
  const [loading, setLoading] = useState(true);
  const [savingPrices, setSavingPrices] = useState(false);
  const [priceMessage, setPriceMessage] = useState('');

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    fetchPrices(token);
    fetchKitchenCounts(token, targetDate);
  }, [targetDate]);

  const fetchPrices = async (token: string) => {
    try {
      const res = await fetch('/api/meals/prices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPrices({
          breakfast_price: data.breakfast_price,
          lunch_price: data.lunch_price,
          dinner_price: data.dinner_price
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchKitchenCounts = async (token: string, dateStr: string) => {
    try {
      const res = await fetch(`/api/meals/kitchen?target_date=${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKitchenCounts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrices(true);
    setPriceMessage('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/meals/prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(prices)
      });
      if (res.ok) {
        setPriceMessage('Meal rates updated successfully!');
      }
    } catch (err) {
      setPriceMessage('Failed to update rates.');
    } finally {
      setSavingPrices(false);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <header className="flex items-center justify-between glass-card p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold">Meal & Kitchen Management</h1>
          <p className="text-slate-400 text-sm">Configure per-meal billing rates & view live kitchen counts</p>
        </div>
      </header>

      {/* Navigation */}
      <nav className="flex gap-3">
        <Link href="/admin/dashboard" className="px-4 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-300 font-medium text-sm">
          Overview
        </Link>
        <Link href="/admin/students" className="px-4 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-300 font-medium text-sm">
          Students
        </Link>
        <Link href="/admin/meals" className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm shadow-lg shadow-indigo-600/30">
          Meal Management
        </Link>
        <Link href="/admin/billing" className="px-4 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-300 font-medium text-sm">
          Monthly Mess Billing
        </Link>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Card 1: Rate Configuration */}
        <div className="glass-card p-6 rounded-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Configure Meal Prices</h2>
              <p className="text-xs text-slate-400">Used for calculating monthly mess bills</p>
            </div>
          </div>

          {priceMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
              {priceMessage}
            </div>
          )}

          <form onSubmit={handleUpdatePrices} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Coffee className="w-4 h-4 text-amber-400" /> Breakfast Price (₹)
              </label>
              <input
                type="number"
                step="0.5"
                value={prices.breakfast_price}
                onChange={(e) => setPrices({ ...prices, breakfast_price: parseFloat(e.target.value) || 0 })}
                className="w-full py-3 px-4 rounded-xl glass-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Sun className="w-4 h-4 text-yellow-400" /> Lunch Price (₹)
              </label>
              <input
                type="number"
                step="0.5"
                value={prices.lunch_price}
                onChange={(e) => setPrices({ ...prices, lunch_price: parseFloat(e.target.value) || 0 })}
                className="w-full py-3 px-4 rounded-xl glass-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-400" /> Dinner Price (₹)
              </label>
              <input
                type="number"
                step="0.5"
                value={prices.dinner_price}
                onChange={(e) => setPrices({ ...prices, dinner_price: parseFloat(e.target.value) || 0 })}
                className="w-full py-3 px-4 rounded-xl glass-input"
              />
            </div>

            <button
              type="submit"
              disabled={savingPrices}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Rates
            </button>
          </form>
        </div>

        {/* Card 2: Kitchen Headcount Dashboard */}
        <div className="glass-card p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Kitchen Preparation Count</h2>
                <p className="text-xs text-slate-400">Headcount for specific dates</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="glass-input py-1.5 px-3 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="glass-card p-4 rounded-xl text-center space-y-2 border-amber-500/20 bg-amber-500/5">
              <span className="text-xs font-semibold text-amber-300 uppercase">Breakfast</span>
              <p className="text-3xl font-bold text-white">{kitchenCounts.total_breakfast}</p>
              <p className="text-xs text-slate-400">Meals</p>
            </div>

            <div className="glass-card p-4 rounded-xl text-center space-y-2 border-yellow-500/20 bg-yellow-500/5">
              <span className="text-xs font-semibold text-yellow-300 uppercase">Lunch</span>
              <p className="text-3xl font-bold text-white">{kitchenCounts.total_lunch}</p>
              <p className="text-xs text-slate-400">Meals</p>
            </div>

            <div className="glass-card p-4 rounded-xl text-center space-y-2 border-indigo-500/20 bg-indigo-500/5">
              <span className="text-xs font-semibold text-indigo-300 uppercase">Dinner</span>
              <p className="text-3xl font-bold text-white">{kitchenCounts.total_dinner}</p>
              <p className="text-xs text-slate-400">Meals</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
            💡 Headcounts combine explicit student opt-in choices and default active hostel resident estimates.
          </div>
        </div>
      </div>
    </div>
  );
}
