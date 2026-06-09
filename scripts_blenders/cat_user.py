"""Genera el token del gato (cat.glb) para gamepolyweb.

Script corregido:
- Las patitas (Cat_Paw_L y Cat_Paw_R) se desplazaron hacia adentro en X y atrás en Y
  para que se incrusten profundamente en la base del óvalo del cuerpo (Cat_Body),
  eliminando cualquier espacio flotante o despegado.
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


def sphere(name, col, mat, radius, location, scale=(1, 1, 1), segments=64, rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=segments, ring_count=rings, location=location)
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


def curve_mesh(name, col, mat, points, bevel_depth=0.003, resolution=12):
    """Tubo suave a lo largo de un spline NURBS."""
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
# Modelo: Gato con patitas firmemente integradas a la base de la malla
# --------------------------------------------------------------------------- #
def build_cat(col):
    root = root_object("Piece_Cat", col)

    # Materiales estilizados
    fur = make_material("Cat_Charcoal", (0.10, 0.11, 0.13, 1), roughness=0.32, coat=0.2)
    belly = make_material("Cat_Cream", (0.92, 0.82, 0.66, 1), roughness=0.34, coat=0.12)
    green = make_material("Cat_Eyes_Green", (0.30, 0.95, 0.34, 1), roughness=0.08, coat=0.7)
    pink = make_material("Cat_Nose_Pink", (0.95, 0.36, 0.54, 1), roughness=0.18, coat=0.35)
    white_whisker = make_material("Cat_Whisker_White", (0.96, 0.94, 0.90, 1), roughness=0.10, coat=0.8, metallic=0.2)

    tail_thickness = 0.0055
    whisker_thickness = 0.0005

    # Trayectoria de la cola por detrás
    tail_points = [
        (0.000,  0.024, 0.035), 
        (0.022,  0.045, 0.045), 
        (0.030,  0.055, 0.070), 
        (0.008,  0.050, 0.092), 
        (-0.016, 0.046, 0.112), 
        (-0.022, 0.048, 0.128), 
    ]

    parts = [
        # cuerpo (Cat_Body) y pecho
        sphere("Cat_Body", col, fur, 0.043, (0, 0.006, 0.047), scale=(0.92, 0.74, 1.18)),
        sphere("Cat_Chest", col, belly, 0.021, (0, -0.030, 0.050), scale=(0.92, 0.36, 1.10)),
        # cabeza redonda
        sphere("Cat_Head", col, fur, 0.034, (0, -0.016, 0.102), scale=(1.04, 0.94, 0.98)),
        sphere("Cat_Cheek_L", col, fur, 0.014, (-0.022, -0.034, 0.097), scale=(0.9, 0.8, 0.9)),
        sphere("Cat_Cheek_R", col, fur, 0.014, (0.022, -0.034, 0.097), scale=(0.9, 0.8, 0.9)),
        # orejas (externa + interior)
        cone("Cat_Ear_L", col, fur, 0.015, 0.0008, 0.030, (-0.020, -0.016, 0.130), rotation=(0, math.radians(-18), 0)),
        cone("Cat_Ear_R", col, fur, 0.015, 0.0008, 0.030, (0.020, -0.016, 0.130), rotation=(0, math.radians(18), 0)),
        cone("Cat_InnerEar_L", col, belly, 0.0095, 0.0006, 0.022, (-0.0195, -0.019, 0.131), rotation=(0, math.radians(-18), 0)),
        cone("Cat_InnerEar_R", col, belly, 0.0095, 0.0006, 0.022, (0.0195, -0.019, 0.131), rotation=(0, math.radians(18), 0)),
        
        # hocico (Cat_Muzzle) y ojos
        sphere("Cat_Muzzle", col, belly, 0.015, (0, -0.044, 0.095), scale=(1.12, 0.46, 0.74)),
        sphere("Cat_Eye_L", col, green, 0.005, (-0.012, -0.045, 0.106), scale=(1, 0.55, 1)),
        sphere("Cat_Eye_R", col, green, 0.005, (0.012, -0.045, 0.106), scale=(1, 0.55, 1)),
        
        # NARIZ PEGADA
        sphere("Cat_Nose", col, pink, 0.004, (0, -0.049, 0.097), scale=(1.2, 0.7, 0.7)),
        
        # PATICAS CORREGIDAS PARA EVITAR QUE REVOLOTEEN FUERA DE LA MALLA:
        # - Desplazadas de X=0.018 a X=0.012 (más centradas para encajar en el cono inferior del óvalo).
        # - Retrasadas de Y=-0.028 a Y=-0.014 (se clavan directo en la masa inferior de la panza).
        # - Mantienen Z=0.006 para asegurar el contacto plano base.
        sphere("Cat_Paw_L", col, fur, 0.012, (-0.012, -0.014, 0.006), scale=(1.0, 0.90, 0.55)),
        sphere("Cat_Paw_R", col, fur, 0.012, (0.012, -0.014, 0.006), scale=(1.0, 0.90, 0.55)),
        
        # Cola y Punta
        curve_mesh("Cat_Tail", col, fur, tail_points, bevel_depth=tail_thickness),
        sphere("Cat_Tail_Tip", col, fur, radius=tail_thickness, location=tail_points[-1], segments=32, rings=16)
    ]

    # Bigotes cortos y finos
    for side in (-1, 1):
        whisker_data = [
            (0.094,  0.001, 0.026, 0.004, -0.002), 
            (0.099,  0.003, 0.023, 0.006,  0.001), 
            (0.089, -0.001, 0.021, 0.002, -0.004)  
        ]
        
        for i, (origin_z, curve_z_mod, ext_x, drop_y, drop_z) in enumerate(whisker_data):
            start_x = side * 0.016
            start_y = -0.046
            
            whisker_path = [
                (start_x, start_y, origin_z),
                (start_x + (side * 0.004), start_y - 0.005, origin_z + curve_z_mod),
                (start_x + (side * (ext_x * 0.65)), start_y - (0.005 + drop_y), origin_z + (drop_z * 0.7)),
                (start_x + (side * ext_x), start_y - (0.005 + drop_y + 0.003), origin_z + drop_z)
            ]
            
            parts.append(
                curve_mesh(
                    f"Cat_Whisker_Curve_{side}_{i}",
                    col, white_whisker, whisker_path,
                    bevel_depth=whisker_thickness,
                    resolution=8
                )
            )

    for obj in parts:
        parent(obj, root)
    return root


if __name__ == "__main__":
    export_token("cat.glb", build_cat)