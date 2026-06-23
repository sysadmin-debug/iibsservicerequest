const fs = require('fs');
let code = fs.readFileSync('admin.js', 'utf8');
code = code.replace(/\\`/g, '`');
code = code.replace(/\\\$/g, '$');
fs.writeFileSync('admin.js', code);
console.log('Fixed admin.js syntax');
