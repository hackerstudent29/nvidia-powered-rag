import React from "react";

export const AmbientBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none bg-[#F7F6ED] dark:bg-[#0b0c0e] transition-colors duration-300">
      {/* Top Left Floating Lavender Orb */}
      <div 
        className="animate-orb-1 absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-[#D0CCE5]/70 dark:bg-[#4C1D95]/20 opacity-60 dark:opacity-30 blur-[90px]"
      />

      {/* Top Right Floating Mint Orb */}
      <div 
        className="animate-orb-2 absolute top-10 -right-20 h-[450px] w-[450px] rounded-full bg-[#D0E7E1]/80 dark:bg-[#2E6B5E]/20 opacity-70 dark:opacity-30 blur-[100px]"
      />

      {/* Center Bottom Floating Blush Orb */}
      <div 
        className="animate-orb-3 absolute -bottom-20 left-1/4 h-[400px] w-[400px] rounded-full bg-[#F2CFDF]/60 dark:bg-[#9D174D]/15 opacity-60 dark:opacity-20 blur-[95px]"
      />

      {/* Bottom Right Floating Matcha Orb */}
      <div 
        className="animate-orb-1 absolute -bottom-10 right-10 h-[380px] w-[380px] rounded-full bg-[#E1EED7]/70 dark:bg-[#10b981]/15 opacity-60 dark:opacity-20 blur-[85px]"
      />

      {/* Subtle Noise / Grid Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] dark:bg-[radial-gradient(#f4f3ee_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.025] dark:opacity-[0.03]" />
    </div>
  );
};
