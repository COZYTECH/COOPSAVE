import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { ProtectedRoute } from './components/routing/ProtectedRoute.jsx';
import { GuestRoute } from './components/routing/GuestRoute.jsx';
import { RoleRoute } from './components/routing/RoleRoute.jsx';
import { GroupAdminRoute } from './components/routing/GroupAdminRoute.jsx';
import { GroupMemberRoute } from './components/routing/GroupMemberRoute.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { DashboardRouter } from './pages/DashboardRouter.jsx';
import { GroupSelectionPage } from './pages/GroupSelectionPage.jsx';
import { JoinGroupPage } from './pages/JoinGroupPage.jsx';
import { GroupAdminDashboardPage } from './pages/GroupAdminDashboardPage.jsx';
import { MemberDashboardPage } from './pages/MemberDashboardPage.jsx';
import { OnboardingPage } from './pages/OnboardingPage.jsx';
import { PlatformAdminDashboardPage } from './pages/PlatformAdminDashboardPage.jsx';
import { PaymentResultPage } from './pages/PaymentResultPage.jsx';
import { CooperativesPage } from './pages/CooperativesPage.jsx';
import { MembersPage } from './pages/MembersPage.jsx';
import { ReconciliationPage } from './pages/ReconciliationPage.jsx';
import { FinancialAccountsPage } from './pages/FinancialAccountsPage.jsx';
import { FinancialAccountDetailsPage } from './pages/FinancialAccountDetailsPage.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { GroupCyclesPage } from './pages/GroupCyclesPage.jsx';
import { GroupCycleDetailsPage } from './pages/GroupCycleDetailsPage.jsx';
import { MemberCyclesPage } from './pages/MemberCyclesPage.jsx';
import { MemberCycleDetailsPage } from './pages/MemberCycleDetailsPage.jsx';
import { NotificationsPage } from './pages/NotificationsPage.jsx';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />
  },
  {
    path: '/login',
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    )
  },
  {
    path: '/register',
    element: (
      <GuestRoute>
        <RegisterPage />
      </GuestRoute>
    )
  },
  {
    path: '/auth/login',
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    )
  },
  {
    path: '/auth/register',
    element: (
      <GuestRoute>
        <RegisterPage />
      </GuestRoute>
    )
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: <DashboardRouter /> },
      { path: '/payment/result', element: <PaymentResultPage /> },
      { path: '/notifications', element: <NotificationsPage /> },
      { path: '/groups/onboarding', element: <OnboardingPage /> },
      { path: '/groups/select', element: <GroupSelectionPage /> },
      { path: '/groups/join', element: <JoinGroupPage /> },
      {
        path: '/groups/:groupId/manage',
        element: (
          <GroupAdminRoute>
            <GroupAdminDashboardPage />
          </GroupAdminRoute>
        )
      },
      {
        path: '/groups/:groupId/manage/cycles',
        element: (
          <GroupAdminRoute>
            <GroupCyclesPage />
          </GroupAdminRoute>
        )
      },
      {
        path: '/groups/:groupId/manage/cycles/:cycleId',
        element: (
          <GroupAdminRoute>
            <GroupCycleDetailsPage />
          </GroupAdminRoute>
        )
      },
      {
        path: '/groups/:groupId/cycles',
        element: (
          <GroupMemberRoute>
            <MemberCyclesPage />
          </GroupMemberRoute>
        )
      },
      {
        path: '/groups/:groupId/cycles/:cycleId',
        element: (
          <GroupMemberRoute>
            <MemberCycleDetailsPage />
          </GroupMemberRoute>
        )
      },
      {
        path: '/groups/:groupId',
        element: (
          <GroupMemberRoute>
            <MemberDashboardPage />
          </GroupMemberRoute>
        )
      },
      {
        path: '/admin',
        element: (
          <RoleRoute>
            <PlatformAdminDashboardPage />
          </RoleRoute>
        )
      },
      {
        path: '/admin/reconciliation',
        element: (
          <RoleRoute>
            <ReconciliationPage />
          </RoleRoute>
        )
      },
      {
        path: '/admin/financial-accounts',
        element: (
          <RoleRoute>
            <FinancialAccountsPage />
          </RoleRoute>
        )
      },
      {
        path: '/admin/financial-accounts/:groupId',
        element: (
          <RoleRoute>
            <FinancialAccountDetailsPage />
          </RoleRoute>
        )
      },
      {
        path: '/admin/financial-accounts/:groupId/cycles/:cycleId',
        element: (
          <RoleRoute>
            <FinancialAccountDetailsPage />
          </RoleRoute>
        )
      },
      {
        path: '/cooperatives',
        element: (
          <GroupAdminRoute allowNoGroup>
            <CooperativesPage />
          </GroupAdminRoute>
        )
      },
      {
        path: '/members',
        element: (
          <GroupAdminRoute>
            <MembersPage />
          </GroupAdminRoute>
        )
      },
      {
        path: '/reconciliation',
        element: (
          <RoleRoute>
            <Navigate to="/admin/reconciliation" replace />
          </RoleRoute>
        )
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
]);
