const fs = require('fs');

const files = [
    'app/(main)/trade/page.tsx',
    'app/(main)/wallet-check/page.tsx',
    'app/terms-and-conditions/page.tsx',
    'app/(auth)/complete-profile/page.tsx'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace import
    content = content.replace(/import SimpleNav from ['"]@\/components\/simple-nav['"];?/g, "import Navigation from '@/components/landing/Navigation';");
    
    // Replace component usage
    content = content.replace(/<SimpleNav \/>/g, '<Navigation />');
    
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
});
