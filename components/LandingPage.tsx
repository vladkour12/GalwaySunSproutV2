import React, { useState, useEffect, useRef } from 'react';
import { Sprout, MapPin, Mail, Lock, Instagram, ArrowRight, Leaf, Truck, Sun, Clock, ChevronDown, CheckCircle2, ChefHat, Droplets, Sparkles } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';

interface LandingPageProps {
  onLoginClick: () => void;
}

// --- Sub-components for Animations ---

const LetterPullUp = ({ text, className = "", delayStr = 0 }: { text: string, className?: string, delayStr?: number }) => {
  const letters = text.split("");
  return (
    <span className={`inline-block overflow-hidden ${className}`}>
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          initial={{ y: "100%" }}
          whileInView={{ y: 0 }}
          viewport={{ once: true }}
          transition={{
            delay: delayStr + i * 0.03,
            type: "spring",
            stiffness: 100,
            damping: 10
          }}
          className="inline-block"
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </span>
  );
};

const SpotlightCard = ({ children, className = "", spotlightColor = "rgba(20, 184, 166, 0.2)" }: { children: React.ReactNode, className?: string, spotlightColor?: string }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div 
      className={`relative overflow-hidden group ${className}`}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              ${spotlightColor},
              transparent 80%
            )
          `,
        }}
      />
      {children}
    </div>
  );
};

const SpotlightButton = ({ children, className = "", onClick, href, spotlightColor = "rgba(255, 255, 255, 0.25)" }: { children: React.ReactNode, className?: string, onClick?: () => void, href?: string, spotlightColor?: string }) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
  
    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
      const { left, top } = currentTarget.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    }
    
    const Component = href ? motion.a : motion.button;
    
    // @ts-ignore
    return (
      <Component
        href={href}
        onClick={onClick}
        className={`relative overflow-hidden group cursor-pointer ${className}`}
        onMouseMove={handleMouseMove}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Spotlight Effect */}
        <motion.div
          className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                150px circle at ${mouseX}px ${mouseY}px,
                ${spotlightColor},
                transparent 80%
              )
            `,
          }}
        />
        <div className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </div>
      </Component>
    );
};

// --- Main Component ---

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);
  
  // Global Mouse tracking for background parallax
  const globalMouseX = useMotionValue(0);
  const globalMouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 50 };
  const backgroundX = useSpring(globalMouseX, springConfig);
  const backgroundY = useSpring(globalMouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      globalMouseX.set(e.clientX);
      globalMouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Parallax transforms for blobs
  const blob1X = useTransform(backgroundX, [0, window.innerWidth], [0, 100]);
  const blob1Y = useTransform(backgroundY, [0, window.innerHeight], [0, 50]);
  const blob2X = useTransform(backgroundX, [0, window.innerWidth], [0, -100]);
  const blob2Y = useTransform(backgroundY, [0, window.innerHeight], [0, -50]);

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
      
      {/* Global Animated Background Elements (Fixed & Interactive) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
         {/* Blob 1 - Top Right - Follows Mouse */}
         <motion.div 
           style={{ x: blob1X, y: blob1Y }}
           animate={{ 
             scale: [1, 1.2, 1], 
             rotate: [0, 20, 0] 
           }}
           transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
           className="absolute -top-[10%] -right-[10%] w-[800px] h-[800px] bg-teal-200/20 rounded-full blur-[120px]" 
         />
         
         {/* Blob 2 - Bottom Left - Follows Mouse Inversely */}
         <motion.div 
           style={{ x: blob2X, y: blob2Y }}
           animate={{ 
             scale: [1, 1.1, 1], 
             rotate: [0, -15, 0] 
           }}
           transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
           className="absolute -bottom-[10%] -left-[10%] w-[700px] h-[700px] bg-emerald-200/20 rounded-full blur-[100px]" 
         />

         {/* Blob 3 - Middle Center */}
         <motion.div 
           animate={{ 
             scale: [0.8, 1, 0.8], 
             opacity: [0.1, 0.3, 0.1],
             x: [0, 30, 0],
           }}
           transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 5 }}
           className="absolute top-[40%] left-[30%] w-[600px] h-[600px] bg-lime-100/30 rounded-full blur-[150px]" 
         />

         {/* Floating Particles */}
         {[...Array(15)].map((_, i) => (
           <motion.div
             key={i}
             className="absolute bg-teal-400/30 rounded-full blur-sm"
             style={{
               width: Math.random() * 6 + 2,
               height: Math.random() * 6 + 2,
               top: `${Math.random() * 100}%`,
               left: `${Math.random() * 100}%`,
             }}
             animate={{
               y: [0, Math.random() * -300 - 50, 0],
               x: [0, Math.random() * 100 - 50, 0],
               opacity: [0, 0.8, 0],
               scale: [0, 1.5, 0],
             }}
             transition={{
               duration: Math.random() * 10 + 10,
               repeat: Infinity,
               ease: "easeInOut",
               delay: Math.random() * 10,
             }}
           />
         ))}
      </div>

      {/* Noise Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-[60]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

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
          <SpotlightButton 
            onClick={onLoginClick}
            className="bg-slate-900 text-white rounded-full px-5 py-2.5 text-sm font-bold shadow-lg shadow-slate-900/20"
          >
            <Lock className="w-4 h-4" />
            <span>Farmer Login</span>
          </SpotlightButton>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden z-10 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center perspective-[1000px]">
          
          <SpotlightCard 
            className="inline-flex items-center bg-white/80 backdrop-blur-sm border border-emerald-100 rounded-full mb-8 shadow-sm"
          >
             <div className="flex items-center gap-2 px-2 py-1.5 pr-4">
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">Fresh</span>
                <span className="text-sm font-medium text-slate-600">Harvesting every week</span>
             </div>
          </SpotlightCard>

          <div className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-slate-900 leading-[0.95] mb-8">
            <LetterPullUp text="Small Scale." delayStr={0.1} />
            <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-600 bg-[length:200%_auto] animate-gradient">
              <LetterPullUp text="Big Flavor." delayStr={0.5} />
            </span>
          </div>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-xl md:text-2xl text-slate-600 max-w-2xl leading-relaxed mb-12"
          >
            Galway's premier microgreens partner for chefs. We deliver ultra-fresh, precision-grown varieties tailored to your menu's unique flavor and aesthetic needs.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <SpotlightButton 
              href="mailto:hello@galwaysunsprouts.com" 
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-900/20"
              spotlightColor="rgba(20, 184, 166, 0.4)"
            >
                <Mail className="w-5 h-5" />
                Get in Touch
            </SpotlightButton>

            <SpotlightButton 
              href="#" 
              className="px-8 py-4 bg-white/50 backdrop-blur-sm text-slate-700 border border-slate-200 rounded-2xl font-bold hover:border-slate-300 shadow-sm"
              spotlightColor="rgba(20, 184, 166, 0.15)"
            >
              <Instagram className="w-5 h-5 text-pink-600 group-hover:scale-110 transition-transform" />
              Follow Us
            </SpotlightButton>
          </motion.div>

          {/* Mobile Hero Image - Visible only on small screens */}
          <motion.div 
            initial={{ opacity: 0, y: 40, rotateX: 20 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 1.2, type: "spring", stiffness: 50 }}
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
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
               <LetterPullUp text="Why Microgreens?" delayStr={0.2} />
            </h2>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="text-slate-500 max-w-2xl mx-auto"
            >
              More than just a garnish. These tiny plants are packed with flavor, nutrition, and sustainability benefits.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <SpotlightCard 
                key={idx}
                className="bg-white/80 backdrop-blur-sm p-8 rounded-[2rem] border border-white/50 shadow-sm hover:shadow-lg transition-all cursor-default"
              >
                <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6 relative z-10`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 relative z-10">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed relative z-10">{feature.desc}</p>
              </SpotlightCard>
            ))}
          </div>

          {/* Large Feature Block */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <SpotlightCard 
               className="md:col-span-3 bg-gradient-to-br from-emerald-900 to-teal-900 rounded-[2.5rem] p-8 md:p-12 text-white border border-white/10"
               spotlightColor="rgba(255, 255, 255, 0.1)"
            >
               <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                 <div className="flex-1">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-teal-300 mb-6 border border-white/10">
                       <ChefHat className="w-3.5 h-3.5" />
                       <span>Chef Partnership Program</span>
                    </div>
                    <div className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
                        <LetterPullUp text="Curated for Culinary Excellence." delayStr={0.2} />
                    </div>
                    <p className="text-slate-300 max-w-lg leading-relaxed mb-8 text-lg">
                      From seed to harvest, every tray is monitored for optimal flavor and texture. We work directly with chefs to grow exactly what your menu needs, when you need it.
                    </p>
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                          {[1,2,3].map((_, i) => (
                            <div key={i} className="w-10 h-10 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-xs font-bold shadow-lg">
                                <Sprout className="w-4 h-4 text-teal-400" />
                            </div>
                          ))}
                        </div>
                        <span className="text-sm font-medium text-slate-400">Growing custom orders</span>
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
                               <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">Made to Order</h4>
                            <p className="text-sm text-slate-400">Specify your preferred harvest stage and variety mix for the perfect plate garnish.</p>
                        </div>
                    </motion.div>
                 </div>
               </div>
               
               {/* Decorative Circle */}
               <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
               <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            </SpotlightCard>
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
