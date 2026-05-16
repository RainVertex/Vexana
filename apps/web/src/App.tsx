import { BrowserRouter } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { SidebarProvider } from "./components/sidebar/SidebarContext";
import { AppRoutes } from "./AppRoutes";
import { ApiProvider, StarredProvider } from "@internal/api-client/react";
import { ThemeProvider } from "./theme";
import { AuthProvider, RequireAuth } from "./auth";
import { VisitTrackerProvider } from "./widgets";
import "./styles/global.css";

export default function App() {
  return (
    <ThemeProvider>
      <ApiProvider>
        <AuthProvider>
          <RequireAuth>
            <BrowserRouter>
              <VisitTrackerProvider>
                <StarredProvider>
                  <SidebarProvider>
                    <AppLayout>
                      <AppRoutes />
                    </AppLayout>
                  </SidebarProvider>
                </StarredProvider>
              </VisitTrackerProvider>
            </BrowserRouter>
          </RequireAuth>
        </AuthProvider>
      </ApiProvider>
    </ThemeProvider>
  );
}
