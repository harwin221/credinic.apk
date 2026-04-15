# Guía para Cambio de Marca/Nombre del Sistema

Esta guía te ayudará a personalizar el sistema para otra marca o cliente, cambiando todos los nombres, logos y referencias de "CrediNica" por el nuevo nombre.

---

## 1. CAMBIOS EN LA APP WEB (Next.js)

### 1.1 Nombre de la Aplicación y Metadatos

**Archivo: `src/app/layout.tsx`**
- Buscar: `title: "CrediNica"`
- Buscar: `description: "Sistema de Gestión de Créditos CrediNica"`
- Cambiar por el nuevo nombre

**Archivo: `package.json`**
- Buscar: `"name": "credinic-apk"`
- Buscar: `"description"`
- Cambiar por el nuevo nombre

### 1.2 Logos e Imágenes

**Archivos a reemplazar en `public/`:**
- `public/CrediNica.png` - Logo principal
- `public/CrediNica-inicial.png` - Logo alternativo
- `public/icon-192.png` - Icono PWA 192x192
- `public/icon-192-maskable.png` - Icono PWA maskable
- Cualquier otro archivo de imagen con el nombre de la marca

**Formato recomendado:**
- Logo principal: PNG con fondo transparente, 200-300px de ancho
- Iconos PWA: PNG 192x192px y 512x512px

### 1.3 Textos en la Interfaz

**Buscar en todos los archivos `.tsx` y `.ts`:**
```bash
# En la terminal, buscar todas las referencias:
grep -r "CrediNica" src/
grep -r "CREDINICA" src/
```

**Archivos principales a revisar:**
- `src/app/(auth)/login/page.tsx` - Pantalla de login
- `src/components/ui/header.tsx` o similar - Header/navbar
- `src/app/layout.tsx` - Layout principal
- Cualquier componente que muestre el nombre de la empresa

### 1.4 Configuración de Base de Datos

**Archivo: `.env` o `.env.local`**
- Revisar nombres de variables que puedan contener referencias a la marca
- Actualizar URLs si es necesario

### 1.5 Manifest PWA

**Archivo: `public/manifest.json` o `src/app/manifest.ts`**
```json
{
  "name": "NUEVO_NOMBRE",
  "short_name": "NUEVO_NOMBRE",
  "description": "Sistema de Gestión de Créditos NUEVO_NOMBRE"
}
```

---

## 2. CAMBIOS EN LA APP MÓVIL (React Native/Expo)

### 2.1 Nombre de la Aplicación

**Archivo: `credinica-mobile/app.json`**
```json
{
  "expo": {
    "name": "NUEVO_NOMBRE",
    "slug": "nuevo-nombre-mobile",
    "description": "Sistema de Gestión de Créditos NUEVO_NOMBRE"
  }
}
```

### 2.2 Package Name (Android)

**Archivo: `credinica-mobile/app.json`**
```json
{
  "expo": {
    "android": {
      "package": "com.nuevaempresa.nuevonombre"
    }
  }
}
```

**IMPORTANTE:** El package name debe ser único y seguir el formato: `com.empresa.app`

### 2.3 Bundle Identifier (iOS)

**Archivo: `credinica-mobile/app.json`**
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.nuevaempresa.nuevonombre"
    }
  }
}
```

### 2.4 Logos e Iconos de la App Móvil

**Archivos a reemplazar en `credinica-mobile/assets/images/`:**
- `icon.png` - Icono principal (1024x1024px)
- `splash-icon.png` - Icono para splash screen
- `logo.png` - Logo de la app
- `credinica.png` - Logo adicional
- `android-icon-foreground.png` - Icono Android foreground
- `android-icon-background.png` - Icono Android background
- `android-icon-monochrome.png` - Icono Android monocromático

**Formato recomendado:**
- Icono principal: PNG 1024x1024px con fondo transparente
- Splash icon: PNG 512x512px
- Logo: PNG con fondo transparente

**Regenerar iconos después de cambiar:**
```bash
cd credinica-mobile
npm run generate-icons
```

### 2.5 Textos en la Interfaz Móvil

**Buscar en todos los archivos `.tsx` y `.ts`:**
```bash
# En la terminal, dentro de credinica-mobile:
grep -r "CrediNica" .
grep -r "CREDINICA" .
```

**Archivos principales a revisar:**
- `credinica-mobile/app/(auth)/login.tsx` - Pantalla de login
- `credinica-mobile/app/(tabs)/*.tsx` - Todas las pestañas
- `credinica-mobile/components/*.tsx` - Todos los componentes

### 2.6 Nombre del Proyecto/Carpeta

**Opcional pero recomendado:**
- Renombrar la carpeta `credinica-mobile` a `nuevo-nombre-mobile`
- Actualizar referencias en scripts y configuraciones

---

## 3. CAMBIOS EN LA BASE DE DATOS

### 3.1 Datos de Ejemplo

Si la base de datos tiene datos de ejemplo o de prueba con el nombre "CrediNica":
- Revisar tabla `sucursales` - nombres de sucursales
- Revisar tabla `users` - nombres de usuarios de prueba
- Revisar cualquier dato hardcodeado

### 3.2 Scripts de Migración

**Archivos en `legacy-scripts/migration-scripts/`:**
- Revisar si hay referencias al nombre de la empresa
- Actualizar comentarios y mensajes

---

## 4. CAMBIOS EN CONFIGURACIÓN DE DEPLOYMENT

### 4.1 Vercel (App Web)

**Archivo: `vercel.json` (si existe)**
- Actualizar configuraciones específicas del proyecto

**En el dashboard de Vercel:**
- Cambiar nombre del proyecto
- Actualizar variables de entorno si contienen referencias a la marca

### 4.2 EAS (App Móvil)

**Archivo: `credinica-mobile/eas.json`**
```json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**Actualizar proyecto en Expo:**
```bash
cd credinica-mobile
eas project:init
# Seguir las instrucciones para crear un nuevo proyecto
```

---

## 5. CAMBIOS EN DOCUMENTACIÓN

### 5.1 Archivos README

**Archivos a actualizar:**
- `README.md` (raíz del proyecto)
- `credinica-mobile/README.md`
- Cualquier otro archivo de documentación

### 5.2 Comentarios en el Código

**Buscar comentarios que mencionen la marca:**
```bash
grep -r "CrediNica" . --include="*.ts" --include="*.tsx" --include="*.js"
```

---

## 6. CHECKLIST COMPLETO DE CAMBIOS

### App Web
- [ ] `src/app/layout.tsx` - Título y descripción
- [ ] `package.json` - Nombre del proyecto
- [ ] `public/CrediNica.png` - Logo principal
- [ ] `public/icon-192.png` - Icono PWA
- [ ] Buscar "CrediNica" en todos los archivos `.tsx`
- [ ] `manifest.json` o `manifest.ts` - Nombre de la PWA
- [ ] Variables de entorno en Vercel

### App Móvil
- [ ] `credinica-mobile/app.json` - Nombre, slug, package, bundle ID
- [ ] `credinica-mobile/assets/images/icon.png` - Icono principal
- [ ] `credinica-mobile/assets/images/logo.png` - Logo
- [ ] Regenerar iconos con `npm run generate-icons`
- [ ] Buscar "CrediNica" en todos los archivos `.tsx`
- [ ] Actualizar proyecto en EAS/Expo

### Base de Datos
- [ ] Revisar datos de ejemplo en tablas
- [ ] Actualizar nombres de sucursales si es necesario

### Deployment
- [ ] Cambiar nombre del proyecto en Vercel
- [ ] Crear nuevo proyecto en Expo/EAS
- [ ] Actualizar variables de entorno

### Documentación
- [ ] Actualizar README.md
- [ ] Actualizar comentarios en el código
- [ ] Actualizar esta guía si es necesario

---

## 7. COMANDOS ÚTILES

### Buscar todas las referencias a la marca:
```bash
# En la raíz del proyecto:
grep -r "CrediNica" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next

# Solo en archivos de código:
grep -r "CrediNica" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude-dir=node_modules
```

### Reemplazar en masa (con cuidado):
```bash
# Linux/Mac:
find . -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/CrediNica/NUEVO_NOMBRE/g'

# Windows (PowerShell):
Get-ChildItem -Recurse -Include *.tsx,*.ts | ForEach-Object { (Get-Content $_) -replace 'CrediNica', 'NUEVO_NOMBRE' | Set-Content $_ }
```

**⚠️ ADVERTENCIA:** Siempre haz un backup antes de hacer reemplazos en masa.

---

## 8. NOTAS IMPORTANTES

1. **Backup:** Siempre haz un backup completo antes de hacer cambios masivos
2. **Testing:** Prueba la aplicación completamente después de los cambios
3. **Git:** Haz commits frecuentes durante el proceso de cambio
4. **Imágenes:** Mantén las proporciones y tamaños recomendados para logos e iconos
5. **Package Names:** Los package names de Android e iOS deben ser únicos y no pueden cambiarse después de publicar en las tiendas
6. **Base de Datos:** Ten cuidado al cambiar datos en producción, considera hacer un respaldo primero

---

## 9. SOPORTE

Si encuentras referencias adicionales que no están en esta guía:
1. Usa la búsqueda global en tu editor de código
2. Busca en archivos de configuración ocultos (`.env`, `.gitignore`, etc.)
3. Revisa los logs de compilación por si hay errores relacionados con nombres antiguos

---

**Última actualización:** Diciembre 2024
**Versión:** 1.0
