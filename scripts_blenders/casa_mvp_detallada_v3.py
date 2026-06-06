import math
import bpy
from mathutils import Vector

ROOT_NAME = "Asset_Casa_MVP_Detallada_v3"
COLLECTION_NAME = "Board_Assets"

# Centro exacto del mundo de Blender
CENTER_X = 0.0
CENTER_Y = 0.0
GROUND_Z = 0.0

# --- MEDIDAS DE LA BASE (TERRENO) ---
BASE_WIDTH = 1.35
BASE_DEPTH = 1.22
BASE_HEIGHT = 0.025

# --- MEDIDAS DEL CUERPO ---
BODY_WIDTH = 1.0
BODY_DEPTH = 0.8
BODY_HEIGHT = 0.55

# --- MEDIDAS DEL TECHO ---
ROOF_WIDTH = 1.16
ROOF_DEPTH = 0.96
ROOF_HEIGHT = 0.35
ROOF_THICKNESS = 0.035

# --- MEDIDAS DE DETALLES ---
DOOR_WIDTH = 0.18
DOOR_HEIGHT = 0.36
DOOR_DEPTH = 0.026
FRAME_THICKNESS = 0.018

WINDOW_SIZE = 0.21
WINDOW_DEPTH = 0.022

# --- COLORES REUTILIZABLES ---
# Cambia estas variables para reutilizar la misma casa con otra paleta.
COLOR_ROJO_COMPONENTES = (0.90, 0.10, 0.08, 1)
COLOR_AZUL_VENTANAS = (0.16, 0.43, 0.68, 1)


def shade_color(rgba, factor):
    return (
        max(0.0, min(1.0, rgba[0] * factor)),
        max(0.0, min(1.0, rgba[1] * factor)),
        max(0.0, min(1.0, rgba[2] * factor)),
        rgba[3],
    )


def get_or_create_material(name, rgba, roughness=0.5, metallic=0.0):
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
        if "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = rgba[3]

    mat.diffuse_color = rgba
    if rgba[3] < 1:
        mat.blend_method = "BLEND"
        mat.use_screen_refraction = True

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


def remove_startup_cube_if_present():
    cube = bpy.data.objects.get("Cube")
    if not cube or cube.parent or cube.type != "MESH":
        return

    mesh = cube.data
    is_default_cube = (
        mesh
        and mesh.name == "Cube"
        and len(mesh.vertices) == 8
        and abs(cube.location.x) < 0.001
        and abs(cube.location.y) < 0.001
        and abs(cube.location.z) < 0.001
    )
    if not is_default_cube:
        return

    bpy.data.objects.remove(cube, do_unlink=True)
    if mesh.users == 0:
        bpy.data.meshes.remove(mesh)


def add_bevel(obj, width=0.01, segments=2):
    if width > 0:
        bevel = obj.modifiers.new(name="Soft_Edges", type="BEVEL")
        bevel.width = width
        bevel.segments = segments
        bevel.affect = "EDGES"

    obj.modifiers.new(name="Weighted_Normals", type="WEIGHTED_NORMAL")

    if hasattr(obj.data, "polygons"):
        for poly in obj.data.polygons:
            poly.use_smooth = True

    return obj


def parent_keep_world(obj, parent):
    obj.parent = parent
    obj.matrix_parent_inverse = parent.matrix_world.inverted()


def create_cube(parent, name, location, dimensions, material, bevel=0.006, segments=2):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dimensions
    obj.data.materials.append(material)
    parent_keep_world(obj, parent)
    add_bevel(obj, bevel, segments)
    return obj


def create_lawn_base(parent, mat_lawn, mat_edge):
    base_z = GROUND_Z + (BASE_HEIGHT / 2)
    create_cube(
        parent,
        "Casa_Grama_Base_Redondeada",
        (CENTER_X, CENTER_Y, base_z),
        (BASE_WIDTH, BASE_DEPTH, BASE_HEIGHT),
        mat_lawn,
        bevel=0.018,
        segments=3,
    )

    trim_z = GROUND_Z + BASE_HEIGHT + 0.008
    front_border_y = CENTER_Y - BASE_DEPTH / 2 + 0.018
    front_border_width = BASE_WIDTH * 0.92
    front_border_min_x = CENTER_X - front_border_width / 2
    front_border_max_x = CENTER_X + front_border_width / 2
    path_center_x = CENTER_X - 0.20
    path_clear_width = DOOR_WIDTH + 0.14
    path_min_x = path_center_x - path_clear_width / 2
    path_max_x = path_center_x + path_clear_width / 2

    front_border_parts = [
        ("Izquierdo", front_border_min_x, path_min_x),
        ("Derecho", path_max_x, front_border_max_x),
    ]
    for suffix, min_x, max_x in front_border_parts:
        part_width = max_x - min_x
        if part_width <= 0:
            continue

        create_cube(
            parent,
            f"Casa_Borde_Base_Frontal_{suffix}",
            ((min_x + max_x) / 2, front_border_y, trim_z),
            (part_width, 0.03, 0.035),
            mat_edge,
            bevel=0.004,
        )
    create_cube(
        parent,
        "Casa_Borde_Base_Trasero",
        (CENTER_X, CENTER_Y + BASE_DEPTH / 2 - 0.018, trim_z),
        (BASE_WIDTH * 0.92, 0.03, 0.035),
        mat_edge,
        bevel=0.004,
    )


def create_entrance_path(parent, mat_path):
    door_x = CENTER_X - 0.20
    wall_y = CENTER_Y - (BODY_DEPTH / 2)
    border_y = CENTER_Y - (BASE_DEPTH / 2)
    path_depth = abs(wall_y - border_y)
    path_y = wall_y - (path_depth / 2)
    path_z = GROUND_Z + BASE_HEIGHT + 0.004

    create_cube(
        parent,
        "Casa_Acera_Entrada_Principal",
        (door_x, path_y, path_z),
        (DOOR_WIDTH + 0.08, path_depth, 0.008),
        mat_path,
        bevel=0.006,
        segments=2,
    )

    # Losas separadas para que el camino no se vea como un solo bloque plano.
    for i in range(3):
        y = border_y + 0.055 + i * (path_depth / 3)
        create_cube(
            parent,
            f"Casa_Acera_Losa_{i + 1}",
            (door_x, y, path_z + 0.004),
            (DOOR_WIDTH + 0.055, 0.04, 0.006),
            mat_path,
            bevel=0.005,
            segments=2,
        )


def create_body_and_trim(parent, mat_body, mat_side, mat_trim):
    body_center_z = GROUND_Z + BASE_HEIGHT + (BODY_HEIGHT / 2)
    create_cube(
        parent,
        "Casa_Paredes_Suaves",
        (CENTER_X, CENTER_Y, body_center_z),
        (BODY_WIDTH, BODY_DEPTH, BODY_HEIGHT),
        mat_body,
        bevel=0.018,
        segments=3,
    )

    # Panel lateral ligeramente azulado como en la referencia.
    side_x = CENTER_X + BODY_WIDTH / 2 + 0.004
    create_cube(
        parent,
        "Casa_Pared_Lateral_Azulada",
        (side_x, CENTER_Y, body_center_z + 0.005),
        (0.012, BODY_DEPTH * 0.92, BODY_HEIGHT * 0.92),
        mat_side,
        bevel=0.004,
        segments=2,
    )

    trim_z = GROUND_Z + BASE_HEIGHT + 0.035
    create_cube(
        parent,
        "Casa_Zocalo_Frontal_Rojo",
        (CENTER_X, CENTER_Y - BODY_DEPTH / 2 - 0.012, trim_z),
        (BODY_WIDTH + 0.035, 0.024, 0.07),
        mat_trim,
        bevel=0.004,
    )
    create_cube(
        parent,
        "Casa_Zocalo_Trasero_Rojo",
        (CENTER_X, CENTER_Y + BODY_DEPTH / 2 + 0.012, trim_z),
        (BODY_WIDTH + 0.035, 0.024, 0.07),
        mat_trim,
        bevel=0.004,
    )
    create_cube(
        parent,
        "Casa_Zocalo_Derecho_Rojo",
        (CENTER_X + BODY_WIDTH / 2 + 0.012, CENTER_Y, trim_z),
        (0.024, BODY_DEPTH + 0.035, 0.07),
        mat_trim,
        bevel=0.004,
    )
    create_cube(
        parent,
        "Casa_Zocalo_Izquierdo_Rojo",
        (CENTER_X - BODY_WIDTH / 2 - 0.012, CENTER_Y, trim_z),
        (0.024, BODY_DEPTH + 0.035, 0.07),
        mat_trim,
        bevel=0.004,
    )


def create_gable_wall(parent, name, y, material):
    body_top_z = GROUND_Z + BASE_HEIGHT + BODY_HEIGHT
    roof_top_z = body_top_z + ROOF_HEIGHT * 0.82
    half_w = BODY_WIDTH / 2
    thickness = 0.012
    y_outer = y
    y_inner = y + (thickness if y < CENTER_Y else -thickness)

    verts = [
        (-half_w, y_outer, body_top_z),
        (half_w, y_outer, body_top_z),
        (0.0, y_outer, roof_top_z),
        (-half_w, y_inner, body_top_z),
        (half_w, y_inner, body_top_z),
        (0.0, y_inner, roof_top_z),
    ]
    faces = [
        (0, 1, 2),
        (3, 5, 4),
        (0, 3, 4, 1),
        (1, 4, 5, 2),
        (2, 5, 3, 0),
    ]

    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(material)
    bpy.context.collection.objects.link(obj)
    parent_keep_world(obj, parent)
    add_bevel(obj, 0.006, 2)
    return obj


def roof_height_at_x(x):
    half_w = ROOF_WIDTH / 2
    body_top_z = GROUND_Z + BASE_HEIGHT + BODY_HEIGHT
    return body_top_z + ROOF_HEIGHT * max(0.0, 1.0 - abs(x) / half_w)


def create_detailed_roof(parent, mat_roof, mat_trim):
    roof_base_z = GROUND_Z + BASE_HEIGHT + BODY_HEIGHT - 0.006
    roof_top_z = roof_base_z + ROOF_HEIGHT

    half_w = ROOF_WIDTH / 2
    half_d = ROOF_DEPTH / 2
    ridge_half_d = max(0.0, half_d - 0.05)

    verts = [
        (-half_w, -half_d, roof_base_z),
        (half_w, -half_d, roof_base_z),
        (half_w, half_d, roof_base_z),
        (-half_w, half_d, roof_base_z),
        (0.0, -ridge_half_d, roof_top_z),
        (0.0, ridge_half_d, roof_top_z),
    ]

    faces = [
        (0, 1, 2, 3),
        (0, 1, 4),
        (1, 2, 5, 4),
        (2, 3, 5),
        (3, 0, 4, 5),
    ]

    mesh = bpy.data.meshes.new("Casa_Techo_Dos_Aguas_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    roof = bpy.data.objects.new("Casa_Techo_Rojo_Detallado", mesh)
    roof.data.materials.append(mat_roof)
    bpy.context.collection.objects.link(roof)
    parent_keep_world(roof, parent)
    add_bevel(roof, 0.012, 3)

    slope_angle = math.atan2(ROOF_HEIGHT, half_w)

    # Cumbrera y bordes visibles del techo.
    create_cube(
        parent,
        "Casa_Techo_Cumbrera_Roja",
        (CENTER_X, CENTER_Y, roof_top_z + 0.012),
        (0.065, ROOF_DEPTH * 0.92, 0.032),
        mat_trim,
        bevel=0.008,
        segments=2,
    )

    for y, suffix in [(-half_d - 0.012, "Frontal"), (half_d + 0.012, "Trasero")]:
        create_cube(
            parent,
            f"Casa_Techo_Fascia_{suffix}",
            (CENTER_X, y, roof_base_z + 0.03),
            (ROOF_WIDTH + 0.035, 0.028, 0.055),
            mat_trim,
            bevel=0.004,
            segments=2,
        )

    # Lineas finas de tejas sobre cada faldon.
    for side, angle in [(-1, slope_angle), (1, -slope_angle)]:
        for i, x_abs in enumerate([0.16, 0.30, 0.44]):
            x = side * x_abs
            z = roof_height_at_x(x) + 0.018
            if side > 0 and i == 1:
                full_len = ROOF_DEPTH * 0.86
                min_y = CENTER_Y - full_len / 2
                max_y = CENTER_Y + full_len / 2
                chimney_y = 0.18
                chimney_clear_width = 0.25
                gap_min_y = chimney_y - chimney_clear_width / 2
                gap_max_y = chimney_y + chimney_clear_width / 2

                tile_parts = [
                    ("Frontal", min_y, gap_min_y),
                    ("Trasera", gap_max_y, max_y),
                ]
                for suffix, part_min_y, part_max_y in tile_parts:
                    part_len = part_max_y - part_min_y
                    if part_len <= 0:
                        continue

                    tile = create_cube(
                        parent,
                        f"Casa_Techo_Linea_Teja_Der_2_{suffix}",
                        (x, (part_min_y + part_max_y) / 2, z),
                        (0.014, part_len, 0.014),
                        mat_trim,
                        bevel=0.003,
                        segments=1,
                    )
                    tile.rotation_euler.y = angle
                continue

            tile = create_cube(
                parent,
                f"Casa_Techo_Linea_Teja_{'Izq' if side < 0 else 'Der'}_{i + 1}",
                (x, CENTER_Y, z),
                (0.014, ROOF_DEPTH * 0.86, 0.014),
                mat_trim,
                bevel=0.003,
                segments=1,
            )
            tile.rotation_euler.y = angle


def create_chimney(parent, mat_body, mat_roof, mat_dark):
    chimney_x = 0.24
    chimney_y = 0.18
    chimney_base_z = roof_height_at_x(chimney_x) + 0.055

    create_cube(
        parent,
        "Casa_Chimenea_Cuerpo",
        (chimney_x, chimney_y, chimney_base_z),
        (0.13, 0.12, 0.18),
        mat_body,
        bevel=0.008,
        segments=2,
    )
    create_cube(
        parent,
        "Casa_Chimenea_Tapa_Roja",
        (chimney_x, chimney_y, chimney_base_z + 0.105),
        (0.17, 0.16, 0.035),
        mat_roof,
        bevel=0.006,
        segments=2,
    )
    create_cube(
        parent,
        "Casa_Chimenea_Hueco",
        (chimney_x, chimney_y, chimney_base_z + 0.126),
        (0.085, 0.075, 0.008),
        mat_dark,
        bevel=0.003,
        segments=1,
    )


def create_front_frame(parent, name, x, z, width, height, depth, mat_frame, mat_glass):
    front_y = CENTER_Y - (BODY_DEPTH / 2)
    frame_y = front_y - (depth / 2) - 0.002
    glass_y = frame_y - 0.004

    create_cube(
        parent,
        f"{name}_Marco_Azul",
        (x, frame_y, z),
        (width + FRAME_THICKNESS * 2, depth * 1.25, height + FRAME_THICKNESS * 2),
        mat_frame,
        bevel=0.006,
        segments=2,
    )
    create_cube(
        parent,
        f"{name}_Cristal",
        (x, glass_y, z),
        (width, depth, height),
        mat_glass,
        bevel=0.005,
        segments=2,
    )
    create_cube(
        parent,
        f"{name}_Cruceta_Vertical",
        (x, glass_y - 0.004, z),
        (0.014, depth * 1.1, height * 0.92),
        mat_frame,
        bevel=0.002,
        segments=1,
    )
    create_cube(
        parent,
        f"{name}_Cruceta_Horizontal",
        (x, glass_y - 0.005, z),
        (width * 0.92, depth * 1.1, 0.014),
        mat_frame,
        bevel=0.002,
        segments=1,
    )


def create_side_window(parent, name, y, z, mat_frame, mat_glass):
    side_x = CENTER_X + (BODY_WIDTH / 2)
    frame_x = side_x + (WINDOW_DEPTH / 2) + 0.002
    glass_x = frame_x + 0.004
    width = WINDOW_SIZE * 0.95
    height = WINDOW_SIZE

    create_cube(
        parent,
        f"{name}_Marco_Azul",
        (frame_x, y, z),
        (WINDOW_DEPTH * 1.25, width + FRAME_THICKNESS * 2, height + FRAME_THICKNESS * 2),
        mat_frame,
        bevel=0.006,
        segments=2,
    )
    create_cube(
        parent,
        f"{name}_Cristal",
        (glass_x, y, z),
        (WINDOW_DEPTH, width, height),
        mat_glass,
        bevel=0.005,
        segments=2,
    )
    create_cube(
        parent,
        f"{name}_Cruceta_Vertical",
        (glass_x + 0.004, y, z),
        (WINDOW_DEPTH * 1.1, 0.014, height * 0.9),
        mat_frame,
        bevel=0.002,
        segments=1,
    )
    create_cube(
        parent,
        f"{name}_Cruceta_Horizontal",
        (glass_x + 0.005, y, z),
        (WINDOW_DEPTH * 1.1, width * 0.9, 0.014),
        mat_frame,
        bevel=0.002,
        segments=1,
    )


def create_luxury_door(parent, x, z, mat_wood, mat_blue, mat_gold, mat_shadow):
    front_y = CENTER_Y - (BODY_DEPTH / 2)
    door_y = front_y - (DOOR_DEPTH / 2) - 0.004

    # Marco separado en tres piezas para que parezca construido, no pegado.
    create_cube(
        parent,
        "Puerta_Marco_Azul_Izquierdo",
        (x - DOOR_WIDTH / 2 - FRAME_THICKNESS / 2, door_y, z),
        (FRAME_THICKNESS, DOOR_DEPTH * 1.2, DOOR_HEIGHT + FRAME_THICKNESS * 2),
        mat_blue,
        bevel=0.004,
        segments=2,
    )
    create_cube(
        parent,
        "Puerta_Marco_Azul_Derecho",
        (x + DOOR_WIDTH / 2 + FRAME_THICKNESS / 2, door_y, z),
        (FRAME_THICKNESS, DOOR_DEPTH * 1.2, DOOR_HEIGHT + FRAME_THICKNESS * 2),
        mat_blue,
        bevel=0.004,
        segments=2,
    )
    create_cube(
        parent,
        "Puerta_Marco_Azul_Superior",
        (x, door_y, z + DOOR_HEIGHT / 2 + FRAME_THICKNESS / 2),
        (DOOR_WIDTH + FRAME_THICKNESS * 2, DOOR_DEPTH * 1.2, FRAME_THICKNESS),
        mat_blue,
        bevel=0.004,
        segments=2,
    )

    create_cube(
        parent,
        "Puerta_Cuerpo_Madera",
        (x, door_y - 0.006, z),
        (DOOR_WIDTH, DOOR_DEPTH, DOOR_HEIGHT),
        mat_wood,
        bevel=0.006,
        segments=2,
    )

    panel_y = door_y - (DOOR_DEPTH / 2) - 0.006
    for i, panel_z in enumerate([z + DOOR_HEIGHT * 0.20, z - DOOR_HEIGHT * 0.18]):
        create_cube(
            parent,
            f"Puerta_Panel_Relieve_{i + 1}",
            (x, panel_y, panel_z),
            (DOOR_WIDTH * 0.62, 0.012, DOOR_HEIGHT * 0.26),
            mat_wood,
            bevel=0.005,
            segments=2,
        )
        create_cube(
            parent,
            f"Puerta_Panel_Sombra_{i + 1}",
            (x, panel_y - 0.006, panel_z),
            (DOOR_WIDTH * 0.44, 0.006, DOOR_HEIGHT * 0.17),
            mat_shadow,
            bevel=0.003,
            segments=1,
        )

    pomo_radius = 0.012
    pomo_x = x + (DOOR_WIDTH * 0.32)
    pomo_y = panel_y - 0.012
    pomo_z = z - 0.02

    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=pomo_radius, location=(pomo_x, pomo_y, pomo_z))
    pomo = bpy.context.active_object
    pomo.name = "Puerta_Pomo_Dorado"
    pomo.data.materials.append(mat_gold)
    parent_keep_world(pomo, parent)
    add_bevel(pomo, 0.0, 1)

    create_cube(
        parent,
        "Puerta_Escalon_Frontal",
        (x, front_y - 0.08, GROUND_Z + BASE_HEIGHT + 0.018),
        (DOOR_WIDTH + 0.08, 0.08, 0.036),
        mat_shadow,
        bevel=0.008,
        segments=2,
    )


def create_attic_window(parent, mat_glass, mat_blue):
    body_top_z = GROUND_Z + BASE_HEIGHT + BODY_HEIGHT
    attic_z = body_top_z + ROOF_HEIGHT * 0.36
    front_y = CENTER_Y - (BODY_DEPTH / 2) - 0.017

    win = create_cube(
        parent,
        "Ventana_Atico_Marco_Azul",
        (CENTER_X, front_y, attic_z),
        (0.13, WINDOW_DEPTH, 0.13),
        mat_blue,
        bevel=0.005,
        segments=2,
    )
    win.rotation_euler.y = math.radians(45)

    glass = create_cube(
        parent,
        "Ventana_Atico_Cristal",
        (CENTER_X, front_y - 0.006, attic_z),
        (0.085, WINDOW_DEPTH, 0.085),
        mat_glass,
        bevel=0.004,
        segments=2,
    )
    glass.rotation_euler.y = math.radians(45)


def create_shrubs(parent, mat_leaf, mat_flower):
    positions = [
        (-0.48, -0.50, 0.035),
        (0.45, -0.50, 0.035),
        (-0.50, 0.44, 0.035),
    ]
    for i, (x, y, z) in enumerate(positions):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.055, location=(x, y, z + 0.04))
        shrub = bpy.context.active_object
        shrub.name = f"Arbusto_Redondeado_{i + 1}"
        shrub.scale.z = 0.72
        shrub.data.materials.append(mat_leaf)
        parent_keep_world(shrub, parent)
        add_bevel(shrub, 0.0, 1)

    for i, x in enumerate([-0.38, 0.34]):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.014, location=(x, -0.47, GROUND_Z + BASE_HEIGHT + 0.055))
        flower = bpy.context.active_object
        flower.name = f"Flor_Detalle_{i + 1}"
        flower.scale.z = 0.55
        flower.data.materials.append(mat_flower)
        parent_keep_world(flower, parent)
        add_bevel(flower, 0.0, 1)


def build_stylized_house(collection):
    mat_lawn = get_or_create_material("Estilo_Grama_Suave", (0.42, 0.66, 0.36, 1), roughness=0.9)
    mat_path = get_or_create_material("Estilo_Acera_Piedra", (0.74, 0.76, 0.78, 1), roughness=0.65)
    mat_body = get_or_create_material("Estilo_Pared_Blanco_Calido", (0.93, 0.95, 0.96, 1), roughness=0.46)
    mat_side = get_or_create_material("Estilo_Pared_Lateral_Azulada", (0.70, 0.82, 0.90, 1), roughness=0.5)
    mat_roof = get_or_create_material("Estilo_Techo_Rojo_Vivo", COLOR_ROJO_COMPONENTES, roughness=0.48)
    mat_trim_red = get_or_create_material("Estilo_Zocalo_Rojo", shade_color(COLOR_ROJO_COMPONENTES, 0.76), roughness=0.55)

    mat_accent_blue = get_or_create_material("Estilo_Marcos_Azul", COLOR_AZUL_VENTANAS, roughness=0.42)
    mat_door_wood = get_or_create_material("Estilo_Puerta_Madera", (0.52, 0.28, 0.13, 1), roughness=0.62)
    mat_shadow = get_or_create_material("Estilo_Sombra_Detalles", (0.18, 0.11, 0.08, 1), roughness=0.78)
    mat_gold = get_or_create_material("Estilo_Pomo_Oro", (0.86, 0.64, 0.16, 1), roughness=0.18, metallic=1.0)
    mat_window_glass = get_or_create_material("Estilo_Ventana_Cristal", (0.50, 0.78, 0.94, 0.86), roughness=0.18)
    mat_leaf = get_or_create_material("Estilo_Arbusto", (0.20, 0.48, 0.24, 1), roughness=0.85)
    mat_flower = get_or_create_material("Estilo_Flor_Amarilla", (0.95, 0.72, 0.16, 1), roughness=0.65)

    root = bpy.data.objects.new(ROOT_NAME, None)
    root.location = (CENTER_X, CENTER_Y, GROUND_Z)
    collection.objects.link(root)

    create_lawn_base(root, mat_lawn, mat_trim_red)
    create_entrance_path(root, mat_path)
    create_body_and_trim(root, mat_body, mat_side, mat_trim_red)
    create_gable_wall(root, "Casa_Timpano_Frontal", CENTER_Y - BODY_DEPTH / 2 - 0.006, mat_body)
    create_gable_wall(root, "Casa_Timpano_Trasero", CENTER_Y + BODY_DEPTH / 2 + 0.006, mat_side)
    create_detailed_roof(root, mat_roof, mat_trim_red)
    create_chimney(root, mat_side, mat_roof, mat_shadow)

    door_x = CENTER_X - 0.20
    door_z = GROUND_Z + BASE_HEIGHT + (DOOR_HEIGHT / 2)
    create_luxury_door(root, door_x, door_z, mat_door_wood, mat_accent_blue, mat_gold, mat_shadow)

    window_z = GROUND_Z + BASE_HEIGHT + (BODY_HEIGHT * 0.58)
    create_front_frame(root, "Ventana_Frontal_Principal", CENTER_X + 0.22, window_z, WINDOW_SIZE, WINDOW_SIZE, WINDOW_DEPTH, mat_accent_blue, mat_window_glass)
    create_side_window(root, "Ventana_Lateral_Frontal", CENTER_Y - 0.20, window_z, mat_accent_blue, mat_window_glass)
    create_side_window(root, "Ventana_Lateral_Trasera", CENTER_Y + 0.18, window_z, mat_accent_blue, mat_window_glass)
    create_attic_window(root, mat_window_glass, mat_accent_blue)
    create_shrubs(root, mat_leaf, mat_flower)

    return root


def add_preview_camera_and_light():
    camera = bpy.context.scene.camera
    if not camera:
        bpy.ops.object.camera_add(location=(1.05, -1.72, 1.08))
        camera = bpy.context.active_object
        bpy.context.scene.camera = camera

    camera.name = "Casa_Preview_Camera"
    camera.location = (1.32, -2.18, 1.22)
    direction = Vector((0.0, 0.0, 0.42)) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 42

    if "MVP_Estilo_Light" not in bpy.data.objects:
        bpy.ops.object.light_add(type="AREA", location=(-1.5, -1.5, 2.5))
        light = bpy.context.active_object
        light.name = "MVP_Estilo_Light"
        light.data.energy = 720
        light.data.size = 2.4


def frame_view_if_possible():
    screen = getattr(bpy.context, "screen", None)
    if not screen:
        return

    for area in screen.areas:
        if area.type == "VIEW_3D":
            for region in area.regions:
                if region.type == "WINDOW":
                    with bpy.context.temp_override(area=area, region=region):
                        bpy.ops.view3d.view_all(center=False)
                    return


if __name__ == "__main__":
    remove_startup_cube_if_present()
    clear_existing_asset(ROOT_NAME)
    collection = create_assets_collection()
    build_stylized_house(collection)
    add_preview_camera_and_light()
    bpy.context.view_layer.update()
    frame_view_if_possible()
