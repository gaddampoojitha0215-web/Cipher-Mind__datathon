const fs = require('fs');
let content = fs.readFileSync('src/components/CommandCenter.tsx', 'utf8');
content = content.replace(/\\\$\\{/g, '${');
fs.writeFileSync('src/components/CommandCenter.tsx', content);
console.log('Fixed literals');
