'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, UserPlus, Home, Plus, Trash2, Edit, LogOut, Search } from 'lucide-react';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    roll_no: '',
    room_number: '',
    phone: '',
    address: ''
  });

  const [roomData, setRoomData] = useState({ room_number: '', capacity: 2 });

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    fetchData(token);
  }, []);

  const fetchData = async (token: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [resStu, resRooms] = await Promise.all([
        fetch('/api/students/', { headers }),
        fetch('/api/rooms/', { headers })
      ]);

      if (resStu.ok) setStudents(await resStu.json());
      if (resRooms.ok) setRooms(await resRooms.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/students/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to create student');
        return;
      }
      setShowAddStudent(false);
      setFormData({ username: '', password: '', name: '', roll_no: '', room_number: '', phone: '', address: '' });
      fetchData(token!);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/rooms/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(roomData)
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to create room');
        return;
      }
      setShowAddRoom(false);
      setRoomData({ room_number: '', capacity: 2 });
      fetchData(token!);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStudent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData(token!);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.roll_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.room_number && s.room_number.includes(searchQuery))
  );

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <header className="flex items-center justify-between glass-card p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold">Student & Room Management</h1>
          <p className="text-slate-400 text-sm">Add, edit, assign rooms, and manage hostel residents</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddRoom(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-all"
          >
            <Home className="w-4 h-4" /> Add Room
          </button>
          <button
            onClick={() => setShowAddStudent(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-600/30 transition-all"
          >
            <UserPlus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="flex gap-3">
        <Link href="/admin/dashboard" className="px-4 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-300 font-medium text-sm">
          Overview
        </Link>
        <Link href="/admin/students" className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm shadow-lg shadow-indigo-600/30">
          Students
        </Link>
        <Link href="/admin/meals" className="px-4 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-300 font-medium text-sm">
          Meal Management
        </Link>
        <Link href="/admin/billing" className="px-4 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-300 font-medium text-sm">
          Monthly Mess Billing
        </Link>
      </nav>

      {/* Filter / Search Bar */}
      <div className="glass-card p-4 rounded-xl flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by student name, roll number, or room number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none w-full text-sm text-white placeholder:text-slate-500"
        />
      </div>

      {/* Students Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-4">Name / Username</th>
              <th className="p-4">Roll No</th>
              <th className="p-4">Room</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No students found
                </td>
              </tr>
            ) : (
              filteredStudents.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 font-medium text-white">
                    <div>{s.name}</div>
                    <div className="text-xs text-slate-400 font-mono">@{s.username}</div>
                  </td>
                  <td className="p-4 font-mono text-indigo-300">{s.roll_no}</td>
                  <td className="p-4">
                    {s.room_number ? (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        Room {s.room_number}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Unassigned</span>
                    )}
                  </td>
                  <td className="p-4">{s.phone || 'N/A'}</td>
                  <td className="p-4">
                    <button
                      onClick={() => handleDeleteStudent(s.id)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card max-w-lg w-full p-6 rounded-2xl space-y-4">
            <h3 className="text-xl font-bold">Add New Student</h3>
            <form onSubmit={handleCreateStudent} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Username</label>
                  <input
                    required
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full p-2.5 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
                  <input
                    required
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full p-2.5 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Full Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Roll Number</label>
                  <input
                    required
                    type="text"
                    value={formData.roll_no}
                    onChange={(e) => setFormData({ ...formData, roll_no: e.target.value })}
                    className="w-full p-2.5 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Room Number</label>
                  <select
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    className="w-full p-2.5 rounded-xl glass-input bg-slate-900"
                  >
                    <option value="">Select Room (Optional)</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.room_number} disabled={r.occupied >= r.capacity}>
                        Room {r.room_number} ({r.occupied}/{r.capacity})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddStudent(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {showAddRoom && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl space-y-4">
            <h3 className="text-xl font-bold">Add Room</h3>
            <form onSubmit={handleCreateRoom} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Room Number</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 301"
                  value={roomData.room_number}
                  onChange={(e) => setRoomData({ ...roomData, room_number: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Capacity</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={roomData.capacity}
                  onChange={(e) => setRoomData({ ...roomData, capacity: parseInt(e.target.value) || 2 })}
                  className="w-full p-2.5 rounded-xl glass-input"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddRoom(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium"
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
