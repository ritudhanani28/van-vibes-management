'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Users, Shield, ChefHat, CheckCircle2 } from 'lucide-react';

const STAFF_MEMBERS = [
  {
    id: 'stf_01',
    name: 'Rahul Verma',
    role: 'ADMIN',
    designation: 'General Manager & Cafe Operations',
    email: 'admin@vaanvibes.com',
    station: 'Front of House & Management',
    status: 'ON_DUTY',
    shift: '09:00 AM – 06:00 PM',
  },
  {
    id: 'stf_02',
    name: 'Chef Vikram Joshi',
    role: 'CHEF',
    designation: 'Executive Head Chef',
    email: 'chef@vaanvibes.com',
    station: 'Main Kitchen & Grill',
    status: 'ON_DUTY',
    shift: '10:00 AM – 10:00 PM',
  },
  {
    id: 'stf_03',
    name: 'Aman Sharma',
    role: 'CHEF',
    designation: 'Sous Chef (Beverages & Frappes)',
    email: 'aman.chef@vaanvibes.com',
    station: 'Espresso Bar & Shakes',
    status: 'ON_DUTY',
    shift: '11:00 AM – 08:00 PM',
  },
  {
    id: 'stf_04',
    name: 'Sneha Patel',
    role: 'CHEF',
    designation: 'Pastry & Toastie Chef',
    email: 'sneha.chef@vaanvibes.com',
    station: 'Bakery & Continental',
    status: 'OFF_DUTY',
    shift: '01:00 PM – 10:00 PM',
  },
];

export default function StaffManagementPage() {
  return (
    <AppLayout requiredRole="ADMIN">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-brand-green tracking-tight">
            Staff Roster & Kitchen Stations
          </h1>
          <p className="text-xs text-brand-green/70 mt-0.5">
            Operational roles, shift allocations, and active duty assignments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STAFF_MEMBERS.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-2xl border border-brand-beige-dark p-4 sm:p-5 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-beige text-brand-green font-black flex items-center justify-center text-xl border border-brand-gold">
                    {member.role === 'ADMIN' ? '👨‍💼' : '👨‍🍳'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-brand-green">
                      {member.name}
                    </h3>
                    <p className="text-xs text-brand-green/60 font-medium">
                      {member.designation}
                    </p>
                    <span className="inline-block mt-1 text-[10px] text-brand-green/50 font-mono">
                      {member.email}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${
                    member.status === 'ON_DUTY'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {member.status === 'ON_DUTY' ? 'On Duty' : 'Off Duty'}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-brand-beige-dark/50 flex items-center justify-between text-xs text-brand-green/70">
                <span>Station: <strong className="text-brand-green">{member.station}</strong></span>
                <span className="font-mono text-[11px]">{member.shift}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
