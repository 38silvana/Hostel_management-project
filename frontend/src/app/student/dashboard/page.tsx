'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Home, Utensils, Receipt, LogOut, Check, X, Calendar } from 'lucide-react';

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mealSelection, setMealSelection] = useState({ breakfast: true, lunch: true, dinner: true });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [recentBills, setRecentBills] = useState<any[]>([]);

  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userStr || !token) {
      router.push('/');
      return;
    }
    const u = JSON.parse(userStr);
    if (u.role !== 'student') {
      router.push('/admin/dashboard');
      return;
    }
    setUser(u);
    fetchStudentMealSelection(token, selectedDate);
    fetchStudentBills(token);
  }, [selectedDate]);

  const fetchStudentMealSelection = async (token: string, dateStr: string) => {
    try {
      const res = await fetch(`/api/meals/selection?start_date=${dateStr}&end_date=${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const list = await res.json();
        if (list.length > 0) {
          setMealSelection({
            breakfast: list[0].breakfast,
            lunch: list[0].lunch,
            dinner: list[0].dinner
          });
        } else {
          setMealSelection({ breakfast: true, lunch: true, dinner: true });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudentBills = async (token: string) => {
    try {
      const res = await fetch('/api/billing/student', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRecentBills(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveMealSelection = async () => {
    setSaving(true);
    setMessage('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/meals/selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: selectedDate,
          ...mealSelection
        })
      });
      if (res.ok) {
        setMessage('Meal preferences updated for ' + selectedDate);
      }
    } catch (err) {
      setMessage('Failed to update meal preference');
    } finally {
      setSaving(false);
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
          <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">
            Student Portal
          </span>
          <h1 className="text-2xl font-bold mt-2">Hello, {user.name || user.username}</h1>
          <p className="text-slate-400 text-sm font-mono">Roll No: {user.roll_no || 'N/A'} | Room: {user.room_number || 'Unassigned'}</p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 transition-all"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </header>

      {/* Navigation */}
      <nav className="flex gap-3">
        <Link href="/student/dashboard" className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm shadow-lg shadow-indigo-600/30">
          Meal Selection & Profile
        </Link>
        <Link href="/student/billing" className="px-4 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-300 font-medium text-sm flex items-center gap-2">
          <Receipt className="w-4 h-4 text-indigo-400" /> My Mess Bills (Module 4)
        </Link>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Meal Selection Card */}
        <div className="glass-card p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Utensils className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Daily Meal Preference</h2>
                <p className="text-xs text-slate-400">Opt in / out of upcoming meals</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="glass-input py-1.5 px-3 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          {message && (
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
              {message}
            </div>
          )}

          <div className="space-y-3">
            {/* Breakfast */}
            <div
              onClick={() => setMealSelection({ ...mealSelection, breakfast: !mealSelection.breakfast })}
              className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                mealSelection.breakfast
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500'
              }`}
            >
              <span className="font-semibold text-sm">Breakfast</span>
              <div className={`w-6 h-6 rounded-md flex items-center justify-center ${mealSelection.breakfast ? 'bg-amber-500 text-slate-950' : 'bg-slate-800'}`}>
                {mealSelection.breakfast && <Check className="w-4 h-4 stroke-[3]" />}
              </div>
            </div>

            {/* Lunch */}
            <div
              onClick={() => setMealSelection({ ...mealSelection, lunch: !mealSelection.lunch })}
              className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                mealSelection.lunch
                  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500'
              }`}
            >
              <span className="font-semibold text-sm">Lunch</span>
              <div className={`w-6 h-6 rounded-md flex items-center justify-center ${mealSelection.lunch ? 'bg-yellow-500 text-slate-950' : 'bg-slate-800'}`}>
                {mealSelection.lunch && <Check className="w-4 h-4 stroke-[3]" />}
              </div>
            </div>

            {/* Dinner */}
            <div
              onClick={() => setMealSelection({ ...mealSelection, dinner: !mealSelection.dinner })}
              className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                mealSelection.dinner
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500'
              }`}
            >
              <span className="font-semibold text-sm">Dinner</span>
              <div className={`w-6 h-6 rounded-md flex items-center justify-center ${mealSelection.dinner ? 'bg-indigo-500 text-white' : 'bg-slate-800'}`}>
                {mealSelection.dinner && <Check className="w-4 h-4 stroke-[3]" />}
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveMealSelection}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/30"
          >
            {saving ? 'Saving...' : 'Save Meal Choice'}
          </button>
        </div>

        {/* Quick Bill Overview */}
        <div className="glass-card p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Monthly Bill Overview</h2>
                <p className="text-xs text-slate-400">Recent monthly mess bill statements</p>
              </div>
            </div>

            <Link href="/student/billing" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              View Detailed Invoice →
            </Link>
          </div>

          <div className="space-y-3">
            {recentBills.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No bill statements generated yet.</p>
            ) : (
              recentBills.map((b) => (
                <div key={b.id} className="p-4 rounded-xl glass-card flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-white">Month: {b.month}</span>
                    <p className="text-xs text-slate-400 mt-0.5">Total Amount: ₹{b.total_amount.toFixed(2)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    b.payment_status === 'PAID'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {b.payment_status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
