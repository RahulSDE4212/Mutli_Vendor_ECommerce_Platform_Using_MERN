import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../Context/AppContext';
import { loginVendor } from '../api';

const VendorLogin = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, user } = useAppContext();

  // Redirect if already logged in as a vendor
  useEffect(() => {
    if (user && user.isVendor) {
      navigate('/vendor');
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call backend vendor login API
      const response = await loginVendor({ email: identifier, password });
      const { token, vendor } = response.data;

      // Store token
      localStorage.setItem('token', token);

      // Update app context (vendor object with isVendor flag)
      const vendorWithFlag = { ...vendor, isVendor: true };
      login(vendorWithFlag, token);

      // Navigate to vendor dashboard
      navigate('/vendor');
    } catch (err) {
      console.error('Vendor login failed', err);
      const errorMsg = err.response?.data?.message || 'Invalid credentials';
      alert(`Login failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900">Vendor Login</h2>
        <p className="text-gray-500 mt-2">Access your vendor dashboard</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Business Email</label>
          <input
            type="email"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="Enter business email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <input
            type="password"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
        >
          {loading ? 'Signing In...' : 'Sign In as Vendor'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          New to selling?{' '}
          <Link to="/vendor-register" className="font-medium text-indigo-600 hover:text-indigo-500">Register as a vendor</Link>
        </p>
      </div>
    </div>
  );
};

export default VendorLogin;







//   ******************* VendorRegister.js



import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../Context/AppContext';
import { registerVendor } from '../api.js';

const VendorRegister = () => {
  const [identifier, setIdentifier] = useState(''); // Mobile
  const [email, setEmail] = useState(''); // Email
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAppContext();

  // Ensure fields are blank whenever the component mounts
  useEffect(() => {
    setName('');
    setEmail('');
    setIdentifier('');
    setPassword('');
    setCompanyName('');
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Prepare data for backend (storeName maps to companyName)
    const vendorData = {
      name: name.trim(),
      email: email.trim(),
      password,
      storeName: companyName.trim(),
      mobile: identifier // optional, backend may ignore
    };

    try {
      const response = await registerVendor(vendorData);
      console.log("the data that i got after registering vendor ", response);
      const { token, vendor } = response.data;

      // Store token
      localStorage.setItem('token', token);
      localStorage.setItem('userType', 'vendor');

      // Update app context
      login(vendor, token);
      
      // Navigate to vendor dashboard
      navigate('/vendor');
      console.log("after vendor registration !!!!");
    } catch (error) {
      console.error('Vendor registration failed:', error);
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      alert(`Registration error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900">Vendor Registration</h2>
        <p className="text-gray-500 mt-2">Start selling on </p>
      </div>

      <form onSubmit={handleRegister} className="space-y-6" autoComplete="off">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
          <input
            type="text"
            required
            pattern="[A-Za-z\s]+"
            title="Name should only contain alphabets"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value.replace(/[^A-Za-z\s]/g, ''))}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="Tech Haven LLC"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Business Email</label>
          <input
            type="email"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="vendor@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
          <input
            type="tel"
            required
            pattern="[0-9]{10}"
            title="Please enter a valid 10-digit mobile number"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="Enter 10-digit mobile number"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <input
            type="password"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Registering...
            </>
          ) : (
            'Register as Vendor'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have a vendor account?{' '}
          <Link to="/vendor-login" className="font-medium text-indigo-600 hover:text-indigo-500">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default VendorRegister;
