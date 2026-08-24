const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add imports
if (!content.includes('import { Sidebar, TabType }')) {
  content = content.replace(
    'import logoImg from "./assets/logo.png";',
    'import logoImg from "./assets/logo.png";\nimport { Sidebar, TabType } from "./components/Sidebar";\nimport { Header } from "./components/Header";'
  );
}

// 2. Update state
content = content.replace(
  'const [activeTab, setActiveTab] = useState<"dashboard" | "chat" | "network" | "cases" | "map">("dashboard");',
  'const [activeTab, setActiveTab] = useState<TabType>("command-center" as any);'
);

// 3. Update setActiveTab calls
content = content.replace(/setActiveTab\("dashboard"\)/g, 'setActiveTab("command-center")');
content = content.replace(/setActiveTab\("chat"\)/g, 'setActiveTab("intelligence")');
content = content.replace(/setActiveTab\("network"\)/g, 'setActiveTab("network-intelligence")');
content = content.replace(/setActiveTab\("cases"\)/g, 'setActiveTab("investigations")');
content = content.replace(/setActiveTab\("map"\)/g, 'setActiveTab("geo-intelligence")');

// 4. Update activeTab conditions
content = content.replace(/activeTab === "dashboard"/g, 'activeTab === "command-center"');
content = content.replace(/activeTab === "chat"/g, 'activeTab === "intelligence"');
content = content.replace(/activeTab === "network"/g, 'activeTab === "network-intelligence"');
content = content.replace(/activeTab !== "network"/g, 'activeTab !== "network-intelligence"');
content = content.replace(/activeTab === "cases"/g, '(activeTab === "investigations" || activeTab === "case-files")');
content = content.replace(/activeTab === "map"/g, 'activeTab === "geo-intelligence"');

// 5. Replace header block
const headerStartRegex = /<header className={`border-b \$\{theme\.border\} bg-white\/80 dark:bg-black\/80 px-6 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-50 \$\{theme\.textMain\}`}[\s\S]*?<\/header>/;

const newHeaderAndSidebar = `
      <Sidebar activeTab={activeTab as TabType} onSelectTab={setActiveTab} currentTheme={theme} />
      
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header 
          currentTheme={theme}
          onToggleTheme={() => setTheme(theme.id === "dark" ? THEMES[1] : THEMES[0])}
          language={language}
          onChangeLanguage={(lang) => setLanguage(lang as any)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={(e) => { e.preventDefault(); }}
        />
`;

content = content.replace(headerStartRegex, newHeaderAndSidebar);

// 6. Update the main container and closing div
content = content.replace(
  '<div className={`h-screen overflow-hidden ${theme.bodyBg} ${theme.textMain} transition-colors duration-300 flex flex-col font-sans',
  '<div className={`h-screen overflow-hidden ${theme.bodyBg} ${theme.textMain} transition-colors duration-300 flex flex-row font-sans'
);

// find the last </div> before export default App; and add another </div>
const lastDivIndex = content.lastIndexOf('</div>\n  );\n}\n\nexport default App;');
if (lastDivIndex !== -1) {
  content = content.substring(0, lastDivIndex) + '      </div>\n    ' + content.substring(lastDivIndex);
}

fs.writeFileSync('src/App.tsx', content);
console.log('Successfully refactored App.tsx');
