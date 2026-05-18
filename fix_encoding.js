const fs = require('fs');
const path = require('path');

const replacements = {
  'âœ“': '✔',
  'âœ—': '✖',
  'â„¹': 'ℹ',
  'â€”': '-',
  'â€¦': '...',
  'â˜ ': '☁',
  'ðŸ’¾': '💾',
  'Ã—': '×',
  'Â·': '·'
};

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [bad, good] of Object.entries(replacements)) {
        if (content.includes(bad)) {
          content = content.split(bad).join(good);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed encoding in ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
console.log('Done fixing encoding issues!');
