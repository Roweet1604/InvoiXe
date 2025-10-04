import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { Lock, LogIn, Mail, Receipt, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { auth } from '../firebase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient flex items-center justify-center" style={{padding: '1rem'}}>
      <div className="max-w-md w-full card">
        <div className="text-center mb-8">
          <div className="icon-circle">
            <Receipt className="h-8 w-8 text-white" />
          </div>
                    <h1 className="text-4xl font-bold text-blue-700">InvoiXe</h1>
          <h2 className="text-3xl font-bold text-gray-900">Receipt Generator</h2>
          <p className="text-gray-600 mt-2">Simple receipt creation and verification</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              Email Address
            </label>
            <div style={{position: 'relative'}}>
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" style={{position: 'absolute', left: '0.75rem', top: '0.75rem'}} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{paddingLeft: '2.5rem'}}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              Password
            </label>
            <div style={{position: 'relative'}}>
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" style={{position: 'absolute', left: '0.75rem', top: '0.75rem'}} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{paddingLeft: '2.5rem'}}
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? (
              <div className="loading-spinner"></div>
            ) : (
              <>
                {isLogin ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                <span>{isLogin ? 'Sign In' : 'Sign Up'}</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 font-medium transition-colors"
          >
            {isLogin 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;