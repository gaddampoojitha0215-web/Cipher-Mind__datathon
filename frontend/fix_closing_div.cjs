const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Find the footer closing tag and the div after it
const target = '      </footer>\r\n    </div>\r\n  );\r\n}\r\n\r\nexport default App;';
const replacement = '      </footer>\r\n      </div>{/* end flex-1 content wrapper */}\r\n    </div>\r\n  );\r\n}\r\n\r\nexport default App;';

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Fixed: added closing div');
} else {
  // Try without \r
  const target2 = '      </footer>\n    </div>\n  );\n}\n\nexport default App;';
  const replacement2 = '      </footer>\n      </div>{/* end flex-1 content wrapper */}\n    </div>\n  );\n}\n\nexport default App;';
  if (content.includes(target2)) {
    content = content.replace(target2, replacement2);
    fs.writeFileSync('src/App.tsx', content);
    console.log('Fixed (LF): added closing div');
  } else {
    console.log('Target not found. Trying regex...');
    // Use regex
    const regex = /(      <\/footer>)\s*(\n|\r\n)\s*(    <\/div>)\s*(\n|\r\n)\s*(\);)\s*(\n|\r\n)(})/;
    if (regex.test(content)) {
      content = content.replace(regex, '$1$2      </div>{/* end flex-1 content wrapper */}$2$3$4$5$6$7');
      fs.writeFileSync('src/App.tsx', content);
      console.log('Fixed (regex): added closing div');
    } else {
      console.log('Could not find pattern to fix');
    }
  }
}
