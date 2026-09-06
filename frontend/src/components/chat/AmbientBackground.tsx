import React from "react";

export const AmbientBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none bg-[#F7F6ED]">
      {/* Top Left Floating Lavender Orb */}
      <div 
        className="animate-orb-1 absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-[#D0CCE5]/70 opacity-60 blur-[90px]"
      />

      {/* Top Right Floating Mint Orb */}
      <div 
        className="animate-orb-2 absolute top-10 -right-20 h-[450px] w-[450px] rounded-full bg-[#D0E7E1]/80 opacity-70 blur-[100px]"
      />

      {/* Center Bottom Floating Blush Orb */}
      <div 
        className="animate-orb-3 absolute -bottom-20 left-1/4 h-[400px] w-[400px] rounded-full bg-[#F2CFDF]/60 opacity-60 blur-[95px]"
      />

      {/* Bottom Right Floating Matcha Orb */}
      <div 
        className="animate-orb-1 absolute -bottom-10 right-10 h-[380px] w-[380px] rounded-full bg-[#E1EED7]/70 opacity-60 blur-[85px]"
      />

      {/* Subtle Noise / Grid Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.025]" />
    </div>
  );
};
