import bpy

ROOT_NAME = "Asset_Casa_Lujo_Centrada"
COLLECTION_NAME = "Board_Assets"

# Centro exacto del mundo de Blender
CENTER_X = 0.0
CENTER_Y = 0.0
GROUND_Z = 0.0

# Medidas bases del diseño modular de lujo
BASE_WIDTH = 1.1
BASE_DEPTH = 0.85
PISO_HEIGHT = 0.35  # Altura por nivel

def get_or_create_material(name, rgba, roughness=0.2, metallic=0.0):
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


def add_bevel(obj, width=0.012):
    bevel = obj.modifiers.new(name="Soft_Edges", type="BEVEL")
    bevel.width = width
    bevel.segments = 1
    bevel.affect = "EDGES"
    
    obj.modifiers.new(name="Weighted_Normals", type="WEIGHTED_NORMAL")
    return obj


def parent_keep_world(obj, parent):
    obj.parent = parent
    obj.matrix_parent_inverse = parent.matrix_world.inverted()


def build_luxury_mansion(parent, mat_wall, mat_glass, mat_roof):
    """
    Construye una mansión moderna de lujo usando bloques cúbicos limpios,
    frentes de cristal (ventanales) y voladizos arquitectónicos.
    """
    
    # --- PISO 1 (Bloque Base Principal) ---
    p1_z = GROUND_Z + PISO_HEIGHT / 2
    bpy.ops.mesh.primitive_cube_add(size=1, location=(CENTER_X, CENTER_Y, p1_z))
    p1 = bpy.context.active_object
    p1.name = "Mansion_Piso1"
    p1.dimensions = (BASE_WIDTH, BASE_DEPTH, PISO_HEIGHT)
    p1.data.materials.append(mat_wall)
    parent_keep_world(p1, parent)
    add_bevel(p1)

    # Ventanal de lujo Piso 1 (Fachada delantera acristalada de lado a lado)
    v1_y = CENTER_Y - (BASE_DEPTH / 2) - 0.002
    bpy.ops.mesh.primitive_cube_add(size=1, location=(CENTER_X, v1_y, p1_z))
    v1 = bpy.context.active_object
    v1.name = "Mansion_Ventanal_P1"
    v1.dimensions = (BASE_WIDTH * 0.85, 0.01, PISO_HEIGHT * 0.7)
    v1.data.materials.append(mat_glass)
    parent_keep_world(v1, parent)

    # --- PISO 2 (Bloque Modular Desfasado) ---
    # Lo movemos ligeramente a la derecha (X) y atrás (Y) para crear el look arquitectónico moderno
    p2_x = CENTER_X + 0.08
    p2_y = CENTER_Y + 0.05
    p2_z = GROUND_Z + PISO_HEIGHT + (PISO_HEIGHT / 2)
    
    bpy.ops.mesh.primitive_cube_add(size=1, location=(p2_x, p2_y, p2_z))
    p2 = bpy.context.active_object
    p2.name = "Mansion_Piso2"
    p2.dimensions = (BASE_WIDTH * 0.85, BASE_DEPTH * 0.85, PISO_HEIGHT)
    p2.data.materials.append(mat_wall)
    parent_keep_world(p2, parent)
    add_bevel(p2)

    # Ventanal Panorámico Piso 2
    v2_y = p2_y - (BASE_DEPTH * 0.85 / 2) - 0.002
    bpy.ops.mesh.primitive_cube_add(size=1, location=(p2_x - 0.05, v2_y, p2_z + 0.02))
    v2 = bpy.context.active_object
    v2.name = "Mansion_Ventanal_P2"
    v2.dimensions = (BASE_WIDTH * 0.6, 0.01, PISO_HEIGHT * 0.6)
    v2.data.materials.append(mat_glass)
    parent_keep_world(v2, parent)

    # --- LOSA DE TECHO DE LUJO (Voladizo Plano) ---
    # Una losa que corona el edificio y sobresale por el frente como un alero moderno
    roof_z = GROUND_Z + (PISO_HEIGHT * 2) + 0.015
    bpy.ops.mesh.primitive_cube_add(size=1, location=(CENTER_X, CENTER_Y - 0.04, roof_z))
    roof = bpy.context.active_object
    roof.name = "Mansion_Techo_Plano"
    roof.dimensions = (BASE_WIDTH * 1.1, BASE_DEPTH * 1.05, 0.03)
    roof.data.materials.append(mat_roof)
    parent_keep_world(roof, parent)
    add_bevel(roof, width=0.005)


def build_main(collection):
    # Paleta de materiales "Premium" de alta gama
    mat_wall = get_or_create_material("Mansion_Pared_BlancoPulido", (0.95, 0.95, 0.95, 1), roughness=0.15)
    mat_glass = get_or_create_material("Mansion_Cristal_Oscuro", (0.08, 0.12, 0.18, 1), roughness=0.05, metallic=0.2)
    mat_roof = get_or_create_material("Mansion_Detalle_GrisElegante", (0.22, 0.24, 0.26, 1), roughness=0.3)

    root = bpy.data.objects.new(ROOT_NAME, None)
    root.location = (CENTER_X, CENTER_Y, GROUND_Z)
    collection.objects.link(root)

    build_luxury_mansion(root, mat_wall, mat_glass, mat_roof)

    return root


def add_preview_camera_and_light():
    if not bpy.context.scene.camera:
        # Orientación de cámara cinemática de arquitectura
        bpy.ops.object.camera_add(
            location=(1.2, -2.1, 1.2),
            rotation=(1.1, 0.0, 0.5),
        )
        bpy.context.scene.camera = bpy.context.active_object

    if "Mansion_Preview_Light" not in bpy.data.objects:
        bpy.ops.object.light_add(type="AREA", location=(-1.5, -1.8, 2.5))
        light = bpy.context.active_object
        light.name = "Mansion_Preview_Light"
        light.data.energy = 500
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
    build_main(collection)
    add_preview_camera_and_light()
    bpy.context.view_layer.update()
    frame_view_if_possible()