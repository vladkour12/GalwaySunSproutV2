import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  label?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select...", 
  className = "",
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-3 flex items-center justify-between bg-slate-50 border rounded-xl font-bold text-left outline-none transition-all ${
          isOpen ? 'border-teal-400 ring-2 ring-teal-100' : 'border-slate-100 hover:border-slate-200'
        } ${selectedOption ? 'text-slate-700' : 'text-slate-400'}`}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-y-auto no-scrollbar"
          >
            <div className="p-1 space-y-0.5">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value.toString());
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                      isSelected 
                        ? 'bg-teal-50 text-teal-700' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate text-left">{option.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0 ml-2" />}
                  </button>
                );
              })}
              {options.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-slate-400 font-medium">
                  No options available
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomSelect;

