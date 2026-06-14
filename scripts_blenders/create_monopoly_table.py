import bpy
import math
import os
import random

# ─────────────────────────────────────────────────────────────────────────
# CONFIGURACIÓN GENERAL (Escala física optimizada)
#   IMPORTANTE: NO cambiar dimensiones ni get_tile_transform(). De ahí salen
#   las posiciones que usan las etiquetas del tablero (useBoardGeometry.ts).
# ─────────────────────────────────────────────────────────────────────────
TABLE_WIDTH       = 6.4
TABLE_DEPTH       = 6.4
TABLE_TOP_Z       = 0.75
TABLE_THICKNESS   = 0.08

BOARD_SIZE        = 4.8
BOARD_Z           = TABLE_TOP_Z + 0.01
BOARD_THICKNESS   = 0.04

TILE_HEIGHT       = 0.02
CORNER_SIZE       = 0.45
TILE_WIDTH        = (BOARD_SIZE - (CORNER_SIZE * 2)) / 9
TILE_DEPTH        = 0.45
BAND_DEPTH        = 0.18
PRICE_BOTTOM_MARGIN = 0.05

# Marco decorativo (queda FUERA del anillo de casillas: no afecta alineación)
FRAME_WIDTH       = 0.18
FRAME_HEIGHT      = 0.05

# Bisel global (cantos suaves estilo plástico premium). 0 = desactivado.
ENABLE_BEVEL      = True

# PALETA COHESIVA (mismos tonos clásicos que las etiquetas 2D)
TILE_COLORS = {
    # Grupos de propiedad
    "brown":             (0.584, 0.329, 0.212, 1),
    "lightBlue":         (0.667, 0.878, 0.980, 1),
    "pink":              (0.851, 0.227, 0.588, 1),
    "orange":            (0.969, 0.580, 0.114, 1),
    "red":               (0.929, 0.106, 0.141, 1),
    "yellow":            (0.996, 0.949, 0.000, 1),
    "green":             (0.122, 0.698, 0.353, 1),
    "darkBlue":          (0.000, 0.447, 0.733, 1),
    "railroad":          (0.169, 0.169, 0.169, 1),
    "utility":           (0.620, 0.820, 0.651, 1),
    "tax":               (0.353, 0.353, 0.353, 1),
    "chance":            (0.969, 0.580, 0.114, 1),
    "community":         (0.227, 0.651, 0.878, 1),
    # Esquinas
    "go":                (0.157, 0.706, 0.388, 1),
    "jail":              (0.902, 0.494, 0.133, 1),
    "parking":           (0.753, 0.224, 0.169, 1),
    "gotojail":          (0.573, 0.169, 0.129, 1),
    # Superficies
    "white":        (0.965, 0.965, 0.945, 1),   # Base de casillas
    "wood":         (0.180, 0.100, 0.050, 1),    # Mesa contenedora
    "frame":        (0.280, 0.150, 0.070, 1),    # Marco de madera
    "board_center": (0.918, 0.933, 0.890, 1),    # Fondo claro del tablero
    "plaza_grass":  (0.650, 0.820, 0.690, 1),    # Jardin central
    "plaza_path":   (0.760, 0.720, 0.640, 1),    # Caminos de piedra
    "plaza_tile":   (0.820, 0.790, 0.700, 1),    # Plaza principal
    "plaza_edge":   (0.560, 0.500, 0.430, 1),    # Bordes de plaza/caminos
    "tree_trunk":   (0.420, 0.240, 0.110, 1),
    "tree_leaf":    (0.130, 0.480, 0.220, 1),
}

PROPERTY_GROUPS = ["brown", "lightBlue", "pink", "orange", "red", "yellow", "green", "darkBlue"]

# Mapeo exacto de las 40 casillas (Sentido horario desde GO)
TILE_GROUPS = [
    "go", "brown", "community", "brown", "tax", "railroad", "lightBlue", "chance", "lightBlue", "lightBlue",
    "jail", "pink", "utility", "pink", "pink", "railroad", "orange", "community", "orange", "orange",
    "parking", "red", "chance", "red", "red", "railroad", "yellow", "yellow", "utility", "yellow",
    "gotojail", "green", "green", "community", "green", "railroad", "chance", "darkBlue", "tax", "darkBlue"
]

# Datos de cada casilla: nombre corto (para 3D), nombre completo y precio
TILE_INFO = [
    {"short": "Go"},                                   # 0  go
    {"short": "Watermill", "price": 60},               # 1  brown
    {"short": "City Fund"},                            # 2  community
    {"short": "Harbor", "price": 60},                  # 3  brown
    {"short": "Tax"},                                  # 4  tax
    {"short": "N.Terminal", "price": 200},             # 5  railroad
    {"short": "Bay St", "price": 100},                 # 6  lightBlue
    {"short": "Fortune"},                              # 7  chance
    {"short": "Market Sq", "price": 100},              # 8  lightBlue
    {"short": "Riverside", "price": 120},              # 9  lightBlue
    {"short": "Jail"},                                 # 10  jail
    {"short": "Grand Ave", "price": 140},              # 11  pink
    {"short": "Power Co.", "price": 150},              # 12  utility
    {"short": "Sunset Blvd", "price": 140},            # 13  pink
    {"short": "Palm Dr", "price": 160},                # 14  pink
    {"short": "E.Terminal", "price": 200},             # 15  railroad
    {"short": "Maple Dr", "price": 180},               # 16  orange
    {"short": "City Fund"},                            # 17  community
    {"short": "Oak St", "price": 180},                 # 18  orange
    {"short": "Elm Park", "price": 200},               # 19  orange
    {"short": "Parking"},                              # 20  parking
    {"short": "Crown", "price": 220},                  # 21  red
    {"short": "Fortune"},                              # 22  chance
    {"short": "Empire Sq", "price": 220},              # 23  red
    {"short": "Liberty St", "price": 240},             # 24  red
    {"short": "S.Terminal", "price": 200},             # 25  railroad
    {"short": "Sunrise", "price": 260},                # 26  yellow
    {"short": "Horizon", "price": 260},                # 27  yellow
    {"short": "Water Works", "price": 150},            # 28  utility
    {"short": "Valley", "price": 280},                 # 29  yellow
    {"short": "Go to Jail"},                           # 30  gotojail
    {"short": "Crescent", "price": 300},               # 31  green
    {"short": "Forest Blvd", "price": 300},            # 32  green
    {"short": "City Fund"},                            # 33  community
    {"short": "Lakeside", "price": 320},               # 34  green
    {"short": "W.Terminal", "price": 200},             # 35  railroad
    {"short": "Fortune"},                              # 36  chance
    {"short": "Skyline", "price": 350},                # 37  darkBlue
    {"short": "Luxury"},                               # 38  tax
    {"short": "Diamond", "price": 400},                # 39  darkBlue
]

# ─────────────────────────────────────────────────────────────────────────
# LIMPIEZA TOTAL SEGURO (Previene errores de contexto de ventana)
# ─────────────────────────────────────────────────────────────────────────
def safe_clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)

def _configure_bsdf(bsdf, rgba, roughness, emission):
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = roughness
    if emission > 0:
        # Blender 4.x: "Emission Color" / 3.x: "Emission"
        emis_color = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        if emis_color:
            emis_color.default_value = rgba
        emis_strength = bsdf.inputs.get("Emission Strength")
        if emis_strength:
            emis_strength.default_value = emission

def get_or_create_material(name, rgba, roughness=0.05, emission=0.0):
    """Genera acabados de alta saturación y reflejo plástico premium"""
    if name in bpy.data.materials:
        mat = bpy.data.materials[name]
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            _configure_bsdf(bsdf, rgba, roughness, emission)
        return mat

    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        _configure_bsdf(bsdf, rgba, roughness, emission)
    return mat

def add_box(name, dims, location, material):
    """Crea un cubo con dimensiones/posición y le aplica escala (deja scale=1)."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dims
    obj.data.materials.append(material)
    # Aplicar escala para que el bisel sea uniforme en todos los ejes
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj

def add_cylinder(name, radius, depth, location, material, vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj

def add_cone(name, radius1, radius2, depth, location, material, vertices=24):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj

def add_uv_sphere(name, radius, location, material, segments=10, rings=6, squash=1.0):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, radius=radius, location=location)
    obj = bpy.context.active_object
    obj.name = name
    if squash != 1.0:
        obj.scale = (1.0, 1.0, squash)
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    return obj

def parent_local(obj, parent, location, rotation_z=0):
    obj.parent = parent
    obj.location = location
    obj.rotation_euler = (0, 0, rotation_z)
    return obj

def bevel_mesh(obj, width=0.004, segments=2):
    """Redondea los cantos del objeto (footprint intacto -> no afecta alineación)."""
    if not ENABLE_BEVEL or width <= 0:
        return
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new(name="Bevel", type='BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'ANGLE'
    mod.angle_limit = math.radians(40)
    bpy.ops.object.modifier_apply(modifier=mod.name)

def add_text_line(name, text_str, location, size, material, extrude=0.002, parent=None):
    """Crea texto 3D sobre la casilla. Se posiciona en espacio local del contenedor."""
    curve_data = bpy.data.curves.new(name=f"{name}_Data", type='FONT')
    curve_data.body = text_str
    curve_data.size = size
    curve_data.extrude = extrude
    curve_data.align_x = 'CENTER'
    curve_data.align_y = 'CENTER'
    curve_data.space_character = 1.0
    curve_data.space_word = 1.0
    obj = bpy.data.objects.new(name, curve_data)
    obj.location = location
    obj.data.materials.append(material)
    bpy.context.scene.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    return obj

def add_flat_icon_polygon(name, points, z, material, parent):
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    verts = [(x, y, z) for x, y in points]
    mesh.from_pydata(verts, [], [list(range(len(verts)))])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(material)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    return obj

def add_flat_icon_rect(name, center, width, height, z, material, parent, rotation_z=0):
    cx, cy = center
    hw = width / 2
    hh = height / 2
    base_points = [(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)]
    cos_r = math.cos(rotation_z)
    sin_r = math.sin(rotation_z)
    points = [
        (
            cx + px * cos_r - py * sin_r,
            cy + px * sin_r + py * cos_r,
        )
        for px, py in base_points
    ]
    return add_flat_icon_polygon(name, points, z, material, parent)

def add_flat_icon_circle(name, center, radius, z, material, parent, vertices=28, scale_y=1.0):
    cx, cy = center
    points = [
        (
            cx + math.cos((math.tau * i) / vertices) * radius,
            cy + math.sin((math.tau * i) / vertices) * radius * scale_y,
        )
        for i in range(vertices)
    ]
    return add_flat_icon_polygon(name, points, z, material, parent)

def add_special_tile_icon(tile_idx, icon_type, parent, mats):
    """Iconos 2D planos sobre la casilla (la version 3D de la locomotora
    vive ahora como ficha de jugador en train_user.py)."""
    base_name = f"Tile_{tile_idx:02d}_Icon"
    z = TILE_HEIGHT / 2 + 0.006
    y = -0.075

    if icon_type == "community":
        add_flat_icon_rect(f"{base_name}_ChestBody", (0, y - 0.004), 0.110, 0.056, z, mats["community_dark"], parent)
        add_flat_icon_rect(f"{base_name}_ChestLid", (0, y + 0.032), 0.120, 0.020, z + 0.0004, mats["community_light"], parent)
        add_flat_icon_rect(f"{base_name}_ChestBand", (0, y - 0.004), 0.018, 0.066, z + 0.0008, mats["metal"], parent)
        add_flat_icon_rect(f"{base_name}_ChestLock", (0, y - 0.039), 0.020, 0.012, z + 0.0012, mats["metal"], parent)
        return

    if icon_type == "railroad":
        add_flat_icon_rect(f"{base_name}_TrainBody", (0, y, ), 0.112, 0.044, z, mats["rail"], parent)
        add_flat_icon_rect(f"{base_name}_TrainCab", (0.036, y + 0.018), 0.044, 0.046, z + 0.0004, mats["rail"], parent)
        add_flat_icon_circle(f"{base_name}_TrainNose", (-0.055, y), 0.024, z + 0.0004, mats["rail"], parent, vertices=20, scale_y=0.82)
        add_flat_icon_circle(f"{base_name}_WheelA", (-0.036, y - 0.036), 0.014, z + 0.0008, mats["dark"], parent, vertices=20)
        add_flat_icon_circle(f"{base_name}_WheelB", (0.036, y - 0.036), 0.014, z + 0.0008, mats["dark"], parent, vertices=20)
        add_flat_icon_rect(f"{base_name}_Track", (0, y - 0.050), 0.136, 0.008, z + 0.0012, mats["dark"], parent)
        return

    if icon_type == "tax":
        for offset in [-0.028, 0.0, 0.028]:
            add_flat_icon_circle(f"{base_name}_Coin_{offset:.2f}", (offset, y), 0.019, z + abs(offset) * 0.002, mats["gold"], parent, vertices=26)
        add_text_line(f"{base_name}_MoneyText", "$", (0, y + 0.003, z + 0.002), 0.038, mats["dark"], extrude=0, parent=parent)
        return

    if icon_type == "luxury":
        add_flat_icon_polygon(
            f"{base_name}_Diamond",
            [(0, y + 0.055), (0.052, y + 0.005), (0, y - 0.055), (-0.052, y + 0.005)],
            z,
            mats["diamond"],
            parent)
        add_flat_icon_polygon(
            f"{base_name}_DiamondFacet",
            [(0, y + 0.055), (0.020, y + 0.005), (0, y - 0.055), (-0.020, y + 0.005)],
            z + 0.0005,
            mats["metal"],
            parent)
        return

    if icon_type == "electric":
        add_flat_icon_polygon(
            f"{base_name}_Bolt",
            [(-0.012, y + 0.060), (0.034, y + 0.010), (0.010, y + 0.010), (0.036, y - 0.060), (-0.036, y - 0.002), (-0.010, y - 0.002)],
            z,
            mats["gold"],
            parent)
        return

    if icon_type == "chance":
        add_text_line(f"{base_name}_Question", "?", (0, y, z + 0.002), 0.080, mats["chance"], extrude=0, parent=parent)
        return

    if icon_type == "water":
        add_flat_icon_polygon(
            f"{base_name}_Drop",
            [(0, y + 0.060), (0.036, y + 0.008), (0.028, y - 0.038), (0, y - 0.058), (-0.028, y - 0.038), (-0.036, y + 0.008)],
            z,
            mats["water"],
            parent)

def special_icon_type(group, short_name):
    if group == "community":
        return "community"
    if group == "railroad":
        return "railroad"
    if group == "chance":
        return "chance"
    if group == "tax":
        return "luxury" if short_name == "Lujo" else "tax"
    if group == "utility":
        return "water" if short_name == "Agua" else "electric"
    return None

# ─────────────────────────────────────────────────────────────────────────
# MATRIZ DE TRANSFORMACIÓN (Corrige orientación y giros invertidos)
#   ¡NO MODIFICAR! Las etiquetas dependen de estas posiciones.
# ─────────────────────────────────────────────────────────────────────────
def get_tile_transform(idx):
    H = BOARD_SIZE / 2
    side = idx // 10
    rem = idx % 10

    # Posicionamiento de las 4 Esquinas Principales
    if idx == 0:  return (-H + CORNER_SIZE/2, -H + CORNER_SIZE/2, 0)
    if idx == 10: return (H - CORNER_SIZE/2, -H + CORNER_SIZE/2, math.pi/2)
    if idx == 20: return (H - CORNER_SIZE/2, H - CORNER_SIZE/2, math.pi)
    if idx == 30: return (-H + CORNER_SIZE/2, H - CORNER_SIZE/2, -math.pi/2)

    # Cálculo preciso del paso por casilla según su lateral
    step = CORNER_SIZE + (rem - 0.5) * TILE_WIDTH

    if side == 0:   # Lado Inferior (Va de Izquierda a Derecha)
        return (-H + step, -H + TILE_DEPTH/2, 0)
    elif side == 1: # Lado Derecho (Va de Abajo hacia Arriba)
        return (H - TILE_DEPTH/2, -H + step, math.pi / 2)
    elif side == 2: # Lado Superior (Va de Derecha a Izquierda)
        return (H - step, H - TILE_DEPTH/2, math.pi)
    elif side == 3: # Lado Izquierdo (Va de Arriba hacia Abajo)
        return (-H + TILE_DEPTH/2, H - step, -math.pi / 2)

# ─────────────────────────────────────────────────────────────────────────
# MARCO DE MADERA (decorativo, alrededor del anillo de casillas)
# ─────────────────────────────────────────────────────────────────────────
def build_frame(frame_mat):
    H = BOARD_SIZE / 2
    z = BOARD_Z + BOARD_THICKNESS / 2 + FRAME_HEIGHT / 2
    center = H + FRAME_WIDTH / 2          # centro de cada barra
    span = 2 * (H + FRAME_WIDTH)          # largo (cruza esquinas)

    bars = [
        ("Frame_Bottom", (span, FRAME_WIDTH, FRAME_HEIGHT), (0, -center, z)),
        ("Frame_Top",    (span, FRAME_WIDTH, FRAME_HEIGHT), (0,  center, z)),
        ("Frame_Left",   (FRAME_WIDTH, span, FRAME_HEIGHT), (-center, 0, z)),
        ("Frame_Right",  (FRAME_WIDTH, span, FRAME_HEIGHT), ( center, 0, z)),
    ]
    for name, dims, loc in bars:
        bar = add_box(name, dims, loc, frame_mat)
        bevel_mesh(bar, width=0.012, segments=2)

# ─────────────────────────────────────────────────────────────────────────
# CONSTRUCCIÓN DEL MODELO 3D
# ─────────────────────────────────────────────────────────────────────────
def add_tree(idx, x, y, scale, kind, trunk_mat, leaf_mat, base_z):
    """Arbol low-poly de distintos tipos. Devuelve la lista de mallas creadas.

    kind:
      - "pine":      pino conico clasico (1-2 copas)
      - "fir":       conifera alta en capas (3 conos apilados)
      - "round":     arbol frondoso de copa redonda (esfera)
      - "broadleaf": frondoso grande de copa multiple (3 esferas)
      - "cypress":   cipres alto y angosto (cono esbelto)
    """
    created = []
    tag = f"Central_Plaza_Tree_{idx:02d}"

    if kind == "cypress":
        trunk_depth = 0.05 * scale
        trunk = add_cylinder(
            f"{tag}_Trunk", 0.014 * scale, trunk_depth,
            (x, y, base_z + trunk_depth / 2), trunk_mat, vertices=8)
        created.append(trunk)

        body_d = 0.36 * scale
        body = add_cone(
            f"{tag}_Body", 0.065 * scale, 0.008, body_d,
            (x, y, base_z + trunk_depth + body_d / 2 - 0.005),
            leaf_mat, vertices=10)
        bevel_mesh(body, width=0.002, segments=1)
        created.append(body)
        return created

    if kind == "broadleaf":
        trunk_depth = 0.16 * scale
        trunk = add_cylinder(
            f"{tag}_Trunk", 0.024 * scale, trunk_depth,
            (x, y, base_z + trunk_depth / 2), trunk_mat, vertices=8)
        bevel_mesh(trunk, width=0.002, segments=1)
        created.append(trunk)

        # Copa irregular: 3 esferas solapadas a distintas alturas
        crown_base_z = base_z + trunk_depth + 0.055 * scale
        blobs = [
            (0.0, 0.0, 0.060 * scale, 0.120 * scale),
            (0.072 * scale, 0.030 * scale, 0.0, 0.088 * scale),
            (-0.060 * scale, -0.045 * scale, 0.012 * scale, 0.082 * scale),
        ]
        for bi, (ox, oy, oz, r) in enumerate(blobs):
            blob = add_uv_sphere(
                f"{tag}_Crown{bi}", r,
                (x + ox, y + oy, crown_base_z + oz),
                leaf_mat, segments=10, rings=6, squash=0.90)
            created.append(blob)
        return created

    if kind == "round":
        trunk_depth = 0.14 * scale
        trunk = add_cylinder(
            f"{tag}_Trunk", 0.022 * scale, trunk_depth,
            (x, y, base_z + trunk_depth / 2), trunk_mat, vertices=8)
        bevel_mesh(trunk, width=0.002, segments=1)
        created.append(trunk)

        crown_r = 0.15 * scale
        crown = add_uv_sphere(
            f"{tag}_Crown", crown_r,
            (x, y, base_z + trunk_depth + crown_r * 0.78),
            leaf_mat, segments=10, rings=6, squash=0.88)
        created.append(crown)
        return created

    if kind == "fir":
        trunk_depth = 0.10 * scale
        trunk = add_cylinder(
            f"{tag}_Trunk", 0.018 * scale, trunk_depth,
            (x, y, base_z + trunk_depth / 2), trunk_mat, vertices=8)
        bevel_mesh(trunk, width=0.002, segments=1)
        created.append(trunk)

        # 3 conos apilados, cada uno mas chico y angosto
        layer_r = 0.14 * scale
        layer_d = 0.16 * scale
        z = base_z + trunk_depth
        for layer in range(3):
            r = layer_r * (1.0 - layer * 0.26)
            d = layer_d * (1.0 - layer * 0.12)
            cone = add_cone(
                f"{tag}_Layer{layer}", r, 0.012, d,
                (x, y, z + d / 2), leaf_mat, vertices=12)
            bevel_mesh(cone, width=0.003, segments=1)
            created.append(cone)
            z += d * 0.62
        return created

    # kind == "pine" (por defecto)
    trunk_depth = 0.11 * scale
    crown_depth = 0.22 * scale
    crown_radius = 0.13 * scale

    trunk = add_cylinder(
        f"{tag}_Trunk", 0.020 * scale, trunk_depth,
        (x, y, base_z + trunk_depth / 2), trunk_mat, vertices=8)
    bevel_mesh(trunk, width=0.002, segments=1)
    created.append(trunk)

    crown = add_cone(
        f"{tag}_Crown", crown_radius, 0.02, crown_depth,
        (x, y, base_z + trunk_depth + crown_depth / 2 - 0.01),
        leaf_mat, vertices=12)
    bevel_mesh(crown, width=0.003, segments=1)
    created.append(crown)

    if scale > 1.05:  # copa extra: mas frondoso en los grandes
        crown2_depth = crown_depth * 0.6
        crown2 = add_cone(
            f"{tag}_Crown2", crown_radius * 0.66, 0.015, crown2_depth,
            (x, y, base_z + trunk_depth + crown_depth * 0.72 + crown2_depth / 2),
            leaf_mat, vertices=10)
        bevel_mesh(crown2, width=0.003, segments=1)
        created.append(crown2)

    return created


def add_bench(idx, x, y, rot, wood_mat, leg_mat, base_z):
    """Banco de plaza low-poly. Con rot=0 el respaldo queda hacia +Y local."""
    parts_def = [
        ("Seat", (0.150, 0.048, 0.014), (0.0, 0.0, 0.052), wood_mat),
        ("Back", (0.150, 0.012, 0.048), (0.0, 0.022, 0.092), wood_mat),
        ("LegL", (0.012, 0.042, 0.045), (-0.060, 0.0, 0.0225), leg_mat),
        ("LegR", (0.012, 0.042, 0.045), (0.060, 0.0, 0.0225), leg_mat),
    ]
    cos_r, sin_r = math.cos(rot), math.sin(rot)
    created = []
    for pname, dims, (ox, oy, oz), mat in parts_def:
        wx = x + ox * cos_r - oy * sin_r
        wy = y + ox * sin_r + oy * cos_r
        part = add_box(f"Central_Plaza_Bench{idx}_{pname}", dims, (wx, wy, base_z + oz), mat)
        part.rotation_euler = (0, 0, rot)
        created.append(part)
    return created

def add_lamp(idx, x, y, metal_mat, light_mat, base_z):
    """Farola de parque: poste + globo de luz calida + remate."""
    post_h = 0.22
    post = add_cylinder(
        f"Central_Plaza_Lamp{idx}_Post", 0.008, post_h,
        (x, y, base_z + post_h / 2), metal_mat, vertices=8)
    head = add_uv_sphere(
        f"Central_Plaza_Lamp{idx}_Light", 0.024,
        (x, y, base_z + post_h + 0.018), light_mat, segments=10, rings=6)
    cap = add_cone(
        f"Central_Plaza_Lamp{idx}_Cap", 0.030, 0.006, 0.025,
        (x, y, base_z + post_h + 0.048), metal_mat, vertices=10)
    return [post, head, cap]

def join_objects(objs, name):
    """Une una lista de mallas en un solo objeto (reduce draw calls)."""
    if not objs:
        return None
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objs:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = name
    return joined

def build_center_plaza(mats):
    """Parque central frondoso (referencia: imageToia/game.png): bosque denso y
    variado, claro central de piedra con fuente ornamental de dos niveles,
    caminos con bordillo, seto perimetral, bancos, farolas, rocas, arbustos
    y macizos de flores.

    NOTA: todo el contenido queda dentro de +-HEDGE_LIMIT para NO solaparse con
    las casas/hoteles que se colocan sobre el anillo de casillas (borde interior).
    """
    rng = random.Random(2024)
    board_top_z = BOARD_Z + BOARD_THICKNESS / 2
    inner_half = BOARD_SIZE / 2 - TILE_DEPTH - 0.08
    inner_span = inner_half * 2

    grass_height = 0.012

    # Cesped base que cubre toda el area interior
    grass = add_box(
        "Central_Plaza_Garden",
        (inner_span, inner_span, grass_height),
        (0, 0, board_top_z + grass_height / 2),
        mats["grass"])
    bevel_mesh(grass, width=0.01, segments=2)
    grass_top = board_top_z + grass_height

    HEDGE_LIMIT = 1.52             # seto perimetral (dentro del margen vs casas)
    TREE_LIMIT = 1.42              # arbolado, un paso por dentro del seto
    clearing_radius = 0.82

    furniture = []   # caminos, seto, bancos, farolas -> 1 solo objeto
    deco = []        # rocas, arbustos, flores -> 1 solo objeto

    # ── Caminos de piedra N/S/E/O con bordillo oscuro ──
    path_w = 0.30
    edge_w = 0.04
    path_h = 0.008
    path_start = clearing_radius - 0.12     # se mete bajo el claro central
    path_len = HEDGE_LIMIT - path_start
    path_center = path_start + path_len / 2
    for axis in ("N", "S", "E", "W"):
        sign = 1 if axis in ("N", "E") else -1
        vertical = axis in ("N", "S")
        if vertical:
            dims = (path_w, path_len, path_h)
            loc = (0, sign * path_center, grass_top + path_h / 2)
            edge_dims = (edge_w, path_len, path_h * 1.3)
        else:
            dims = (path_len, path_w, path_h)
            loc = (sign * path_center, 0, grass_top + path_h / 2)
            edge_dims = (path_len, edge_w, path_h * 1.3)
        furniture.append(add_box(f"Central_Plaza_Path_{axis}", dims, loc, mats["path"]))
        off = path_w / 2 + edge_w / 2
        for eside in (-1, 1):
            if vertical:
                eloc = (eside * off, sign * path_center, grass_top + path_h * 0.65)
            else:
                eloc = (sign * path_center, eside * off, grass_top + path_h * 0.65)
            furniture.append(add_box(
                f"Central_Plaza_PathEdge_{axis}{'L' if eside < 0 else 'R'}",
                edge_dims, eloc, mats["edge"]))

    # ── Claro central de piedra con anillo de borde ──
    clearing_h = 0.010
    add_cylinder(
        "Central_Plaza_ClearingRing",
        clearing_radius + 0.05, clearing_h * 0.8,
        (0, 0, grass_top + clearing_h * 0.4),
        mats["edge"], vertices=48)
    clearing = add_cylinder(
        "Central_Plaza_Clearing",
        clearing_radius, clearing_h,
        (0, 0, grass_top + clearing_h / 2 + 0.001),
        mats["stone"], vertices=48)
    bevel_mesh(clearing, width=0.005, segments=2)
    clearing_top = grass_top + clearing_h + 0.001

    # ── Fuente ornamental de dos niveles en piedra blanca ──
    rim_h = 0.045
    rim = add_cylinder(
        "Central_Plaza_FountainRim", 0.46, rim_h,
        (0, 0, clearing_top + rim_h / 2), mats["monument"], vertices=36)
    bevel_mesh(rim, width=0.006, segments=2)
    add_cylinder(
        "Central_Plaza_FountainWater", 0.41, 0.012,
        (0, 0, clearing_top + rim_h - 0.010), mats["water"], vertices=36)

    col_h = 0.14
    add_cone(
        "Central_Plaza_FountainColumn", 0.062, 0.040, col_h,
        (0, 0, clearing_top + col_h / 2), mats["monument"], vertices=18)
    bowl_h = 0.025
    bowl_z = clearing_top + col_h
    bowl = add_cylinder(
        "Central_Plaza_FountainBowl", 0.165, bowl_h,
        (0, 0, bowl_z + bowl_h / 2), mats["monument"], vertices=24)
    bevel_mesh(bowl, width=0.004, segments=1)
    add_cylinder(
        "Central_Plaza_FountainBowlWater", 0.135, 0.008,
        (0, 0, bowl_z + bowl_h + 0.002), mats["water"], vertices=24)
    top_h = 0.07
    add_cone(
        "Central_Plaza_FountainTop", 0.026, 0.012, top_h,
        (0, 0, bowl_z + bowl_h + top_h / 2), mats["monument"], vertices=12)
    add_uv_sphere(
        "Central_Plaza_FountainJet", 0.020,
        (0, 0, bowl_z + bowl_h + top_h + 0.012), mats["water"], segments=10, rings=6)

    # ── Bancos en las diagonales del claro, mirando a la fuente ──
    for bi, ang in enumerate([45, 135, 225, 315]):
        rad = math.radians(ang)
        bx = math.cos(rad) * 0.62
        by = math.sin(rad) * 0.62
        rot = rad - math.pi / 2   # respaldo hacia afuera
        furniture.extend(add_bench(bi, bx, by, rot, mats["bench"], mats["lamp_metal"], clearing_top))

    # ── Farolas sobre el cesped, junto al borde del claro ──
    for li, ang in enumerate([45, 135, 225, 315]):
        rad = math.radians(ang)
        lx = math.cos(rad) * (clearing_radius + 0.13)
        ly = math.sin(rad) * (clearing_radius + 0.13)
        furniture.extend(add_lamp(li, lx, ly, mats["lamp_metal"], mats["lamp_light"], grass_top))

    # ── Seto perimetral bajo, con huecos en las entradas de los caminos ──
    hedge_h = 0.075
    hedge_w = 0.07
    gap = 0.26
    seg_len = HEDGE_LIMIT - gap
    seg_center = gap + seg_len / 2
    hz = grass_top + hedge_h / 2
    for s in (-1, 1):
        for t in (-1, 1):
            furniture.append(add_box(
                f"Central_Plaza_Hedge_H_{s}_{t}",
                (seg_len, hedge_w, hedge_h),
                (t * seg_center, s * HEDGE_LIMIT, hz), mats["hedge"]))
            furniture.append(add_box(
                f"Central_Plaza_Hedge_V_{s}_{t}",
                (hedge_w, seg_len, hedge_h),
                (s * HEDGE_LIMIT, t * seg_center, hz), mats["hedge"]))

    # ── Bosque denso y organico alrededor del claro ──
    clearing_clear = clearing_radius + 0.20
    path_clear = path_w / 2 + edge_w + 0.10   # margen lateral de los caminos
    step = 0.30

    tree_objs = []
    idx = 1
    y = -TREE_LIMIT
    while y <= TREE_LIMIT + 1e-6:
        x = -TREE_LIMIT
        while x <= TREE_LIMIT + 1e-6:
            jx = x + rng.uniform(-0.11, 0.11)
            jy = y + rng.uniform(-0.11, 0.11)
            if math.hypot(jx, jy) < clearing_clear:
                x += step
                continue
            if abs(jx) < path_clear or abs(jy) < path_clear:
                x += step
                continue
            if max(abs(jx), abs(jy)) > TREE_LIMIT:
                x += step
                continue
            if rng.random() < 0.16:   # huecos para romper la grilla
                x += step
                continue
            scale = rng.uniform(0.65, 1.50)
            kind = rng.choices(
                ["pine", "fir", "round", "broadleaf", "cypress"],
                weights=[0.26, 0.22, 0.20, 0.18, 0.14])[0]
            leaf_mat = rng.choice(mats["leaves"])
            tree_objs.extend(
                add_tree(idx, jx, jy, scale, kind, mats["trunk"], leaf_mat, grass_top))
            idx += 1
            x += step
        y += step

    # ── Arbustos bajos entre los arboles ──
    for bi in range(20):
        for _try in range(24):
            bx = rng.uniform(-TREE_LIMIT, TREE_LIMIT)
            by = rng.uniform(-TREE_LIMIT, TREE_LIMIT)
            if math.hypot(bx, by) < clearing_clear - 0.06:
                continue
            if abs(bx) < path_clear - 0.06 or abs(by) < path_clear - 0.06:
                continue
            r = rng.uniform(0.050, 0.095)
            deco.append(add_uv_sphere(
                f"Central_Plaza_Bush_{bi:02d}", r,
                (bx, by, grass_top + r * 0.45),
                rng.choice(mats["leaves"]), segments=10, rings=6, squash=0.62))
            break

    # ── Rocas grises dispersas ──
    for ri in range(14):
        for _try in range(24):
            rx = rng.uniform(-TREE_LIMIT, TREE_LIMIT)
            ry = rng.uniform(-TREE_LIMIT, TREE_LIMIT)
            if math.hypot(rx, ry) < clearing_clear - 0.10:
                continue
            s = rng.uniform(0.030, 0.070)
            bpy.ops.mesh.primitive_ico_sphere_add(
                subdivisions=1, radius=s, location=(rx, ry, grass_top + s * 0.32))
            rock = bpy.context.active_object
            rock.name = f"Central_Plaza_Rock_{ri:02d}"
            rock.scale = (1.0, rng.uniform(0.70, 1.25), rng.uniform(0.42, 0.60))
            rock.rotation_euler = (0, 0, rng.uniform(0, math.tau))
            rock.data.materials.append(mats["rock"])
            deco.append(rock)
            break

    # ── Macizos de flores: anillo alrededor del claro + dispersos ──
    flower_spots = []
    for ang in range(0, 360, 45):
        rad = math.radians(ang + 22.5)
        flower_spots.append((
            math.cos(rad) * (clearing_radius + 0.10),
            math.sin(rad) * (clearing_radius + 0.10)))
    for _fi in range(22):
        for _try in range(24):
            fx = rng.uniform(-TREE_LIMIT, TREE_LIMIT)
            fy = rng.uniform(-TREE_LIMIT, TREE_LIMIT)
            if math.hypot(fx, fy) < clearing_radius + 0.06:
                continue
            if abs(fx) < path_w / 2 + 0.04 or abs(fy) < path_w / 2 + 0.04:
                continue
            flower_spots.append((fx, fy))
            break
    for fi, (fx, fy) in enumerate(flower_spots):
        fmat = rng.choice(mats["flowers"])
        for petal in range(rng.randint(3, 5)):
            px = fx + rng.uniform(-0.045, 0.045)
            py = fy + rng.uniform(-0.045, 0.045)
            deco.append(add_uv_sphere(
                f"Central_Plaza_Flower_{fi:02d}_{petal}", 0.013,
                (px, py, grass_top + 0.012), fmat, segments=8, rings=5))

    # Unir por grupos: reduce draw calls a 1 por material sin cambiar como se ve
    join_objects(tree_objs, "Central_Plaza_Trees")
    join_objects(deco, "Central_Plaza_Deco")
    join_objects(furniture, "Central_Plaza_Props")

def build_gamepoly():
    safe_clear_scene()

    # Inicializar materiales bases
    wood_mat = get_or_create_material("WoodTable", TILE_COLORS["wood"], roughness=0.55)
    frame_mat = get_or_create_material("WoodFrame", TILE_COLORS["frame"], roughness=0.4)
    center_mat = get_or_create_material("BoardCenter", TILE_COLORS["board_center"], roughness=0.6)
    plaza_mats = {
        "grass": get_or_create_material("PlazaGrass", TILE_COLORS["plaza_grass"], roughness=0.55),
        "stone": get_or_create_material("PlazaTile", TILE_COLORS["plaza_tile"], roughness=0.42),
        "path": get_or_create_material("PlazaPath", TILE_COLORS["plaza_path"], roughness=0.5),
        "edge": get_or_create_material("PlazaEdge", TILE_COLORS["plaza_edge"], roughness=0.5),
        "water": get_or_create_material("PlazaWater", TILE_COLORS["plaza_water"], roughness=0.12),
        "trunk": get_or_create_material("TreeTrunk", TILE_COLORS["tree_trunk"], roughness=0.55),
        "leaves": [
            get_or_create_material("TreeLeaf", TILE_COLORS["tree_leaf"], roughness=0.5),
            get_or_create_material("TreeLeaf2", TILE_COLORS["tree_leaf2"], roughness=0.5),
            get_or_create_material("TreeLeaf3", TILE_COLORS["tree_leaf3"], roughness=0.5),
            get_or_create_material("TreeLeaf4", TILE_COLORS["tree_leaf4"], roughness=0.5),
            get_or_create_material("TreeLeaf5", TILE_COLORS["tree_leaf5"], roughness=0.5),
        ],
        "rock": get_or_create_material("PlazaRock", TILE_COLORS["rock"], roughness=0.62),
        "hedge": get_or_create_material("PlazaHedge", TILE_COLORS["hedge"], roughness=0.55),
        "flowers": [
            get_or_create_material("PlazaFlowerRed", TILE_COLORS["flower_red"], roughness=0.35),
            get_or_create_material("PlazaFlowerYellow", TILE_COLORS["flower_yellow"], roughness=0.35),
            get_or_create_material("PlazaFlowerWhite", TILE_COLORS["flower_white"], roughness=0.35),
        ],
        "bench": get_or_create_material("PlazaBench", TILE_COLORS["bench_wood"], roughness=0.5),
        "lamp_metal": get_or_create_material("PlazaLampMetal", TILE_COLORS["lamp_metal"], roughness=0.3),
        "lamp_light": get_or_create_material("PlazaLampLight", TILE_COLORS["lamp_light"], roughness=0.2, emission=2.0),
        "monument": get_or_create_material("PlazaMonument", TILE_COLORS["monument"], roughness=0.3),
    }
    white_tile_mat = get_or_create_material("TileWhite", TILE_COLORS["white"], roughness=0.45)
    text_mat = get_or_create_material("TileText", (0.06, 0.06, 0.06, 1), roughness=0.3)
    text_mat_white = get_or_create_material("TileTextWhite", (0.95, 0.95, 0.92, 1), roughness=0.3)
    icon_mats = {
        "community_dark": get_or_create_material("IconCommunityChestDark", (0.420, 0.225, 0.105, 1), roughness=0.32),
        "community_light": get_or_create_material("IconCommunityChestLight", (0.710, 0.435, 0.185, 1), roughness=0.24),
        "rail": get_or_create_material("IconRailroad", (0.055, 0.055, 0.055, 1), roughness=0.26),
        "dark": get_or_create_material("IconDark", (0.025, 0.025, 0.025, 1), roughness=0.35),
        "metal": get_or_create_material("IconMetal", (0.780, 0.700, 0.500, 1), roughness=0.18),
        "gold": get_or_create_material("IconGold", (1.000, 0.760, 0.120, 1), roughness=0.14),
        "diamond": get_or_create_material("IconDiamond", (0.500, 0.900, 1.000, 1), roughness=0.08),
        "chance": get_or_create_material("IconChance", TILE_COLORS["chance"], roughness=0.12),
        "water": get_or_create_material("IconWater", (0.100, 0.490, 0.980, 1), roughness=0.08),
    }

    # 1. Mesa base del juego
    table = add_box("Table_Base", (TABLE_WIDTH, TABLE_DEPTH, TABLE_TOP_Z),
                    (0, 0, TABLE_TOP_Z / 2), wood_mat)
    bevel_mesh(table, width=0.02, segments=3)

    # 2. Centro del Tablero (Área de rodado de dados)
    board = add_box("Board_Center", (BOARD_SIZE, BOARD_SIZE, BOARD_THICKNESS),
                    (0, 0, BOARD_Z), center_mat)
    bevel_mesh(board, width=0.008, segments=2)

    # 2b. Parque central frondoso (queda dentro del anillo de casillas)
    build_center_plaza(plaza_mats)

    # 3. Marco de madera
    build_frame(frame_mat)

    # 4. Generación y ensamble de Casillas
    for i in range(40):
        group = TILE_GROUPS[i]
        x, y, rot = get_tile_transform(i)
        z_pos = BOARD_Z + BOARD_THICKNESS/2 + TILE_HEIGHT/2

        is_corner = i in [0, 10, 20, 30]

        # Contenedor padre de la casilla
        tile_container = bpy.data.objects.new(f"Tile_{i:02d}_Container", None)
        tile_container.location = (x, y, z_pos)
        tile_container.rotation_euler = (0, 0, rot)
        bpy.context.scene.collection.objects.link(tile_container)

        if is_corner:
            # Bloque de Esquina (color propio del grupo)
            corner_mat = get_or_create_material(
                f"Mat_{group}", TILE_COLORS.get(group, TILE_COLORS["white"]), roughness=0.35)
            c_mesh = add_box(f"Tile_{i:02d}_CornerMesh",
                             (CORNER_SIZE, CORNER_SIZE, TILE_HEIGHT), (0, 0, 0), corner_mat)
            bevel_mesh(c_mesh, width=0.006, segments=2)
            c_mesh.parent = tile_container
            c_mesh.location = (0, 0, 0)
        else:
            has_band = group in ["brown", "lightBlue", "pink", "orange", "red", "yellow", "green", "darkBlue"]

            if has_band:
                # Banda de color SOLIDA: ocupa toda la franja superior,
                # sin dejar blanco visible debajo ni en los bordes laterales.
                band_mat = get_or_create_material(f"Mat_{group}", TILE_COLORS[group], roughness=0.15)
                band_mesh = add_box(
                    f"Tile_{i:02d}_ColorBand",
                    (TILE_WIDTH * 0.94, BAND_DEPTH, TILE_HEIGHT * 1.1),
                    (0, (TILE_DEPTH / 2) - (BAND_DEPTH / 2), TILE_HEIGHT * 0.05),
                    band_mat)
                bevel_mesh(band_mesh, width=0.003, segments=2)
                band_mesh.parent = tile_container
                band_mesh.location = (0, (TILE_DEPTH / 2) - (BAND_DEPTH / 2), TILE_HEIGHT * 0.05)

                # Base blanca solo en la parte inferior (debajo de la banda)
                base_depth = TILE_DEPTH - BAND_DEPTH
                base_mesh = add_box(f"Tile_{i:02d}_Base",
                                    (TILE_WIDTH * 0.94, base_depth, TILE_HEIGHT),
                                    (0, -(TILE_DEPTH / 2) + (base_depth / 2), 0), white_tile_mat)
                bevel_mesh(base_mesh, width=0.004, segments=2)
                base_mesh.parent = tile_container
                base_mesh.location = (0, -(TILE_DEPTH / 2) + (base_depth / 2), 0)
            else:
                # Base blanca completa para casillas especiales
                base_mesh = add_box(f"Tile_{i:02d}_Base",
                                    (TILE_WIDTH * 0.94, TILE_DEPTH, TILE_HEIGHT),
                                    (0, 0, 0), white_tile_mat)
                bevel_mesh(base_mesh, width=0.004, segments=2)
                base_mesh.parent = tile_container
                base_mesh.location = (0, 0, 0)

                # Bloque central indicador para casillas especiales (Suerte, Trenes, Impuestos)
                spec_mat = get_or_create_material(
                    f"Mat_{group}", TILE_COLORS.get(group, TILE_COLORS["white"]), roughness=0.2)
                spec_mesh = add_box(
                    f"Tile_{i:02d}_SpecialCenter",
                    (TILE_WIDTH * 0.5, TILE_DEPTH * 0.35, TILE_HEIGHT * 1.1),
                    (0, -0.05, TILE_HEIGHT * 0.05),
                    spec_mat)
                bevel_mesh(spec_mesh, width=0.004, segments=2)
                spec_mesh.parent = tile_container
                spec_mesh.location = (0, -0.05, TILE_HEIGHT * 0.05)

        # ── Etiquetas 3D (nombre + precio) sobre la casilla ──
        info = TILE_INFO[i]
        z_text = TILE_HEIGHT / 2 + 0.004
        is_band = group in ["brown", "lightBlue", "pink", "orange", "red", "yellow", "green", "darkBlue"]
        is_spec = not is_corner and not is_band

        # Color del texto: blanco sobre banda de color / esquinas, oscuro sobre base blanca
        # Determine if the band color is dark enough to need white text
        band_rgba = TILE_COLORS.get(group, TILE_COLORS["white"])
        band_luminance = 0.299 * band_rgba[0] + 0.587 * band_rgba[1] + 0.114 * band_rgba[2]
        text_on_band = text_mat_white if band_luminance < 0.5 else text_mat
        text_on_white = text_mat

        if is_corner:
            add_text_line(
                f"Tile_{i:02d}_Lbl", info["short"],
                (0, 0, z_text), 0.055, text_on_band, extrude=0.003,
                parent=tile_container)
        elif is_band:
            # Nombre del property: va en la banda de color (texto blanco o claro)
            name_y = (TILE_DEPTH / 2) - BAND_DEPTH + (BAND_DEPTH * 0.28)
            add_text_line(
                f"Tile_{i:02d}_Name", info["short"],
                (0, name_y, z_text), 0.038, text_on_band, extrude=0.002,
                parent=tile_container)
            # Precio: margen consistente desde el bottom
            if "price" in info:
                price_y = -TILE_DEPTH / 2 + PRICE_BOTTOM_MARGIN
                add_text_line(
                    f"Tile_{i:02d}_Price", f"${info['price']}",
                    (0, price_y, z_text), 0.032, text_on_white, extrude=0.002,
                    parent=tile_container)
        elif is_spec:
            # Casillas especiales: texto siempre oscuro (estaciones, lujos, impuestos)
            spec_top_y_new = (-0.05 + (TILE_DEPTH * 0.35) / 2) + 0.032
            icon_type = special_icon_type(group, info["short"])
            if icon_type:
                add_special_tile_icon(i, icon_type, tile_container, icon_mats)

            add_text_line(
                f"Tile_{i:02d}_Lbl", info["short"],
                (0, spec_top_y_new, z_text), 0.038, text_on_white, extrude=0.002,
                parent=tile_container)
            if "price" in info:
                price_y = -TILE_DEPTH / 2 + PRICE_BOTTOM_MARGIN
                add_text_line(
                    f"Tile_{i:02d}_Price", f"${info['price']}",
                    (0, price_y, z_text), 0.032, text_on_white, extrude=0.002,
                    parent=tile_container)
        else:
            # Casillas sin banda ni bloque especial (no debería llegar aquí)
            add_text_line(
                f"Tile_{i:02d}_Lbl", info["short"],
                (0, 0.04, z_text), 0.042, text_on_white, extrude=0.002,
                parent=tile_container)

    # Activar sombreado de materiales en el viewport dinámicamente
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    space.shading.type = 'MATERIAL'

    export_glb()

# ─────────────────────────────────────────────────────────────────────────
# EXPORT AUTOMÁTICO A public/models/tablero.glb
# ─────────────────────────────────────────────────────────────────────────
def export_glb():
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        out_dir = os.path.normpath(os.path.join(base_dir, "..", "public", "models"))
        out_path = os.path.join(out_dir, "tablero.glb")
        bpy.ops.export_scene.gltf(
            filepath=out_path, export_format='GLB', use_selection=False)
        print(f"[OK] Tablero exportado a: {out_path}")
    except Exception as e:
        print(f"[!] No se pudo exportar automaticamente ({e}). "
              f"Exporta manualmente como public/models/tablero.glb")

if __name__ == "__main__":
    build_gamepoly()
