import React, { useState, useEffect, useRef } from 'react';
import { User, Calendar, HelpCircle, ArrowRight, Sparkles, X, ChevronDown, Check } from 'lucide-react';

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

  if (!isOpen) return null;

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

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-3.5 animate-in fade-in duration-150"
    >
      <div
        className="relative w-full max-w-sm sm:max-w-[410px] overflow-visible rounded-3xl border border-white/10 bg-[#14151a] p-5 sm:p-6 text-[#f4f3ee] shadow-2xl animate-in zoom-in-95 duration-150"
      >
        {/* Glow Ambient Accent */}
        <div className="absolute -top-20 -left-20 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />

        {/* Close Button (X) */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 flex size-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Modal Header */}
        <div className="relative z-10 space-y-1 text-left pr-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#34d399]">
            <Sparkles className="h-3 w-3" />
            <span>Welcome to Lorin AI</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-white pt-1">
            Tell us about yourself
          </h2>
          <p className="text-[11.5px] sm:text-xs text-[#b1ada1]">
            Personalize campus AI assistance for your profile.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="relative z-10 mt-5 space-y-3.5">
          {/* 1. Name Input */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#e4e4e7]">
              <User className="h-3.5 w-3.5 text-emerald-400" />
              <span>Your Name <span className="text-emerald-400">*</span></span>
            </label>
            <input
              type="text"
              placeholder="e.g. Ramanathan S"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              className={`w-full rounded-xl border bg-[#1c1d24] px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                errors.name ? 'border-red-500/80' : 'border-white/10'
              }`}
            />
            {errors.name && <p className="text-[10px] font-medium text-red-400 pl-0.5">{errors.name}</p>}
          </div>

          {/* 2. Age Input */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#e4e4e7]">
              <Calendar className="h-3.5 w-3.5 text-emerald-400" />
              <span>Your Age <span className="text-emerald-400">*</span></span>
            </label>
            <input
              type="number"
              min="10"
              max="100"
              placeholder="e.g. 18"
              value={age}
              onChange={(e) => {
                setAge(e.target.value);
                if (errors.age) setErrors((prev) => ({ ...prev, age: undefined }));
              }}
              className={`w-full rounded-xl border bg-[#1c1d24] px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                errors.age ? 'border-red-500/80' : 'border-white/10'
              }`}
            />
            {errors.age && <p className="text-[10px] font-medium text-red-400 pl-0.5">{errors.age}</p>}
          </div>

          {/* 3. Custom Glassmorphic Animated Dropdown */}
          <div className="space-y-1 relative" ref={dropdownRef}>
            <label className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#e4e4e7]">
              <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
              <span>Primary Interest / Category <span className="text-emerald-400">*</span></span>
            </label>

            {/* Custom Dropdown Trigger Button */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#1c1d24] px-3.5 py-2.5 text-xs text-white transition-all hover:border-white/20 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <span className="font-medium truncate">{selectedCategoryObj.label}</span>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-emerald-400' : ''}`} />
            </button>

            {/* Custom Animated Options Menu */}
            {isDropdownOpen && (
              <div
                className="absolute left-0 right-0 top-full mt-1 z-[120] max-h-48 overflow-y-auto rounded-2xl border border-white/15 bg-[#181920] p-1.5 shadow-[0_25px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
              >
                {CATEGORY_OPTIONS.map((cat) => {
                  const isSelected = cat.value === purpose;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        setPurpose(cat.value);
                        setIsDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/15 text-[#34d399] font-medium border border-emerald-500/30'
                          : 'text-zinc-200 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5 truncate pr-2">
                        <span className="font-semibold text-[11.5px]">{cat.label}</span>
                        <span className="text-[10px] text-zinc-400 truncate font-normal">{cat.desc}</span>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected category description preview */}
            <p className="text-[10.5px] text-emerald-400/90 italic pl-1 pt-0.5">
              ↳ {selectedCategoryObj.desc}
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
            >
              <span>Start Assistant Chat</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
