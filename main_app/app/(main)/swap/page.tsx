import AuthGuard from '@/components/auth/AuthGuard';
import SimpleNav from '@/components/simple-nav';

export default function SwapPage() {
  return (
    <AuthGuard requireAuth={true}>
      <div className="bg-black min-h-screen">
        <SimpleNav />
        <main className="max-w-7xl mx-auto px-4 pt-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="text-white/10 text-8xl font-bold">⇄</div>
            <h1 className="text-white text-3xl font-bold">Swap</h1>
            <p className="text-white/40 text-base">Coming soon</p>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
