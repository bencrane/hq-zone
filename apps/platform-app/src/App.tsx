/**
 * App — the platform-app router shell.
 *
 * Routes:
 *   `/`                          → HQ home (cards: Workbooks, TAM, Lists, Govt Leads).
 *   `/map`                       → catalyst map demo (anonymous).
 *   `/workbooks`                 → Clay-shape workbook index (auth).
 *   `/workbooks/:workbook_id`    → workbook detail (tables list, auth).
 *   `/tables/:table_id`          → single table view (auth, flat URL with breadcrumb).
 *   `/find/companies`            → criteria-driven find-companies route (auth).
 *   `/tam`                       → person-grain lead search (auth).
 *   `/tam/:person_id`            → single person detail (auth).
 *   `/lists`                     → saved lead lists (auth).
 *   `/lists/:list_id`            → single list detail (auth).
 *   `/opportunities`             → SAM.gov active opportunities list (auth).
 *   `/opportunities/:notice_id`  → single opportunity detail (auth).
 *   `/leads`                     → read-only view over gtm.people (auth).
 *   `/campaigns/new`             → full-page campaign builder (auth).
 */

import { Navigate, Route, Routes } from "react-router-dom";

import CampaignBuilder from "./campaigns/CampaignBuilder";
import { HQBadge } from "./components/HQBadge";
import LeadsList from "./leads/LeadsList";
import { AuthProvider, useAuth } from "./lib/auth";
import ListDetail from "./lists/ListDetail";
import ListsOverview from "./lists/ListsOverview";
import OppDetail from "./opportunities/OppDetail";
import OppsList from "./opportunities/OppsList";
import { SignIn } from "./opportunities/SignIn";
import Home from "./routes/Home";
import MapDemo from "./routes/MapDemo";
import FindCompaniesRoute from "./tables/FindCompaniesRoute";
import TableView from "./tables/TableView";
import TamDetail from "./tam/TamDetail";
import TamList from "./tam/TamList";
import WorkbookDetail from "./workbooks/WorkbookDetail";
import WorkbooksIndex from "./workbooks/WorkbooksIndex";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <SignIn />;
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <HQBadge />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<MapDemo />} />
        <Route
          path="/tam"
          element={
            <RequireAuth>
              <TamList />
            </RequireAuth>
          }
        />
        <Route
          path="/tam/:person_id"
          element={
            <RequireAuth>
              <TamDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/lists"
          element={
            <RequireAuth>
              <ListsOverview />
            </RequireAuth>
          }
        />
        <Route
          path="/lists/:list_id"
          element={
            <RequireAuth>
              <ListDetail />
            </RequireAuth>
          }
        />
        <Route path="/tables" element={<Navigate to="/workbooks" replace />} />
        <Route
          path="/workbooks"
          element={
            <RequireAuth>
              <WorkbooksIndex />
            </RequireAuth>
          }
        />
        <Route
          path="/workbooks/:workbook_id"
          element={
            <RequireAuth>
              <WorkbookDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/tables/:table_id"
          element={
            <RequireAuth>
              <TableView />
            </RequireAuth>
          }
        />
        <Route
          path="/find/companies"
          element={
            <RequireAuth>
              <FindCompaniesRoute />
            </RequireAuth>
          }
        />
        <Route
          path="/opportunities"
          element={
            <RequireAuth>
              <OppsList />
            </RequireAuth>
          }
        />
        <Route
          path="/opportunities/:notice_id"
          element={
            <RequireAuth>
              <OppDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/leads"
          element={
            <RequireAuth>
              <LeadsList />
            </RequireAuth>
          }
        />
        <Route
          path="/campaigns/new"
          element={
            <RequireAuth>
              <CampaignBuilder />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
