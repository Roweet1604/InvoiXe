import { signOut } from 'firebase/auth';
import { LogOut, Receipt } from 'lucide-react';
import { auth } from '../firebase';

const Navbar = ({ user }) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-brand">
            <Receipt className="h-8 w-8 text-blue-600" />
            <h1>InvoiXe</h1>
          </div>
          
          <div className="navbar-user">
            <span>
              Welcome, {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="btn btn-danger ml-4 flex items-center gap-2 text-bold"
            >
              <LogOut className="h-4 w-4 font-bold text-white" />
              <span>Logout</span>
            </button>
          </div>
      </div>
    </nav>
  );
};

export default Navbar;