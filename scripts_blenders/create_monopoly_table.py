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
    "plaza_tile":   (0.820, 0.790, 0.700, 1),    # Claro central de piedra clara
    "plaza_edge":   (0.560, 0.500, 0.430, 1),    # Bordes de plaza/caminos
    "plaza_water":  (0.360, 0.620, 0.800, 1),    # Estanque central
    "tree_trunk":   (0.420, 0.240, 0.110, 1),
    "tree_leaf":    (0.130, 0.480, 0.220, 1),    # Verde medio
    "tree_leaf2":   (0.090, 0.360, 0.180, 1),    # Verde oscuro
    "tree_leaf3":   (0.240, 0.600, 0.300, 1),    # Verde claro
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
    {"short": "Salida"},                               # 0  go
    {"short": "Ronda de Arrieta", "price": 60},        # 1  brown
    {"short": "Arca Comunal"},                         # 2  community
    {"short": "Plaza de Lavapies", "price": 60},       # 3  brown
    {"short": "Impuesto"},                             # 4  tax
    {"short": "Estacion Norte", "price": 200},         # 5  railroad
    {"short": "La Montera", "price": 100},             # 6  lightBlue
    {"short": "Suerte"},                               # 7  chance
    {"short": "Calle de Alcala", "price": 100},        # 8  lightBlue
    {"short": "Gran Via", "price": 120},               # 9  lightBlue
    {"short": "Carcel"},                               # 10  jail
    {"short": "Paseo del Prado", "price": 140},        # 11  pink
    {"short": "Electrica", "price": 150},              # 12  utility
    {"short": "Calle de Serrano", "price": 140},       # 13  pink
    {"short": "Paseo de Recoletos", "price": 160},     # 14  pink
    {"short": "Estacion Este", "price": 200},          # 15  railroad
    {"short": "Calle de Goya", "price": 180},          # 16  orange
    {"short": "Arca Comunal"},                         # 17  community
    {"short": "Calle de Velazquez", "price": 180},     # 18  orange
    {"short": "Castellana", "price": 200},             # 19  orange
    {"short": "Parking"},                              # 20  parking
    {"short": "Plaza de Espana", "price": 220},        # 21  red
    {"short": "Suerte"},                               # 22  chance
    {"short": "Fuencarral", "price": 220},             # 23  red
    {"short": "Reforma", "price": 240},                # 24  red
    {"short": "Estacion Sur", "price": 200},           # 25  railroad
    {"short": "America", "price": 260},                # 26  yellow
    {"short": "Bravo Murillo", "price": 260},          # 27  yellow
    {"short": "Agua", "price": 150},                   # 28  utility
    {"short": "Alberto Aguilera", "price": 280},       # 29  yellow
    {"short": "Ve Carcel"},                            # 30  gotojail
    {"short": "Paseo de Gracia", "price": 300},        # 31  green
    {"short": "Rambla de Cataluna", "price": 300},     # 32  green
    {"short": "Arca Comunal"},                         # 33  community
    {"short": "Avenida Diagonal", "price": 320},       # 34  green
    {"short": "Estacion Oeste", "price": 200},         # 35  railroad
    {"short": "Suerte"},                               # 36  chance
    {"short": "La Habana", "price": 350},              # 37  darkBlue
    {"short": "Lujo"},                                 # 38  tax
    {"short": "Paseo del Arte", "price": 400},         # 39  darkBlue
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

def get_or_create_material(name, rgba, roughness=0.05):
    """Genera acabados de alta saturación y reflejo plástico premium"""
    if name in bpy.data.materials:
        mat = bpy.data.materials[name]
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = rgba
            bsdf.inputs["Roughness"].default_value = roughness
        return mat

    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Roughness"].default_value = roughness
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
    """
    created = []
    tag = f"Central_Plaza_Tree_{idx:02d}"

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


def build_center_plaza(grass_mat, plaza_mat, water_mat, trunk_mat, leaf_mats):
    """Parque central frondoso: claro de piedra + estanque, rodeado de bosque denso.

    NOTA: el arbolado se mantiene dentro de +-TREE_LIMIT para NO solaparse con las
    casas/hoteles que se colocan sobre el anillo de casillas (borde interior).
    """
    board_top_z = BOARD_Z + BOARD_THICKNESS / 2
    inner_half = BOARD_SIZE / 2 - TILE_DEPTH - 0.08
    inner_span = inner_half * 2

    grass_height = 0.012

    # Cesped base que cubre toda el area interior
    grass = add_box(
        "Central_Plaza_Garden",
        (inner_span, inner_span, grass_height),
        (0, 0, board_top_z + grass_height / 2),
        grass_mat)
    bevel_mesh(grass, width=0.01, segments=2)
    grass_top = board_top_z + grass_height

    # Claro central de piedra clara (zona despejada del parque)
    clearing_radius = 0.82
    clearing_h = 0.010
    clearing = add_cylinder(
        "Central_Plaza_Clearing",
        clearing_radius, clearing_h,
        (0, 0, grass_top + clearing_h / 2),
        plaza_mat, vertices=40)
    bevel_mesh(clearing, width=0.006, segments=2)
    clearing_top = grass_top + clearing_h

    # Estanque de agua en el centro del claro
    pond_h = 0.008
    add_cylinder(
        "Central_Plaza_Pond",
        0.40, pond_h,
        (0, 0, clearing_top + pond_h / 2),
        water_mat, vertices=40)

    # Pequena fuente al centro del estanque
    fountain_h = 0.10
    fountain = add_cylinder(
        "Central_Plaza_Fountain",
        0.06, fountain_h,
        (0, 0, clearing_top + fountain_h / 2),
        plaza_mat, vertices=16)
    bevel_mesh(fountain, width=0.005, segments=2)

    # ── Bosque denso y organico alrededor del claro ──
    TREE_LIMIT = 1.55              # margen de seguridad frente a casas/hoteles
    clearing_clear = clearing_radius + 0.22
    step = 0.30
    rng = random.Random(2024)

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
            if max(abs(jx), abs(jy)) > TREE_LIMIT:
                x += step
                continue
            if rng.random() < 0.22:   # huecos para romper la grilla
                x += step
                continue
            scale = rng.uniform(0.7, 1.45)
            kind = rng.choices(
                ["pine", "fir", "round"], weights=[0.42, 0.30, 0.28])[0]
            leaf_mat = rng.choice(leaf_mats)
            tree_objs.extend(
                add_tree(idx, jx, jy, scale, kind, trunk_mat, leaf_mat, grass_top))
            idx += 1
            x += step
        y += step

    # Unir todos los arboles en un solo objeto: reduce draw calls a 1 por material
    # (todo el bosque comparte tronco + hoja) sin cambiar como se ve.
    if tree_objs:
        bpy.ops.object.select_all(action='DESELECT')
        for obj in tree_objs:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = tree_objs[0]
        bpy.ops.object.join()
        bpy.context.active_object.name = "Central_Plaza_Trees"

def build_gamepoly():
    safe_clear_scene()

    # Inicializar materiales bases
    wood_mat = get_or_create_material("WoodTable", TILE_COLORS["wood"], roughness=0.55)
    frame_mat = get_or_create_material("WoodFrame", TILE_COLORS["frame"], roughness=0.4)
    center_mat = get_or_create_material("BoardCenter", TILE_COLORS["board_center"], roughness=0.6)
    plaza_grass_mat = get_or_create_material("PlazaGrass", TILE_COLORS["plaza_grass"], roughness=0.55)
    plaza_tile_mat = get_or_create_material("PlazaTile", TILE_COLORS["plaza_tile"], roughness=0.42)
    plaza_water_mat = get_or_create_material("PlazaWater", TILE_COLORS["plaza_water"], roughness=0.12)
    tree_trunk_mat = get_or_create_material("TreeTrunk", TILE_COLORS["tree_trunk"], roughness=0.55)
    tree_leaf_mats = [
        get_or_create_material("TreeLeaf", TILE_COLORS["tree_leaf"], roughness=0.5),
        get_or_create_material("TreeLeaf2", TILE_COLORS["tree_leaf2"], roughness=0.5),
        get_or_create_material("TreeLeaf3", TILE_COLORS["tree_leaf3"], roughness=0.5),
    ]
    white_tile_mat = get_or_create_material("TileWhite", TILE_COLORS["white"], roughness=0.45)
    text_mat = get_or_create_material("TileText", (0.06, 0.06, 0.06, 1), roughness=0.3)
    text_mat_white = get_or_create_material("TileTextWhite", (0.95, 0.95, 0.92, 1), roughness=0.3)

    # 1. Mesa base del juego
    table = add_box("Table_Base", (TABLE_WIDTH, TABLE_DEPTH, TABLE_TOP_Z),
                    (0, 0, TABLE_TOP_Z / 2), wood_mat)
    bevel_mesh(table, width=0.02, segments=3)

    # 2. Centro del Tablero (Área de rodado de dados)
    board = add_box("Board_Center", (BOARD_SIZE, BOARD_SIZE, BOARD_THICKNESS),
                    (0, 0, BOARD_Z), center_mat)
    bevel_mesh(board, width=0.008, segments=2)

    # 2b. Parque central frondoso (queda dentro del anillo de casillas)
    build_center_plaza(
        plaza_grass_mat,
        plaza_tile_mat,
        plaza_water_mat,
        tree_trunk_mat,
        tree_leaf_mats)

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
