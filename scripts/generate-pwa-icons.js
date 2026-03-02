const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const inputImage = path.join(__dirname, '../public/CrediNica-inicial.png');
  const outputDir = path.join(__dirname, '../public');

  console.log('🎨 Generando iconos para PWA...\n');

  try {
    // Verificar que existe la imagen de entrada
    if (!fs.existsSync(inputImage)) {
      console.error('❌ No se encontró CrediNica-inicial.png');
      return;
    }

    // Generar icono 192x192 (any)
    await sharp(inputImage)
      .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(outputDir, 'icon-192.png'));
    console.log('✅ icon-192.png creado');

    // Generar icono 512x512 (any)
    await sharp(inputImage)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(outputDir, 'icon-512.png'));
    console.log('✅ icon-512.png creado');

    // Generar icono 192x192 maskable (con fondo y padding)
    await sharp({
      create: {
        width: 192,
        height: 192,
        channels: 4,
        background: { r: 31, g: 41, b: 55, alpha: 1 } // #1f2937
      }
    })
      .composite([{
        input: await sharp(inputImage)
          .resize(154, 154, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .toBuffer(),
        gravity: 'center'
      }])
      .png()
      .toFile(path.join(outputDir, 'icon-192-maskable.png'));
    console.log('✅ icon-192-maskable.png creado');

    // Generar icono 512x512 maskable (con fondo y padding)
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 31, g: 41, b: 55, alpha: 1 } // #1f2937
      }
    })
      .composite([{
        input: await sharp(inputImage)
          .resize(410, 410, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .toBuffer(),
        gravity: 'center'
      }])
      .png()
      .toFile(path.join(outputDir, 'icon-512-maskable.png'));
    console.log('✅ icon-512-maskable.png creado');

    console.log('\n🎉 ¡Iconos generados exitosamente!');
    console.log('\nArchivos creados en public/:');
    console.log('  - icon-192.png');
    console.log('  - icon-512.png');
    console.log('  - icon-192-maskable.png');
    console.log('  - icon-512-maskable.png');
    console.log('\nAhora ejecuta: npm run build');

  } catch (error) {
    console.error('❌ Error generando iconos:', error.message);
  }
}

generateIcons();
