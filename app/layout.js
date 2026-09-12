import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata = {
  title: 'Shanthibavanam - Hostel Management & Meal Tracking System',
  description: 'Shanthibavanam Hostel Management & Meal Tracking Web Application',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
