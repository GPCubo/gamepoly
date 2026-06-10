"""Genera el token de la locomotora (train.glb) para gamepolyweb.

Inspirado en el icono de ferrocarril del tablero (create_monopoly_table.py),
convertido a ficha de jugador 3D: caldera cilindrica, cabina con techo rojo,
chimenea con copa de laton, domo de vapor, campana, faro, quitapiedras y
6 ruedas (2 motrices grandes + 4 menores) con bujes de laton.

Script autonomo: no depende de ningun modulo auxiliar. Ejecutar dentro de
Blender (Scripting > Run) o por linea de comandos:

    blender --background --python scripts_blenders/train_user.py

La ficha mira hacia -Y y apoya sobre Z=0, igual que el resto de tokens
(dog_user.py, cat_user.py, etc.).
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


def box(name, col, mat, dims, location, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = dims
    link_to(obj, col)
    apply_mat(obj, mat)
    return obj


def cylinder(name, col, mat, radius, depth, location, vertices=32, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=radius, depth=depth, vertices=vertices, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    link_to(obj, col)
    apply_mat(obj, mat)
    shade_smooth(obj)
    return obj


def cone(name, col, mat, radius1, radius2, depth, location, vertices=24, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(
        radius1=radius1, radius2=radius2, depth=depth, vertices=vertices,
        location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    link_to(obj, col)
    apply_mat(obj, mat)
    shade_smooth(obj)
    return obj


def sphere(name, col, mat, radius, location, scale=(1, 1, 1), segments=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=radius, segments=segments, ring_count=rings, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    link_to(obj, col)
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
        export_apply=True,
    )
    print(f"Exported {filename} -> {OUTPUT_DIR / filename}")


# --------------------------------------------------------------------------- #
# Modelo: locomotora (mira hacia -Y, apoya sobre Z=0)
# --------------------------------------------------------------------------- #
def build_train(col):
    root = root_object("Piece_Train", col)

    body = make_material("Train_Body_Black", (0.085, 0.085, 0.095, 1), roughness=0.30, metallic=0.35, coat=0.30)
    iron = make_material("Train_Iron_Dark", (0.040, 0.040, 0.045, 1), roughness=0.35, metallic=0.60)
    red = make_material("Train_Red_Accent", (0.720, 0.070, 0.070, 1), roughness=0.25, coat=0.35)
    brass = make_material("Train_Brass", (0.850, 0.640, 0.180, 1), roughness=0.18, metallic=0.85)
    glass = make_material("Train_Window", (0.550, 0.750, 0.850, 1), roughness=0.08, metallic=0.10, coat=0.50)

    parts = []

    # Chasis
    parts.append(box("Train_Chassis", col, body, (0.036, 0.112, 0.012), (0, 0.002, 0.020)))

    # Caldera (eje a lo largo de Y) + firebox que conecta con la cabina
    parts.append(cylinder("Train_Boiler", col, body, 0.018, 0.064,
                          (0, -0.022, 0.042), rotation=(math.radians(90), 0, 0)))
    parts.append(box("Train_Firebox", col, body, (0.030, 0.012, 0.030), (0, 0.013, 0.040)))

    # Frente de caldera + faro de laton
    parts.append(cylinder("Train_BoilerFace", col, iron, 0.0185, 0.006,
                          (0, -0.054, 0.042), rotation=(math.radians(90), 0, 0)))
    parts.append(cylinder("Train_Headlight", col, brass, 0.008, 0.006,
                          (0, -0.059, 0.042), rotation=(math.radians(90), 0, 0)))

    # Chimenea con copa acampanada de laton
    parts.append(cylinder("Train_Chimney", col, body, 0.006, 0.022, (0, -0.042, 0.068), vertices=20))
    parts.append(cone("Train_ChimneyCap", col, brass, 0.0065, 0.011, 0.012, (0, -0.042, 0.082), vertices=20))

    # Domo de vapor y campana sobre la caldera
    parts.append(sphere("Train_Dome", col, brass, 0.009, (0, -0.020, 0.060), scale=(1, 1, 0.8)))
    parts.append(sphere("Train_Bell", col, brass, 0.005, (0, -0.004, 0.062)))

    # Cabina con techo rojo y ventanas laterales
    parts.append(box("Train_Cab", col, body, (0.040, 0.036, 0.046), (0, 0.034, 0.047)))
    parts.append(box("Train_CabRoof", col, red, (0.048, 0.044, 0.008), (0, 0.034, 0.074)))
    parts.append(box("Train_Window_L", col, glass, (0.002, 0.018, 0.018), (-0.0205, 0.034, 0.052)))
    parts.append(box("Train_Window_R", col, glass, (0.002, 0.018, 0.018), (0.0205, 0.034, 0.052)))

    # Quitapiedras rojo al frente (cono con la punta hacia -Y)
    parts.append(cone("Train_CowCatcher", col, red, 0.016, 0.002, 0.020,
                      (0, -0.066, 0.016), rotation=(math.radians(90), 0, 0)))

    # Ruedas: 2 motrices grandes atras + 4 menores; bujes de laton en las motrices
    for side in (-1, 1):
        for wi, (wy, wr) in enumerate([(0.036, 0.017), (0.004, 0.011), (-0.030, 0.009)]):
            parts.append(cylinder(
                f"Train_Wheel_{'L' if side < 0 else 'R'}_{wi}", col, iron, wr, 0.006,
                (side * 0.018, wy, wr), vertices=20, rotation=(0, math.radians(90), 0)))
        parts.append(cylinder(
            f"Train_Hub_{'L' if side < 0 else 'R'}", col, brass, 0.005, 0.002,
            (side * 0.0215, 0.036, 0.017), vertices=16, rotation=(0, math.radians(90), 0)))

    for obj in parts:
        parent(obj, root)
    return root


if __name__ == "__main__":
    export_token("train.glb", build_train)
