# Configurar Firebase para el panel admin de Äura

El panel `/admin` usa **Firebase** para: login seguro (Auth), guardar los productos
(Firestore) y subir imágenes (Storage). Seguí estos pasos una sola vez.

---

## 1. Crear/abrir el proyecto

1. Entrá a https://console.firebase.google.com
2. Abrí tu proyecto (o creá uno nuevo, gratis — plan **Spark**).

## 2. Registrar la app web y copiar la config

1. En el proyecto: ⚙️ **Configuración del proyecto** → pestaña **General**.
2. En **Tus apps**, tocá el ícono **`</>`** (Web). Poné un apodo (ej. "Aura Web") → **Registrar**.
3. Vas a ver un objeto `firebaseConfig` con estos valores. Copialos.

## 3. Cargar las variables de entorno

**Local** (en tu compu): creá un archivo `.env` en la raíz del proyecto (al lado de `package.json`)
con los valores copiados:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
```

**Vercel** (para el sitio en vivo): Project → **Settings** → **Environment Variables**.
Agregá las mismas 6 variables (Production + Preview) y volvé a desplegar.

> El archivo `.env` NO se sube a GitHub (está en `.gitignore`). Está bien:
> estas claves de Firebase Web son públicas por diseño; la seguridad real la dan
> las **reglas** del paso 6.

## 4. Activar Authentication (login)

1. Firebase → **Authentication** → **Comenzar**.
2. Pestaña **Sign-in method** → habilitá **Correo electrónico/contraseña** → Guardar.
3. Pestaña **Users** → **Agregar usuario**: poné tu email y una contraseña.
   Ese será tu usuario para entrar a `/admin`.

## 5. Crear la base de datos (Firestore) y Storage

1. Firebase → **Firestore Database** → **Crear base de datos** → modo **Producción** → elegí región (ej. `southamerica-east1`).
2. Firebase → **Storage** → **Comenzar** → modo Producción → misma región.

## 6. Reglas de seguridad (¡importante!)

**Firestore** (Rules → pegar y Publicar): la tienda puede LEER, solo un admin logueado puede ESCRIBIR.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

**Storage** (Rules → pegar y Publicar): cualquiera ve las imágenes, solo un admin logueado las sube.

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{file=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 7. Usar el panel

1. Andá a `tu-sitio/admin` (o `localhost:3000/admin`).
2. Iniciá sesión con el email/contraseña del paso 4.
3. La primera vez, tocá **“Importar catálogo”** para subir los 47 productos a Firebase.
4. Listo: ya podés crear, editar, **ocultar/mostrar** y subir imágenes. Los cambios
   aparecen en la tienda al instante.

---

### Notas
- Mientras Firebase no esté configurado, la tienda sigue funcionando con el catálogo
  incluido y `/admin` muestra un aviso (no se rompe nada).
- Para agregar otro administrador: Authentication → Users → Agregar usuario.
