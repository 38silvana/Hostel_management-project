'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Receipt, CheckCircle2, Clock, Calendar, ArrowLeft, Printer } from 'lucide-react';

export default function StudentBillingPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    fetchStudentBills(token);
  }, []);

  const fetchStudentBills = async (token: string) => {
    try {
      const res = await fetch('/api/billing/student', {
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-8">
      {/* Top Header */}
      <header className="flex items-center justify-between glass-card p-6 rounded-2xl">
        <div>
          <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">
            Module 4: Monthly Mess Billing
          </span>
          <h1 className="text-2xl font-bold mt-2">My Monthly Mess Bills</h1>
          <p className="text-slate-400 text-sm">Detailed itemized breakdown of meal counts & mess charges</p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 transition-all"
        >
          <Printer className="w-4 h-4" /> Print Statement
        </button>
      </header>

      {/* Navigation */}
      <nav className="flex gap-3">
        <Link href="/student/dashboard" className="px-4 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-300 font-medium text-sm flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <Link href="/student/billing" className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm shadow-lg shadow-indigo-600/30">
          My Mess Bills
        </Link>
      </nav>

      {/* Bill Cards */}
      <div className="space-y-6">
        {bills.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-2xl space-y-3">
            <Receipt className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-semibold text-slate-300">No Monthly Mess Bills Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Your hostel admin has not generated monthly mess bills for your account yet. Check back soon.
            </p>
          </div>
        ) : (
          bills.map((bill) => (
            <div key={bill.id} className="glass-card p-6 rounded-2xl space-y-6 border border-slate-800 hover:border-indigo-500/30 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span className="text-lg font-bold text-white">Month Statement: {bill.month}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Invoice ID: #{bill.id} • Issued for {bill.student_name} ({bill.roll_no})</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                    bill.payment_status === 'PAID'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {bill.payment_status === 'PAID' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    STATUS: {bill.payment_status}
                  </span>
                </div>
              </div>

              {/* Itemized Calculation Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-xs font-semibold text-amber-300 uppercase">Breakfast</span>
                  <div className="text-xl font-bold text-white">{bill.total_breakfasts} Meals</div>
                  <div className="text-xs text-slate-400">@ ₹{bill.breakfast_rate} per meal = ₹{(bill.total_breakfasts * bill.breakfast_rate).toFixed(2)}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-xs font-semibold text-yellow-300 uppercase">Lunch</span>
                  <div className="text-xl font-bold text-white">{bill.total_lunches} Meals</div>
                  <div className="text-xs text-slate-400">@ ₹{bill.lunch_rate} per meal = ₹{(bill.total_lunches * bill.lunch_rate).toFixed(2)}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-xs font-semibold text-indigo-300 uppercase">Dinner</span>
                  <div className="text-xl font-bold text-white">{bill.total_dinners} Meals</div>
                  <div className="text-xs text-slate-400">@ ₹{bill.dinner_rate} per meal = ₹{(bill.total_dinners * bill.dinner_rate).toFixed(2)}</div>
                </div>
              </div>

              {/* Total Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-sm font-semibold text-slate-400">Net Total Mess Charge</span>
                <span className="text-2xl font-extrabold text-white">₹{bill.total_amount.toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
