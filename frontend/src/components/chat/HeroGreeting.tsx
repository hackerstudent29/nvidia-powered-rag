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
  isMinimal?: boolean;
  isEmbed?: boolean;
}

const FAQ_CARDS = [
  {
    id: "admission",
    icon: <GraduationCap className="w-5 h-5" />,
    title: "Admission Guide",
    subtitle: "Criteria, TNEA 1301 & documents",
    q: "What are the admission criteria, TNEA Code 1301 details, counseling pathways, eligibility, and required documents for new students at MSAJCEA?",
  },
  {
    id: "courses",
    icon: <Library className="w-5 h-5" />,
    title: "Courses Offered",
    subtitle: "All 12 UG & 2 PG degrees",
    q: "What are all the 12 UG & 2 PG degree courses, department specializations, and intake capacities offered at MSAJCEA?",
  },
  {
    id: "placements",
    icon: <Briefcase className="w-5 h-5" />,
    title: "Campus Placements",
    subtitle: "Top packages & recruiters",
    q: "What are the placement statistics, top recruiting companies, highest salary package, and placement cell details for MSAJCEA?",
  },
  {
    id: "scholarships",
    icon: <Award className="w-5 h-5" />,
    title: "Scholarships",
    subtitle: "Merit & government aid",
    q: "What scholarship schemes, government fee waivers, 7.5% school student quota benefits, and merit assistance are available at MSAJCEA?",
  },
  {
    id: "boys-hostel",
    icon: <Building className="w-5 h-5" />,
    title: "Boys Hostel",
    subtitle: "Rooms, capacity & rules",
    q: "What are the accommodation facilities, room capacity options, food menu, and safety rules for the Boys Hostel at MSAJCEA?",
  },
  {
    id: "girls-hostel",
    icon: <Home className="w-5 h-5" />,
    title: "Girls Hostel",
    subtitle: "Safety & accommodation",
    q: "What safety features, 24/7 security, room amenities, warden supervision, and facilities apply to the Girls Hostel at MSAJCEA?",
  },
  {
    id: "bus",
    icon: <Bus className="w-5 h-5" />,
    title: "Bus Routes",
    subtitle: "Stops, timings & routes",
    q: "What are the college bus routes, pickup points across Chennai, morning arrival timings, and transport coverage for MSAJCEA?",
  },
  {
    id: "mess",
    icon: <Utensils className="w-5 h-5" />,
    title: "Mess & Canteen",
    subtitle: "Food menu & timings",
    q: "What is the food quality, daily mess menu, dining hall capacity, and canteen options available for students at MSAJCEA?",
  },
  {
    id: "library",
    icon: <BookMarked className="w-5 h-5" />,
    title: "Central Library",
    subtitle: "Books, resources & timings",
    q: "What are the Central Library facilities, book collection, IEEE digital journal access, study halls, and working hours at MSAJCEA?",
  },
  {
    id: "labs",
    icon: <FlaskConical className="w-5 h-5" />,
    title: "Lab Facilities",
    subtitle: "Engineering labs & tools",
    q: "What engineering laboratories, high-performance computing centers, and specialized workshop facilities exist at MSAJCEA?",
  },
  {
    id: "campus-life",
    icon: <Trophy className="w-5 h-5" />,
    title: "Campus Life",
    subtitle: "Sports, events & clubs",
    q: "What sports facilities, athletic infrastructure, annual cultural events, and technical student clubs are active at MSAJCEA?",
  },
  {
    id: "contact",
    icon: <Phone className="w-5 h-5" />,
    title: "Contact Info",
    subtitle: "Phone, email & location",
    q: "What is the official contact info, phone numbers, email addresses, and campus location of MSAJCEA at Siruseri IT Park?",
  },
];

export default function HeroGreeting({
  onSelectPrompt,
  onPastePrompt,
  isMinimal = false,
  isEmbed = false,
}: HeroGreetingProps) {
  const userProfile = (() => {
    try {
      const saved = localStorage.getItem("lorin_user_profile");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  })();

  const firstName = userProfile?.name ? userProfile.name.split(" ")[0] : "Future Engineer";

  const handleCardClick = (promptText: string) => {
    if (onSelectPrompt) {
      onSelectPrompt(promptText);
    } else if (onPastePrompt) {
      onPastePrompt(promptText);
    }
  };

  // If in minimal mode (mobile, tablet, or iframe embed), render sleek compact hero
  if (isMinimal) {
    const minimalCards = FAQ_CARDS.slice(0, 4);
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col items-center w-full max-w-lg mx-auto px-3 my-auto py-2"
      >
        <div className="flex flex-col items-center text-center mb-3.5 w-full">
          <div className="size-11 sm:size-12 rounded-full overflow-hidden border border-white/80 dark:border-white/20 shadow-md bg-black p-0.5 mb-2 shrink-0">
            <img src="/lorin-pic.png" alt="Lorin AI" className="w-full h-full object-cover rounded-full" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-ink dark:text-[#f4f3ee]">
            Hello, {firstName}.
          </h1>
          <p className="mt-1 text-xs text-ink-3 dark:text-[#b1ada1] max-w-xs leading-relaxed">
            {isEmbed
              ? "Ask any question about MSAJCEA admissions, courses, and campus."
              : "What would you like to explore about MSAJCEA today?"}
          </p>
        </div>

        {/* Compact 4-Card Grid */}
        <div className="w-full grid grid-cols-2 gap-2 sm:gap-2.5">
          {minimalCards.map((card) => (
            <motion.button
              key={card.id}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => handleCardClick(card.q)}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-[#14151a] border border-black/[0.08] dark:border-white/[0.08] shadow-2xs hover:border-[#2E6B5E] dark:hover:border-[#10b981] transition-all text-left cursor-pointer"
            >
              <div className="size-7 rounded-lg bg-[#E1EED7]/80 dark:bg-[#2E6B5E]/25 text-[#2E6B5E] dark:text-[#10b981] flex items-center justify-center shrink-0">
                {card.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-bold text-ink dark:text-[#f4f3ee] truncate leading-tight">
                  {card.title}
                </p>
                <p className="text-[9.5px] text-ink-3 dark:text-[#b1ada1] truncate mt-0.5 leading-none">
                  {card.subtitle}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="flex flex-col items-center w-full max-w-[1120px] mx-auto px-3 sm:px-6 my-auto py-2 sm:py-4"
    >
      {/* ── Hero headline ── */}
      <div className="relative flex flex-col items-center text-center mb-6 sm:mb-8 w-full">
        {/* Ambient glow backing */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[130px] rounded-full blur-[90px] opacity-30 dark:opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(ellipse, #2E6B5E 0%, transparent 70%)" }}
        />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mb-3.5 flex items-center justify-center z-10"
        >
          <div className="size-16 sm:size-20 rounded-full overflow-hidden border-2 border-white/80 dark:border-white/20 shadow-xl bg-black p-0.5 ring-2 ring-accent/30">
            <img src="/lorin-pic.png" alt="Lorin AI" className="w-full h-full object-cover rounded-full" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="hero-title relative text-[1.45rem] min-[360px]:text-[1.65rem] sm:text-[2.8rem] lg:text-[3.4rem] font-bold tracking-tight leading-none text-ink dark:text-[#f4f3ee] z-10 whitespace-nowrap"
        >
          Hello, {firstName}.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="relative z-10 mt-2.5 sm:mt-3.5 text-[13px] sm:text-[15px] text-ink-3 dark:text-[#b1ada1] max-w-[620px] leading-relaxed font-ui"
        >
          Explore&nbsp;
          <span className="font-bold text-ink dark:text-[#f4f3ee]">
            Mohamed Sathak A.J. College of Engineering and Architecture
          </span>{" "}
          — {userProfile?.purpose ? `personalized assistance for ${userProfile.purpose}` : "admissions, placements, courses, hostels, and campus life"}.
        </motion.p>
      </div>

      {/* ── 12-card Grid (Slightly Larger & Spaced Cards) ── */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {FAQ_CARDS.map((card, idx) => (
          <motion.button
            key={card.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 + idx * 0.01, duration: 0.18 }}
            onClick={() => handleCardClick(card.q)}
            className="group flex flex-col justify-between items-start text-left rounded-xl sm:rounded-2xl p-3.5 sm:p-4 bg-white dark:bg-[#14151a] border border-black/[0.08] dark:border-white/[0.08] shadow-xs hover:border-[#2E6B5E] dark:hover:border-[#10b981] hover:shadow-md transform-gpu hover:-translate-y-0.5 transition-all duration-150 ease-out cursor-pointer w-full active:scale-[0.98] min-h-[84px] sm:min-h-[104px]"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 w-full">
              {/* Icon Pill Container */}
              <div className="size-8 sm:size-9 rounded-lg sm:rounded-xl bg-[#E1EED7]/80 dark:bg-[#2E6B5E]/25 border border-[#2E6B5E]/20 dark:border-[#10b981]/30 flex items-center justify-center text-[#2E6B5E] dark:text-[#10b981] group-hover:bg-[#2E6B5E] group-hover:text-white dark:group-hover:bg-[#10b981] dark:group-hover:text-zinc-950 transition-all duration-150 shadow-xs shrink-0">
                {card.icon}
              </div>

              {/* Title */}
              <p className="text-[13px] sm:text-[14px] font-bold text-ink dark:text-[#f4f3ee] leading-tight line-clamp-1 group-hover:text-[#2E6B5E] dark:group-hover:text-[#10b981] transition-colors duration-150">
                {card.title}
              </p>
            </div>

            {/* Subtitle */}
            <div className="mt-1.5 sm:mt-2 w-full">
              <p className="text-[11px] sm:text-[12px] text-ink-3 dark:text-[#b1ada1] leading-tight line-clamp-1">
                {card.subtitle}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
