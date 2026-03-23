import { createBrowserRouter, Navigate } from 'react-router-dom';

import { PublicLayout } from './components/layout/PublicLayout';
import { UserLayout } from './components/layout/UserLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { EmployeeLayout } from './components/layout/EmployeeLayout';

import { Home } from './pages/public/Home';
import { ServiceList } from './pages/public/ServiceList';
import { BlogList } from './pages/public/BlogList';
import { BlogPost } from './pages/public/BlogPost';
import { MetamorphosesGallery } from './pages/public/MetamorphosesGallery';
import { LoyaltyInfo } from './pages/public/LoyaltyInfo';

import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';

import { UserDashboard } from './pages/user/Dashboard';
import { UserAppointments } from './pages/user/Appointments';
import { BookingWizard } from './pages/user/BookingWizard';
import { UserLoyalty } from './pages/user/Loyalty';
import { UserProfile } from './pages/user/Profile';

import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminAppointments } from './pages/admin/Appointments';
import { AdminServices } from './pages/admin/Services';
import { AdminBlog } from './pages/admin/Blog';
import { AdminBlogForm } from './pages/admin/AdminBlogForm';
import { AdminMetamorphoses } from './pages/admin/Metamorphoses';
import { AdminLoyalty } from './pages/admin/Loyalty';
import { AdminUsers } from './pages/admin/Users';
import { AdminChat } from './pages/admin/Chat';
import { AdminEmployees } from './pages/admin/Employees';
import { AdminWork } from './pages/admin/Work';
import { AdminHeroSlides } from './pages/admin/HeroSlides';
import { AdminDiscountCodes } from './pages/admin/DiscountCodes';
import { AdminTerms } from './pages/admin/AdminTerms';
import { PublicTerms } from './pages/public/Terms';
import { Contact } from './pages/public/Contact';
import { About } from './pages/public/About';
import { AdminAbout } from './pages/admin/AdminAbout';
import { AdminConsultations } from './pages/admin/Consultations';
import { ServiceDetail } from './pages/public/ServiceDetail';
import { AdminServiceDetail } from './pages/admin/AdminServiceDetail';
import AdminQuizzes from './pages/admin/AdminQuizzes';
import AdminQuizEditor from './pages/admin/AdminQuizEditor';

import { EmployeeSchedule } from './pages/employee/Schedule';
import { EmployeeAppointments } from './pages/employee/MyAppointments';
import { EmployeeChat } from './pages/employee/Chat';
import { UserChat } from './pages/user/Chat';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'uslugi', element: <ServiceList /> },
      { path: 'uslugi/:slug', element: <ServiceDetail /> },
      { path: 'blog', element: <BlogList /> },
      { path: 'blog/:slug', element: <BlogPost /> },
      { path: 'metamorfozy', element: <MetamorphosesGallery /> },
      { path: 'program-lojalnosciowy', element: <LoyaltyInfo /> },
      { path: 'regulamin', element: <PublicTerms /> },
      { path: 'kontakt', element: <Contact /> },
      { path: 'o-nas', element: <About /> },
      {
        path: 'auth',
        children: [
          { path: 'login', element: <Login /> },
          { path: 'register', element: <Register /> },
          { path: 'forgot-password', element: <ForgotPassword /> },
          { path: 'reset-password', element: <ResetPassword /> },
        ],
      },
    ],
  },
  {
    path: '/user',
    element: <UserLayout />,
    children: [
      { index: true, element: <UserDashboard /> },
      { path: 'wizyty', element: <UserAppointments /> },
      { path: 'appointments', element: <Navigate to="/user/wizyty" replace /> },
      { path: 'lojalnosc', element: <UserLoyalty /> },
      { path: 'profil', element: <UserProfile /> },
      { path: 'chat', element: <UserChat /> },
    ],
  },
  {
    path: '/rezerwacja',
    element: <UserLayout />,
    children: [{ index: true, element: <BookingWizard /> }],
  },
  {
    path: '/employee',
    element: <EmployeeLayout />,
    children: [
      { index: true, element: <EmployeeSchedule /> },
      { path: 'terminarz', element: <EmployeeSchedule /> },
      { path: 'wizyty', element: <EmployeeAppointments /> },
      { path: 'chat', element: <EmployeeChat /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'wizyty', element: <AdminAppointments /> },
      { path: 'pracownicy', element: <AdminEmployees /> },
      { path: 'uslugi', element: <AdminServices /> },
      { path: 'uslugi/:slug', element: <AdminServiceDetail /> },
      { path: 'blog/new', element: <AdminBlogForm /> },
      { path: 'blog/:id/edit', element: <AdminBlogForm /> },
      { path: 'blog', element: <AdminBlog /> },
      { path: 'metamorfozy', element: <AdminMetamorphoses /> },
      { path: 'lojalnosc', element: <AdminLoyalty /> },
      { path: 'uzytkownicy', element: <AdminUsers /> },
      { path: 'chat', element: <AdminChat /> },
      { path: 'praca', element: <AdminWork /> },
      { path: 'hero', element: <AdminHeroSlides /> },
      { path: 'kody-rabatowe', element: <AdminDiscountCodes /> },
      { path: 'regulamin', element: <AdminTerms /> },
      { path: 'o-nas', element: <AdminAbout /> },
      { path: 'konsultacje', element: <AdminConsultations /> },
      { path: 'quizy', element: <AdminQuizzes /> },
      { path: 'quizy/:id/edytor', element: <AdminQuizEditor /> },
    ],
  },
]);
