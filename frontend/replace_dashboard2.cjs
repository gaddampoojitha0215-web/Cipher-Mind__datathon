const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

if (!lines.join('\n').includes('import { CommandCenter }')) {
  lines.splice(0, 0, 'import { CommandCenter } from "./components/CommandCenter";');
}

const t1 = lines.findIndex(l => l.includes('{/* TAB 1: DASHBOARD */}'));
const t2 = lines.findIndex(l => l.includes('TAB 2:'));

if (t1 !== -1 && t2 !== -1) {
  lines.splice(t1, t2 - t1, 
    '{/* TAB 1: DASHBOARD */}',
    '        {activeTab === "command-center" && (',
    '          <CommandCenter',
    '            cases={cases}',
    '            currentTheme={theme}',
    '            onSelectCase={(c) => { setSelectedCase(c); setActiveTab("investigations"); }}',
    '            onNavigateToCases={() => setActiveTab("investigations")}',
    '            currentTime={currentTime}',
    '          />',
    '        )}',
    ''
  );
  fs.writeFileSync('src/App.tsx', lines.join('\n'));
  console.log('Replaced');
}
