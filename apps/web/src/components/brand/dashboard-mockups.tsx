/** Decorative UI thumbnails for login / marketing panels */
export function DashboardMockups({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2 justify-end max-w-[280px] ms-auto ${className}`}>
      <MockCard w="w-[72px]" h="h-[52px]" />
      <MockCard w="w-[88px]" h="h-[52px]" highlight />
      <MockCard w="w-[64px]" h="h-[52px]" />
      <MockCard w="w-[80px]" h="h-[44px]" />
      <MockCard w="w-[96px]" h="h-[44px]" highlight />
      <MockCard w="w-[70px]" h="h-[44px]" />
    </div>
  );
}

function MockCard({ w, h, highlight }: { w: string; h: string; highlight?: boolean }) {
  return (
    <div
      className={`${w} ${h} rounded-md border overflow-hidden shadow-sm ${
        highlight ? 'border-vega-cyan/40 ring-1 ring-vega-cyan/20' : 'border-[#dde2ef]'
      }`}
    >
      <div className="h-[30%] bg-vega-navy/90 flex items-center gap-0.5 px-1">
        <div className="w-1 h-1 rounded-full bg-white/40" />
        <div className="w-1 h-1 rounded-full bg-white/40" />
        <div className="w-1 h-1 rounded-full bg-white/40" />
      </div>
      <div className="h-[70%] bg-white p-1 flex flex-col gap-0.5">
        <div className="h-1 w-full bg-[#eef0f7] rounded-sm" />
        <div className="h-1 w-3/4 bg-[#eef0f7] rounded-sm" />
        <div className="flex gap-0.5 mt-auto">
          <div className="h-3 flex-1 bg-vega-cyan/20 rounded-sm" />
          <div className="h-3 flex-1 bg-vega-navy/15 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
