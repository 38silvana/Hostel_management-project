'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Receipt, Play, CheckCircle2, Clock, Filter, DollarSign, ArrowUpDown } from 'lucide-react';

export default function AdminBillingPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    fetchBills(token, selectedMonth, statusFilter);
  }, [selectedMonth, statusFilter]);

  const fetchBills = async (token: string, month: string, status: string) => {
    setLoading(true);
    try {
      let url = `/api/billing/admin?month=${month}`;
      if (status) url += `&payment_status=${status}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setBills(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBills = async () => {
    setGenerating(true);
    setMessage('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/billing/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ month: selectedMonth })
      });
      if (res.ok) {
        setMessage(`Successfully generated/updated bills for ${selectedMonth}!`);
        fetchBills(token!, selectedMonth, statusFilter);
      } else {
        const err = await res.json();
        setMessage(`Error: ${err.detail || 'Failed to generate bills'}`);
      }
    } catch (err) {
      setMessage('Failed to execute bill calculation');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleStatus = async (billId: number, currentStatus: string) => {
    const token = localStorage.getItem('token');
    const newStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID';
    try {
      const res = await fetch(`/api/billing/${billId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ payment_status: newStatus })
      });
      if (res.ok) {
        fetchBills(token!, selectedMonth, statusFilter);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalRevenue = bills.reduce((sum, b) => sum + b.total_amount, 0);
  const paidCount = bills.filter(b => b.payment_status === 'PAID').length;
  const unpaidCount = bills.filter(b => b.payment_status === 'UNPAID').length;

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-card p-6 rounded-2xl">
        <div>
          <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">
            Module 4: Monthly Mess Billing
          </span>
          <h1 className="text-2xl font-bold mt-2">Mess Bill Generation & Audit</h1>
          <p className="text-slate-400 text-sm">Calculate attendance totals * meal rates and update payment receipts</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="glass-input py-2.5 px-4 rounded-xl text-sm font-semibold"
          />
          <button
            onClick={handleGenerateBills}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            {generating ? 'Calculating...' : 'Generate Bills'}
          </button>
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
        <Link href="/admin/meals" className="px-4 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-300 font-medium text-sm">
          Meal Management
        </Link>
        <Link href="/admin/billing" className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm shadow-lg shadow-indigo-600/30">
          Monthly Mess Billing
        </Link>
      </nav>

      {message && (
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium">
          {message}
        </div>
      )}

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Total Monthly Billing</p>
            <p className="text-2xl font-bold text-white mt-1">₹{totalRevenue.toFixed(2)}</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Paid Invoices</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{paidCount} Students</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Unpaid / Pending</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{unpaidCount} Students</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between glass-card p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">Filter by Status:</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === '' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('PAID')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'PAID' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => setStatusFilter('UNPAID')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'UNPAID' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Unpaid
            </button>
          </div>
        </div>

        {/* Bills Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-4">Student</th>
                <th className="p-4">Roll No / Room</th>
                <th className="p-4">Month</th>
                <th className="p-4">Meals Breakdown (B / L / D)</th>
                <th className="p-4">Rates (₹)</th>
                <th className="p-4">Total Bill</th>
                <th className="p-4">Payment Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No mess bills generated for month {selectedMonth} yet. Click "Generate Bills" above.
                  </td>
                </tr>
              ) : (
                bills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-medium text-white">{b.student_name}</td>
                    <td className="p-4 font-mono text-indigo-300">
                      {b.roll_no} {b.room_number ? `(${b.room_number})` : ''}
                    </td>
                    <td className="p-4 font-mono text-slate-400">{b.month}</td>
                    <td className="p-4 font-mono text-xs">
                      <span className="text-amber-300">{b.total_breakfasts} B</span> |{' '}
                      <span className="text-yellow-300">{b.total_lunches} L</span> |{' '}
                      <span className="text-indigo-300">{b.total_dinners} D</span>
                    </td>
                    <td className="p-4 text-xs text-slate-400">
                      {b.breakfast_rate} / {b.lunch_rate} / {b.dinner_rate}
                    </td>
                    <td className="p-4 font-bold text-white">₹{b.total_amount.toFixed(2)}</td>
                    <td className="p-4">
                      {b.payment_status === 'PAID' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 w-fit">
                          <CheckCircle2 className="w-3.5 h-3.5" /> PAID
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5 w-fit">
                          <Clock className="w-3.5 h-3.5" /> UNPAID
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleStatus(b.id, b.payment_status)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1"
                      >
                        <ArrowUpDown className="w-3 h-3" /> Toggle Status
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
