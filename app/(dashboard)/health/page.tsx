export default function HealthPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1C1208]">Health</h1>
        <p className="text-sm text-[#8B7355] mt-0.5">Coming soon</p>
      </div>
      <div className="bg-white rounded-xl border border-[#E5DAC8] p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-[#F7F3EC] flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-[#C9B89A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[#3D2B14]">This module is under construction</p>
        <p className="text-xs text-[#8B7355] mt-1">Check back soon — Health management is being built.</p>
      </div>
    </div>
  );
}
