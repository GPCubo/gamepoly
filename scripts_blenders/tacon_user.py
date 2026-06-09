"""Genera el token del tacon (tacon.glb) para gamepolyweb.

Script autonomo: no depende de ningun modulo auxiliar. Ejecutar dentro de
Blender (Scripting > Run) o por linea de comandos:

    blender --background --python scripts_blenders/tacon_user.py

Tecnica: el cuerpo del zapato se modela a partir de su SILUETA LATERAL (un
poligono en el plano Y-Z con punta afilada, escote y contrafuerte alto) que se
rellena, se le da grosor con Solidify y se redondea con Bevel. El stiletto es un
cono fino. Acabado: charol negro brillante (como la referencia), sin dorados.
"""

import math
from pathlib import Path

import bpy
import bmesh


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


def _taper_curve(name, scales):
    """Curva de taper: escala el grosor del barrido a lo largo del recorrido.

    scales[0] aplica en el inicio del spline (la punta) y scales[-1] al final
    (el talon). Un valor cercano a 0 en la punta produce el filo del zapato.
    """
    cu = bpy.data.curves.new(name, type="CURVE")
    cu.dimensions = "2D"
    sp = cu.splines.new("NURBS")
    sp.points.add(len(scales) - 1)
    n = len(scales)
    for i, s in enumerate(scales):
        sp.points[i].co = (i / (n - 1), s, 0, 1)
    sp.order_u = min(4, n)
    sp.use_endpoint_u = True
    obj = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def swept(name, col, mat, points, half_w, half_h, resolution=24, taper=None):
    """Barre una seccion eliptica a lo largo de un spline NURBS suave.

    Produce UNA pieza continua (suela o empeine) que sigue el perfil del pie,
    en lugar de varias esferas/elipsoides apilados. `taper` (lista de escalas)
    estrecha el barrido para lograr la punta afilada del stiletto.
    """
    profile = _ellipse_profile(name + "_Prof", half_w, half_h)
    taper_obj = _taper_curve(name + "_Taper", taper) if taper else None

    cu = bpy.data.curves.new(name, type="CURVE")
    cu.dimensions = "3D"
    cu.resolution_u = resolution
    cu.bevel_mode = "OBJECT"
    cu.bevel_object = profile
    if taper_obj:
        cu.taper_object = taper_obj
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
    if taper_obj:
        bpy.data.objects.remove(taper_obj, do_unlink=True)
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
def smooth_closed(points, samples_per_seg=12):
    """Interpola un lazo cerrado de puntos 2D con Catmull-Rom.

    Convierte la silueta poligonal (con esquinas) en una curva continua y suave
    que pasa por los puntos de control, eliminando las facetas angulares.
    """
    n = len(points)
    out = []
    for i in range(n):
        p0, p1, p2, p3 = (
            points[(i - 1) % n],
            points[i],
            points[(i + 1) % n],
            points[(i + 2) % n],
        )
        for s in range(samples_per_seg):
            t = s / samples_per_seg
            t2, t3 = t * t, t * t * t
            y = 0.5 * (
                (2 * p1[0])
                + (-p0[0] + p2[0]) * t
                + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2
                + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
            )
            z = 0.5 * (
                (2 * p1[1])
                + (-p0[1] + p2[1]) * t
                + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2
                + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
            )
            out.append((y, z))
    return out


def profile_solid(name, col, mat, outline, width, bevel=0.006, bevel_seg=2, subsurf=1):
    """Crea un cuerpo solido suave a partir de un perfil lateral (plano Y-Z).

    Rellena el poligono, le da grosor con Solidify (centrado en x=0), redondea
    los cantos con Bevel y suaviza la superficie con Subdivision Surface.
    """
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    col.objects.link(obj)

    bm = bmesh.new()
    verts = [bm.verts.new((0.0, y, z)) for (y, z) in outline]
    face = bm.faces.new(verts)
    bmesh.ops.recalc_face_normals(bm, faces=[face])
    bm.to_mesh(mesh)
    bm.free()

    solid = obj.modifiers.new("Solidify", "SOLIDIFY")
    solid.thickness = width
    solid.offset = 0.0
    solid.use_even_offset = True

    bev = obj.modifiers.new("Bevel", "BEVEL")
    bev.width = bevel
    bev.segments = bevel_seg
    bev.limit_method = "ANGLE"
    bev.angle_limit = math.radians(30)
    bev.use_clamp_overlap = True

    if subsurf:
        sub = obj.modifiers.new("Subsurf", "SUBSURF")
        sub.levels = subsurf
        sub.render_levels = subsurf

    apply_mat(obj, mat)
    shade_smooth(obj)
    return obj


def build_high_heel(col):
    root = root_object("Piece_HighHeel", col)

    # Charol negro brillante, como la referencia: muy reflejante, casi sin
    # rugosidad y con clearcoat al maximo.
    patent = make_material("Heel_Black_Patent", (0.018, 0.018, 0.022, 1), roughness=0.05, coat=1.0)

    # Silueta lateral del stiletto (plano Y-Z). Recorrido cerrado:
    # empeine (punta -> talon) por arriba, baja por el contrafuerte, y vuelve
    # por la suela (asiento del talon -> arco -> punta).
    outline = [
        (-0.115, 0.010),  # 1  punta afilada (en el suelo)
        (-0.085, 0.042),  # 2  caja de la punta (arriba)
        (-0.045, 0.058),  # 3  empeine / pala
        (-0.008, 0.054),  # 4  escote (abertura)
        ( 0.022, 0.078),  # 5  subida del empeine
        ( 0.052, 0.125),  # 6  contrafuerte (parte alta del talon)
        ( 0.070, 0.118),  # 7  remate trasero
        ( 0.066, 0.080),  # 8  espalda del contrafuerte
        ( 0.060, 0.064),  # 9  asiento del talon (atras)
        ( 0.052, 0.060),  # 10 asiento del talon (abajo) - sale el stiletto
        ( 0.012, 0.030),  # 11 arco (suela elevada)
        (-0.035, 0.006),  # 12 planta (apoyo en el suelo)
    ]

    smooth_outline = smooth_closed(outline, samples_per_seg=12)
    body = profile_solid(
        "Heel_Body", col, patent, smooth_outline, width=0.050, bevel=0.006, bevel_seg=2, subsurf=1
    )

    # Stiletto fino y alto: ancho en el asiento (+Z) y casi en filo en el suelo (-Z).
    stiletto = cone("Heel_Stiletto", col, patent, 0.0015, 0.0065, 0.062, (0, 0.056, 0.031))
    # Tapa de tacon discreta, mismo charol negro.
    tip = cylinder("Heel_Tip", col, patent, 0.004, 0.003, (0, 0.056, 0.0016))

    for obj in (body, stiletto, tip):
        parent(obj, root)
    return root


if __name__ == "__main__":
    export_token("tacon.glb", build_high_heel)
