import React from "react";
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
import { JellyBlobMascot } from "../ui/JellyBlobMascot";

interface HeroGreetingProps {
  onSelectPrompt: (prompt: string) => void;
  onPastePrompt?: (prompt: string) => void;
}

const FAQ_CARDS = [
  {
    id: "admission",
    icon: <GraduationCap className="w-5 h-5" />,
    title: "Admission Guide",
    subtitle: "Criteria, TNEA 1301 & documents",
    q: "What are the admission criteria, TNEA Code 1301 details, counseling pathways, eligibility, and required documents for new students at MSAJCE?",
  },
  {
    id: "courses",
    icon: <Library className="w-5 h-5" />,
    title: "Courses Offered",
    subtitle: "All 12 UG & 2 PG degrees",
    q: "What are all the 12 UG & 2 PG degree courses, department specializations, and intake capacities offered at MSAJCE?",
  },
  {
    id: "placements",
    icon: <Briefcase className="w-5 h-5" />,
    title: "Placements",
    subtitle: "Top packages & recruiters",
    q: "What are the placement statistics, top recruiting companies, highest salary package, and placement cell details for MSAJCE?",
  },
  {
    id: "scholarships",
    icon: <Award className="w-5 h-5" />,
    title: "Scholarships",
    subtitle: "Merit & government aid",
    q: "What scholarship schemes, government fee waivers, 7.5% school student quota benefits, and merit assistance are available at MSAJCE?",
  },
  {
    id: "boys-hostel",
    icon: <Building className="w-5 h-5" />,
    title: "Boys Hostel",
    subtitle: "Rooms, capacity & rules",
    q: "What are the accommodation facilities, room capacity options, food menu, and safety rules for the Boys Hostel at MSAJCE?",
  },
  {
    id: "girls-hostel",
    icon: <Home className="w-5 h-5" />,
    title: "Girls Hostel",
    subtitle: "Safety & accommodation",
    q: "What safety features, 24/7 security, room amenities, warden supervision, and facilities apply to the Girls Hostel at MSAJCE?",
  },
  {
    id: "bus",
    icon: <Bus className="w-5 h-5" />,
    title: "Bus Routes",
    subtitle: "Stops, timings & routes",
    q: "What are the college bus routes, pickup points across Chennai, morning arrival timings, and transport coverage for MSAJCE?",
  },
  {
    id: "mess",
    icon: <Utensils className="w-5 h-5" />,
    title: "Mess & Canteen",
    subtitle: "Food menu & timings",
    q: "What is the food quality, daily mess menu, dining hall capacity, and canteen options available for students at MSAJCE?",
  },
  {
    id: "library",
    icon: <BookMarked className="w-5 h-5" />,
    title: "Central Library",
    subtitle: "Books, resources & timings",
    q: "What are the Central Library facilities, book collection, IEEE digital journal access, study halls, and working hours at MSAJCE?",
  },
  {
    id: "labs",
    icon: <FlaskConical className="w-5 h-5" />,
    title: "Lab Facilities",
    subtitle: "Engineering labs & tools",
    q: "What engineering laboratories, high-performance computing centers, and specialized workshop facilities exist at MSAJCE?",
  },
  {
    id: "campus-life",
    icon: <Trophy className="w-5 h-5" />,
    title: "Campus Life",
    subtitle: "Sports, events & clubs",
    q: "What sports facilities, athletic infrastructure, annual cultural events, and technical student clubs are active at MSAJCE?",
  },
  {
    id: "contact",
    icon: <Phone className="w-5 h-5" />,
    title: "Contact Info",
    subtitle: "Phone, email & location",
    q: "What is the official contact info, phone numbers, email addresses, and campus location of MSAJCE at Siruseri IT Park?",
  },
];

const HeroGreeting = React.memo(function HeroGreeting({
  onSelectPrompt,
  onPastePrompt,
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center w-full max-w-[1120px] mx-auto px-2 sm:px-6 pt-24 sm:pt-28 md:pt-20 pb-3 sm:pb-4 my-auto"
    >
      {/* ── Hero headline ── */}
      <div className="relative flex flex-col items-center text-center mb-3 sm:mb-6 w-full">
        {/* Ambient glow backing */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[110px] rounded-full blur-[80px] opacity-25 dark:opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(ellipse, #9E2339 0%, transparent 70%)" }}
        />

        {/* Hello, [Mascot] [firstName]. structure centered across all screen sizes */}
        <div className="relative z-10 flex flex-row items-center justify-center gap-1.5 sm:gap-3.5 flex-nowrap w-full px-1">
          <motion.h1
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="hero-title text-[1.2rem] min-[360px]:text-[1.45rem] sm:text-[2.6rem] lg:text-[3.2rem] font-bold tracking-tight leading-none text-ink dark:text-[#f4f3ee] whitespace-nowrap shrink-0"
          >
            Hello,
          </motion.h1>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.03 }}
            className="shrink-0 cursor-pointer mx-0.5 sm:mx-1"
          >
            <JellyBlobMascot emotion="curious" size={68} interactive={true} showSubtitle={true} autoLoop={true} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.06 }}
            className="hero-title text-[1.2rem] min-[360px]:text-[1.45rem] sm:text-[2.6rem] lg:text-[3.2rem] font-bold tracking-tight leading-none text-ink dark:text-[#f4f3ee] whitespace-nowrap shrink-0"
          >
            {firstName}.
          </motion.h1>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="relative z-10 mt-1.5 sm:mt-2.5 text-[12px] sm:text-[14.5px] text-ink-3 dark:text-[#b1ada1] max-w-[620px] leading-relaxed font-ui px-2"
        >
          Explore&nbsp;
          <span className="font-bold text-ink dark:text-[#f4f3ee]">
            Mohamed Sathak A.J. College of Engineering and Architecture
          </span>{" "}
          — {userProfile?.purpose ? `personalized assistance for ${userProfile.purpose}` : "admissions, placements, courses, hostels, and campus life"}.
        </motion.p>
      </div>

      {/* ── All 12 Cards Grid (Responsive 2-col on Mobile/Iframe, 3-col on Tablet, 4-col on Desktop) ── */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        {FAQ_CARDS.map((card, idx) => (
          <motion.button
            key={card.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            onClick={() => handleCardClick(card.q)}
            className="group flex flex-col justify-between items-start text-left rounded-xl sm:rounded-2xl p-2.5 min-[420px]:p-3 sm:p-4 bg-white dark:bg-[#14151a] border border-black/[0.08] dark:border-white/[0.08] shadow-xs hover:border-[#9E2339] dark:hover:border-[#E11D48] hover:shadow-md cursor-pointer w-full min-h-[74px] sm:min-h-[100px]"
          >
            <div className="flex items-center gap-2 sm:gap-3 w-full">
              {/* Icon Pill Container */}
              <div className="size-7 sm:size-9 rounded-lg sm:rounded-xl bg-[#9E2339]/10 dark:bg-[#E11D48]/20 border border-[#9E2339]/20 dark:border-[#E11D48]/30 flex items-center justify-center text-[#9E2339] dark:text-[#E11D48] group-hover:bg-[#9E2339] group-hover:text-white dark:group-hover:bg-[#E11D48] dark:group-hover:text-white transition-all duration-150 shadow-xs shrink-0">
                {card.icon}
              </div>

              {/* Title */}
              <p className="text-[12px] sm:text-[14px] font-bold text-ink dark:text-[#f4f3ee] leading-tight line-clamp-1 group-hover:text-[#9E2339] dark:group-hover:text-[#E11D48] transition-colors duration-150">
                {card.title}
              </p>
            </div>

            {/* Subtitle */}
            <div className="mt-1 sm:mt-2 w-full">
              <p className="text-[10px] sm:text-[12px] text-ink-3 dark:text-[#b1ada1] leading-tight line-clamp-1">
                {card.subtitle}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
});

export default HeroGreeting;

