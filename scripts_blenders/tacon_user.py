"""Genera el token del tacon (tacon.glb) para gamepolyweb.

Script autonomo: no depende de ningun modulo auxiliar. Ejecutar dentro de
Blender (Scripting > Run) o por linea de comandos:

    blender --background --python scripts_blenders/tacon_user.py

Tecnica: el zapato NO se construye apilando elipsoides. La suela y el empeine
son curvas BARRIDAS (sweep) que siguen el perfil del pie con su arco natural;
cada una es una sola pieza continua. El stiletto es un cono y la tapa/correa
son detalles dorados.
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


def cylinder(name, col, mat, radius, depth, location, vertices=48, rotation=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=vertices, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    link_to(obj, col)
    apply_mat(obj, mat)
    shade_smooth(obj)
    return obj


def cone(name, col, mat, radius1, radius2, depth, location, vertices=48, rotation=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_cone_add(radius1=radius1, radius2=radius2, depth=depth, vertices=vertices, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    link_to(obj, col)
    apply_mat(obj, mat)
    shade_smooth(obj)
    return obj


def _ellipse_profile(name, half_w, half_h, points=24):
    """Seccion transversal eliptica usada como perfil de barrido (bevel object)."""
    cu = bpy.data.curves.new(name, type="CURVE")
    cu.dimensions = "2D"
    sp = cu.splines.new("NURBS")
    sp.points.add(points - 1)
    for i, p in enumerate(sp.points):
        t = 2 * math.pi * i / points
        p.co = (half_w * math.cos(t), half_h * math.sin(t), 0, 1)
    sp.use_cyclic_u = True
    sp.order_u = 4
    obj = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def swept(name, col, mat, points, half_w, half_h, resolution=16):
    """Barre una seccion eliptica a lo largo de un spline NURBS suave.

    Produce UNA pieza continua (suela o empeine) que sigue el perfil del pie,
    en lugar de varias esferas/elipsoides apilados.
    """
    profile = _ellipse_profile(name + "_Prof", half_w, half_h)

    cu = bpy.data.curves.new(name, type="CURVE")
    cu.dimensions = "3D"
    cu.resolution_u = resolution
    cu.bevel_mode = "OBJECT"
    cu.bevel_object = profile
    cu.use_fill_caps = True
    sp = cu.splines.new("NURBS")
    sp.points.add(len(points) - 1)
    for p, co in zip(sp.points, points):
        p.co = (co[0], co[1], co[2], 1)
    sp.order_u = min(4, len(points))
    sp.use_endpoint_u = True

    obj = bpy.data.objects.new(name, cu)
    link_to(obj, col)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.active_object
    obj.name = name
    apply_mat(obj, mat)
    shade_smooth(obj)

    bpy.data.objects.remove(profile, do_unlink=True)
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
# Modelo: zapato de tacon (mira hacia -Y, talon en +Y)
# --------------------------------------------------------------------------- #
def build_high_heel(col):
    root = root_object("Piece_HighHeel", col)

    red = make_material("Heel_Ruby_Patent", (0.86, 0.02, 0.11, 1), roughness=0.11, coat=0.8)
    dark = make_material("Heel_Black_Gloss", (0.015, 0.012, 0.014, 1), roughness=0.08, coat=0.75)
    gold = make_material("Heel_Gold_Accent", (0.95, 0.72, 0.18, 1), roughness=0.16, metallic=0.9, coat=0.35)

    # Suela: una sola pieza barrida, plana y ancha, que se arquea desde la punta
    # (apoyada en el suelo) hasta el asiento del talon (elevado).
    sole_path = [
        (0, -0.082, 0.011),  # punta
        (0, -0.052, 0.005),  # planta delantera (contacto con el suelo)
        (0, -0.018, 0.008),
        (0,  0.012, 0.030),  # arco
        (0,  0.038, 0.058),
        (0,  0.054, 0.082),  # asiento del talon
    ]

    # Empeine/pala: una sola pieza barrida que envuelve el pie desde la punta,
    # baja en el escote y sube al contrafuerte trasero.
    upper_path = [
        (0, -0.074, 0.022),  # punta (sobre la suela)
        (0, -0.052, 0.046),
        (0, -0.028, 0.060),
        (0, -0.004, 0.065),  # escote (parte mas baja de la abertura)
        (0,  0.022, 0.068),
        (0,  0.042, 0.082),
        (0,  0.054, 0.100),  # contrafuerte trasero
    ]

    parts = [
        swept("Heel_Sole", col, dark, sole_path, half_w=0.030, half_h=0.0085),
        swept("Heel_Upper", col, red, upper_path, half_w=0.027, half_h=0.018),
        cone("Heel_Stiletto", col, dark, 0.0055, 0.010, 0.082, (0, 0.054, 0.040)),
        cylinder("Heel_Tip", col, gold, 0.0085, 0.004, (0, 0.054, 0.002)),
        cylinder("Heel_AnkleBand", col, gold, 0.030, 0.004, (0, 0.046, 0.108),
                 rotation=(math.radians(90), 0, 0), scale=(1, 0.6, 1)),
    ]

    for obj in parts:
        parent(obj, root)
    return root


if __name__ == "__main__":
    export_token("tacon.glb", build_high_heel)
