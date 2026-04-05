# 📱 Instrucciones para Generar Iconos de la App

## Problema Actual
El icono de la app se ve como una "C" genérica porque los archivos adaptive icon no están correctamente configurados.

## Solución: Generar iconos desde logo.png

### Opción 1: Usar herramienta online (MÁS FÁCIL)

1. Ve a: https://icon.kitchen/
2. Sube tu archivo `assets/images/logo.png`
3. Configura:
   - **Foreground**: Tu logo (con padding del 20%)
   - **Background**: Color sólido `#0ea5e9` (azul de CREDINICA)
   - **Shape**: Circle o Rounded Square
4. Descarga el paquete de iconos
5. Reemplaza estos archivos en `assets/images/`:
   - `android-icon-foreground.png` (512x512)
   - `android-icon-background.png` (512x512)
   - `android-icon-monochrome.png` (512x512)
   - `icon.png` (1024x1024)

### Opción 2: Usar Photoshop/GIMP

#### 1. android-icon-foreground.png (512x512)
- Abrir logo.png
- Redimensionar a 432x432 (mantener aspecto)
- Crear canvas de 512x512
- Centrar el logo (dejar 40px de padding en todos los lados)
- Fondo: Transparente
- Guardar como PNG

#### 2. android-icon-background.png (512x512)
- Crear imagen nueva 512x512
- Rellenar con color sólido: `#0ea5e9` (RGB: 14, 165, 233)
- Guardar como PNG

#### 3. android-icon-monochrome.png (512x512)
- Usar el mismo que foreground
- Convertir a escala de grises
- Aplicar threshold para hacerlo blanco/negro puro
- Guardar como PNG

#### 4. icon.png (1024x1024)
- Abrir logo.png
- Redimensionar a 1024x1024 (mantener aspecto, centrar)
- Fondo: Transparente o blanco
- Guardar como PNG

#### 5. splash-icon.png (200x200)
- Abrir logo.png
- Redimensionar a 200x200 (mantener aspecto, centrar)
- Fondo: Transparente
- Guardar como PNG

### Opción 3: Usar script automatizado

Si tienes Node.js con sharp instalado:

```bash
cd credinica-mobile
npm install --save-dev sharp
node scripts/generate-app-icons.js
```

## Configuración Actual en app.json

```json
"android": {
  "adaptiveIcon": {
    "backgroundColor": "#0ea5e9",
    "foregroundImage": "./assets/images/android-icon-foreground.png",
    "monochromeImage": "./assets/images/android-icon-monochrome.png"
  },
  "icon": "./assets/images/icon.png"
}
```

## Después de generar los iconos

1. Reemplazar los archivos en `assets/images/`
2. Limpiar caché: `npx expo start -c`
3. Compilar APK: `eas build --platform android --profile production`

## Colores de CREDINICA

- Azul principal: `#0ea5e9` (RGB: 14, 165, 233)
- Blanco: `#FFFFFF`
- Gris oscuro: `#1e293b`

## Notas Importantes

- **Adaptive Icons**: Android usa dos capas (foreground + background) que se pueden animar y adaptar a diferentes formas
- **Padding**: El foreground debe tener ~20% de padding para evitar que se corte en diferentes formas
- **Monochrome**: Para Android 13+ themed icons (se colorea automáticamente según el tema del usuario)
- **Tamaños**: Siempre usar potencias de 2 o múltiplos de 512 para mejor calidad

## Verificar Resultado

Después de compilar, el icono debería verse como tu logo de CREDINICA con fondo azul en el launcher de Android.
