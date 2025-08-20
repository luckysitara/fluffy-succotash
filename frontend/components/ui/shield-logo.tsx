import type React from "react"

interface ShieldLogoProps {
  size?: number
  className?: string
}

export const ShieldLogo: React.FC<ShieldLogoProps> = ({ size = 40, className = "" }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Shield outline */}
      <path d="M50 5 L85 20 L85 45 Q85 70 50 95 Q15 70 15 45 L15 20 Z" fill="currentColor" stroke="none" />

      {/* Inner shield */}
      <path d="M50 12 L78 25 L78 45 Q78 65 50 85 Q22 65 22 45 L22 25 Z" fill="rgba(255,255,255,0.1)" stroke="none" />

      {/* Eye outer */}
      <ellipse cx="50" cy="45" rx="20" ry="15" fill="rgba(255,255,255,0.9)" />

      {/* Eye inner (iris) */}
      <ellipse cx="50" cy="45" rx="12" ry="10" fill="rgba(0,0,0,0.8)" />

      {/* Pupil */}
      <ellipse cx="50" cy="45" rx="6" ry="5" fill="rgba(0,0,0,1)" />

      {/* Eye highlight */}
      <ellipse cx="52" cy="42" rx="2" ry="1.5" fill="rgba(255,255,255,0.8)" />
    </svg>
  )
}

export default ShieldLogo
