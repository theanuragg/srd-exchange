'use client';

import { AuthButton } from '@coinbase/cdp-react/components/AuthButton';
import { useCurrentUser } from '@coinbase/cdp-hooks';
import { useIsSignedIn } from '@coinbase/cdp-hooks';
import { useIsInitialized } from '@coinbase/cdp-hooks';
import { useEvmAddress } from '@coinbase/cdp-hooks';
import { useEvmSmartAccounts } from '@coinbase/cdp-hooks';

export default function TestCDPPage() {
  const { isInitialized } = useIsInitialized();
  const { isSignedIn } = useIsSignedIn();
  const { currentUser } = useCurrentUser();
  const { evmAddress } = useEvmAddress();
  const { evmSmartAccounts } = useEvmSmartAccounts();

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">CDP Wallet Test</h1>
          <AuthButton />
        </div>

        {!isInitialized && (
          <div className="p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
            Initializing CDP SDK...
          </div>
        )}

        {isInitialized && !isSignedIn && (
          <div className="p-8 text-center space-y-4">
            <p className="text-gray-400">Sign in to create your CDP wallet</p>
            <p className="text-sm text-gray-500">
              Uses email/SMS/social login via Coinbase CDP
            </p>
          </div>
        )}

        {isSignedIn && (
          <div className="space-y-6">
            <div className="p-6 bg-green-900/20 border border-green-700 rounded-lg">
              <p className="text-green-400 font-semibold">Wallet Created Successfully!</p>
            </div>

            <div className="space-y-4">
              <Section title="User Info">
                <Field label="User ID" value={currentUser?.userId} />
                <Field label="Auth Methods" value={JSON.stringify(currentUser?.authenticationMethods, null, 2)} />
              </Section>

              <Section title="EVM Address (Primary)">
                <Field label="Address" value={evmAddress} />
              </Section>

              <Section title="Smart Accounts">
                {evmSmartAccounts && evmSmartAccounts.length > 0 ? (
                  evmSmartAccounts.map((acc, i) => (
                    <div key={acc.address} className="p-3 bg-gray-800 rounded">
                      <Field label={`Account ${i + 1}`} value={acc.address} />
                      <Field label="Owners" value={acc.ownerAddresses?.join(', ')} />
                      <Field label="Created" value={new Date(acc.createdAt).toLocaleString()} />
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No smart accounts</p>
                )}
              </Section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-gray-300">{title}</h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="text-sm">
      <span className="text-gray-500">{label}: </span>
      <span className="text-gray-300 font-mono break-all">{value}</span>
    </div>
  );
}
