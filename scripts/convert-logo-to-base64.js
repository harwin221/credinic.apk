const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '..', 'public', 'CrediNica.png');
const logoBuffer = fs.readFileSync(logoPath);
const logoBase64 = logoBuffer.toString('base64');

console.log('Logo convertido a base64. Tamaño:', logoBase64.length, 'caracteres');
console.log('\nCopia este código en tu archivo:\n');
console.log(`const LOGO_BASE64 = '${logoBase64}';`);

// Guardar en archivo
fs.writeFileSync(
    path.join(__dirname, 'logo-base64.txt'),
    logoBase64
);

console.log('\n✅ También guardado en scripts/logo-base64.txt');
