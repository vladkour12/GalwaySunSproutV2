
import React, { useState } from 'react';
import { Sprout, ArrowRight, Lock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onBack: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onBack }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.toLowerCase() === 'grow' || password.length > 0) {
      onLoginSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.4, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
      />
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3], x: [-20, 20, -20] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md p-8 rounded-[2rem] shadow-xl border border-slate-100 relative z-10"
      >
        <button 
          onClick={onBack}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 mb-6 flex items-center"
        >
          ← Back to Website
        </button>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-teal-400 shadow-lg mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Farmer Access</h2>
          <p className="text-slate-500 text-sm mt-2">Enter your shed PIN to access the management dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <motion.div 
             className="relative"
             animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
             transition={{ duration: 0.4 }}
          >
            <input 
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              className={`w-full p-4 bg-slate-50 border-2 ${error ? 'border-red-100 bg-red-50 text-red-900' : 'border-slate-100 focus:border-teal-500'} rounded-xl text-center text-lg font-bold outline-none transition-all placeholder:font-normal`}
              placeholder="••••"
              autoFocus
            />
            {error && (
               <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-6 left-0 right-0 text-center text-xs text-red-500 font-bold flex items-center justify-center"
               >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Incorrect PIN (Try "grow")
               </motion.div>
            )}
          </motion.div>

          <motion.button 
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-200 transition-all flex items-center justify-center"
          >
            Enter Shed
            <ArrowRight className="w-5 h-5 ml-2" />
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginPage;
