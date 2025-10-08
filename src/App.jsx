import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { auth } from './firebase';

// Pages
import CreateReceipt from './pages/CreateReceipt';
import Login from './pages/Login';
import VerifyReceipt from './pages/VerifyReceipt';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router basename="/InvoiXe">
      <Routes>
        {/* Public Routes */}
        <Route path="/verify/:id" element={<VerifyReceipt />} />
        <Route path="/verify" element={<VerifyReceipt />} />
        
        {/* Authentication Routes */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/create-receipt" /> : <Login />} 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/create-receipt" 
          element={user ? <CreateReceipt /> : <Navigate to="/login" />} 
        />
        
        {/* Default Routes */}
        <Route 
          path="/" 
          element={user ? <Navigate to="/create-receipt" /> : <Navigate to="/login" />} 
        />

        {/* Catch all - keep this as the last route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;