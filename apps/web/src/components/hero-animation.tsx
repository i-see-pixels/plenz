export function HeroAnimation() {
  return (
    <div className="w-full h-full p-4 flex items-center justify-center bg-muted/30">
      <svg
        viewBox="0 0 800 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-w-[600px] drop-shadow-xl"
      >
        <defs>
          <clipPath id="typewriter">
            <rect className="typewriter-mask" x="100" y="270" width="0" height="40" />
          </clipPath>
        </defs>

        <style>
          {`
            /* Total loop duration: 12s */
            
            /* Typewriter effect: typing from 0s to 3s (25%) */
            @keyframes typeEffect {
              0%, 5% { width: 0px; }
              20%, 95% { width: 620px; }
              96%, 100% { width: 0px; }
            }

            /* Thinking pill: fade in around 2.4s (20%), pulse, fade out at 4.2s (35%) */
            @keyframes thinkEffect {
              0%, 18% { opacity: 0; transform: scale(0.9); }
              22% { opacity: 1; transform: scale(1); }
              25% { opacity: 0.8; transform: scale(0.95); }
              28% { opacity: 1; transform: scale(1); }
              33%, 100% { opacity: 0; transform: scale(0.9); }
            }

            /* Overlay appears at 4.2s (35%), fades after select at 9.7s (81%) */
            @keyframes overlayAppear {
              0%, 33% { opacity: 0; transform: translateY(10px); }
              38%, 80% { opacity: 1; transform: translateY(0); }
              83%, 100% { opacity: 0; transform: translateY(10px); }
            }

            /* Hover highlight happens around 6.6s (55%) - 9.6s (80%) */
            @keyframes hoverEffect {
              0%, 52% { fill: transparent; }
              55%, 80% { fill: rgba(147, 51, 234, 0.1); }
              82%, 100% { fill: transparent; }
            }
            @keyframes hoverTextEffect {
              0%, 52% { fill: #64748b; }
              55%, 80% { fill: #9333ea; }
              82%, 100% { fill: #64748b; }
            }

            /* Pointer enters at 5.4s (45%), hovers from 6.6s (55%), clicks at 9.6s (80%), then leaves */
            @keyframes pointerMove {
              0%, 45% { transform: translate(700px, 450px); }
              55%, 80% { transform: translate(270px, 160px); }
              85%, 100% { transform: translate(700px, 450px); }
            }

            /* Swap text exactly when pointer clicks at 80.5% (9.66s) */
            @keyframes draftTextSwap {
              0%, 80% { opacity: 1; }
              81%, 100% { opacity: 0; }
            }
            @keyframes updatedTextSwap {
              0%, 80% { opacity: 0; }
              81%, 95% { opacity: 1; }
              96%, 100% { opacity: 0; }
            }

            /* Focus styling of input box */
            @keyframes inputFocus {
              0%, 25% { stroke: #cbd5e1; }
              35%, 80% { stroke: #9333ea; }
              82%, 95% { stroke: #3b82f6; }
              96%, 100% { stroke: #cbd5e1; }
            }

            .typewriter-mask { animation: typeEffect 12s infinite steps(60, end); }
            .think-pill { animation: thinkEffect 12s infinite ease-in-out; transform-origin: 670px 290px; }
            .overlay { animation: overlayAppear 12s infinite cubic-bezier(0.4, 0, 0.2, 1); transform-origin: top; }
            .hover-box { animation: hoverEffect 12s infinite cubic-bezier(0.4, 0, 0.2, 1); }
            .hover-text { animation: hoverTextEffect 12s infinite cubic-bezier(0.4, 0, 0.2, 1); }
            .pointer { animation: pointerMove 12s infinite cubic-bezier(0.4, 0, 0.2, 1); }
            .draft-text { animation: draftTextSwap 12s infinite step-end; }
            .updated-text { animation: updatedTextSwap 12s infinite step-end; }
            .input-box { animation: inputFocus 12s infinite ease-in-out; }
          `}
        </style>

        {/* Browser Window Backdrop */}
        <rect width="800" height="500" rx="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
        
        {/* Browser Title Bar */}
        <path d="M0 12C0 5.37258 5.37258 0 12 0H788C794.627 0 800 5.37258 800 12V40H0V12Z" fill="#f8fafc" />
        <line x1="0" y1="40" x2="800" y2="40" stroke="#e2e8f0" strokeWidth="1" />
        
        {/* Window Controls */}
        <circle cx="24" cy="20" r="6" fill="#ef4444" />
        <circle cx="44" cy="20" r="6" fill="#eab308" />
        <circle cx="64" cy="20" r="6" fill="#22c55e" />
        
        {/* Address Bar */}
        <rect x="250" y="8" width="300" height="24" rx="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
        <text x="400" y="24" fontSize="12" fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">app.promptlens.com</text>

        {/* Content Area - Chat Interface Mockup */}
        <rect x="40" y="80" width="720" height="380" rx="8" fill="#f8fafc" stroke="#e2e8f0" />
        
        {/* Fake Chat Bubbles */}
        <rect x="80" y="120" width="200" height="40" rx="8" fill="#e2e8f0" />
        <rect x="520" y="180" width="200" height="40" rx="8" fill="#3b82f6" />
        
        {/* Input Field below */}
        <rect className="input-box" x="80" y="260" width="640" height="60" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
        
        {/* Group with Typewriter Mask for both texts */}
        <g clipPath="url(#typewriter)">
          {/* Draft text */}
          <text className="draft-text" x="100" y="296" fontSize="16" fill="#334155" fontFamily="sans-serif">
            write me an email to my manager
          </text>
          
          {/* Updated text (appears on click) */}
          <text className="updated-text" x="100" y="296" fontSize="14" fill="#1e293b" fontFamily="sans-serif">
            Write a concise professional email to my manager requesting PTO from March 10 to 14.
          </text>
        </g>

        {/* Thinking Pill */}
        <g className="think-pill">
          <rect x="630" y="274" width="75" height="32" rx="16" fill="#f3e8ff" stroke="#d8b4fe" strokeWidth="1" />
          <circle cx="650" cy="290" r="3" fill="#a855f7">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="667" cy="290" r="3" fill="#a855f7">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite" begin="0.2s" />
          </circle>
          <circle cx="684" cy="290" r="3" fill="#a855f7">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite" begin="0.4s" />
          </circle>
        </g>

        {/* Suggestion Overlay Group - Centered over input content, flush with top of input box (gap of 8px) */}
        <g className="overlay" transform="translate(100, 102)">
          {/* Dropdown container */}
          <rect y="0" width="450" height="150" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" filter="drop-shadow(0 10px 15px rgba(0,0,0,0.1))" />
          
          {/* Item 1 */}
          <rect x="8" y="8" width="434" height="40" rx="6" fill="transparent" />
          <text x="24" y="34" fontSize="14" fill="#64748b" fontFamily="sans-serif">Make this more professional</text>
          
          {/* Item 2 (The Target) */}
          <rect className="hover-box" x="8" y="52" width="434" height="40" rx="6" />
          <path d="M24 72 L16 72 L16 64" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6"/>
          <text className="hover-text" x="32" y="78" fontSize="14" fontFamily="sans-serif" fontWeight="500">Add context about PTO dates</text>
          
          {/* Item 3 */}
          <rect x="8" y="96" width="434" height="40" rx="6" fill="transparent" />
          <text x="24" y="122" fontSize="14" fill="#64748b" fontFamily="sans-serif">Make it shorter</text>
        </g>

        {/* Mouse Pointer */}
        <g className="pointer">
          <path 
            d="M5 5 L16.5 28.5 L20.5 18 L31.5 14 L5 5Z" 
            fill="#1e293b" 
            stroke="#ffffff" 
            strokeWidth="2"
            strokeLinejoin="round" 
            filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"
          />
        </g>
      </svg>
    </div>
  );
}
