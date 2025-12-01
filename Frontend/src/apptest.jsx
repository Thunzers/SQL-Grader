{/* PROFILE DROPDOWN *
import { useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/StudentDashboard";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");  

  return (
    isLoggedIn ? 
      <Dashboard 
        setIsLoggedIn={setIsLoggedIn} 
        userEmail={userEmail}             
      /> 
      : 
      <Login 
        setIsLoggedIn={setIsLoggedIn} 
        setUserEmail={setUserEmail}       
      />
  );
}
/* PROFILE DROPDOWN */}