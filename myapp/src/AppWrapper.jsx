import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import WorkspacesPage from "./pages/WorkspacesPage";
import WorkspaceDetails from './pages/WorkspaceDetails';
import { Toaster } from 'react-hot-toast';
import PasswordResetPage from "./pages/PasswordReset";
import EmailVerifySuccess from "./pages/EmailCheckVerifiedPage";
import EmailLinkVerifyPage from "./pages/EmailLinkVerification";
import EmailSubmittedPage from "./pages/EmailSubmittedPage";
import ProfilePage from "./pages/ProfilePage";
import ClientPage from "./redux+page/client/ClientPage";
import UserPage from "./redux+page/user/UserPage";
import ProjectPage from "./redux+page/Project/ProjectPage";
import ProjectDetailsPage from "./redux+page/Project/ProjectDeatilsPage";
import ConfirmEmail from "./pages/ConfirmEmail";
import CompanyPage from "./redux+page/company/CompanyPage";
import MapViewer from "./pages/MapViewer";
import MapWindow from "./mapviewer/MapWindow";
import ImageWindow from "./mapviewer/ImageWindow";
import ThreeDWindow from "./mapviewer/ThreeDWindow";
import LayerWindow from "./mapviewer/LayersWindow";
import ProjectMapSelector from "./mapviewer/ProjectSelector";

function AppWrapper() {
  const location = useLocation();
  // Determine if the current route is `/login`
  const isSignInOrSignUpPage = location.pathname === "/sign-in" || location.pathname === "/sign-up" || location.pathname === "/confirm-email" || location.pathname === "/reset-password" || location.pathname === "/verify-email"

  return (
    <div className={`flex ${isSignInOrSignUpPage ? "w-full" : ""}`}>
        {/* Show Sidebar only if not on the login page */}
        {!isSignInOrSignUpPage && <Sidebar /> }
        <div className={`${isSignInOrSignUpPage ? "w-full" : "flex-1 ml-16 bg-gray-100 min-h-screen-grow"}`}>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                {/* <Route path="/users" element={<UsersPage />} /> */}

                <Route path="/workspaces" element={<WorkspacesPage />} />
                <Route path="/workspaces/:id" element={<WorkspaceDetails />} />

                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/sign-in" element={<SignInPage />} />
                <Route path="/sign-up" element={<SignUpPage />} />
                {/* <Route path="/forgot-password" element={<ForgotPasswordPage />} /> */}


                <Route path="/confirm-email" element={<ConfirmEmail />} />              {/*  email verification for password reset */}
                <Route path="/reset-password" element={< PasswordResetPage/>} />
                <Route path="/success" element={<EmailVerifySuccess />} />                       {/* after email verifaction is done */}
                <Route path="/verify-email" element={<EmailLinkVerifyPage />} /> 
                <Route path="/emailres" element={<EmailSubmittedPage />} />                 {/* Email link Verify after Register is done */}
               <Route path="/user-profile" element={<ProfilePage />} />    
              <Route path="/users" element={<UserPage />} />
              <Route path="/clients" element={<ClientPage />} />
              <Route path="/projects" element={<ProjectPage />} />
             <Route path="/project-details-Page/:projectId" element={<ProjectDetailsPage />} />
            <Route path="/company" element={<CompanyPage />} />
    
            <Route path="/map/:projectId" element={<MapViewer />} />
            <Route path="/map" element={<Navigate to="/map/default" replace />} />
            {/* <Route path="/map" element={<ProjectMapSelector />} /> */}
             <Route path="/mapwindow" element={<MapWindow />} />
              <Route path="/imagewindow" element={<ImageWindow />} />
               <Route path="/threewindow" element={<ThreeDWindow />} />
                <Route path="/layerwindow" element={<LayerWindow />} />

            </Routes>
      </div>
        <Toaster position="top-right" />
    </div>
  )
}

export default AppWrapper
