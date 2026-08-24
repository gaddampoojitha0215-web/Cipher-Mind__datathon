const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add import for CommandCenter
if (!content.includes('import { CommandCenter }')) {
  content = content.replace(
    'import { Header } from "./components/Header";',
    'import { Header } from "./components/Header";\nimport { CommandCenter } from "./components/CommandCenter";'
  );
}

// 2. Replace the massive Dashboard inline JSX
const tab1Start = content.indexOf('{/* TAB 1: DASHBOARD */}');
const tab2Start = content.indexOf('{/* TAB 2: AI ASSISTANT */}');

if (tab1Start !== -1 && tab2Start !== -1) {
  const newDashboardJSX = `{/* TAB 1: DASHBOARD */}
        {activeTab === "command-center" && (
          <CommandCenter
            cases={cases}
            currentTheme={theme}
            onSelectCase={(c) => {
              setSelectedCase(c);
              setActiveTab("investigations");
            }}
            onNavigateToCases={() => setActiveTab("investigations")}
            currentTime={currentTime}
          />
        )}

        `;
  
  content = content.substring(0, tab1Start) + newDashboardJSX + content.substring(tab2Start);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Successfully replaced Dashboard with CommandCenter in App.tsx');
} else {
  console.log('Could not find TAB markers in App.tsx');
}
