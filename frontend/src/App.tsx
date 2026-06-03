import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PrivateRoute } from '@/components/auth/PrivateRoute';
import { HomePage } from '@/pages/HomePage';
import { AvailabilityPage } from '@/pages/AvailabilityPage';
import { MeetingsPage } from '@/pages/MeetingsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { TeamsPage } from '@/pages/TeamsPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { BookingPage } from '@/pages/public/BookingPage';
import { PublicUserPage } from '@/pages/public/PublicUserPage';
import { GuestBookingPage } from '@/pages/public/GuestBookingPage';
import { InvitePage } from '@/pages/InvitePage';
import { NotFound } from '@/pages/NotFound';
import { LandingPage } from '@/pages/LandingPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/welcome" element={<LandingPage />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />

            <Route element={<PrivateRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/events" element={<HomePage />} />
                <Route path="/availability" element={<AvailabilityPage />} />
                <Route path="/bookings" element={<MeetingsPage />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/me" element={<ProfilePage />} />
              </Route>
            </Route>

            <Route path="/cancel/:bookingUid" element={<GuestBookingPage />} />
            <Route path="/u/:username" element={<PublicUserPage />} />
            <Route path="/:username" element={<PublicUserPage />} />
            <Route path="/:username/:slug" element={<BookingPage />} />

            <Route path="/invite/:token" element={<InvitePage />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
