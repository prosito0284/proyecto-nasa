# Modelos 3D Externos (`.glb` / `.gltf`) — Junior Astronaut Mission Trainer

Esta carpeta (`public/models/`) aloja los activos 3D opcionales en formato binario `.glb` o `.gltf`.

## Cómo funciona la carga sin errores 404

1. Por defecto, `src/components/Three/proceduralModels.ts` declara `EXTERNAL_GLB_ASSETS = {}`.
2. Mientras no registres un archivo aquí, [`ModelViewer3D`](../../src/components/Three/ModelViewer3D.tsx) ensambla en memoria el modelo CAD técnico equivalente de Three.js (`colony-base`, `rover-moxie`, `habitat-shield` o `planet-globe`) en 0 ms y **no emite ninguna petición HTTP**, garantizando **cero errores 404** en consola y compatibilidad offline.
3. Para sustituir cualquiera de los 4 modelos por un `.glb` exportado desde Blender / NASA 3D Resources:
   - Coloca el archivo en esta carpeta, por ejemplo `public/models/colony-base.glb`.
   - Registra su nombre en `EXTERNAL_GLB_ASSETS` dentro de `src/components/Three/proceduralModels.ts`:
     ```ts
     export const EXTERNAL_GLB_ASSETS: Partial<Record<Model3DId, string>> = {
       'colony-base': 'colony-base.glb',
     };
     ```
   - `ModelViewer3D` resolverá automáticamente la ruta con `${import.meta.env.BASE_URL}models/colony-base.glb` (compatible tanto en `/` como en subdirectorios de GitHub Pages) usando `GLTFLoader`.
