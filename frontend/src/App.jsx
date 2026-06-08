import React, { useState } from 'react';
import { Sparkles, ShieldAlert, User, Key, Mail, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import ProposalGenerator from './components/ProposalGenerator';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  // Session States
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  
  // Navigation View
  const [view, setView] = useState(token ? 'generator' : 'login'); // 'login' | 'signup' | 'generator' | 'admin'

  // Input fields for auth form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false); // role config checkbox
  const [showPass, setShowPass] = useState(false);
  
  // Feedback status
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all credentials.");
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errDetail = await response.json();
        throw new Error(errDetail.detail || "Authentication failed. Check credentials.");
      }

      const data = await response.json();
      setToken(data.access_token);
      setUser(data.user);
      
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setView('generator');
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Username and password cannot be empty.");
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');
    try {
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password, 
          role: isAdmin ? 'admin' : 'user' 
        })
      });

      if (!response.ok) {
        const errDetail = await response.json();
        throw new Error(errDetail.detail || "Registration failed. Try a different username.");
      }

      setInfo("Registration successful! You can now log in.");
      setView('login');
      setPassword('');
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setView('login');
    setUsername('');
    setPassword('');
    setError('');
    setInfo('');
  };

  // Switch between panels
  if (token && user) {
    if (view === 'admin' && user.role === 'admin') {
      return (
        <AdminDashboard 
          token={token} 
          onBack={() => setView('generator')} 
        />
      );
    }
    return (
      <ProposalGenerator 
        token={token} 
        user={user} 
        onLogout={handleLogout} 
        setView={setView}
      />
    );
  }

  // Auth Card Renderer
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '40px', animation: 'fadeIn 0.4s ease-out' }}>
        
        {/* Brand Banner */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '35px' }}>
          <div style={{ background: 'var(--primary)', padding: '12px', borderRadius: '16px', boxShadow: '0 0 25px var(--primary-glow)', marginBottom: '16px' }}>
            <Sparkles size={32} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', background: 'linear-gradient(90deg, #fff, var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            PROPOSAL.AI
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px', textAlign: 'center' }}>
            {view === 'login' ? 'Secure login to access AI generation services' : 'Create an account to start generating proposals'}
          </p>
        </div>

        {error && (
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem' }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {info && (
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--secondary)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem' }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{info}</span>
          </div>
        )}

        <form onSubmit={view === 'login' ? handleLogin : handleSignup}>
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: '44px' }} 
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Key size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              <input 
                type={showPass ? "text" : "password"} 
                className="form-input" 
                style={{ paddingLeft: '44px', paddingRight: '44px' }} 
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: '14px', top: '14px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {view === 'signup' && (
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
              <input 
                type="checkbox" 
                id="admin-role" 
                checked={isAdmin} 
                onChange={(e) => setIsAdmin(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="admin-role" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Register with Admin permissions (Dashboard access)
              </label>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px', marginTop: '15px' }}
            disabled={loading}
          >
            {loading ? 'Please wait...' : (view === 'login' ? 'Login Session' : 'Register Account')}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '25px', fontSize: '0.85rem' }}>
          {view === 'login' ? (
            <span style={{ color: 'var(--text-secondary)' }}>
              Don't have an account?{' '}
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer' }}
                onClick={() => { setView('signup'); setError(''); setInfo(''); }}
              >
                Sign up
              </button>
            </span>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>
              Already registered?{' '}
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer' }}
                onClick={() => { setView('login'); setError(''); setInfo(''); }}
              >
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
