import bpy

ROOT_NAME = "Asset_Casa_Basica_Centrada"
COLLECTION_NAME = "Board_Assets"

# Centro exacto del mundo de Blender.
CENTER_X = 0.0
CENTER_Y = 0.0
GROUND_Z = 0.0

# Medidas simples y alineadas.
BODY_WIDTH = 1.0
BODY_DEPTH = 0.8
BODY_HEIGHT = 0.55

ROOF_WIDTH = 1.15
ROOF_DEPTH = 0.95
ROOF_HEIGHT = 0.35

# Medidas de los elementos austeros (Puerta y Ventana)
DOOR_WIDTH = 0.18
DOOR_HEIGHT = 0.36
DOOR_DEPTH = 0.02

WINDOW_SIZE = 0.20
WINDOW_DEPTH = 0.02


def get_or_create_material(name, rgba, roughness=0.75):
    if name in bpy.data.materials:
        mat = bpy.data.materials[name]
    else:
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True

    bsdf = mat.node_tree.nodes.get("Principled BSDF") if mat.use_nodes else None
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Roughness"].default_value = roughness

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

    obj.modifiers.new(name="Weighted_Normals", type="WEIGHTED_NORMAL")
    return obj


def parent_keep_world(obj, parent):
    obj.parent = parent
    obj.matrix_parent_inverse = parent.matrix_world.inverted()


def create_body(parent, material):
    body_center_z = GROUND_Z + BODY_HEIGHT / 2

    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=(CENTER_X, CENTER_Y, body_center_z),
    )
    body = bpy.context.active_object
    body.name = "CasaBasica_Cuerpo_Rectangular"
    body.dimensions = (BODY_WIDTH, BODY_DEPTH, BODY_HEIGHT)
    body.data.materials.append(material)
    parent_keep_world(body, parent)
    add_bevel(body, 0.012)

    bpy.context.view_layer.update()
    return body


def create_pyramid_roof(parent, material):
    """
    Genera un techo a dos aguas con faldones (Hip Roof) que coincide
    con la geometría rectangular alargada de la imagen de referencia.
    """
    roof_base_z = GROUND_Z + BODY_HEIGHT
    roof_top_z = roof_base_z + ROOF_HEIGHT

    half_w = ROOF_WIDTH / 2
    half_d = ROOF_DEPTH / 2

    # Longitud de la cumbrera adaptada proporcionalmente.
    ridge_half_w = max(0.0, half_w - half_d * 0.5) 

    # Definición de los 6 vértices del techo
    verts = [
        (-half_w, -half_d, roof_base_z),  # 0
        (half_w, -half_d, roof_base_z),   # 1
        (half_w, half_d, roof_base_z),    # 2
        (-half_w, half_d, roof_base_z),   # 3
        (-ridge_half_w, 0.0, roof_top_z), # 4
        (ridge_half_w, 0.0, roof_top_z),  # 5
    ]
    
    faces = [
        (0, 1, 2, 3),        # Base inferior
        (0, 1, 5, 4),        # Faldón frontal
        (1, 2, 5),           # Lateral derecho
        (2, 3, 4, 5),        # Faldón trasero
        (3, 0, 4),           # Lateral izquierdo
    ]

    mesh = bpy.data.meshes.new("CasaBasica_Techo_Piramidal_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    roof = bpy.data.objects.new("CasaBasica_Techo_Piramidal", mesh)
    roof.data.materials.append(material)
    bpy.context.collection.objects.link(roof)
    parent_keep_world(roof, parent)
    add_bevel(roof, 0.01)

    return roof


def create_details(parent, material):
    """
    Añade una puerta y una ventana en la fachada delantera (Y negativa).
    """
    # Posición en Y: Justo en la superficie de la pared delantera, sobresaliendo un milímetro.
    front_y = CENTER_Y - (BODY_DEPTH / 2) - (DOOR_DEPTH / 2) + 0.001

    # --- PUERTA (Alineada a la izquierda del eje central) ---
    door_x = CENTER_X - 0.22
    door_z = GROUND_Z + (DOOR_HEIGHT / 2)
    
    bpy.ops.mesh.primitive_cube_add(size=1, location=(door_x, front_y, door_z))
    door = bpy.context.active_object
    door.name = "CasaBasica_Puerta"
    door.dimensions = (DOOR_WIDTH, DOOR_DEPTH, DOOR_HEIGHT)
    door.data.materials.append(material)
    parent_keep_world(door, parent)
    add_bevel(door, 0.005)

    # --- VENTANA (Alineada a la derecha del eje central, elevada) ---
    window_x = CENTER_X + 0.22
    window_z = GROUND_Z + (BODY_HEIGHT * 0.6) # Situada a buena altura de la pared
    
    bpy.ops.mesh.primitive_cube_add(size=1, location=(window_x, front_y, window_z))
    window = bpy.context.active_object
    window.name = "CasaBasica_Ventana"
    window.dimensions = (WINDOW_SIZE, WINDOW_DEPTH, WINDOW_SIZE)
    window.data.materials.append(material)
    parent_keep_world(window, parent)
    add_bevel(window, 0.005)


def build_basic_house(collection):
    # Materiales mates y sencillos acordes al estilo austero
    mat_body = get_or_create_material("CasaBasica_Pared_Simple", (0.72, 0.62, 0.48, 1), 0.82)
    mat_roof = get_or_create_material("CasaBasica_Techo_Simple", (0.42, 0.19, 0.16, 1), 0.78)
    mat_details = get_or_create_material("CasaBasica_Detalles", (0.22, 0.15, 0.12, 1), 0.85) # Marrón oscuro plástico

    root = bpy.data.objects.new(ROOT_NAME, None)
    root.location = (CENTER_X, CENTER_Y, GROUND_Z)
    collection.objects.link(root)

    create_body(root, mat_body)
    create_pyramid_roof(root, mat_roof)
    create_details(root, mat_details)

    return root


def add_preview_camera_and_light():
    if not bpy.context.scene.camera:
        # Se ha reorientado ligeramente la cámara para apreciar mejor la fachada con los nuevos detalles
        bpy.ops.object.camera_add(
            location=(0.4, -2.2, 1.1),
            rotation=(1.15, 0.0, 0.18),
        )
        bpy.context.scene.camera = bpy.context.active_object

    if "CasaBasica_Preview_Light" not in bpy.data.objects:
        bpy.ops.object.light_add(type="AREA", location=(-1.0, -1.4, 2.0))
        light = bpy.context.active_object
        light.name = "CasaBasica_Preview_Light"
        light.data.energy = 400
        light.data.size = 1.4


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