import bpy
import bmesh
import math

# ============================================================
#  MONOPOLY - FICHA LLAVE DE LA CIUDAD (CITY KEY)
#  Versión 2.0 — Proporciones reales, más alta y detallada
#  Altura total objetivo: ~0.14  (más alta que la alcancía)
#  Ancho máximo (cabeza): ~0.045
# ============================================================

# --- CONFIGURACIÓN GLOBAL ---
GO_X    = 0
GO_Y    = 0
SPAWN_Z = 0
SCALE   = 1.0


# ============================================================
#  MATERIALES
# ============================================================

def make_material(name, color, roughness=0.12, metallic=1.0, clearcoat=0.6):
    """Material PBR dorado metálico con barniz."""
    if name in bpy.data.materials:
        mat = bpy.data.materials[name]
    else:
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True

    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value  = roughness
        bsdf.inputs["Metallic"].default_value   = metallic
        if "Coat Weight" in bsdf.inputs:
            bsdf.inputs["Coat Weight"].default_value    = clearcoat
            bsdf.inputs["Coat Roughness"].default_value = 0.04
        elif "Clearcoat" in bsdf.inputs:
            bsdf.inputs["Clearcoat"].default_value           = clearcoat
            bsdf.inputs["Clearcoat Roughness"].default_value = 0.04
    return mat


def setup_materials():
    mats = {}
    # Dorado principal brillante
    mats["gold"]   = make_material("Key_Gold",   (0.96, 0.78, 0.18, 1), roughness=0.10, metallic=1.0, clearcoat=0.7)
    # Dorado más oscuro para grabados y detalles
    mats["dark"]   = make_material("Key_Dark",   (0.55, 0.38, 0.05, 1), roughness=0.25, metallic=0.85, clearcoat=0.3)
    return mats


# ============================================================
#  UTILIDADES
# ============================================================

def link_to(obj, col):
    for c in obj.users_collection:
        c.objects.unlink(obj)
    col.objects.link(obj)


def apply_mat(obj, mat):
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


def get_or_create_collection(name):
    if name not in bpy.data.collections:
        c = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(c)
    return bpy.data.collections[name]


def clear_piece(root_name):
    if root_name not in bpy.data.objects:
        return
    root = bpy.data.objects[root_name]
    for obj in list(root.children_recursive) + [root]:
        mesh = obj.data if obj.type == 'MESH' else None
        bpy.data.objects.remove(obj, do_unlink=True)
        if mesh and mesh.users == 0:
            bpy.data.meshes.remove(mesh)


def apply_transforms(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)


def set_smooth(obj, angle_deg=40):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth()
    if hasattr(obj.data, "use_auto_smooth"):
        obj.data.use_auto_smooth = True
        obj.data.auto_smooth_angle = math.radians(angle_deg)
    else:
        for mod in obj.modifiers:
            if mod.type == 'SMOOTH_BY_ANGLE':
                obj.modifiers.remove(mod)
        mod = obj.modifiers.new("SmoothByAngle", 'SMOOTH_BY_ANGLE')
        mod.angle = math.radians(angle_deg)


def add_subsurf(obj, levels=2):
    mod = obj.modifiers.new("Subsurf", 'SUBSURF')
    mod.levels           = levels
    mod.render_levels    = levels
    mod.subdivision_type = 'CATMULL_CLARK'


def join_objects(objects, active_obj):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active_obj
    bpy.ops.object.join()
    return active_obj


# ============================================================
#  PARTES DE LA LLAVE
#
#  Orientación: la llave está PARADA (vertical, eje Z)
#  Cabeza (ojo) arriba  → Z ~ 0.12–0.14
#  Mástil (shaft)       → Z ~ 0.04–0.12
#  Dientes              → salen a la derecha (eje +X)
#  Base plana           → Z ~ 0.00–0.008
# ============================================================

def make_base(col, mat):
    """Disco base muy fino para estabilidad visual en el tablero."""
    bpy.ops.mesh.primitive_cylinder_add(radius=0.030, depth=0.006, vertices=40)
    base = bpy.context.active_object
    base.name = "Key_Base"
    base.location = (0, 0, 0.003)
    link_to(base, col)
    apply_mat(base, mat)
    return base


def make_shaft(col, mat):
    """
    Mástil largo y robusto.
    Va desde Z=0.006 hasta Z=0.105 → largo neto 0.099
    Sección octogonal para dar aspecto forjado.
    """
    bpy.ops.mesh.primitive_cylinder_add(radius=0.0115, depth=0.099, vertices=8)
    shaft = bpy.context.active_object
    shaft.name = "Key_Shaft"
    shaft.location = (0, 0, 0.055)   # centro del mástil
    link_to(shaft, col)
    apply_mat(shaft, mat)
    return shaft


def make_shoulder(col, mat):
    """
    Hombro: ensanchamiento donde el mástil se une a la cabeza.
    Simula el forjado típico de una llave antigua.
    """
    bpy.ops.mesh.primitive_cylinder_add(radius=0.016, depth=0.010, vertices=12)
    sh = bpy.context.active_object
    sh.name = "Key_Shoulder"
    sh.location = (0, 0, 0.109)
    link_to(sh, col)
    apply_mat(sh, mat)
    return sh


def make_head_ring(col, mat):
    """
    Ojo de la llave: toroide grueso orientado verticalmente.
    Diámetro exterior ~0.044, grosor del tubo ~0.009
    Posición: Z = 0.130 (centro del aro)
    """
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.022,
        minor_radius=0.009,
        major_segments=48,
        minor_segments=16
    )
    ring = bpy.context.active_object
    ring.name = "Key_HeadRing"
    # El toro por defecto está en el plano XY → rotar 90° en X para que quede vertical
    ring.rotation_euler = (math.radians(90), 0, 0)
    ring.location = (0, 0, 0.130)
    link_to(ring, col)
    apply_mat(ring, mat)
    return ring


def make_head_cap(col, mat):
    """
    Tapa superior del ojo: pequeño cilindro que cierra visualmente
    la parte de arriba del aro y le da volumen de corona.
    """
    bpy.ops.mesh.primitive_cylinder_add(radius=0.013, depth=0.008, vertices=20)
    cap = bpy.context.active_object
    cap.name = "Key_HeadCap"
    cap.location = (0, 0, 0.144)
    link_to(cap, col)
    apply_mat(cap, mat)
    return cap



def make_teeth(col, mat):
    """
    Dientes de la llave: 3 dientes escalonados clásicos.
    Corregidos para fusionarse perfectamente con el mástil sin dejar huecos.
    """
    teeth = []

    # Definición: (offset_z_desde_base, saliente_x, alto_z, profundo_y)
    tooth_defs = [
        (0.012, 0.024, 0.018, 0.013),  # Diente 1 — Base
        (0.036, 0.018, 0.014, 0.013),  # Diente 2 — Centro
        (0.056, 0.013, 0.010, 0.013),  # Diente 3 — Superior
    ]

    shaft_radius = 0.0115  # Radio del mástil octogonal
    overlap = 0.002        # Margen de seguridad para empotrar el diente dentro del mástil

    for i, (z_off, sal_x, h_z, d_y) in enumerate(tooth_defs):
        bpy.ops.mesh.primitive_cube_add(size=1)
        tooth = bpy.context.active_object
        tooth.name = f"Key_Tooth_{i}"
        tooth.scale = (sal_x, d_y, h_z)
        
        # CORRECCIÓN: El centro en X debe ser el radio del mástil + la MITAD del saliente, 
        # restando el overlap para que se clave dentro de la malla principal.
        pos_x = shaft_radius + (sal_x / 2.0) - overlap
        
        tooth.location = (pos_x, 0, z_off + h_z * 0.5)
        link_to(tooth, col)
        apply_mat(tooth, mat)
        teeth.append(tooth)

    return teeth


def make_groove(col, mat):
    """
    Canal longitudinal decorativo. 
    Ajustado en Y para que no flote sobre la superficie del mástil.
    """
    bpy.ops.mesh.primitive_cube_add(size=1)
    groove = bpy.context.active_object
    groove.name = "Key_Groove"
    groove.scale = (0.003, 0.016, 0.045)
    
    # CORRECCIÓN: Desplazamos ligeramente en Y (-0.005) para que rompa la superficie
    # del mástil cilíndrico y actúe como un canal tallado real.
    groove.location = (0, -0.005, 0.065)
    
    link_to(groove, col)
    apply_mat(groove, mat)
    return groove

def make_bow_decorations(col, mat):
    """
    Decoraciones en el ojo: dos pequeñas esferas simétricas
    en el diámetro horizontal del aro para simular grabados.
    """
    decs = []
    for sx in (-0.022, 0.022):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.005, segments=12, ring_count=8)
        d = bpy.context.active_object
        d.name = "Key_BowDec"
        d.location = (sx, 0, 0.130)
        link_to(d, col)
        apply_mat(d, mat)
        decs.append(d)
    return decs


# ============================================================
#  ENSAMBLAJE
# ============================================================

def build_city_key(collection, x_offset=0.0, y_offset=0.0):
    mats = setup_materials()

    # Contenedor raíz
    root = bpy.data.objects.new("Piece_CityKey", None)
    root.location = (GO_X + x_offset, GO_Y + y_offset, SPAWN_Z)
    root.empty_display_type = 'ARROWS'
    root.empty_display_size = 0.02
    collection.objects.link(root)

    # --- Crear partes ---
    base     = make_base(collection, mats["gold"])
    shaft    = make_shaft(collection, mats["gold"])
    shoulder = make_shoulder(collection, mats["gold"])
    ring     = make_head_ring(collection, mats["gold"])
    cap      = make_head_cap(collection, mats["gold"])
    teeth    = make_teeth(collection, mats["gold"])
    groove   = make_groove(collection, mats["dark"])
    bow_decs = make_bow_decorations(collection, mats["dark"])

    # --- Unir toda la geometría dorada en una sola malla ---
    gold_parts = [base, shaft, shoulder, ring, cap] + teeth + bow_decs
    for p in gold_parts:
        apply_transforms(p)

    key_mesh = join_objects(gold_parts, base)
    key_mesh.name = "CityKey_Mesh"
    key_mesh.parent = root
    key_mesh.location = (0, 0, 0)

    # Biselado suave con bmesh para redondear aristas de los dientes y mástil
    bm = bmesh.new()
    bm.from_mesh(key_mesh.data)
    bm.edges.ensure_lookup_table()
    sharp_edges = [e for e in bm.edges if not e.smooth]
    bmesh.ops.bevel(
        bm,
        geom=sharp_edges if sharp_edges else list(bm.edges),
        offset=0.0008,
        segments=2,
        profile=0.5,
        affect='EDGES'
    )
    bm.to_mesh(key_mesh.data)
    bm.free()

    set_smooth(key_mesh, angle_deg=35)
    add_subsurf(key_mesh, levels=2)

    # Ranura oscura — objeto separado para conservar color
    apply_transforms(groove)
    groove.parent = root
    groove.location = groove.location
    set_smooth(groove, angle_deg=30)

    # Escala global
    root.scale = (SCALE, SCALE, SCALE)

    print("✅ Llave de la Ciudad Monopoly generada correctamente.")
    return root


# ============================================================
#  PUNTO DE ENTRADA
# ============================================================

if __name__ == "__main__":
    clear_piece("Piece_CityKey")
    col = get_or_create_collection("Game_Pieces")
    build_city_key(col, x_offset=0.0, y_offset=0.0)
    bpy.context.view_layer.update()