import AuthGuard from '@/components/auth/AuthGuard';
import SimpleNav from '@/components/simple-nav';
import MultiChainSwap from '@/components/MultiChainSwap';
import StarField from '@/components/StarField';
import CustomCursor from '@/components/CustomCursor';

export default function SwapPage() {
  return (
    <AuthGuard requireAuth={true}>
      <div className="relative bg-black h-[100dvh] text-white scanlines overflow-hidden flex flex-col no-scrollbar">
        <CustomCursor />
        <StarField />
        <div className="shrink-0 relative z-10">
          <SimpleNav />
        </div>

        {/* Ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-30 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, rgba(123,47,247,0.55) 0%, rgba(123,47,247,0) 70%)",
          }}
        />

        <main className="relative flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto no-scrollbar pb-6 z-10">
          <div className="mb-2 md:mb-4 text-center w-full max-w-[520px]">
            <h1
              className="font-bold leading-none tracking-tight pt-2 pb-1"
              style={{
                fontSize: "clamp(42px, 8vw, 72px)",
                background: "linear-gradient(180deg, #ffffff 0%, #7B2FF7 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Swap
            </h1>
            <p className="mt-3 text-text-secondary text-sm md:text-base">
              Swap across 8 chains in one click,&nbsp;
              <span className="text-purple font-semibold">Gasless</span>
            </p>
          </div>

          <div className="w-full max-w-[520px] shrink-0">
            <MultiChainSwap />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
