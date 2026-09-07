import { motion } from "framer-motion";
import {
  GraduationCap,
  Library,
  Briefcase,
  Award,
  Building,
  Home,
  Bus,
  Utensils,
  BookMarked,
  FlaskConical,
  Trophy,
  Phone,
  Sparkles,
} from "lucide-react";

interface HeroGreetingProps {
  onSelectPrompt: (prompt: string) => void;
  onPastePrompt?: (prompt: string) => void;
}

const FAQ_CARDS = [
  {
    id: "admission",
    icon: <GraduationCap className="w-5 h-5" />,
    title: "Admission Guide",
    subtitle: "Eligibility, pathways & criteria",
    q: "What are the admission criteria, pathways, TNEA code, and document requirements for MSAJCEA?",
  },
  {
    id: "courses",
    icon: <Library className="w-5 h-5" />,
    title: "Courses Offered",
    subtitle: "All 12 UG & 2 PG degrees",
    q: "What are all the 12 UG & 2 PG degree courses, intake capacity, and departments offered at MSAJCEA?",
  },
  {
    id: "placements",
    icon: <Briefcase className="w-5 h-5" />,
    title: "Campus Placements",
    subtitle: "Top packages & recruiters",
    q: "Who are the top recruiters, placement statistics, and highest salary package at MSAJCEA?",
  },
  {
    id: "scholarships",
    icon: <Award className="w-5 h-5" />,
    title: "Scholarships",
    subtitle: "Merit & government aid",
    q: "What scholarships, including government aid, 7.5% quota, and merit schemes, are available at MSAJCEA?",
  },
  {
    id: "boys-hostel",
    icon: <Building className="w-5 h-5" />,
    title: "Boys Hostel",
    subtitle: "Rooms, capacity & rules",
    q: "What are the hostel facilities, room capacity, mess menu, and rules for the Boys Hostel at MSAJCEA?",
  },
  {
    id: "girls-hostel",
    icon: <Home className="w-5 h-5" />,
    title: "Girls Hostel",
    subtitle: "Safety & accommodation",
    q: "What safety features, capacity, room amenities, and location details apply to the Girls Hostel at MSAJCEA?",
  },
  {
    id: "bus",
    icon: <Bus className="w-5 h-5" />,
    title: "Bus Routes",
    subtitle: "Stops, timings & routes",
    q: "What are the college bus routes, pickup points, timings, and transport coverage for MSAJCEA?",
  },
  {
    id: "mess",
    icon: <Utensils className="w-5 h-5" />,
    title: "Mess & Canteen",
    subtitle: "Food menu & timings",
    q: "What is the mess food menu, dining hall capacity, canteen facilities, and timings at MSAJCEA?",
  },
  {
    id: "library",
    icon: <BookMarked className="w-5 h-5" />,
    title: "Central Library",
    subtitle: "Books, resources & timings",
    q: "Tell me about the Central Library facilities, book collection, digital library, and working hours at MSAJCEA.",
  },
  {
    id: "labs",
    icon: <FlaskConical className="w-5 h-5" />,
    title: "Lab Facilities",
    subtitle: "Engineering labs & tools",
    q: "What engineering lab facilities, computer centers, and specialized workshops are available at MSAJCEA?",
  },
  {
    id: "campus-life",
    icon: <Trophy className="w-5 h-5" />,
    title: "Campus Life",
    subtitle: "Sports, events & clubs",
    q: "What sports facilities, athletic infrastructure, and student clubs are active at MSAJCEA?",
  },
  {
    id: "contact",
    icon: <Phone className="w-5 h-5" />,
    title: "Contact Info",
    subtitle: "Phone, email & location",
    q: "What is the official contact info, phone numbers, email addresses, and location map for MSAJCEA?",
  },
];

export default function HeroGreeting({ onSelectPrompt, onPastePrompt }: HeroGreetingProps) {
  const handleCardClick = (q: string) => {
    if (onPastePrompt) {
      onPastePrompt(q);
    } else {
      onSelectPrompt(q);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="flex flex-col items-center w-full max-w-[1020px] mx-auto px-3 sm:px-6 pt-4 sm:pt-12 lg:pt-16 pb-6"
    >
      {/* ── Hero headline ── */}
      <div className="relative flex flex-col items-center text-center mb-4 sm:mb-6 w-full">
        {/* Ambient glow backing */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[120px] rounded-full blur-[80px] opacity-30 dark:opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(ellipse, #2E6B5E 0%, transparent 70%)" }}
        />

        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="hero-title relative text-[1.35rem] min-[360px]:text-[1.55rem] sm:text-[2.6rem] lg:text-[3.2rem] font-bold tracking-tight leading-none text-ink dark:text-[#f4f3ee] z-10 whitespace-nowrap"
        >
          Hello, Future Engineer.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="relative z-10 mt-2 sm:mt-3 text-[12.5px] sm:text-[14.5px] text-ink-3 dark:text-[#b1ada1] max-w-[580px] leading-relaxed font-ui"
        >
          Explore&nbsp;
          <span className="font-bold text-ink dark:text-[#f4f3ee]">
            Mohamed Sathak A.J. College of Engineering and Architecture
          </span>{" "}
          — admissions, placements, courses, hostels, and campus life.
        </motion.p>
      </div>

      {/* ── 12-card Grid (Compact, Small & Fits in One Screen) ── */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {FAQ_CARDS.map((card, idx) => (
          <motion.button
            key={card.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 + idx * 0.01, duration: 0.18 }}
            onClick={() => handleCardClick(card.q)}
            className="group flex flex-col sm:flex-col justify-between items-start text-left rounded-xl sm:rounded-2xl p-2.5 sm:p-3 bg-white dark:bg-[#14151a] border border-black/[0.08] dark:border-white/[0.08] shadow-xs hover:border-[#2E6B5E] dark:hover:border-[#10b981] hover:shadow-md transform-gpu hover:-translate-y-0.5 transition-all duration-150 ease-out cursor-pointer w-full active:scale-[0.98] min-h-[72px] sm:min-h-[92px]"
          >
            <div className="flex items-center gap-2 sm:gap-2.5 w-full">
              {/* Icon Pill Container */}
              <div className="size-7 sm:size-8 rounded-lg sm:rounded-xl bg-[#E1EED7]/80 dark:bg-[#2E6B5E]/25 border border-[#2E6B5E]/20 dark:border-[#10b981]/30 flex items-center justify-center text-[#2E6B5E] dark:text-[#10b981] group-hover:bg-[#2E6B5E] group-hover:text-white dark:group-hover:bg-[#10b981] dark:group-hover:text-zinc-950 transition-all duration-150 shadow-xs shrink-0">
                {card.icon}
              </div>

              {/* Title */}
              <p className="text-[12px] sm:text-[13px] font-bold text-ink dark:text-[#f4f3ee] leading-tight line-clamp-1 group-hover:text-[#2E6B5E] dark:group-hover:text-[#10b981] transition-colors duration-150">
                {card.title}
              </p>
            </div>

            {/* Subtitle */}
            <div className="mt-1 sm:mt-1.5 w-full">
              <p className="text-[10px] sm:text-[11px] text-ink-3 dark:text-[#b1ada1] leading-tight line-clamp-1">
                {card.subtitle}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
