import bpy
import random

ROOT_NAME = "Asset_Casa_Austerisima_Centrada"
COLLECTION_NAME = "Board_Assets"

# Centro exacto del mundo de Blender
CENTER_X = 0.0
CENTER_Y = 0.0
GROUND_Z = 0.0

# Medidas del cuerpo de la casa
BODY_WIDTH = 1.0
BODY_DEPTH = 0.8
BODY_HEIGHT = 0.55

# Láminas de chapa individuales y ultra finas
LAMINA_WIDTH = 0.38   
LAMINA_DEPTH = 0.90   
ROOF_HEIGHT = 0.008   

# Medidas de los elementos en bajorrelieve
DOOR_WIDTH = 0.18
DOOR_HEIGHT = 0.36
WINDOW_SIZE = 0.20


def get_or_create_material(name, rgba, roughness=0.75, metallic=0.0):
    if name in bpy.data.materials:
        mat = bpy.data.materials[name]
    else:
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True

    bsdf = mat.node_tree.nodes.get("Principled BSDF") if mat.use_nodes else None
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic

    return mat


def create_assets_collection():
    if COLLECTION_NAME not in bpy.data.collections:
        collection = bpy.data.collections.new(COLLECTION_NAME)
        bpy.context.scene.collection.children.link(collection)
    return bpy.data.collections[COLLECTION_NAME]


def clear_existing_asset(root_name):
    if root_name not in bpy.data.objects:
        return

    root = bpy.data.objects[root_name]
    for child in list(root.children):
        mesh = child.data if hasattr(child, "data") else None
        bpy.data.objects.remove(child, do_unlink=True)
        if mesh and mesh.users == 0:
            bpy.data.meshes.remove(mesh)

    bpy.data.objects.remove(root, do_unlink=True)


def add_bevel(obj, width=0.015):
    bevel = obj.modifiers.new(name="Soft_Edges", type="BEVEL")
    bevel.width = width
    bevel.segments = 1
    bevel.affect = "EDGES"
    return obj


def parent_keep_world(obj, parent):
    obj.parent = parent
    obj.matrix_parent_inverse = parent.matrix_world.inverted()


def create_asymmetric_body(parent, materiales_pared):
    """
    NUEVA FUNCIÓN: Genera las paredes combinando un núcleo central con parches 
    desalineados de diferentes tamaños y colores (ladrillo, cemento, bloques).
    """
    random.seed(101) # Semilla fija para mantener el caos controlado
    
    # 1. Núcleo principal de la casa (un poquito más pequeño para dejar espacio a los parches)
    body_center_z = GROUND_Z + BODY_HEIGHT / 2
    bpy.ops.mesh.primitive_cube_add(size=1, location=(CENTER_X, CENTER_Y, body_center_z))
    base_body = bpy.context.active_object
    base_body.name = "CasaAustera_Pared_Base"
    base_body.dimensions = (BODY_WIDTH * 0.96, BODY_DEPTH * 0.96, BODY_HEIGHT)
    base_body.data.materials.append(materiales_pared[0]) # Color cemento base
    parent_keep_world(base_body, parent)
    add_bevel(base_body, 0.01)

    # 2. Generamos "Parches" asimétricos en los laterales para romper las líneas rectas
    # Definimos posiciones estratégicas (Esquinas y laterales) donde sobresaldrán materiales
    parches_config = [
        # (X, Y, Z, Ancho, Profundidad, Alto, Variación rotación)
        (-0.48,  0.10, 0.25, 0.05, 0.30, 0.40,  0.03), # Parche lateral izquierdo (madera/ladrillo)
        ( 0.48, -0.15, 0.20, 0.05, 0.25, 0.30, -0.02), # Parche lateral derecho
        (-0.20,  0.39, 0.30, 0.40, 0.04, 0.35,  0.01), # Parche trasero superior
        ( 0.35, -0.39, 0.15, 0.20, 0.04, 0.25, -0.03), # Ladrillos expuestos fachada delantera derecha
        (-0.46, -0.38, 0.45, 0.08, 0.05, 0.15,  0.02), # Remiendo de esquina superior izquierda
    ]

    for i, (px, py, pz, pw, pd, ph, r_z) in enumerate(parches_config):
        # Añadir ligeras variaciones aleatorias a las medidas para que no sea perfecto
        pw += random.uniform(-0.01, 0.01)
        ph += random.uniform(-0.02, 0.02)
        
        bpy.ops.mesh.primitive_cube_add(size=1, location=(px, py, pz))
        parche = bpy.context.active_object
        parche.name = f"Pared_Asimetrica_Parche_{i+1}"
        parche.dimensions = (pw, pd, ph)
        
        # Una leve rotación rompe las líneas perfectamente paralelas del renderizado digital
        parche.rotation_euler.z = r_z
        parche.rotation_euler.y = random.uniform(-0.01, 0.01)

        # Asignamos materiales de forma aleatoria (ladrillo, cemento viejo, etc.)
        mat_asignado = random.choice(materiales_pared)
        parche.data.materials.append(mat_asignado)
        
        parent_keep_world(parche, parent)
        add_bevel(parche, 0.008)

    return base_body


def create_realistic_chapas(parent, materiales_lata):
    base_z = GROUND_Z + BODY_HEIGHT + (ROOF_HEIGHT / 2)
    posiciones_x = [-0.33, -0.11, 0.11, 0.33]
    
    random.seed(42)

    for i, x_base in enumerate(posiciones_x):
        offset_x = random.uniform(-0.015, 0.015)
        offset_y = random.uniform(-0.03, 0.03)
        offset_z = i * 0.002 
        
        loc_x = x_base + offset_x
        loc_y = CENTER_Y + offset_y
        loc_z = base_z + offset_z

        bpy.ops.mesh.primitive_cube_add(size=1, location=(loc_x, loc_y, loc_z))
        chapa = bpy.context.active_object
        chapa.name = f"Chapa_Lata_Asimetrica_{i+1}"
        chapa.dimensions = (LAMINA_WIDTH, LAMINA_DEPTH, ROOF_HEIGHT)
        
        chapa.rotation_euler.z = random.uniform(-0.02, 0.02)
        chapa.rotation_euler.x = random.uniform(-0.01, 0.02)

        mat_asignado = random.choice(materiales_lata)
        chapa.data.materials.append(mat_asignado)
        
        parent_keep_world(chapa, parent)
        add_bevel(chapa, 0.001)


def create_details(parent, material):
    # Desplazamos un milímetro extra hacia adelante la puerta/ventana para que no colisionen
    # con los nuevos parches asimétricos de la fachada
    pared_frontal_y = CENTER_Y - (BODY_DEPTH / 2)
    grosor_detalle = 0.015
    front_y = pared_frontal_y + (grosor_detalle / 2) - 0.004

    # --- PUERTA HUNDIDA ---
    door_x = CENTER_X - 0.22
    door_z = GROUND_Z + (DOOR_HEIGHT / 2)
    
    bpy.ops.mesh.primitive_cube_add(size=1, location=(door_x, front_y, door_z))
    door = bpy.context.active_object
    door.name = "CasaAustera_Puerta"
    door.dimensions = (DOOR_WIDTH, grosor_detalle, DOOR_HEIGHT) 
    door.data.materials.append(material)
    parent_keep_world(door, parent)

    # --- VENTANA HUNDIDA ---
    window_x = CENTER_X + 0.22
    window_z = GROUND_Z + (BODY_HEIGHT * 0.6)
    
    bpy.ops.mesh.primitive_cube_add(size=1, location=(window_x, front_y, window_z))
    window = bpy.context.active_object
    window.name = "CasaAustera_Ventana"
    window.dimensions = (WINDOW_SIZE, grosor_detalle, WINDOW_SIZE)
    window.data.materials.append(material)
    parent_keep_world(window, parent)


def build_basic_house(collection):
    # MATERIALES DE PARED (Inspirados en la paleta de colores de la foto)
    mat_cemento_base = get_or_create_material("Pared_Cemento_Gris", (0.55, 0.53, 0.50, 1), 0.9)
    mat_ladrillo_naranja = get_or_create_material("Pared_Ladrillo_Expuesto", (0.68, 0.34, 0.22, 1), 0.85)
    mat_bloque_oscuro = get_or_create_material("Pared_Bloque_Viejo", (0.38, 0.37, 0.35, 1), 0.95)
    
    materiales_pared = [mat_cemento_base, mat_ladrillo_naranja, mat_bloque_oscuro]
    
    # Materiales Techo
    mat_lata_nueva = get_or_create_material("Lata_Gris_Claro", (0.65, 0.67, 0.68, 1), roughness=0.3, metallic=1.0)
    mat_lata_vieja = get_or_create_material("Lata_Gris_Oscuro", (0.35, 0.37, 0.38, 1), roughness=0.4, metallic=1.0)
    mat_lata_oxido = get_or_create_material("Lata_Oxidada", (0.52, 0.28, 0.18, 1), roughness=0.8, metallic=0.4)
    materiales_techo = [mat_lata_nueva, mat_lata_vieja, mat_lata_oxido]
    
    mat_details = get_or_create_material("CasaAustera_Detalles", (0.12, 0.12, 0.12, 1), 0.8)

    root = bpy.data.objects.new(ROOT_NAME, None)
    root.location = (CENTER_X, CENTER_Y, GROUND_Z)
    collection.objects.link(root)

    # Llamamos a la nueva función de cuerpo asimétrico
    create_asymmetric_body(root, materiales_pared)
    create_realistic_chapas(root, materiales_techo)
    create_details(root, mat_details)

    return root


def add_preview_camera_and_light():
    if not bpy.context.scene.camera:
        # Ajustamos la cámara para ver bien el lateral con imperfecciones
        bpy.ops.object.camera_add(
            location=(0.8, -1.8, 1.1),
            rotation=(1.0, 0.0, 0.45),
        )
        bpy.context.scene.camera = bpy.context.active_object

    if "CasaBasica_Preview_Light" not in bpy.data.objects:
        bpy.ops.object.light_add(type="AREA", location=(-1.5, -1.0, 2.5))
        light = bpy.context.active_object
        light.name = "CasaBasica_Preview_Light"
        light.data.energy = 600
        light.data.size = 2.0


def frame_view_if_possible():
    for area in bpy.context.screen.areas:
        if area.type == "VIEW_3D":
            for region in area.regions:
                if region.type == "WINDOW":
                    override = {"area": area, "region": region}
                    bpy.ops.view3d.view_all(override, center=False)
                    return


if __name__ == "__main__":
    clear_existing_asset(ROOT_NAME)
    collection = create_assets_collection()
    build_basic_house(collection)
    add_preview_camera_and_light()
    bpy.context.view_layer.update()
    frame_view_if_possible()