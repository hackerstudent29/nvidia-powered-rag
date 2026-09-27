import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Calendar, HelpCircle, ArrowRight, X, ChevronDown, Check } from 'lucide-react';
import { JellyBlobMascot } from '../ui/JellyBlobMascot';

export interface UserProfile {
  name: string;
  age: number | string;
  purpose: string;
}

export const CATEGORY_OPTIONS = [
  { value: "College Enquiry", label: "College Enquiry", desc: "General info, campus location & overview" },
  { value: "Admission Related", label: "Admission & Cutoffs", desc: "TNEA cutoff scores, counseling & application" },
  { value: "MSAJCE Student", label: "Current MSAJCE Student", desc: "Campus help, exams, syllabus & department info" },
  { value: "Fees & Scholarships", label: "Fees & Scholarships", desc: "Tuition fees, 7.5% quota & financial aid" },
  { value: "Placements & Career", label: "Placements & Career", desc: "Top recruiters, salary packages & training" },
  { value: "Hostel & Facilities", label: "Hostel & Campus Facilities", desc: "Accommodation, transport, labs & sports" },
  { value: "Parent / Guardian", label: "Parent / Guardian Inquiry", desc: "Safety, discipline, fees & campus infrastructure" },
  { value: "Casual Chat", label: "Casual Chat / Overview", desc: "Exploring Lorin AI features & general QA" }
];

interface UserOnboardingModalProps {
  isOpen: boolean;
  onSaveProfile: (profile: UserProfile) => void;
  onClose?: () => void;
  initialProfile?: UserProfile | null;
}

export default function UserOnboardingModal({ isOpen, onSaveProfile, onClose, initialProfile }: UserOnboardingModalProps) {
  const [name, setName] = useState(initialProfile?.name || '');
  const [age, setAge] = useState<string | number>(initialProfile?.age || '');
  const [purpose, setPurpose] = useState(initialProfile?.purpose || CATEGORY_OPTIONS[0].value);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; age?: string }>({});
  const [isTyping, setIsTyping] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialProfile) {
      setName(initialProfile.name || '');
      setAge(initialProfile.age || '');
      setPurpose(initialProfile.purpose || CATEGORY_OPTIONS[0].value);
    }
  }, [initialProfile]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; age?: string } = {};

    if (!name.trim()) {
      newErrors.name = "Please enter your name";
    }
    if (!age || Number(age) <= 0 || Number(age) > 100) {
      newErrors.age = "Please enter a valid age";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSaveProfile({
      name: name.trim(),
      age: Number(age),
      purpose
    });
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current && onClose) {
      onClose();
    }
  };

  const selectedCategoryObj = CATEGORY_OPTIONS.find((c) => c.value === purpose) || CATEGORY_OPTIONS[0];

  const hasErrors = Object.keys(errors).length > 0;
  const modalMascotEmotion = hasErrors ? "sad" : isTyping ? "curious" : name.trim() ? "happy" : "shy";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={backdropRef}
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 dark:bg-black/75 backdrop-blur-md p-3.5"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm sm:max-w-[420px] overflow-visible rounded-3xl bg-[#F9F9F8] dark:bg-[#121214] p-5 sm:p-6 text-[#1A1C1C] dark:text-[#f4f3ee] shadow-2xl dark:shadow-[0_24px_80px_rgba(0,0,0,0.85)] transform-gpu"
          >
            {/* Close Button (X) */}
            {onClose && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 z-20 flex size-8 items-center justify-center rounded-full bg-black/[0.05] dark:bg-white/10 text-slate-600 dark:text-zinc-400 hover:bg-black/[0.1] dark:hover:bg-white/20 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </motion.button>
            )}

            {/* Modal Header */}
            <div className="relative z-10 flex items-center gap-3 text-left pr-6 mb-2">
              <div className="shrink-0">
                <JellyBlobMascot emotion={modalMascotEmotion} size={58} interactive={true} />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold font-oswald uppercase tracking-tight text-[#2E6B5E] dark:text-[#10b981] whitespace-nowrap">
                  Student Profile Setup
                </h2>
                <p className="text-[11.5px] font-libre text-slate-600 dark:text-[#b1ada1] leading-snug truncate">
                  Personalize campus assistance for your academic interests.
                </p>
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="relative z-10 mt-4 space-y-4 font-libre">
              {/* 1. Name Input */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-700 dark:text-[#e4e4e7]">
                  <User className="h-3.5 w-3.5 text-[#2E6B5E] dark:text-emerald-400" />
                  <span>Your Name <span className="text-[#2E6B5E] dark:text-emerald-400">*</span></span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramanathan S"
                  value={name}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  className={`w-full rounded-2xl bg-[#F0F0EF] dark:bg-[#18181b] px-4 py-3 text-xs text-[#1A1C1C] dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition-colors border-none focus:bg-[#EBEBEA] dark:focus:bg-[#202024] ${
                    errors.name ? 'bg-red-500/10 text-red-600' : ''
                  }`}
                />
                {errors.name && <p className="text-[10px] font-medium text-red-500 pl-1">{errors.name}</p>}
              </div>

              {/* 2. Age Input */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-700 dark:text-[#e4e4e7]">
                  <Calendar className="h-3.5 w-3.5 text-[#2E6B5E] dark:text-emerald-400" />
                  <span>Your Age <span className="text-[#2E6B5E] dark:text-emerald-400">*</span></span>
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  placeholder="e.g. 18"
                  value={age}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  onChange={(e) => {
                    setAge(e.target.value);
                    if (errors.age) setErrors((prev) => ({ ...prev, age: undefined }));
                  }}
                  className={`w-full rounded-2xl bg-[#F0F0EF] dark:bg-[#18181b] px-4 py-3 text-xs text-[#1A1C1C] dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition-colors border-none focus:bg-[#EBEBEA] dark:focus:bg-[#202024] ${
                    errors.age ? 'bg-red-500/10 text-red-600' : ''
                  }`}
                />
                {errors.age && <p className="text-[10px] font-medium text-red-500 pl-1">{errors.age}</p>}
              </div>

              {/* 3. Category Selector */}
              <div className="space-y-1 relative" ref={dropdownRef}>
                <label className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-700 dark:text-[#e4e4e7]">
                  <HelpCircle className="h-3.5 w-3.5 text-[#2E6B5E] dark:text-emerald-400" />
                  <span>Primary Interest / Category <span className="text-[#2E6B5E] dark:text-emerald-400">*</span></span>
                </label>

                {/* Custom Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-2xl bg-[#F0F0EF] dark:bg-[#18181b] px-4 py-3 text-xs text-[#1A1C1C] dark:text-white transition-colors hover:bg-[#EBEBEA] dark:hover:bg-[#202024] cursor-pointer border-none"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="font-bold text-[#2E6B5E] dark:text-[#34d399] truncate">{selectedCategoryObj.label}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 dark:text-zinc-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-[#2E6B5E] dark:text-[#34d399]' : ''}`} />
                </button>

                {/* Animated Options Menu */}
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.1, ease: "easeOut" }}
                      className="absolute left-0 right-0 top-full mt-1.5 z-[120] max-h-52 overflow-y-auto rounded-2xl bg-[#F9F9F8] dark:bg-[#18181b] p-1.5 shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.9)] space-y-1 origin-top border-none"
                    >
                      {CATEGORY_OPTIONS.map((cat) => {
                        const isSelected = cat.value === purpose;
                        return (
                          <motion.button
                            whileHover={{ x: 2 }}
                            whileTap={{ scale: 0.98 }}
                            key={cat.value}
                            type="button"
                            onClick={() => {
                              setPurpose(cat.value);
                              setIsDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition-colors cursor-pointer border-none ${
                              isSelected
                                ? 'bg-[#2E6B5E]/10 text-[#2E6B5E] dark:bg-emerald-500/15 dark:text-[#34d399] font-bold'
                                : 'text-slate-800 dark:text-zinc-200 hover:bg-[#F0F0EF] dark:hover:bg-white/5'
                            }`}
                          >
                            <div className="flex flex-col gap-0.5 truncate pr-2">
                              <span className="font-semibold text-[11.5px]">{cat.label}</span>
                              <span className="text-[10px] text-slate-500 dark:text-zinc-400 truncate font-normal">{cat.desc}</span>
                            </div>
                            {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[#2E6B5E] dark:text-emerald-400" />}
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Selected category description preview */}
                <p className="text-[10.5px] text-slate-500 dark:text-emerald-400/90 italic pl-1 pt-0.5">
                  ↳ {selectedCategoryObj.desc}
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 450, damping: 22 }}
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2E6B5E] hover:bg-[#24544a] text-white dark:bg-[#10b981] dark:hover:bg-[#059669] dark:text-zinc-950 px-5 py-3.5 text-xs font-bold transition-colors cursor-pointer border-none"
                >
                  <span>Save & Start Assistant</span>
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
