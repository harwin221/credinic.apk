const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '../assets/images/logo.png');
const OUTPUT_DIR = path.join(__dirname, '../assets/images');

async function generateIcons() {
    console.log('🎨 Generando iconos de la aplicación...\n');

    try {
        // Verificar que existe el logo
        if (!fs.existsSync(LOGO_PATH)) {
            console.error('❌ No se encontró logo.png');
            return;
        }

        // 1. Icon principal (1024x1024 para stores)
        console.log('📱 Generando icon.png (1024x1024)...');
        await sharp(LOGO_PATH)
            .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .png()
            .toFile(path.join(OUTPUT_DIR, 'icon.png'));

        // 2. Adaptive Icon Foreground (512x512 con padding)
        console.log('🎯 Generando android-icon-foreground.png (512x512)...');
        await sharp(LOGO_PATH)
            .resize(432, 432, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .extend({
                top: 40,
                bottom: 40,
                left: 40,
                right: 40,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toFile(path.join(OUTPUT_DIR, 'android-icon-foreground.png'));

        // 3. Adaptive Icon Background (512x512 color sólido)
        console.log('🎨 Generando android-icon-background.png (512x512)...');
        await sharp({
            create: {
                width: 512,
                height: 512,
                channels: 4,
                background: { r: 14, g: 165, b: 233, alpha: 1 } // #0ea5e9
            }
        })
            .png()
            .toFile(path.join(OUTPUT_DIR, 'android-icon-background.png'));

        // 4. Monochrome Icon (para Android 13+)
        console.log('⚫ Generando android-icon-monochrome.png (512x512)...');
        await sharp(LOGO_PATH)
            .resize(432, 432, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .greyscale()
            .threshold(128)
            .extend({
                top: 40,
                bottom: 40,
                left: 40,
                right: 40,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toFile(path.join(OUTPUT_DIR, 'android-icon-monochrome.png'));

        // 5. Splash Icon (200x200 para splash screen)
        console.log('💦 Generando splash-icon.png (200x200)...');
        await sharp(LOGO_PATH)
            .resize(200, 200, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .png()
            .toFile(path.join(OUTPUT_DIR, 'splash-icon.png'));

        // 6. Favicon (48x48 para web)
        console.log('🌐 Generando favicon.png (48x48)...');
        await sharp(LOGO_PATH)
            .resize(48, 48, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .png()
            .toFile(path.join(OUTPUT_DIR, 'favicon.png'));

        console.log('\n✅ ¡Todos los iconos generados exitosamente!');
        console.log('\n📋 Archivos generados:');
        console.log('   - icon.png (1024x1024) - Icono principal');
        console.log('   - android-icon-foreground.png (512x512) - Capa frontal Android');
        console.log('   - android-icon-background.png (512x512) - Fondo Android');
        console.log('   - android-icon-monochrome.png (512x512) - Icono monocromático');
        console.log('   - splash-icon.png (200x200) - Pantalla de carga');
        console.log('   - favicon.png (48x48) - Icono web');
        console.log('\n💡 Ahora puedes compilar la APK con: npm run build:apk');

    } catch (error) {
        console.error('❌ Error generando iconos:', error);
    }
}

generateIcons();
