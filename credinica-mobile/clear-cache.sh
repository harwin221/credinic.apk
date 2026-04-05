#!/bin/bash
echo "Limpiando cache de Expo y Metro..."

# Eliminar carpeta .expo
if [ -d ".expo" ]; then
    echo "Eliminando .expo..."
    rm -rf .expo
fi

# Eliminar cache de node_modules
if [ -d "node_modules/.cache" ]; then
    echo "Eliminando node_modules/.cache..."
    rm -rf node_modules/.cache
fi

# Eliminar cache de Metro
echo "Eliminando cache de Metro..."
rm -rf $TMPDIR/metro-* 2>/dev/null
rm -rf $TMPDIR/haste-map-* 2>/dev/null

# Eliminar cache de watchman si existe
if [ -d "$HOME/.watchman" ]; then
    echo "Eliminando cache de watchman..."
    rm -rf $HOME/.watchman
fi

echo ""
echo "Cache limpiado! Ahora ejecuta: npx expo start"
echo ""
