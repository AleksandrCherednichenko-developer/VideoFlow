import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "../components/layout/AppLayout";
import { AccountsPage } from "../pages/AccountsPage";
import { CreatePage } from "../pages/CreatePage";
import { DashboardPage } from "../pages/DashboardPage";
import { HistoryPage } from "../pages/HistoryPage";
import { InstallPage } from "../pages/InstallPage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { SchedulePage } from "../pages/SchedulePage";
import { SettingsPage } from "../pages/SettingsPage";
import { ProtectedRoute } from "./ProtectedRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />
      <Route element={<RegisterPage />} path="/register" />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route element={<Navigate replace to="/dashboard" />} index />
        <Route element={<DashboardPage />} path="/dashboard" />
        <Route element={<CreatePage />} path="/create" />
        <Route element={<SchedulePage />} path="/schedule" />
        <Route element={<HistoryPage />} path="/history" />
        <Route element={<AccountsPage />} path="/accounts" />
        <Route element={<SettingsPage />} path="/settings" />
        <Route element={<InstallPage />} path="/install" />
      </Route>
      <Route element={<Navigate replace to="/dashboard" />} path="*" />
    </Routes>
  );
}
