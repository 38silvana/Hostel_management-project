'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Home, UtensilsCrossed, Receipt, LogOut, ArrowRight, TrendingUp, CheckCircle, Clock } from 'lucide-react';

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    studentsCount: 0,
    roomsCount: 0,
    occupiedRooms: 0,
    tomorrowMeals: { breakfast: 0, lunch: 0, dinner: 0 },
    unpaidBillsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userStr || !token) {
      router.push('/');
      return;
    }
    const u = JSON.parse(userStr);
    if (u.role !== 'admin') {
      router.push('/student/dashboard');
      return;
    }
    setUser(u);
    fetchDashboardData(token);
  }, []);

  const fetchDashboardData = async (token: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [resStu, resRooms, resMeals, resBills] = await Promise.all([
        fetch('/api/students/', { headers }),
        fetch('/api/rooms/', { headers }),
        fetch('/api/meals/kitchen', { headers }),
        fetch('/api/billing/admin', { headers }),
      ]);

      const students = resStu.ok ? await resStu.json() : [];
      const rooms = resRooms.ok ? await resRooms.json() : [];
      const meals = resMeals.ok ? await resMeals.json() : { total_breakfast: 0, total_lunch: 0, total_dinner: 0 };
      const bills = resBills.ok ? await resBills.json() : [];

      const occupied = rooms.reduce((acc: number, r: any) => acc + (r.occupied || 0), 0);
      const unpaid = bills.filter((b: any) => b.payment_status === 'UNPAID').length;

      setStats({
        studentsCount: students.length,
        roomsCount: rooms.length,
        occupiedRooms: occupied,
        tomorrowMeals: {
          breakfast: meals.total_breakfast,
          lunch: meals.total_lunch,
          dinner: meals.total_dinner,
        },
        unpaidBillsCount: unpaid,
      });
    } catch (err) {
      console.error('Failed to load admin stats', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-card p-6 rounded-2xl">
        <div>
          <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">
            Admin Portal
          </span>
          <h1 className="text-2xl font-bold mt-2">Welcome back, {user.name || user.username}</h1>
          <p className="text-slate-400 text-sm">Hostel Overview & System Management</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-all border border-slate-700"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex flex-wrap gap-3">
        <Link href="/admin/dashboard" className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Overview
        </Link>
        <Link href="/admin/students" className="px-4 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-300 font-medium text-sm flex items-center gap-2 transition-all">
          <Users className="w-4 h-4" /> Students
        </Link>
        <Link href="/admin/meals" className="px-4 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-300 font-medium text-sm flex items-center gap-2 transition-all">
          <UtensilsCrossed className="w-4 h-4" /> Meal Management
        </Link>
        <Link href="/admin/billing" className="px-4 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-300 font-medium text-sm flex items-center gap-2 transition-all border-indigo-500/30">
          <Receipt className="w-4 h-4 text-indigo-400" /> Monthly Mess Billing (Module 4)
        </Link>
      </nav>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Registered</span>
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{stats.studentsCount}</p>
          <p className="text-xs text-slate-400 mt-2">Active Students in Hostel</p>
        </div>

        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Room Occupancy</span>
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Home className="w-6 h-6" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{stats.occupiedRooms} Occupied</p>
          <p className="text-xs text-slate-400 mt-2">Across {stats.roomsCount} total rooms</p>
        </div>

        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Tomorrow's Meal Count</span>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xl font-bold text-white">
            B: {stats.tomorrowMeals.breakfast} | L: {stats.tomorrowMeals.lunch} | D: {stats.tomorrowMeals.dinner}
          </p>
          <p className="text-xs text-slate-400 mt-2">Kitchen Preparation Estimate</p>
        </div>

        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Mess Bills Status</span>
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
          <p className="text-3xl font-bold text-rose-400">{stats.unpaidBillsCount} Pending</p>
          <p className="text-xs text-slate-400 mt-2">Unpaid Monthly Mess Bills</p>
        </div>
      </div>

      {/* Module 4 Quick Action Showcase */}
      <div className="glass-card p-8 rounded-2xl border border-indigo-500/30 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="px-3 py-1 text-xs font-semibold bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
              Module 4 Highlight
            </span>
            <h2 className="text-2xl font-bold text-white">Monthly Mess Billing Management</h2>
            <p className="text-slate-300 text-sm max-w-2xl">
              Automatically aggregate student meal selections (breakfast, lunch, dinner), apply custom per-meal rates, generate monthly invoices, and track payment status.
            </p>
          </div>
          <Link
            href="/admin/billing"
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-semibold text-sm text-white shadow-xl shadow-indigo-600/30 flex items-center gap-2 whitespace-nowrap"
          >
            <span>Open Mess Billing</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
