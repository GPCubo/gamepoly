"""Genera el token del perro (dog.glb) para gamepolyweb.

Script autonomo: no depende de ningun modulo auxiliar. Ejecutar dentro de
Blender (Scripting > Run) o por linea de comandos:

    blender --background --python scripts_blenders/dog_user.py

Tecnica: el cuerpo del perro NO se construye apilando esferas. Se define un
"esqueleto" de vertices/aristas (columna, cuello, cabeza, hocico, 4 patas,
cola y orejas) y el modificador SKIN + SUBSURF genera una sola malla organica
continua con silueta de perro. Encima se anaden detalles (nariz, ojos, collar,
lengua) como piezas separadas.
"""

import math
from pathlib import Path

import bpy


# --------------------------------------------------------------------------- #
# Localizacion del proyecto y salida
# --------------------------------------------------------------------------- #
WORKSPACE_FALLBACK = Path(r"C:\Users\gggpa\OneDrive\Desktop\Personal\gamepolyweb")


def looks_like_project_root(path):
    return (path / "package.json").exists() and (path / "public" / "models" / "users").exists()


def find_project_root():
    candidates = []
    try:
        candidates.append(Path(__file__).resolve())
    except (NameError, OSError):
        pass
    if bpy.data.filepath:
        candidates.append(Path(bpy.data.filepath).resolve())
    candidates.extend([Path.cwd().resolve(), WORKSPACE_FALLBACK.resolve()])

    for candidate in candidates:
        for path in [candidate, *candidate.parents]:
            if looks_like_project_root(path):
                return path
    raise RuntimeError(
        "No pude encontrar la raiz del proyecto. Ejecuta el script desde "
        "gamepolyweb o ajusta WORKSPACE_FALLBACK al directorio del proyecto."
    )


OUTPUT_DIR = find_project_root() / "public" / "models" / "users"


# --------------------------------------------------------------------------- #
# Helpers de escena / material
# --------------------------------------------------------------------------- #
def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def set_bsdf_input(bsdf, names, value):
    for name in names:
        if name in bsdf.inputs:
            bsdf.inputs[name].default_value = value
            return


def make_material(name, color, roughness=0.28, metallic=0.0, coat=0.2):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        set_bsdf_input(bsdf, ("Base Color",), color)
        set_bsdf_input(bsdf, ("Roughness",), roughness)
        set_bsdf_input(bsdf, ("Metallic",), metallic)
        set_bsdf_input(bsdf, ("Coat Weight", "Clearcoat"), coat)
        set_bsdf_input(bsdf, ("Coat Roughness", "Clearcoat Roughness"), 0.06)
    return mat


def make_collection():
    col = bpy.data.collections.new("Game_Pieces")
    bpy.context.scene.collection.children.link(col)
    return col


def link_to(obj, col):
    for existing in list(obj.users_collection):
        existing.objects.unlink(obj)
    col.objects.link(obj)


def apply_mat(obj, mat):
    obj.data.materials.append(mat)


def shade_smooth(obj):
    if obj.type != "MESH":
        return
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth()


def parent(obj, root):
    obj.parent = root
    return obj


def root_object(name, col):
    root = bpy.data.objects.new(name, None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.025
    col.objects.link(root)
    return root


def sphere(name, col, mat, radius, location, scale=(1, 1, 1), segments=48, rings=24):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=segments, ring_count=rings, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    link_to(obj, col)
    apply_mat(obj, mat)
    shade_smooth(obj)
    return obj


def cylinder(name, col, mat, radius, depth, location, vertices=48, rotation=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=vertices, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    link_to(obj, col)
    apply_mat(obj, mat)
    shade_smooth(obj)
    return obj


def skin_body(name, col, mat, verts, edges, radii, root_index=0, subsurf=2):
    """Crea UNA malla organica continua a partir de un esqueleto de vertices.

    Cada vertice recibe un 'radio de piel'; el modificador SKIN tiende una
    superficie sobre las aristas y SUBSURF la suaviza. El resultado es una sola
    forma definida (no esferas apiladas).
    """
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(verts, edges, [])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    link_to(obj, col)

    skin = obj.modifiers.new("Skin", "SKIN")
    skin.use_smooth_shade = True

    skin_layer = mesh.skin_vertices[0].data
    for i, r in enumerate(radii):
        skin_layer[i].radius = (r, r)
    skin_layer[root_index].use_root = True

    sub = obj.modifiers.new("Subsurf", "SUBSURF")
    sub.levels = subsurf
    sub.render_levels = subsurf

    apply_mat(obj, mat)
    shade_smooth(obj)
    return obj


def export_token(filename, build_fn):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    clear_scene()
    col = make_collection()
    root = build_fn(col)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action="DESELECT")
    for obj in [root] + list(root.children_recursive):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_DIR / filename),
        export_format="GLB",
        use_selection=True,
        export_apply=True,  # aplica SKIN + SUBSURF al exportar
    )
    print(f"Exported {filename} -> {OUTPUT_DIR / filename}")


# --------------------------------------------------------------------------- #
# Modelo: perro (cuerpo unico via SKIN, mira hacia -Y, de pie sobre Z=0)
# --------------------------------------------------------------------------- #
def build_dog(col):
    root = root_object("Piece_Dog", col)

    brown = make_material("Dog_Warm_Brown", (0.55, 0.28, 0.11, 1), roughness=0.34, coat=0.18)
    dark = make_material("Dog_Dark_Details", (0.05, 0.035, 0.025, 1), roughness=0.2, coat=0.4)
    red = make_material("Dog_Red_Collar", (0.82, 0.03, 0.08, 1), roughness=0.18, coat=0.4)
    tongue = make_material("Dog_Tongue_Pink", (0.90, 0.36, 0.48, 1), roughness=0.22, coat=0.15)

    #            indice  posicion (x, y, z)
    verts = [
        (0.000,  0.046, 0.060),  # 0  cadera
        (0.000,  0.012, 0.066),  # 1  lomo medio (raiz)
        (0.000, -0.022, 0.064),  # 2  hombros
        (0.000, -0.038, 0.074),  # 3  base del cuello
        (0.000, -0.052, 0.090),  # 4  nuca
        (0.000, -0.068, 0.092),  # 5  cabeza
        (0.000, -0.090, 0.083),  # 6  hocico
        (0.000, -0.102, 0.081),  # 7  punta del hocico
        (0.000,  0.058, 0.074),  # 8  cola base
        (0.006,  0.066, 0.092),  # 9  cola media
        (0.014,  0.062, 0.106),  # 10 cola punta
        (-0.016, -0.022, 0.052),  # 11 pata del. izq (arriba)
        (-0.019, -0.030, 0.005),  # 12 pata del. izq (pata)
        (0.016, -0.022, 0.052),  # 13 pata del. der (arriba)
        (0.019, -0.030, 0.005),  # 14 pata del. der (pata)
        (-0.017,  0.044, 0.050),  # 15 pata tras. izq (arriba)
        (-0.020,  0.040, 0.005),  # 16 pata tras. izq (pata)
        (0.017,  0.044, 0.050),  # 17 pata tras. der (arriba)
        (0.020,  0.040, 0.005),  # 18 pata tras. der (pata)
        (-0.018, -0.058, 0.106),  # 19 oreja izq
        (0.018, -0.058, 0.106),  # 20 oreja der
    ]

    radii = [
        0.024, 0.027, 0.025, 0.017, 0.019, 0.022, 0.013, 0.009,  # cuerpo + cabeza
        0.009, 0.006, 0.0035,                                    # cola
        0.010, 0.0095, 0.010, 0.0095,                            # patas delanteras
        0.011, 0.0095, 0.011, 0.0095,                            # patas traseras
        0.007, 0.007,                                            # orejas
    ]

    edges = [
        (0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 7),  # columna -> cabeza
        (0, 8), (8, 9), (9, 10),                                 # cola
        (2, 11), (11, 12), (2, 13), (13, 14),                    # patas delanteras
        (0, 15), (15, 16), (0, 17), (17, 18),                    # patas traseras
        (5, 19), (5, 20),                                        # orejas
    ]

    body = skin_body("Dog_Body", col, brown, verts, edges, radii, root_index=1, subsurf=2)

    details = [
        sphere("Dog_Nose", col, dark, 0.007, (0, -0.106, 0.081), scale=(1.1, 0.85, 0.9)),
        sphere("Dog_Eye_L", col, dark, 0.004, (-0.013, -0.082, 0.098), scale=(1, 0.8, 1)),
        sphere("Dog_Eye_R", col, dark, 0.004, (0.013, -0.082, 0.098), scale=(1, 0.8, 1)),
        sphere("Dog_Tongue", col, tongue, 0.008, (0, -0.100, 0.070), scale=(0.9, 0.5, 0.7)),
        cylinder("Dog_Collar", col, red, 0.022, 0.008, (0, -0.044, 0.076),
                 rotation=(math.radians(112), 0, 0), scale=(1.2, 1.2, 0.5)),
    ]

    for obj in [body, *details]:
        parent(obj, root)
    return root


if __name__ == "__main__":
    export_token("dog.glb", build_dog)
