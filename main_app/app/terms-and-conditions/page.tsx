'use client'

import { useWalletManager } from '@/hooks/useWalletManager'
import { useRouter } from 'next/navigation'
import SimpleNav from '@/components/simple-nav'

export default function TermsAndConditionsPage() {
  const { address } = useWalletManager()
  const router = useRouter()

  const handleAcceptTerms = () => {
    if (address) {
      // Store acceptance in localStorage
      localStorage.setItem(`terms_accepted_${address}`, 'true')
      // Redirect to dashboard
      router.push('/fiat')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <SimpleNav />

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 font-montserrat">
            Terms & Conditions
          </h1>
          <p className="text-gray-400 text-lg font-montserrat">
            Please read these terms carefully before using Srd.Exchange
          </p>
          <div className="mt-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
            <p className="text-purple-300 font-medium font-montserrat">
              By Connecting Your Wallet, you agree to all terms and conditions.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8 text-gray-300">

          {/* Introduction */}
          <section className="bg-[#111111] border border-gray-700 rounded-lg p-6">
            <p className="leading-relaxed font-montserrat">
              Welcome to Srd.Exchange ("Platform", "we", "our", or "us"). By accessing or using our services, you ("User", "you", or "your") agree to comply with and be bound by the following Terms & Conditions. Please read them carefully before using the Platform.
            </p>
          </section>

          {/* 1. Nature of Platform */}
          <section className="bg-[#111111] border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 font-montserrat">1. Nature of the Platform</h2>
            <div className="space-y-3">
              <p className="font-montserrat"><span className="font-semibold">1.1</span> Srd.Exchange is a peer-to-peer (P2P) decentralized platform that enables users to connect and trade digital assets (such as USDT & INR) directly with each other.</p>
              <p className="font-montserrat"><span className="font-semibold">1.2</span> The Platform does not hold user funds, act as a payment processor, or guarantee any transactions. Users transact directly with one another at their own discretion.</p>
              <p className="font-montserrat"><span className="font-semibold">1.3</span> Srd.Exchange provides only a technological interface to facilitate matching and communication between buyers and sellers.</p>
            </div>
          </section>

          {/* 2. Eligibility */}
          <section className="bg-[#111111] border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 font-montserrat">2. Eligibility</h2>
            <div className="space-y-3">
              <p className="font-montserrat"><span className="font-semibold">2.1</span> By using Srd.Exchange, you confirm that:</p>
              <ul className="ml-6 space-y-2 list-disc font-montserrat">
                <li>You are at least 18 years of age.</li>
                <li>You are not restricted by any law, regulation, or authority in your jurisdiction from using P2P exchanges.</li>
                <li>You are using the Platform only for lawful purposes.</li>
                <li>Users must comply with local laws in their jurisdiction.</li>
                <li>Use of the Platform is prohibited for money laundering, fraud, terrorist financing, or any unlawful activity.</li>
              </ul>
            </div>
          </section>

          {/* 3. User Verification & Limits */}
          <section className="bg-[#111111] border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 font-montserrat">3. User Verification & Limits</h2>
            <div className="space-y-3">
              <p className="font-montserrat"><span className="font-semibold">3.1</span> For any transactions, the Platform may require indirect/Direct verification methods such as valid social media accounts, Bank account Verification, identity Verification (Specific cases) or any possible way to support your transaction is legal.</p>
              <p className="font-montserrat"><span className="font-semibold">3.2</span> For higher-value transactions, the Platform may require submission of PAN, Aadhaar, and can also charge fee as security.</p>
              <div className="mt-4">
                <p className="font-semibold font-montserrat"><span className="font-semibold">3.3</span> Transaction Limits:</p>
                <ul className="ml-6 mt-2 space-y-1 list-disc font-montserrat">
                  <li><span className="font-medium">UPI Payments:</span> Maximum of $100 approx. equivalent per day per wallet.</li>
                  <li><span className="font-medium">Cash Deposit (CDM):</span> Maximum of $500 equivalent per day. Security Fee Deposit verification required from the registered UPI.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 4. User Responsibilities */}
          <section className="bg-[#111111] border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 font-montserrat">4. User Responsibilities</h2>
            <div className="space-y-3">
              <p className="font-montserrat"><span className="font-semibold">4.1</span> You agree to provide accurate information and not engage in any form of fraud, scam, or misrepresentation.</p>
              <p className="font-montserrat"><span className="font-semibold">4.2</span> You are fully responsible for ensuring compliance with your local laws, taxation obligations, and banking regulations when using the Platform.</p>
              <p className="font-montserrat"><span className="font-semibold">4.3</span> Maintain proof of payments and transaction records.</p>
              <p className="font-montserrat"><span className="font-semibold">4.4</span> Ensure tax compliance under Indian law (Income Tax Act).</p>
              <div className="mt-4">
                <p className="font-semibold font-montserrat"><span className="font-semibold">4.5</span> You agree not to use Srd.Exchange for:</p>
                <ul className="ml-6 mt-2 space-y-1 list-disc font-montserrat">
                  <li>Money laundering, terrorist financing, or illegal transactions.</li>
                  <li>Fraudulent activities, chargebacks, or stolen payment methods or any unlawful activity.</li>
                  <li>Any activity that may harm the reputation or functioning of the Platform.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 5. Risks & Disclaimer */}
          <section className="bg-[#111111] border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 font-montserrat">5. Risks & Disclaimer</h2>
            <div className="space-y-3">
              <p className="font-montserrat"><span className="font-semibold">5.1</span> Cryptocurrency trading carries market, regulatory, and technological risks. Prices are volatile and losses can occur.</p>
              <p className="font-montserrat"><span className="font-semibold">5.2</span> Srd.Exchange does not provide investment advice, financial guarantees, or transaction assurance.</p>
              <p className="font-montserrat"><span className="font-semibold">5.3</span> Users acknowledge that all trades are conducted at their own risk.</p>
              <p className="font-montserrat"><span className="font-semibold">5.4</span> Srd.Exchange is not responsible for user negligence, scams, or losses.</p>
            </div>
          </section>

          {/* 6. Dispute Resolution */}
          <section className="bg-[#111111] border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 font-montserrat">6. Dispute Resolution</h2>
            <div className="space-y-3">
              <p className="font-montserrat"><span className="font-semibold">6.1</span> In case of a dispute between two users, the Platform may provide limited mediation support but will not be held responsible for transaction outcomes.</p>
              <p className="font-montserrat"><span className="font-semibold">6.2</span> Users are encouraged to keep proof of payment, chat records, and transaction details for their own protection.</p>
              <p className="font-montserrat"><span className="font-semibold">6.3</span> Srd.Exchange may provide limited mediation such as holding USDT, but final responsibility lies with users and merchants.</p>
            </div>
          </section>

          {/* 7. Liability Limitation */}
          <section className="bg-[#111111] border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 font-montserrat">7. Liability Limitation</h2>
            <div className="space-y-3">
              <div>
                <p className="font-montserrat"><span className="font-semibold">7.1</span> Srd.Exchange shall not be liable for:</p>
                <ul className="ml-6 mt-2 space-y-1 list-disc font-montserrat">
                  <li>Loss of funds due to user negligence, fraud, hack or third-party actions.</li>
                  <li>Technical issues, downtime, or server failures.</li>
                  <li>Any indirect, incidental, or consequential damages.</li>
                </ul>
              </div>
              <p className="font-montserrat"><span className="font-semibold">7.2</span> Liability, if proven, shall not exceed fees paid to the Platform (if any).</p>
            </div>
          </section>

          {/* 8. Compliance with Indian Law */}
          <section className="bg-[#111111] border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 font-montserrat">8. Compliance with Indian Law</h2>
            <div className="space-y-3">
              <p className="font-montserrat"><span className="font-semibold">8.1</span> Users agree to comply with all applicable laws of India, including but not limited to the Prevention of Money Laundering Act (PMLA), RBI guidelines, and Income Tax laws.</p>
              <p className="font-montserrat"><span className="font-semibold">8.2</span> Srd.Exchange reserves the right to restrict or terminate any user account if there is suspicion of illegal activity.</p>
              <p className="font-montserrat"><span className="font-semibold">8.3</span> Platform can take legal action on any suspicious or unlawful user if they are not agreeing to coordinate with Srd.Exchange.</p>
            </div>
          </section>

          {/* 9. Amendments */}
          <section className="bg-[#111111] border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 font-montserrat">9. Amendments</h2>
            <p className="font-montserrat">We may update these Terms & Conditions from time to time. Continued use of the Platform after changes are published shall constitute acceptance of the revised terms.</p>
          </section>

          {/* 10. Governing Law */}
          <section className="bg-[#111111] border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 font-montserrat">10. Governing Law</h2>
            <p className="font-montserrat">These Terms & Conditions shall be governed by and construed in accordance with the laws of India. Any disputes shall fall under the exclusive jurisdiction of the courts in Lucknow, Uttar Pradesh.</p>
          </section>

          {/* 11. Contact */}
          <section className="bg-[#111111] border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 font-montserrat">11. Contact</h2>
            <div className="space-y-2">
              <p className="font-montserrat">For any queries or support, please contact:</p>
              <p className="font-montserrat">📧 <a href="mailto:support@srd.exchange" className="text-purple-400 hover:text-purple-300">support@srd.exchange</a></p>
              <p className="font-montserrat">For Legal queries:</p>
              <p className="font-montserrat">📧 <a href="mailto:legalsupport@srd.exchange" className="text-purple-400 hover:text-purple-300">legalsupport@srd.exchange</a></p>
            </div>
          </section>

          {/* Privacy Policy */}
          <section className="bg-[#111111] border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 font-montserrat">🔒 Privacy Policy</h2>
            <p className="mb-4 font-montserrat">We respect your privacy and are committed to protecting your personal data in compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act) and other Indian IT laws.</p>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2 font-montserrat">1. Data We Collect</h3>
                <ul className="ml-6 space-y-1 list-disc font-montserrat">
                  <li>Basic account info (Wallet address, username, UPI, bank details).</li>
                  <li>Verification info for high-value trades or additional verification (PAN, Aadhaar, security fee deposit proof).</li>
                  <li>Transaction records (amount, method, counterparties).</li>
                  <li>May also social media verification.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2 font-montserrat">2. How We Use Data</h3>
                <ul className="ml-6 space-y-1 list-disc font-montserrat">
                  <li>To enable secure P2P transactions.</li>
                  <li>To prevent fraud, scams, and misuse.</li>
                  <li>To comply with legal & regulatory obligations.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2 font-montserrat">3. Data Sharing</h3>
                <p className="font-montserrat">We do not sell or rent your data. Data may be shared only:</p>
                <ul className="ml-6 mt-2 space-y-1 list-disc font-montserrat">
                  <li>With regulators if legally required.</li>
                  <li>With limited trusted third-party providers (e.g., payment verification, buyer, seller).</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2 font-montserrat">4. Data Retention</h3>
                <ul className="ml-6 space-y-1 list-disc font-montserrat">
                  <li>Transaction records: retained for 5 years (as per Indian law).</li>
                  <li>KYC documents (if submitted): securely stored and encrypted.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2 font-montserrat">5. User Rights</h3>
                <ul className="ml-6 space-y-1 list-disc font-montserrat">
                  <li>Right to request access, correction, or deletion of your data (limited).</li>
                  <li>Right to withdraw consent (subject to legal obligations).</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2 font-montserrat">6. Security Measures</h3>
                <ul className="ml-6 space-y-1 list-disc font-montserrat">
                  <li>Encryption of sensitive data.</li>
                  <li>Fee Deposit Verification for CDM (Cash Deposit).</li>
                  <li>Restricted admin access to personal data.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Risk Disclaimer */}
          <section className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-red-400 mb-4 font-montserrat">⚠️ Risk Disclaimer</h2>
            <div className="space-y-3 text-red-200">
              <p className="font-montserrat"><span className="font-semibold">No Investment Advice:</span> Srd.Exchange does not provide investment or trading advice.</p>
              <p className="font-montserrat"><span className="font-semibold">User Responsibility:</span> Users are solely responsible for their trades and compliance.</p>
              <p className="font-montserrat"><span className="font-semibold">No Guarantee:</span> We do not guarantee profits, price accuracy, or transaction success.</p>
              <p className="font-montserrat"><span className="font-semibold">Decentralized Nature:</span> Being P2P, Srd.Exchange cannot reverse or cancel user-initiated trades.</p>
            </div>
          </section>

          {/* Final Disclaimer */}
          <section className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6">
            <p className="text-yellow-200 text-center font-semibold font-montserrat">
              ⚠️ Disclaimer: Srd.Exchange is a decentralized P2P platform. We do not provide banking services or hold user funds. Users are solely responsible for their transactions.
            </p>
          </section>

          {/* Accept Button */}
          <div className="flex justify-center mt-8">
            <button
              onClick={handleAcceptTerms}
              disabled={!address}
              className="bg-[#622DBF] hover:bg-purple-700 disabled:bg-gray-600 disabled:opacity-50 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-purple-600/40 disabled:cursor-not-allowed font-montserrat"
            >
              {address ? 'Accept Terms & Continue to Dashboard' : 'Connect Wallet to Accept'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-gray-700">
          <p className="text-gray-500 font-montserrat">
            Last updated: {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>
    </div>
  )
}