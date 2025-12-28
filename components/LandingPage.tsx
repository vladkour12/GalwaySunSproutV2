import React, { useState, useEffect } from 'react';
import { Sprout, MapPin, Mail, Lock, Instagram, ArrowRight, ChefHat, Droplets, Sparkles, Leaf, CheckCircle2, TrendingUp } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { INITIAL_CROPS } from '../constants';

interface LandingPageProps {
  onLoginClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const yTransform = useTransform(scrollYProgress, [0, 0.3], [0, -50]);
  const [varietiesExpanded, setVarietiesExpanded] = useState(false);

  const features = [
    { 
      title: "Ultra Fresh", 
      desc: "Harvested within 24 hours of delivery", 
      icon: Sparkles, 
      gradient: "from-amber-500 to-orange-500"
    },
    { 
      title: "Local & Sustainable", 
      desc: "Grown right here in Galway City", 
      icon: MapPin, 
      gradient: "from-teal-500 to-cyan-500"
    },
    { 
      title: "100% Organic", 
      desc: "No pesticides, just pure water & light", 
      icon: Droplets, 
      gradient: "from-emerald-500 to-teal-500"
    },
    { 
      title: "Chef Approved", 
      desc: "Supplying top local restaurants", 
      icon: ChefHat, 
      gradient: "from-rose-500 to-pink-500"
    },
  ];

  const varieties = INITIAL_CROPS.map(crop => crop.name);

  return (
    <div className="min-h-screen overflow-x-hidden font-sans text-white bg-[radial-gradient(circle_at_20%_20%,rgba(0,217,163,0.08),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(196,181,253,0.08),transparent_32%),linear-gradient(135deg,#0b0f17_0%,#0f1624_50%,#0b101a_100%)]">
      
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-10 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-40 -left-20 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl" 
        />
      </div>
      
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 bg-[rgba(10,12,18,0.9)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.08)]"
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div 
            className="flex items-center gap-2 cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-[var(--mint)] to-[#00b894] rounded-lg flex items-center justify-center text-white">
              <Sprout className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-white hidden sm:inline">Sun Sprouts</span>
          </motion.div>
          
          <motion.button
            onClick={onLoginClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-2 bg-[var(--mint)] text-[#03130f] rounded-lg font-semibold text-sm shadow-[0_10px_30px_rgba(0,217,163,0.35)] hover:shadow-[0_14px_34px_rgba(0,217,163,0.45)] transition-all duration-200"
          >
            Login
          </motion.button>
        </div>
      </motion.nav>

      {/* Hero Section - Clean & Minimal */}
      <section className="relative pt-24 pb-32 px-4 sm:px-6 z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-[rgba(0,217,163,0.1)] border border-[rgba(0,217,163,0.2)] text-[var(--mint)] rounded-full mb-6 text-sm font-semibold tracking-wide"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-pulse"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Fresh. Local. Delicious.
          </motion.div>

          {/* Main Heading */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 leading-tight text-white drop-shadow-[0_12px_35px_rgba(0,0,0,0.35)]"
          >
            <span className="text-white">Premium Microgreens</span>
            <br />
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="bg-gradient-to-r from-[var(--mint)] via-[#6dd3ff] to-[var(--lavender)] bg-clip-text text-transparent"
            >
              Grown Right Here
            </motion.span>
          </motion.h1>

          {/* Subheading */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-lg sm:text-xl text-[var(--text-subtle)] max-w-2xl mx-auto leading-relaxed mb-12"
          >
            Precision-grown microgreens delivered fresh to your restaurant or home. Ultra-nutritious, packed with flavor, and grown sustainably in Galway.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-col sm:flex-row justify-center gap-4 mb-12"
          >
            <motion.a
              href="mailto:hello@galwaysunsprouts.com"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-[var(--mint)] text-[#03130f] rounded-xl font-semibold shadow-[0_14px_40px_rgba(0,217,163,0.35)] hover:shadow-[0_18px_46px_rgba(0,217,163,0.45)] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Mail className="w-5 h-5" />
              Contact Us
            </motion.a>

            <motion.a
              href="https://www.instagram.com/galwaysunsprouts"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-[rgba(255,255,255,0.08)] text-white rounded-xl font-semibold border border-[rgba(255,255,255,0.14)] hover:border-[rgba(255,255,255,0.25)] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Instagram className="w-5 h-5" />
              Follow Us
            </motion.a>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="grid grid-cols-3 gap-8 max-w-xl mx-auto pt-12 border-t border-[rgba(255,255,255,0.08)]"
          >
            {[
              { label: "Varieties", value: "20+" },
              { label: "Restaurants", value: "3+" },
              { label: "Weekly Harvest", value: "1kg+" }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-[var(--text-subtle)] font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="relative z-10 py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Why Choose Us
            </h2>
            <p className="text-lg text-[var(--text-subtle)] max-w-2xl mx-auto">
              Sustainable farming meets premium quality. Every tray is monitored with precision.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                whileHover={{ y: -8 }}
                className="glass-card-elevated p-8 rounded-2xl border border-[rgba(255,255,255,0.12)] shadow-lg hover:shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition-all duration-300"
              >
                <motion.div 
                  className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-6`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </motion.div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-[var(--text-subtle)] leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Varieties Section */}
      <section className="relative z-10 py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center text-2xl sm:text-3xl font-bold text-white mb-10"
          >
            Our Varieties
          </motion.h2>
          
          {/* Mobile Toggle Button */}
          <div className="md:hidden flex justify-center mb-6">
            <motion.button
              onClick={() => setVarietiesExpanded(!varietiesExpanded)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--mint)] text-[#03130f] rounded-lg font-semibold shadow-[0_12px_32px_rgba(0,217,163,0.35)]"
            >
              {varietiesExpanded ? 'Hide' : 'Show'} All Varieties
              <motion.div
                animate={{ rotate: varietiesExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ArrowRight className="w-5 h-5" />
              </motion.div>
            </motion.button>
          </div>

          {/* Desktop: Always visible, Mobile: Conditional */}
          <motion.div
            initial={false}
            animate={{ height: varietiesExpanded ? 'auto' : 0, opacity: varietiesExpanded ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="md:block overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {varieties.map((variety, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="px-3 py-2 rounded-lg text-center font-medium text-white text-xs cursor-default bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)]"
                >
                  {variety}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Desktop: Direct grid display */}
          <div className="hidden md:grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {varieties.map((variety, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                whileHover={{ scale: 1.05, y: -2 }}
                className="px-3 py-2 rounded-lg text-center font-medium text-white text-xs cursor-default bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)]"
              >
                {variety}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 bg-gradient-to-br from-[#0c121d] via-[#0f1a2a] to-[#0c111a] text-white border-t border-[rgba(255,255,255,0.06)]">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl font-bold mb-6"
          >
            Ready to Try Fresh Microgreens?
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-lg text-[var(--text-subtle)] mb-10"
          >
            Join restaurants across Galway that trust us for premium, fresh microgreens delivered weekly.
          </motion.p>

          <motion.a
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            href="mailto:hello@galwaysunsprouts.com"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 px-10 py-4 bg-[var(--mint)] text-[#03130f] rounded-xl font-semibold transition-all duration-200 shadow-[0_14px_38px_rgba(0,217,163,0.35)] hover:shadow-[0_18px_44px_rgba(0,217,163,0.45)]"
          >
            <Mail className="w-5 h-5" />
            Get In Touch
            <ArrowRight className="w-5 h-5" />
          </motion.a>
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative z-10 bg-[rgba(10,12,18,0.95)] border-t border-[rgba(255,255,255,0.08)] py-12 px-4 sm:px-6"
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12 pb-12 border-b border-[rgba(255,255,255,0.08)]">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-[var(--mint)] to-[#00b894] rounded-lg flex items-center justify-center text-white">
                  <Sprout className="w-5 h-5" />
                </div>
                <span className="font-bold text-white">Sun Sprouts</span>
              </div>
              <p className="text-sm text-[var(--text-subtle)]">Fresh, local, premium microgreens for Galway's finest restaurants.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <p className="text-sm text-[var(--text-subtle)] mb-2">Email: hello@galwaysunsprouts.com</p>
              <p className="text-sm text-[var(--text-subtle)]">Galway, Ireland</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Follow</h4>
              <motion.a
                whileHover={{ scale: 1.05 }}
                href="#"
                className="text-sm text-[var(--text-subtle)] hover:text-white transition-colors flex items-center gap-2"
              >
                <Instagram className="w-4 h-4" />
                Instagram
              </motion.a>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Hours</h4>
              <p className="text-sm text-[var(--text-subtle)]">Mon - Fri: 8am - 6pm</p>
              <p className="text-sm text-[var(--text-subtle)]">Harvest: Wed & Fri</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-[var(--text-subtle)]">© {new Date().getFullYear()} Galway Sun Sprouts. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-[var(--text-subtle)]">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default LandingPage;
