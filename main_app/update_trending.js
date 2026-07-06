const fs = require('fs');

let content = fs.readFileSync('components/MultiChainSwap.tsx', 'utf-8');

// Remove TrendingBar definition
content = content.replace(/function TrendingBar\(\{ chains \}: \{ chains: any\[\] \}\) \{[\s\S]*?\}\n\n/m, '');

// Add showTxs state
content = content.replace(
  'const [showDestDropdown, setShowDestDropdown] = useState(false)',
  'const [showDestDropdown, setShowDestDropdown] = useState(false)\n  const [showTxs, setShowTxs] = useState(false)'
);

// Remove TrendingBar usage and update onClick
content = content.replace(
  '<TrendingBar chains={chains} />',
  '<div className="text-white/50 text-sm font-semibold"></div>'
);

content = content.replace(
  'onClick={() => {}}',
  'onClick={() => setShowTxs(true)}'
);

// Add import for TransactionsPanel
content = content.replace(
  'import { DynamicTokenModal, Token } from \'./DynamicTokenModal\'',
  'import { DynamicTokenModal, Token } from \'./DynamicTokenModal\'\nimport TransactionsPanel from \'./TransactionsPanel\''
);

// Render TransactionsPanel at bottom
content = content.replace(
  '{/* Modals */}',
  '{/* Modals */}\n      <TransactionsPanel open={showTxs} onClose={() => setShowTxs(false)} />'
);

fs.writeFileSync('components/MultiChainSwap.tsx', content, 'utf-8');
console.log("Updated MultiChainSwap.tsx");
