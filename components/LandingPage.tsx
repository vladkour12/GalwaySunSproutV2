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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 font-sans text-slate-100 overflow-x-hidden">
      
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-40 -left-20 w-96 h-96 bg-slate-600/10 rounded-full blur-3xl" 
        />
      </div>
      
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-700"
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div 
            className="flex items-center gap-2 cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center text-slate-900">
              <Sprout className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-slate-100 hidden sm:inline">Sun Sprouts</span>
          </motion.div>
          
          <motion.button
            onClick={onLoginClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-all duration-200"
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
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-900/30 border border-emerald-700/50 rounded-full mb-6 text-sm font-medium text-emerald-300"
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
            className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 leading-tight"
          >
            <span className="text-slate-100">Premium Microgreens</span>
            <br />
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent"
            >
              Grown Right Here
            </motion.span>
          </motion.h1>

          {/* Subheading */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-12"
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
              className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:bg-emerald-700 transition-all duration-200 flex items-center justify-center gap-2"
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
              className="px-8 py-4 bg-slate-700 text-slate-100 rounded-xl font-semibold border border-slate-600 hover:bg-slate-600 transition-all duration-200 flex items-center justify-center gap-2"
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
            className="grid grid-cols-3 gap-8 max-w-xl mx-auto pt-12 border-t border-slate-200"
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
                <div className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</div>
                <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="relative z-10 py-24 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Why Choose Us
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
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
                className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <motion.div 
                  className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-6`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </motion.div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Varieties Section */}
      <section className="relative z-10 py-16 px-4 sm:px-6 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center text-2xl sm:text-3xl font-bold text-slate-900 mb-10"
          >
            Our Varieties
          </motion.h2>
          
          {/* Mobile Toggle Button */}
          <div className="md:hidden flex justify-center mb-6">
            <motion.button
              onClick={() => setVarietiesExpanded(!varietiesExpanded)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold"
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
                  className="px-3 py-2 bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 rounded-lg text-center font-medium text-slate-700 text-xs cursor-default"
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
                className="px-3 py-2 bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 rounded-lg text-center font-medium text-slate-700 text-xs cursor-default"
              >
                {variety}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
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
            className="text-lg text-slate-300 mb-10"
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
            className="inline-flex items-center gap-2 px-10 py-4 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-all duration-200 shadow-lg hover:shadow-xl"
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
        className="relative z-10 bg-white border-t border-slate-100 py-12 px-4 sm:px-6"
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12 pb-12 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center text-white">
                  <Sprout className="w-5 h-5" />
                </div>
                <span className="font-bold text-slate-900">Sun Sprouts</span>
              </div>
              <p className="text-sm text-slate-600">Fresh, local, premium microgreens for Galway's finest restaurants.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Contact</h4>
              <p className="text-sm text-slate-600 mb-2">Email: hello@galwaysunsprouts.com</p>
              <p className="text-sm text-slate-600">Galway, Ireland</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Follow</h4>
              <motion.a
                whileHover={{ scale: 1.05 }}
                href="#"
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-2"
              >
                <Instagram className="w-4 h-4" />
                Instagram
              </motion.a>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Hours</h4>
              <p className="text-sm text-slate-600">Mon - Fri: 8am - 6pm</p>
              <p className="text-sm text-slate-600">Harvest: Wed & Fri</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500">© {new Date().getFullYear()} Galway Sun Sprouts. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-slate-500">
              <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default LandingPage;
