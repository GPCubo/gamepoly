"""Genera el token del cafe (coffee.glb) para gamepolyweb.

Script autonomo: no depende de ningun modulo auxiliar. Ejecutar dentro de
Blender (Scripting > Run) o por linea de comandos:

    blender --background --python scripts_blenders/coffee_user.py
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
# Helpers de escena / geometria (mesh suave, alta resolucion)
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


def cylinder(name, col, mat, radius, depth, location, vertices=64, rotation=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=vertices, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    link_to(obj, col)
    apply_mat(obj, mat)
    shade_smooth(obj)
    return obj


def cone(name, col, mat, radius1, radius2, depth, location, vertices=64, rotation=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_cone_add(radius1=radius1, radius2=radius2, depth=depth, vertices=vertices, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    link_to(obj, col)
    apply_mat(obj, mat)
    shade_smooth(obj)
    return obj


def curve_mesh(name, col, mat, points, bevel_depth=0.003, resolution=12):
    """Tubo suave a lo largo de un spline NURBS (curvas continuas, sin quiebres)."""
    curve = bpy.data.curves.new(name, type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = resolution
    curve.bevel_depth = bevel_depth
    curve.bevel_resolution = 10
    curve.use_fill_caps = True
    spline = curve.splines.new("NURBS")
    spline.points.add(len(points) - 1)
    for point, coords in zip(spline.points, points):
        point.co = (coords[0], coords[1], coords[2], 1)
    spline.order_u = min(4, len(points))
    spline.use_endpoint_u = True
    obj = bpy.data.objects.new(name, curve)
    link_to(obj, col)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.active_object
    obj.name = name
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
# Modelo: vaso de cafe
# --------------------------------------------------------------------------- #
def build_coffee_cup(col):
    root = root_object("Piece_CoffeeCup", col)

    paper = make_material("Coffee_Paper_White", (0.96, 0.93, 0.86, 1), roughness=0.42, coat=0.08)
    green = make_material("Coffee_Green_Sleeve", (0.03, 0.43, 0.24, 1), roughness=0.24, coat=0.25)
    dark_green = make_material("Coffee_Dark_Green", (0.01, 0.24, 0.14, 1), roughness=0.2, coat=0.2)
    lid = make_material("Coffee_Lid_Caramel", (0.73, 0.48, 0.25, 1), roughness=0.28, coat=0.22)
    coffee = make_material("Coffee_Drink_Dark", (0.18, 0.08, 0.03, 1), roughness=0.2, coat=0.35)
    steam = make_material("Coffee_Steam", (0.92, 0.88, 0.78, 1), roughness=0.5, coat=0.05)

    parts = [
        cone("Coffee_CupBody", col, paper, 0.034, 0.051, 0.112, (0, 0, 0.056)),
        cone("Coffee_Sleeve", col, green, 0.039, 0.045, 0.036, (0, 0, 0.060)),
        cylinder("Coffee_Lid", col, lid, 0.052, 0.013, (0, 0, 0.119)),
        cylinder("Coffee_LidTop", col, coffee, 0.036, 0.004, (0, 0, 0.128)),
        cylinder("Coffee_Badge", col, dark_green, 0.019, 0.003, (0, -0.046, 0.064), rotation=(math.radians(90), 0, 0)),
        curve_mesh("Coffee_BeanMark", col, paper, [(-0.006, -0.049, 0.055), (0.000, -0.052, 0.064), (0.006, -0.049, 0.073)], bevel_depth=0.0015),
        curve_mesh("Coffee_SteamA", col, steam, [(-0.020, 0, 0.134), (-0.025, 0, 0.148), (-0.018, 0, 0.160)], bevel_depth=0.0015),
        curve_mesh("Coffee_SteamB", col, steam, [(0.000, 0, 0.135), (0.007, 0, 0.150), (0.001, 0, 0.165)], bevel_depth=0.0016),
        curve_mesh("Coffee_SteamC", col, steam, [(0.020, 0, 0.134), (0.025, 0, 0.149), (0.018, 0, 0.160)], bevel_depth=0.0015),
    ]

    for obj in parts:
        parent(obj, root)
    return root


if __name__ == "__main__":
    export_token("coffee.glb", build_coffee_cup)
