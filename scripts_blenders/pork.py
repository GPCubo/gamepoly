import bpy
import bmesh
import math

# ============================================================
#  MONOPOLY - FICHA ALCANCÍA (PIGGY BANK)
#  Versión 2.0 — Geometría mejorada, más detalle y fidelidad
# ============================================================

# --- CONFIGURACIÓN GLOBAL ---
GO_X    = 0
GO_Y    = 0
SPAWN_Z = 0

SCALE   = 1.0   # Escalar toda la pieza si se necesita


# ============================================================
#  MATERIALES
# ============================================================

def make_material(name, color, roughness=0.15, metallic=0.0, clearcoat=0.4):
    """Crea o actualiza un material PBR."""
    if name in bpy.data.materials:
        mat = bpy.data.materials[name]
    else:
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True

    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value   = color
        bsdf.inputs["Roughness"].default_value    = roughness
        bsdf.inputs["Metallic"].default_value     = metallic
        # Clearcoat (barniz cerámico) — disponible en Blender ≥ 3.x
        if "Coat Weight" in bsdf.inputs:
            bsdf.inputs["Coat Weight"].default_value      = clearcoat
            bsdf.inputs["Coat Roughness"].default_value   = 0.05
        elif "Clearcoat" in bsdf.inputs:
            bsdf.inputs["Clearcoat"].default_value        = clearcoat
            bsdf.inputs["Clearcoat Roughness"].default_value = 0.05
    return mat


def setup_materials():
    mats = {}
    # Rosa pastel brillante (cuerpo principal)
    mats["pink"]  = make_material("Pig_Pink",  (0.96, 0.58, 0.68, 1), roughness=0.12, clearcoat=0.5)
    # Rosa más oscuro para detalles internos (nariz, orejas)
    mats["inner"] = make_material("Pig_Inner", (0.88, 0.42, 0.55, 1), roughness=0.18, clearcoat=0.3)
    # Negro para ojos
    mats["black"] = make_material("Pig_Black", (0.04, 0.03, 0.04, 1), roughness=0.05, clearcoat=0.8)
    # Blanco brillante para córneas/reflejos de ojos
    mats["white"] = make_material("Pig_White", (0.98, 0.98, 0.98, 1), roughness=0.02, clearcoat=1.0)
    # Dorado metálico para la ranura de monedas
    mats["gold"]  = make_material("Pig_Gold",  (0.90, 0.72, 0.15, 1), roughness=0.25, metallic=0.9, clearcoat=0.2)
    return mats


# ============================================================
#  UTILIDADES
# ============================================================

def link_to(obj, collection):
    """Vincula objeto a la colección dada, moviéndolo si ya está en otra."""
    for col in obj.users_collection:
        col.objects.unlink(obj)
    collection.objects.link(obj)


def apply_mat(obj, mat):
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


def get_or_create_collection(name):
    if name not in bpy.data.collections:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
    return bpy.data.collections[name]


def clear_piece(root_name):
    """Elimina pieza previa y todos sus hijos."""
    if root_name not in bpy.data.objects:
        return
    root = bpy.data.objects[root_name]
    queue = list(root.children_recursive) + [root]
    for obj in queue:
        mesh = obj.data if obj.type == 'MESH' else None
        bpy.data.objects.remove(obj, do_unlink=True)
        if mesh and mesh.users == 0:
            bpy.data.meshes.remove(mesh)


def apply_transforms(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)


def set_smooth(obj, angle_deg=50):
    """Activa shade smooth con auto-smooth."""
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth()
    if hasattr(obj.data, "use_auto_smooth"):
        obj.data.use_auto_smooth = True
        obj.data.auto_smooth_angle = math.radians(angle_deg)
    else:
        # Blender 4.x usa modificador
        for mod in obj.modifiers:
            if mod.type == 'SMOOTH_BY_ANGLE':
                obj.modifiers.remove(mod)
        mod = obj.modifiers.new("SmoothByAngle", 'SMOOTH_BY_ANGLE')
        mod.angle = math.radians(angle_deg)


def add_subsurf(obj, levels=2):
    mod = obj.modifiers.new("Subsurf", 'SUBSURF')
    mod.levels          = levels
    mod.render_levels   = levels
    mod.subdivision_type = 'CATMULL_CLARK'


def join_objects(objects, active_obj):
    """Une una lista de objetos en active_obj y lo retorna."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active_obj
    bpy.ops.object.join()
    return active_obj


# ============================================================
#  CONSTRUCCIÓN DE PARTES
# ============================================================

def make_body(col, mats):
    """Cuerpo principal: esfera aplastada en Z, alargada en Y."""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.055, segments=48, ring_count=32)
    body = bpy.context.active_object
    body.name = "Pig_Body"
    body.scale = (1.0, 1.45, 0.88)
    body.location = (0, 0, 0.055)
    link_to(body, col)
    apply_mat(body, mats["pink"])
    return body


def make_head(col, mats):
    """Cabeza separada (esfera más pequeña) unida al frente del cuerpo."""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.038, segments=48, ring_count=32)
    head = bpy.context.active_object
    head.name = "Pig_Head"
    head.scale = (0.95, 0.95, 0.95)
    head.location = (0, -0.072, 0.068)
    link_to(head, col)
    apply_mat(head, mats["pink"])
    return head


def make_snout(col, mats):
    """Hocico: disco cilíndrico con concavidad simulada."""
    bpy.ops.mesh.primitive_cylinder_add(radius=0.020, depth=0.012, vertices=32)
    snout = bpy.context.active_object
    snout.name = "Pig_Snout"
    snout.rotation_euler = (math.radians(90), 0, 0)
    snout.location = (0, -0.108, 0.063)
    snout.scale = (1, 1, 0.7)
    link_to(snout, col)
    apply_mat(snout, mats["inner"])

    # Dos agujeros de nariz (esferas aplastadas empotradas)
    nostrils = []
    for sx in (-0.008, 0.008):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.005, segments=12, ring_count=8)
        n = bpy.context.active_object
        n.name = "Pig_Nostril"
        n.scale = (0.7, 0.4, 0.7)
        n.location = (sx, -0.114, 0.062)
        link_to(n, col)
        apply_mat(n, mats["inner"])
        nostrils.append(n)

    return snout, nostrils


def make_ears(col, mats):
    """Orejas: conos dobles (exterior rosa, interior oscuro) inclinados."""
    ears = []
    for side in (-1, 1):
        # Oreja exterior
        bpy.ops.mesh.primitive_cone_add(radius1=0.017, radius2=0.003, depth=0.028, vertices=20)
        ear_out = bpy.context.active_object
        ear_out.name = f"Pig_EarOuter_{'L' if side < 0 else 'R'}"
        ear_out.scale = (0.9, 0.55, 1)
        ear_out.rotation_euler = (math.radians(-22), math.radians(side * 18), 0)
        ear_out.location = (side * 0.028, -0.072, 0.098)
        link_to(ear_out, col)
        apply_mat(ear_out, mats["pink"])

        # Oreja interior (más pequeña, empotrada)
        bpy.ops.mesh.primitive_cone_add(radius1=0.011, radius2=0.001, depth=0.020, vertices=20)
        ear_in = bpy.context.active_object
        ear_in.name = f"Pig_EarInner_{'L' if side < 0 else 'R'}"
        ear_in.scale = (0.9, 0.55, 1)
        ear_in.rotation_euler = (math.radians(-22), math.radians(side * 18), 0)
        ear_in.location = (side * 0.028, -0.073, 0.097)
        link_to(ear_in, col)
        apply_mat(ear_in, mats["inner"])

        ears.extend([ear_out, ear_in])
    return ears


def make_legs(col, mats):
    """Cuatro patas cilíndricas con base ligeramente acampanada."""
    legs = []
    positions = [
        (-0.030,  0.040, 0.018),
        ( 0.030,  0.040, 0.018),
        (-0.030, -0.025, 0.018),
        ( 0.030, -0.025, 0.018),
    ]
    for i, (px, py, pz) in enumerate(positions):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.011, depth=0.034, vertices=20)
        leg = bpy.context.active_object
        leg.name = f"Pig_Leg_{i}"
        leg.location = (px, py, pz)
        link_to(leg, col)
        apply_mat(leg, mats["pink"])
        legs.append(leg)

        # Pezuña: disco achatado al pie de la pata
        bpy.ops.mesh.primitive_cylinder_add(radius=0.013, depth=0.006, vertices=20)
        hoof = bpy.context.active_object
        hoof.name = f"Pig_Hoof_{i}"
        hoof.location = (px, py, 0.003)
        link_to(hoof, col)
        apply_mat(hoof, mats["inner"])
        legs.append(hoof)

    return legs


def make_eyes(col, mats):
    """Ojos expresivos: esclerótica blanca + iris negro + destello blanco."""
    eyes = []
    for side in (-1, 1):
        ex = side * 0.019

        # Esclerótica (blanco del ojo)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.0075, segments=16, ring_count=12)
        sclera = bpy.context.active_object
        sclera.name = f"Pig_Sclera_{'L' if side < 0 else 'R'}"
        sclera.location = (ex, -0.100, 0.075)
        link_to(sclera, col)
        apply_mat(sclera, mats["white"])
        eyes.append(sclera)

        # Iris/pupila (negro)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.0055, segments=12, ring_count=8)
        iris = bpy.context.active_object
        iris.name = f"Pig_Iris_{'L' if side < 0 else 'R'}"
        iris.location = (ex, -0.106, 0.076)
        link_to(iris, col)
        apply_mat(iris, mats["black"])
        eyes.append(iris)

        # Destello (pequeño punto blanco)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.0018, segments=8, ring_count=6)
        glint = bpy.context.active_object
        glint.name = f"Pig_Glint_{'L' if side < 0 else 'R'}"
        glint.location = (ex + 0.002, -0.108, 0.079)
        link_to(glint, col)
        apply_mat(glint, mats["white"])
        eyes.append(glint)

    return eyes


def make_tail(col, mats):
    """Cola corta: una sola vuelta pequeña y apretada, pegada al trasero."""
    curve_data = bpy.data.curves.new("Pig_TailCurve", type='CURVE')
    curve_data.dimensions      = '3D'
    curve_data.bevel_depth     = 0.0028   # grosor fino
    curve_data.bevel_resolution = 4
    curve_data.use_fill_caps   = True

    spline = curve_data.splines.new('NURBS')
    turns  = 1.0          # una sola vuelta
    points = 14           # pocos puntos → espiral compacta
    spline.points.add(points - 1)

    for i in range(points):
        t   = i / (points - 1)
        ang = t * turns * 2 * math.pi
        r   = 0.010 * (1.0 - t * 0.45)  # radio pequeño, se cierra al final
        x   = r * math.cos(ang)
        y   = r * math.sin(ang)
        z   = t * 0.010                  # sube muy poco
        spline.points[i].co = (x, y, z, 1)

    spline.use_endpoint_u = True
    spline.order_u = 4

    tail_obj = bpy.data.objects.new("Pig_Tail", curve_data)
    # Posición: pegada al trasero del cuerpo, lateralmente centrada
    tail_obj.location      = (0.0, 0.077, 0.072)
    tail_obj.rotation_euler = (math.radians(5), 0, 0)
    link_to(tail_obj, col)

    # Convertir a malla para unir y aplicar material
    bpy.ops.object.select_all(action='DESELECT')
    tail_obj.select_set(True)
    bpy.context.view_layer.objects.active = tail_obj
    bpy.ops.object.convert(target='MESH')
    tail_obj.name = "Pig_Tail"
    apply_mat(tail_obj, mats["pink"])
    return tail_obj


def make_coin_slot(col, mats):
    """Ranura de moneda en el lomo: placa dorada con hendidura."""
    # Plaquita dorada elevada
    bpy.ops.mesh.primitive_cube_add(size=1)
    slot_plate = bpy.context.active_object
    slot_plate.name = "Pig_CoinPlate"
    slot_plate.scale = (0.022, 0.005, 0.008)
    slot_plate.location = (0, 0.005, 0.108)
    link_to(slot_plate, col)
    apply_mat(slot_plate, mats["gold"])

    # Hendidura (caja delgada negra empotrada en la plaquita)
    bpy.ops.mesh.primitive_cube_add(size=1)
    slot_line = bpy.context.active_object
    slot_line.name = "Pig_CoinSlot"
    slot_line.scale = (0.018, 0.003, 0.0025)
    slot_line.location = (0, 0.002, 0.108)
    link_to(slot_line, col)
    apply_mat(slot_line, mats["black"])

    return [slot_plate, slot_line]


# ============================================================
#  ENSAMBLAJE PRINCIPAL
# ============================================================

def build_piggy_bank(collection, x_offset=0.0, y_offset=0.0):
    mats = setup_materials()

    # --- Contenedor raíz ---
    root = bpy.data.objects.new("Piece_PiggyBank", None)
    root.location = (GO_X + x_offset, GO_Y + y_offset, SPAWN_Z)
    root.empty_display_type = 'ARROWS'
    root.empty_display_size = 0.02
    collection.objects.link(root)

    # --- Crear partes ---
    body            = make_body(collection, mats)
    head            = make_head(collection, mats)
    snout, nostrils = make_snout(collection, mats)
    ears            = make_ears(collection, mats)
    legs            = make_legs(collection, mats)
    eyes            = make_eyes(collection, mats)
    tail            = make_tail(collection, mats)
    coin_parts      = make_coin_slot(collection, mats)

    # --- Partes a unir en la malla rosa principal ---
    pink_parts = [body, head, snout] + ears + legs + [tail]

    # Aplicar transformaciones antes de unir
    for p in pink_parts:
        apply_transforms(p)

    # Unir en el cuerpo
    pink_mesh = join_objects(pink_parts, body)
    pink_mesh.name = "PiggyBank_Body"

    # Suavizado + Subdivisión en la malla rosa
    set_smooth(pink_mesh, angle_deg=50)
    add_subsurf(pink_mesh, levels=2)

    # --- Partes independientes (mantienen material propio) ---
    independent = nostrils + eyes + coin_parts

    # --- Parentar todo al root ---
    pink_mesh.parent = root
    pink_mesh.location = (0, 0, 0)

    for obj in independent:
        obj.parent = root
        set_smooth(obj, angle_deg=60)

    # --- Aplicar escala global ---
    root.scale = (SCALE, SCALE, SCALE)

    print("✅ Alcancía Monopoly generada correctamente.")
    return root


# ============================================================
#  PUNTO DE ENTRADA
# ============================================================

if __name__ == "__main__":
    clear_piece("Piece_PiggyBank")
    col = get_or_create_collection("Game_Pieces")
    build_piggy_bank(col, x_offset=0.0, y_offset=0.0)
    bpy.context.view_layer.update()