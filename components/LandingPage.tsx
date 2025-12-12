
import React from 'react';
import { Sprout, MapPin, Mail, Lock, Instagram, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingPageProps {
  onLoginClick: () => void;
}

// Staggered Text Animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-hidden relative flex flex-col">
      
      {/* Background Decor - Animated with Framer Motion */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0], 
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-teal-50 rounded-full mix-blend-multiply filter blur-[100px] opacity-70"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            x: [0, -30, 0],
            y: [0, -50, 0], 
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-50 rounded-full mix-blend-multiply filter blur-[100px] opacity-70"
        />
      </div>

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
        className="px-6 py-6 flex justify-between items-center max-w-5xl mx-auto w-full z-50"
      >
        <div className="flex items-center space-x-2 group cursor-pointer">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.1 }}
            className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-200"
          >
            <Sprout className="w-6 h-6" />
          </motion.div>
          <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-teal-700 transition-colors">Galway Sun Sprouts</span>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onLoginClick}
          className="flex items-center space-x-2 text-sm font-bold text-slate-500 hover:text-teal-600 hover:bg-teal-50 px-4 py-2 rounded-full transition-all border border-transparent hover:border-teal-100"
        >
          <Lock className="w-4 h-4" />
          <span>Farmer Access</span>
        </motion.button>
      </motion.nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center px-6 py-8 md:py-12">
        <div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row items-center gap-12 md:gap-20">
          
          {/* Left Text Content - Staggered */}
          <motion.div 
            className="flex-1 space-y-8 text-center md:text-left"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center space-x-2 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
                <span className="text-xs font-bold text-teal-800 uppercase tracking-wide">Growing Now</span>
              </div>
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1] mb-6">
              Small Scale. <br />
              <motion.span 
                className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 inline-block"
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                style={{ backgroundSize: "200% auto" }}
              >
                Big Flavor.
              </motion.span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-lg text-slate-600 leading-relaxed max-w-lg mx-auto md:mx-0">
              We are a micro-urban farm located in the heart of Galway. Operating out of a highly efficient <strong>2x2 meter shed</strong>, we supply local chefs and households with ultra-fresh, sustainable microgreens harvested weekly.
            </motion.p>

            {/* Compact Info Row */}
            <motion.div variants={itemVariants} className="flex flex-wrap justify-center md:justify-start gap-4 text-sm font-bold text-slate-500">
               {[
                 { icon: MapPin, text: 'Galway City' },
                 { icon: Sprout, text: '100% Organic Seeds' },
                 { icon: ArrowRight, text: 'Harvested on Demand' }
               ].map((item, idx) => (
                  <motion.div 
                    key={idx}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="flex items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 cursor-default"
                  >
                    <item.icon className="w-4 h-4 mr-2 text-teal-500" />
                    {item.text}
                  </motion.div>
               ))}
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center justify-center md:justify-start space-x-4 pt-2">
              <motion.a 
                href="mailto:hello@galwaysunsprouts.com" 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center"
              >
                <Mail className="w-4 h-4 mr-2" />
                Get in Touch
              </motion.a>
              <motion.a 
                href="#" 
                whileHover={{ scale: 1.05, color: '#db2777', borderColor: '#fbcfe8' }}
                whileTap={{ scale: 0.95 }}
                className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-600 transition-colors shadow-sm"
              >
                 <Instagram className="w-5 h-5" />
              </motion.a>
            </motion.div>
          </motion.div>

          {/* Right Visual */}
          <div className="flex-1 w-full max-w-md relative">
             <motion.div 
                className="relative aspect-[4/5] md:aspect-square"
                initial={{ opacity: 0, scale: 0.8, rotate: 10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
             >
                <motion.div 
                  animate={{ rotate: [3, 0, 3] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-gradient-to-br from-teal-100 to-emerald-50 rounded-[2.5rem] transform"
                ></motion.div>
                
                <motion.img 
                  src="https://images.unsplash.com/photo-1536636730397-5b62b083c74c?auto=format&fit=crop&q=80&w=800" 
                  alt="Fresh Microgreens" 
                  className="absolute inset-0 w-full h-full object-cover rounded-[2.5rem] shadow-2xl z-10"
                  crossOrigin="anonymous"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.5 }}
                />
                
                {/* Floating Card */}
                <motion.div 
                   initial={{ opacity: 0, x: -50 }}
                   animate={{ opacity: 1, x: 0, y: [0, -10, 0] }}
                   transition={{ 
                     opacity: { delay: 0.8, duration: 0.5 },
                     x: { delay: 0.8, duration: 0.5 },
                     y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 } 
                   }}
                   className="absolute -bottom-6 -left-6 bg-white p-5 rounded-2xl shadow-xl border border-slate-100 max-w-[200px] z-20"
                >
                   <p className="text-xs font-bold text-slate-400 uppercase mb-1">Current Batch</p>
                   <p className="font-bold text-slate-800">Sunflower Shoots</p>
                   <p className="text-xs text-teal-600 font-medium mt-1">Harvesting Friday</p>
                </motion.div>
             </motion.div>
          </div>

        </div>
      </main>

      {/* Minimal Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="py-6 text-center text-xs text-slate-400 font-medium"
      >
         © {new Date().getFullYear()} Galway Sun Sprouts. Urban Microgreens.
      </motion.footer>
    </div>
  );
};

export default LandingPage;
