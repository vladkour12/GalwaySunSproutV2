import React from 'react';
import { Sprout, MapPin, Mail, Lock, Instagram, ArrowRight, ChefHat, Droplets, Sparkles, Leaf, CheckCircle2, TrendingUp } from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
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

  const varieties = [
    "Sunflower", "Pea Shoots", "Radish Rambo", "Broccoli", 
    "Red Amaranth", "Mustard", "Coriander", "Basil", "Arugula"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 font-sans text-slate-900 overflow-x-hidden relative">
      
      {/* Subtle Background Grid */}
      <div className="fixed inset-0 z-0 opacity-[0.02] pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(15 23 42) 1px, transparent 0)`,
            backgroundSize: '48px 48px'
          }}
        />
      </div>

      {/* Gradient Orbs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-400/10 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/30">
              <Sprout className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 font-outfit">Galway Sun Sprouts</span>
          </div>
          
          <button
            onClick={onLoginClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl hover:bg-slate-800 transition-all duration-200"
          >
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">Farmer Login</span>
            <span className="sm:hidden">Login</span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 min-h-screen flex items-center z-10">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full mb-8">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-semibold text-emerald-700">Harvesting weekly</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-[1.1]">
              <span className="text-slate-900">Small Scale.</span>
              <br />
              <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 bg-[length:200%_auto] bg-clip-text text-transparent">
                Big Flavor.
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-12 font-medium">
              Galway's premier microgreens partner for chefs. Ultra-fresh, precision-grown varieties tailored to your menu.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-4 mb-16">
              <a
                href="mailto:hello@galwaysunsprouts.com"
                className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-teal-500/30 hover:shadow-2xl hover:shadow-teal-500/40 transition-all duration-200"
              >
                <Mail className="w-5 h-5" />
                Get in Touch
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href="#"
                className="flex items-center gap-2 px-8 py-4 bg-white text-slate-700 rounded-2xl font-bold text-lg shadow-lg border border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-200"
              >
                <Instagram className="w-5 h-5 text-pink-600" />
                Follow Us
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-12 border-t border-slate-200">
              {[
                { label: "Varieties", value: "20+" },
                { label: "Restaurants", value: "15+" },
                { label: "Weekly Harvest", value: "200+" }
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-slate-900 mb-1">{stat.value}</div>
                  <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Varieties Ticker */}
      <div className="relative z-10 py-8 bg-white/50 backdrop-blur-sm border-y border-slate-200/50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-white z-10 pointer-events-none" />
        <div className="flex whitespace-nowrap gap-12">
          {[...varieties, ...varieties, ...varieties].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-slate-600 font-bold text-sm uppercase tracking-wider">
              <Sprout className="w-4 h-4 text-teal-600" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 font-outfit">
              Why Microgreens?
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              More than just a garnish. These tiny plants pack incredible flavor, nutrition, and sustainability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:border-slate-300"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 font-outfit">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chef Partnership Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30 rounded-full text-sm font-semibold text-emerald-300 mb-6">
                <ChefHat className="w-4 h-4" />
                <span>Chef Partnership Program</span>
              </div>
              
              <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight font-outfit">
                Curated for Culinary Excellence
              </h2>
              
              <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                From seed to harvest, every tray is monitored for optimal flavor and texture. We work directly with chefs to grow exactly what your menu needs, when you need it.
              </p>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Custom varieties</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Flexible delivery</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Weekly harvest</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative bg-gradient-to-br from-teal-500/20 to-emerald-500/20 backdrop-blur-sm rounded-3xl p-8 border border-white/10 shadow-2xl">
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { icon: Leaf, label: "Organic", value: "100%" },
                    { icon: TrendingUp, label: "Growth", value: "7-14 days" },
                    { icon: Droplets, label: "Water", value: "Pure" },
                    { icon: Sparkles, label: "Freshness", value: "< 24h" }
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
                    >
                      <stat.icon className="w-8 h-8 text-emerald-400 mb-3" />
                      <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                      <div className="text-sm text-slate-400">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-teal-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-white border-t border-slate-200 py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/30">
              <Sprout className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 text-lg font-outfit">Galway Sun Sprouts</span>
          </div>
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} Urban Microgreens Farm. Galway, Ireland.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
