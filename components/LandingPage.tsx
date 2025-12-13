import React, { useState, useEffect } from 'react';
import { Sprout, MapPin, Mail, Lock, Instagram, ArrowRight, Leaf, Truck, Sun, Clock, ChevronDown, CheckCircle2, ChefHat, Droplets, Sparkles } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';

interface LandingPageProps {
  onLoginClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);
  
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    { title: "Ultra Fresh", desc: "Harvested < 24h before delivery", icon: Sparkles, color: "bg-amber-100 text-amber-700" },
    { title: "Zero Miles", desc: "Grown right here in Galway City", icon: MapPin, color: "bg-teal-100 text-teal-700" },
    { title: "100% Organic", desc: "No pesticides, just water & light", icon: Droplets, color: "bg-emerald-100 text-emerald-700" },
    { title: "Chef Grade", desc: "Supplying top local restaurants", icon: ChefHat, color: "bg-rose-100 text-rose-700" },
  ];

  // Varieties ticker
  const varieties = ["Sunflower", "Pea Shoots", "Radish Rambo", "Broccoli", "Red Amaranth", "Mustard", "Coriander", "Basil", "Arugula"];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden selection:bg-teal-200 selection:text-teal-900 relative">
      
      {/* Global Animated Background Elements (Fixed) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
         {/* Blob 1 - Top Right */}
         <motion.div 
           animate={{ 
             scale: [1, 1.2, 1], 
             x: [0, 100, 0], 
             y: [0, 50, 0], 
             rotate: [0, 20, 0] 
           }}
           transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
           className="absolute -top-[10%] -right-[10%] w-[800px] h-[800px] bg-teal-200/20 rounded-full blur-[120px]" 
         />
         
         {/* Blob 2 - Bottom Left */}
         <motion.div 
           animate={{ 
             scale: [1, 1.1, 1], 
             x: [0, -50, 0], 
             y: [0, -100, 0], 
             rotate: [0, -15, 0] 
           }}
           transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
           className="absolute -bottom-[10%] -left-[10%] w-[700px] h-[700px] bg-emerald-200/20 rounded-full blur-[100px]" 
         />

         {/* Blob 3 - Middle Center (New) */}
         <motion.div 
           animate={{ 
             scale: [0.8, 1, 0.8], 
             opacity: [0.1, 0.3, 0.1],
             x: [0, 30, 0],
           }}
           transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 5 }}
           className="absolute top-[40%] left-[30%] w-[600px] h-[600px] bg-lime-100/30 rounded-full blur-[150px]" 
         />

         {/* Floating Particles - Distributed Globally */}
         {[...Array(12)].map((_, i) => (
           <motion.div
             key={i}
             className="absolute bg-teal-400/20 rounded-full blur-xl"
             style={{
               width: Math.random() * 100 + 50,
               height: Math.random() * 100 + 50,
               top: `${Math.random() * 100}%`,
               left: `${Math.random() * 100}%`,
             }}
             animate={{
               y: [0, Math.random() * -200 - 50, 0],
               x: [0, Math.random() * 100 - 50, 0],
               opacity: [0.2, 0.5, 0.2],
               scale: [1, 1.5, 1],
             }}
             transition={{
               duration: Math.random() * 20 + 15,
               repeat: Infinity,
               ease: "easeInOut",
               delay: Math.random() * 10,
             }}
           />
         ))}
      </div>

      {/* Noise Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[60]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      {/* Navbar */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-white/70 backdrop-blur-xl border-b border-white/20"
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/20 group-hover:scale-110 transition-transform duration-300">
              <Sprout className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Galway Sun Sprouts</span>
          </div>
          <button 
            onClick={onLoginClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-sm font-bold transition-all shadow-lg shadow-slate-900/20 hover:shadow-slate-900/40 hover:-translate-y-0.5"
          >
            <Lock className="w-4 h-4" />
            <span>Farmer Login</span>
          </button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden z-10 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-emerald-100 rounded-full pl-2 pr-4 py-1.5 shadow-sm hover:shadow-md transition-shadow cursor-default mb-8"
          >
            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">Fresh</span>
            <span className="text-sm font-medium text-slate-600">Harvesting every week</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-slate-900 leading-[0.95] mb-8"
          >
            Small Scale.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-600 bg-[length:200%_auto] animate-gradient">
              Big Flavor.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl md:text-2xl text-slate-600 max-w-2xl leading-relaxed mb-12"
          >
            Galway's premier microgreens partner for chefs. We deliver ultra-fresh, precision-grown varieties tailored to your menu's unique flavor and aesthetic needs.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <a href="mailto:hello@galwaysunsprouts.com" className="group relative px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold overflow-hidden shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-slate-900/30 transition-all hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Get in Touch
              </span>
            </a>
            <a href="#" className="px-8 py-4 bg-white/50 backdrop-blur-sm text-slate-700 border border-slate-200 rounded-2xl font-bold hover:bg-white/80 transition-all hover:border-slate-300 flex items-center gap-2 group">
              <Instagram className="w-5 h-5 text-pink-600 group-hover:scale-110 transition-transform" />
              Follow Us
            </a>
          </motion.div>

          {/* Mobile Hero Image - Visible only on small screens */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full max-w-lg aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white relative mt-16 lg:hidden"
          >
            <img src="https://images.unsplash.com/photo-1536636730397-5b62b083c74c?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover" alt="Microgreens" crossOrigin="anonymous" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white text-left">
                <h3 className="text-2xl font-bold">Sunflower Shoots</h3>
                <p className="text-sm opacity-90">Grown locally in Galway</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Infinite Scroll Ticker */}
      <div className="bg-slate-900 py-3 overflow-hidden relative z-10">
         <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-transparent to-slate-900 z-10 pointer-events-none" />
         <motion.div 
            className="flex whitespace-nowrap gap-8"
            animate={{ x: [0, -1000] }}
            transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
         >
            {[...varieties, ...varieties, ...varieties].map((item, i) => (
               <div key={i} className="flex items-center gap-2 text-white/50 font-bold text-sm uppercase tracking-widest">
                  <Sprout className="w-4 h-4 text-teal-500" />
                  {item}
               </div>
            ))}
         </motion.div>
      </div>

      {/* Bento Grid Features */}
      <section className="py-20 px-6 relative z-10">
        {/* Subtle glass background for the section to separate it slightly from global background */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl -z-10 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Why Microgreens?</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">More than just a garnish. These tiny plants are packed with flavor, nutrition, and sustainability benefits.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5, borderColor: 'rgba(20, 184, 166, 0.3)' }}
                className="bg-white/80 backdrop-blur-sm p-8 rounded-[2rem] border border-white/50 shadow-sm hover:shadow-lg hover:shadow-teal-100/50 transition-all group cursor-default relative overflow-hidden"
              >
                <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 relative z-10`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 relative z-10">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed relative z-10">{feature.desc}</p>
                
                {/* Subtle gradient blob on hover */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-teal-100/50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </motion.div>
            ))}
          </div>

          {/* Large Feature Block */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div 
               initial={{ opacity: 0, x: -20 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               className="md:col-span-3 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden group"
            >
               <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                 <div className="flex-1">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-teal-300 mb-6 border border-white/10">
                       <CheckCircle2 className="w-3.5 h-3.5" />
                       <span>Sustainable Practice</span>
                    </div>
                    <h3 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">Grown with Purpose.<br/>Harvested with Pride.</h3>
                    <p className="text-slate-300 max-w-lg leading-relaxed mb-8 text-lg">
                      We use 95% less water than traditional farming and zero pesticides. Our efficient tray-based growing system maximizes space in an urban environment, bringing fresh food closer to where you live.
                    </p>
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                          {[1,2,3].map((_, i) => (
                            <div key={i} className="w-10 h-10 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-xs font-bold shadow-lg">
                                <Sprout className="w-4 h-4 text-teal-400" />
                            </div>
                          ))}
                        </div>
                        <span className="text-sm font-medium text-slate-400">Growing for the community</span>
                    </div>
                 </div>
                 
                 <div className="flex-1 w-full max-w-sm">
                    <motion.div 
                       whileHover={{ scale: 1.02, rotate: 1 }}
                       transition={{ type: "spring", stiffness: 300 }}
                       className="aspect-square bg-white/5 rounded-3xl border border-white/10 p-6 backdrop-blur-sm relative overflow-hidden"
                    >
                        {/* Abstract Map Graphic */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none">
                           <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                              <path d="M20,50 Q40,20 60,50 T90,50" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-teal-500" />
                              <path d="M10,60 Q30,30 50,60 T80,60" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-teal-500" />
                              <circle cx="50" cy="50" r="2" fill="currentColor" className="text-white" />
                           </svg>
                        </div>

                        <div className="h-full w-full bg-slate-800/80 rounded-2xl flex flex-col items-center justify-center text-center p-6 border border-white/5 relative z-10 shadow-2xl">
                            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-teal-500/30">
                               <Leaf className="w-8 h-8 text-white" />
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">Locally Grown</h4>
                            <p className="text-sm text-slate-400">Harvested weekly in Galway City for maximum freshness and minimal carbon footprint.</p>
                        </div>
                    </motion.div>
                 </div>
               </div>
               
               {/* Decorative Circle */}
               <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
               <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white/70 backdrop-blur-lg border-t border-slate-100 py-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-teal-200">
              <Sprout className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900">Galway Sun Sprouts</span>
          </div>
          <p className="text-slate-400 text-sm">© {new Date().getFullYear()} Urban Microgreens Farm. Galway, Ireland.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
