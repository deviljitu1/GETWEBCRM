const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Footer replacements (do this before general replacements)
  content = content.replace(/©\{new Date\(\)\.getFullYear\(\)\} Horizon UI\. All Rights Reserved by[\s\S]*?ThemeWagon<\/a>/g, '©{new Date().getFullYear()} getwebcrm. All Rights Reserved.');
  
  // Sidebar card link
  content = content.replace(/href="https:\/\/themewagon\.com[^"]*"/g, 'href="#!"');
  content = content.replace(/href="https:\/\/github\.com\/horizon-ui[^"]*"/g, 'href="#!"');

  // General text replacements
  content = content.replace(/Horizon UI Dashboard PRO/g, 'getwebcrm Dashboard PRO');
  content = content.replace(/Horizon UI PRO/gi, 'getwebcrm PRO');
  content = content.replace(/Horizon UI Free/gi, 'getwebcrm Free');
  content = content.replace(/Horizon UI Dashboard/gi, 'getwebcrm Dashboard');
  content = content.replace(/Try Horizon Free/gi, 'Try getwebcrm Free');
  content = content.replace(/Horizon UI/gi, 'getwebcrm');
  content = content.replace(/ThemeWagon/gi, 'getwebcrm');
  content = content.replace(/horizon-ui/gi, 'getwebcrm');
  content = content.replace(/horizon-next/gi, 'getwebcrm');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        walk(fullPath);
      }
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.md') || fullPath.endsWith('.json')) {
      replaceInFile(fullPath);
    }
  }
}

walk(path.join(__dirname, 'src'));
walk(path.join(__dirname, 'public'));
replaceInFile(path.join(__dirname, 'README.md'));
replaceInFile(path.join(__dirname, 'package.json'));
