import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../Context/AppContext';
import { registerUser } from '../api';

const Register = () => {
  const [identifier, setIdentifier] = useState(''); // Mobile
  const [email, setEmail] = useState(''); // Email
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAppContext();

  // Ensure fields are blank whenever the component mounts
  useEffect(() => {
    setName('');
    setEmail('');
    setIdentifier('');
    setPassword('');
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare data for backend
      const userData = {
        name: name || 'User',
        email: email || identifier,
        password,
        role: 'user',
      };

      // Call backend register API
      const response = await registerUser(userData);
      const { token, user } = response.data;

      // Store token
      localStorage.setItem('token', token);

      // Update app context
      login(user, token);

      // Navigate to home
      navigate('/');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Registration failed';
      alert(`Registration failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900">Create Account</h2>
        <p className="text-gray-500 mt-2">Join UniBox today</p>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
          <input
            type="email"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number (Optional)</label>
          <input
            type="tel"
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
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;


