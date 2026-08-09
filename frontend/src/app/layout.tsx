import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hostel Management System',
  description: 'Manage Students, Rooms, Meals, and Monthly Mess Billing',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
