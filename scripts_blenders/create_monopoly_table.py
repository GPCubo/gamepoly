import bpy
import math
import os

# ─────────────────────────────────────────────────────────────────────────
# CONFIGURACIÓN GENERAL (Escala física optimizada)
#   IMPORTANTE: NO cambiar dimensiones ni get_tile_transform(). De ahí salen
#   las posiciones que usan las etiquetas del tablero (useBoardGeometry.ts).
# ─────────────────────────────────────────────────────────────────────────
TABLE_WIDTH       = 6.0
TABLE_DEPTH       = 6.0
TABLE_TOP_Z       = 0.75
TABLE_THICKNESS   = 0.08

BOARD_SIZE        = 4.5
BOARD_Z           = TABLE_TOP_Z + 0.01
BOARD_THICKNESS   = 0.04

TILE_HEIGHT       = 0.02
CORNER_SIZE       = 0.45
TILE_WIDTH        = (BOARD_SIZE - (CORNER_SIZE * 2)) / 9
TILE_DEPTH        = 0.45
BAND_DEPTH        = 0.10
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
    "center_panel": (0.870, 0.895, 0.850, 1),    # Area central de dados
}

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
def build_gamepoly():
    safe_clear_scene()

    # Inicializar materiales bases
    wood_mat = get_or_create_material("WoodTable", TILE_COLORS["wood"], roughness=0.55)
    frame_mat = get_or_create_material("WoodFrame", TILE_COLORS["frame"], roughness=0.4)
    center_mat = get_or_create_material("BoardCenter", TILE_COLORS["board_center"], roughness=0.6)
    panel_mat = get_or_create_material("CenterPanel", TILE_COLORS["center_panel"], roughness=0.55)
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

    # 2b. Panel central sutil (queda dentro del anillo de casillas: ±1.7 < ±1.8)
    inner = BOARD_SIZE / 2 - TILE_DEPTH - 0.1
    panel = add_box("Center_Panel", (inner * 2, inner * 2, BOARD_THICKNESS * 0.5),
                    (0, 0, BOARD_Z + BOARD_THICKNESS / 2), panel_mat)
    bevel_mesh(panel, width=0.01, segments=2)

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
            name_y = (TILE_DEPTH / 2) - (BAND_DEPTH / 2)
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
