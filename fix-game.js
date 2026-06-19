const fs = require('fs');
const path = require('path');

let code = fs.readFileSync(path.join(__dirname, 'js/game.js'), 'utf8');
const original = code;

// ============================================================
// PASS 1: Fix PIXI.Text constructor
// ============================================================
// new PIXI.Text({ text: X, style: new PIXI.TextStyle({...}) })
// -> new PIXI.Text(X, new PIXI.TextStyle({...}))

// Match multi-line {text, style} pattern
code = code.replace(
  /new PIXI\.Text\(\{\s*\n?\s*text:\s*(.+?),\s*\n?\s*style:\s*(new PIXI\.TextStyle\([^)]*\))\s*\n?\s*\}\)/g,
  (match, textExpr, styleExpr) => {
    return `new PIXI.Text(${textExpr.trim()}, ${styleExpr.trim()})`;
  }
);

// Handle cases where there's NO trailing newline before })
// e.g. new PIXI.Text({ text: '...', style: new PIXI.TextStyle({...}) })
code = code.replace(
  /new PIXI\.Text\(\{\s*text:\s*(.+?),\s*style:\s*(new PIXI\.TextStyle\([^)]*\))\s*\}\)/g,
  (match, textExpr, styleExpr) => {
    return `new PIXI.Text(${textExpr.trim()}, ${styleExpr.trim()})`;
  }
);

// Also handle text followed by a method call on the result
// e.g. title.anchor.set(0.5, 0) - this still works after constructor change

// ============================================================
// PASS 2: Fix Graphics circle + fill
// ============================================================
// .circle(x, y, r).fill(color) -> .beginFill(color).drawCircle(x, y, r).endFill()
// .circle(x, y, r).fill({color, alpha}) -> .beginFill(color, alpha).drawCircle(x, y, r).endFill()

code = code.replace(
  /\.circle\s*\(([^)]+)\)\s*\.fill\s*\(\{?\s*color:\s*([^,}]+?)(?:\s*,\s*alpha:\s*([^}]+?))?\s*}?\s*\)/g,
  (match, args, color, alpha) => {
    if (alpha) return `.beginFill(${color.trim()}, ${alpha.trim()}).drawCircle(${args.trim()}).endFill()`;
    return `.beginFill(${color.trim()}).drawCircle(${args.trim()}).endFill()`;
  }
);

// ============================================================
// PASS 3: Fix Graphics roundRect + fill
// ============================================================
code = code.replace(
  /\.roundRect\s*\(([^)]+)\)\s*\.fill\s*\(\{?\s*color:\s*([^,}]+?)(?:\s*,\s*alpha:\s*([^}]+?))?\s*}?\s*\)/g,
  (match, args, color, alpha) => {
    if (alpha) return `.beginFill(${color.trim()}, ${alpha.trim()}).drawRoundedRect(${args.trim()}).endFill()`;
    return `.beginFill(${color.trim()}).drawRoundedRect(${args.trim()}).endFill()`;
  }
);

// ============================================================
// PASS 4: Fix Graphics rect + fill
// ============================================================
code = code.replace(
  /(?<!draw)\.rect\s*\(([^)]+)\)\s*\.fill\s*\(\{?\s*color:\s*([^,}]+?)(?:\s*,\s*alpha:\s*([^}]+?))?\s*}?\s*\)/g,
  (match, args, color, alpha) => {
    if (alpha) return `.beginFill(${color.trim()}, ${alpha.trim()}).drawRect(${args.trim()}).endFill()`;
    return `.beginFill(${color.trim()}).drawRect(${args.trim()}).endFill()`;
  }
);

// ============================================================
// PASS 5: Fix Graphics poly + fill  
// ============================================================
code = code.replace(
  /\.poly\s*\(([^)]+)\)\s*\.fill\s*\(([^)]+)\)/g,
  (match, args, fillArgs) => {
    return `.beginFill(${fillArgs.trim()}).drawPolygon(${args.trim()}).endFill()`;
  }
);

// ============================================================
// PASS 6: Fix Graphics stroke
// ============================================================
code = code.replace(
  /\.stroke\s*\(\{\s*width:\s*([^,]+?)(?:\s*,\s*color:\s*([^,]+?))?(?:\s*,\s*alpha:\s*([^}]+?))?\s*\}\)/g,
  (match, width, color, alpha) => {
    let result = `.lineStyle(${width.trim()}`;
    if (color !== undefined) result += `, ${color.trim()}`;
    if (alpha !== undefined) result += `, ${alpha.trim()}`;
    result += `)`;
    return result;
  }
);

// ============================================================
// PASS 7: Handle remaining fill patterns with object shorthand
// e.g. .fill({ color, alpha: 0.4 }) where 'color' is a variable
// These appear after the shape transforms above.
// But wait - we already handled them in passes 2-5!
// The only remaining .fill() calls would be ones that weren't 
// preceded by a shape method. Let me check if there are any.
// ============================================================

// ============================================================
// PASS 8: Verify no v8-style patterns remain
// ============================================================
const remainingCircle = (code.match(/\.circle\s*\(/g) || []).length;
const remainingFillAsMethod = (code.match(/\.fill\s*\(/g) || []).length;
const remainingStroke = (code.match(/\.stroke\s*\(/g) || []).length;
const remainingRoundRect = (code.match(/\.roundRect\s*\(/g) || []).length;
const remainingRectNonDraw = (code.match(/(?<!draw)\.rect\s*\(/g) || []).length;
const remainingPoly = (code.match(/\.poly\s*\(/g) || []).length;
const remainingTextOptions = (code.match(/new PIXI\.Text\(\{/g) || []).length;

console.log('=== Remaining v8-style patterns ===');
console.log(`circle(): ${remainingCircle}`);
console.log(`fill(): ${remainingFillAsMethod}`);
console.log(`stroke(): ${remainingStroke}`);
console.log(`roundRect(): ${remainingRoundRect}`);
console.log(`rect() (non-drawRect): ${remainingRectNonDraw}`);
console.log(`poly(): ${remainingPoly}`);
console.log(`Text({text:): ${remainingTextOptions}`);

// Check for other v8-style Graphics methods
const remainingEllipse = (code.match(/\.ellipse\s*\(/g) || []).length;
console.log(`ellipse(): ${remainingEllipse}`);

if (remainingFillAsMethod > 0) {
  console.log('\nWARNING: Remaining .fill() calls found!');
  // Show them
  const fillLines = code.split('\n').filter(l => l.includes('.fill('));
  fillLines.forEach(l => console.log(`  ${l.trim()}`));
}

if (remainingTextOptions > 0) {
  console.log('\nWARNING: Remaining Text({text: calls!');
  const textLines = code.split('\n').filter(l => l.includes('new PIXI.Text({'));
  textLines.forEach(l => console.log(`  ${l.trim()}`));
}

// ============================================================
// Write the result
// ============================================================
fs.writeFileSync(path.join(__dirname, 'js/game.js'), code, 'utf8');
console.log('\n✓ Written to js/game.js');
