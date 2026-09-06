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
} from "lucide-react";

interface HeroGreetingProps {
  onSelectPrompt: (prompt: string) => void;
  onPastePrompt?: (prompt: string) => void;
}

const FAQ_CARDS = [
  {
    id: "admission",
    icon: <GraduationCap size={20} />,
    title: "Admission Guide",
    subtitle: "Eligibility, pathways & criteria",
    q: "What are the admission criteria, pathways, TNEA code, and document requirements for MSAJCEA?",
  },
  {
    id: "courses",
    icon: <Library size={20} />,
    title: "Courses Offered",
    subtitle: "All 12 UG & 2 PG degrees",
    q: "What are all the 12 UG & 2 PG degree courses, intake capacity, and departments offered at MSAJCEA?",
  },
  {
    id: "placements",
    icon: <Briefcase size={20} />,
    title: "Campus Placements",
    subtitle: "Top packages & recruiters",
    q: "Who are the top recruiters, placement statistics, and highest salary package at MSAJCEA?",
  },
  {
    id: "scholarships",
    icon: <Award size={20} />,
    title: "Scholarships",
    subtitle: "Merit & government aid",
    q: "What scholarships, including government aid, 7.5% quota, and merit schemes, are available at MSAJCEA?",
  },
  {
    id: "boys-hostel",
    icon: <Building size={20} />,
    title: "Boys Hostel",
    subtitle: "Rooms, capacity & rules",
    q: "What are the hostel facilities, room capacity, mess menu, and rules for the Boys Hostel at MSAJCEA?",
  },
  {
    id: "girls-hostel",
    icon: <Home size={20} />,
    title: "Girls Hostel",
    subtitle: "Safety & accommodation",
    q: "What safety features, capacity, room amenities, and location details apply to the Girls Hostel at MSAJCEA?",
  },
  {
    id: "bus",
    icon: <Bus size={20} />,
    title: "Bus Routes",
    subtitle: "Stops, timings & routes",
    q: "What are the college bus routes, pickup points, timings, and transport coverage for MSAJCEA?",
  },
  {
    id: "mess",
    icon: <Utensils size={20} />,
    title: "Mess & Canteen",
    subtitle: "Food menu & timings",
    q: "What is the mess food menu, dining hall capacity, canteen facilities, and timings at MSAJCEA?",
  },
  {
    id: "library",
    icon: <BookMarked size={20} />,
    title: "Central Library",
    subtitle: "Books, resources & timings",
    q: "Tell me about the Central Library facilities, book collection, digital library, and working hours at MSAJCEA.",
  },
  {
    id: "labs",
    icon: <FlaskConical size={20} />,
    title: "Lab Facilities",
    subtitle: "Engineering labs & tools",
    q: "What engineering lab facilities, computer centers, and specialized workshops are available at MSAJCEA?",
  },
  {
    id: "campus-life",
    icon: <Trophy size={20} />,
    title: "Campus Life",
    subtitle: "Sports, events & clubs",
    q: "What sports facilities, athletic infrastructure, and student clubs are active at MSAJCEA?",
  },
  {
    id: "contact",
    icon: <Phone size={20} />,
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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="flex flex-col items-center w-full max-w-[960px] mx-auto px-4 pt-2 pb-6"
    >
      {/* ── Hero headline ── */}
      <div className="relative flex flex-col items-center text-center mb-8 w-full">
        {/* soft glow behind the title */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[120px] rounded-full blur-[72px] opacity-25 pointer-events-none"
          style={{ background: "radial-gradient(ellipse, #2E6B5E 0%, transparent 70%)" }}
        />

        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="relative text-[2.4rem] sm:text-[3.2rem] lg:text-[3.8rem] font-black tracking-tighter leading-none uppercase text-ink z-10"
        >
          Hello, Future Engineer.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="relative z-10 mt-3 text-[13px] sm:text-[14px] text-ink-3 max-w-[520px] leading-relaxed"
        >
          Explore&nbsp;
          <span className="font-semibold text-ink">
            Mohamed Sathak A.J. College of Engineering and Architecture
          </span>{" "}
          — admissions, placements, courses, hostels, and campus life.
        </motion.p>
      </div>

      {/* ── 12-card grid  4 × 3 ── */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {FAQ_CARDS.map((card, idx) => (
          <motion.button
            key={card.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 + idx * 0.03, duration: 0.3 }}
            whileHover={{
              scale: 1.03,
              boxShadow: "0 8px 28px rgba(46,107,94,0.12)",
              borderColor: "var(--accent)",
            }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleCardClick(card.q)}
            className="flex flex-col items-start text-left rounded-2xl p-4 bg-surface border border-line shadow-sm transition-colors duration-200 cursor-pointer w-full hover:border-accent/40"
            style={{ minHeight: "108px" }}
          >
            {/* icon */}
            <span className="text-accent shrink-0">
              {card.icon}
            </span>

            {/* label */}
            <div className="mt-auto pt-3 w-full">
              <p className="text-[13px] font-bold text-ink leading-tight line-clamp-1">
                {card.title}
              </p>
              <p className="text-[11px] text-ink-3 leading-snug mt-0.5 line-clamp-2">
                {card.subtitle}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
