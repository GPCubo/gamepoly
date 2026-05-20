import bpy
import math

# ─────────────────────────────────────────────────────────────────────────
# CONFIGURACIÓN GENERAL (Escala física optimizada)
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

# PALETA DE COLORES VIVOS (Hexadecimales de interfaz convertidos a RGB)
TILE_COLORS = {
    "brown":       (0.55, 0.20, 0.05, 1),   # Propiedades 1 y 3
    "lightBlue":   (0.00, 0.75, 1.00, 1),   # Propiedades 6, 8 y 9
    "pink":        (1.00, 0.00, 0.55, 1),   # Propiedades 11, 13 y 14
    "orange":      (1.00, 0.45, 0.00, 1),   # Propiedades 16, 18 y 19
    "red":         (1.00, 0.00, 0.05, 1),   # Propiedades 21, 23 y 24
    "yellow":      (1.00, 0.85, 0.00, 1),   # Propiedades 26, 27 y 29
    "green":       (0.00, 0.70, 0.15, 1),   # Propiedades 31, 32 y 34
    "darkBlue":    (0.00, 0.15, 0.80, 1),   # Propiedades 37 y 39
    "railroad":    (0.05, 0.05, 0.05, 1),   # Estaciones / Trenes
    "utility":     (0.55, 0.60, 0.55, 1),   # Compañías eléctrica/agua
    "tax":         (0.15, 0.15, 0.15, 1),   # Impuestos
    "chance":      (1.00, 0.30, 0.00, 1),   # Casillas de Suerte
    "community":   (0.00, 0.55, 0.90, 1),   # Arca Comunal
    "white":       (0.98, 0.98, 0.98, 1),   # Base de casillas estándar
    "wood":        (0.15, 0.08, 0.03, 1),   # Mesa contenedora
    "board_center":(0.91, 0.94, 0.89, 1)    # Fondo claro del tablero
}

# Mapeo exacto de las 40 casillas (Sentido horario desde GO)
TILE_GROUPS = [
    "go", "brown", "community", "brown", "tax", "railroad", "lightBlue", "chance", "lightBlue", "lightBlue",
    "jail", "pink", "utility", "pink", "pink", "railroad", "orange", "community", "orange", "orange",
    "parking", "red", "chance", "red", "red", "railroad", "yellow", "yellow", "utility", "yellow",
    "gotojail", "green", "green", "community", "green", "railroad", "chance", "darkBlue", "tax", "darkBlue"
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

# ─────────────────────────────────────────────────────────────────────────
# MATRIZ DE TRANSFORMACIÓN (Corrige orientación y giros invertidos)
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
# CONSTRUCCIÓN DEL MODELO 3D
# ─────────────────────────────────────────────────────────────────────────
def build_gamepoly():
    safe_clear_scene()
    
    # Inicializar materiales bases
    wood_mat = get_or_create_material("WoodTable", TILE_COLORS["wood"], roughness=0.4)
    center_mat = get_or_create_material("BoardCenter", TILE_COLORS["board_center"], roughness=0.6)
    white_tile_mat = get_or_create_material("TileWhite", TILE_COLORS["white"], roughness=0.1)
    
    # 1. Mesa base del juego
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, TABLE_TOP_Z/2))
    table = bpy.context.active_object
    table.name = "Table_Base"
    table.dimensions = (TABLE_WIDTH, TABLE_DEPTH, TABLE_TOP_Z)
    table.data.materials.append(wood_mat)
    
    # 2. Centro del Tablero (Área de rodado de dados)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, BOARD_Z))
    board = bpy.context.active_object
    board.name = "Board_Center"
    board.dimensions = (BOARD_SIZE, BOARD_SIZE, BOARD_THICKNESS)
    board.data.materials.append(center_mat)
    
    # 3. Generación y ensamble de Casillas
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
            # Bloque de Esquina
            bpy.ops.mesh.primitive_cube_add(size=1)
            c_mesh = bpy.context.active_object
            c_mesh.name = f"Tile_{i:02d}_CornerMesh"
            c_mesh.dimensions = (CORNER_SIZE, CORNER_SIZE, TILE_HEIGHT)
            c_mesh.location = (0, 0, 0)
            c_mesh.parent = tile_container
            
            c_mat = get_or_create_material(f"Mat_{group}", TILE_COLORS.get(group, TILE_COLORS["white"]), roughness=0.1)
            c_mesh.data.materials.append(c_mat)
        else:
            # Base Blanca Pulida
            bpy.ops.mesh.primitive_cube_add(size=1)
            base_mesh = bpy.context.active_object
            base_mesh.name = f"Tile_{i:02d}_Base"
            base_mesh.dimensions = (TILE_WIDTH * 0.94, TILE_DEPTH, TILE_HEIGHT)
            base_mesh.location = (0, 0, 0)
            base_mesh.parent = tile_container
            base_mesh.data.materials.append(white_tile_mat)
            
            has_band = group in ["brown", "lightBlue", "pink", "orange", "red", "yellow", "green", "darkBlue"]
            
            if has_band:
                # Banda de Color orientada de cara al borde exterior de la mesa
                bpy.ops.mesh.primitive_cube_add(size=1)
                band_mesh = bpy.context.active_object
                band_mesh.name = f"Tile_{i:02d}_ColorBand"
                band_mesh.dimensions = (TILE_WIDTH * 0.94, BAND_DEPTH, TILE_HEIGHT * 1.1)
                # Mueve la banda al extremo superior local de la casilla
                band_mesh.location = (0, (TILE_DEPTH / 2) - (BAND_DEPTH / 2), TILE_HEIGHT * 0.05)
                band_mesh.parent = tile_container
                
                band_mat = get_or_create_material(f"Mat_{group}", TILE_COLORS[group], roughness=0.05)
                band_mesh.data.materials.append(band_mat)
            else:
                # Bloque central indicador para casillas especiales (Suerte, Trenes, Impuestos)
                bpy.ops.mesh.primitive_cube_add(size=1)
                spec_mesh = bpy.context.active_object
                spec_mesh.name = f"Tile_{i:02d}_SpecialCenter"
                spec_mesh.dimensions = (TILE_WIDTH * 0.5, TILE_DEPTH * 0.35, TILE_HEIGHT * 1.1)
                spec_mesh.location = (0, -0.05, TILE_HEIGHT * 0.05)
                spec_mesh.parent = tile_container
                
                spec_mat = get_or_create_material(f"Mat_{group}", TILE_COLORS.get(group, TILE_COLORS["white"]), roughness=0.1)
                spec_mesh.data.materials.append(spec_mat)

    # Activar sombreado de materiales en el viewport dinámicamente
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    space.shading.type = 'MATERIAL'

if __name__ == "__main__":
    build_gamepoly()