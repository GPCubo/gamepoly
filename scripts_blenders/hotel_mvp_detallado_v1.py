import math
import bpy
from mathutils import Vector

ROOT_NAME = "Asset_Hotel_MVP_Detallado_v1"
COLLECTION_NAME = "Board_Assets"

# Centro exacto del mundo de Blender
CENTER_X = 0.0
CENTER_Y = 0.0
GROUND_Z = 0.0

# --- COLORES REUTILIZABLES ---
# Cambia estas dos variables para reutilizar el hotel con otra paleta.
COLOR_ROJO_COMPONENTES = (0.90, 0.10, 0.08, 1)
COLOR_AZUL_VENTANAS = (0.16, 0.43, 0.68, 1)

# --- MEDIDAS GENERALES ---
BASE_WIDTH = 1.75
BASE_DEPTH = 1.34
BASE_HEIGHT = 0.026

BODY_WIDTH = 1.34
BODY_DEPTH = 0.98
FLOOR_HEIGHT = 0.30
FLOOR_COUNT = 3
BODY_HEIGHT = FLOOR_HEIGHT * FLOOR_COUNT

ROOF_WIDTH = 1.48
ROOF_DEPTH = 1.10
ROOF_HEIGHT = 0.28

WINDOW_WIDTH = 0.15
WINDOW_HEIGHT = 0.18
WINDOW_DEPTH = 0.022
FRAME_THICKNESS = 0.014

DOOR_WIDTH = 0.22
DOOR_HEIGHT = 0.28
DOOR_DEPTH = 0.026


def clamp01(value):
    return max(0.0, min(1.0, value))


def shade_color(rgba, factor):
    return (
        clamp01(rgba[0] * factor),
        clamp01(rgba[1] * factor),
        clamp01(rgba[2] * factor),
        rgba[3],
    )


def mix_color(a, b, amount):
    return (
        clamp01(a[0] * (1.0 - amount) + b[0] * amount),
        clamp01(a[1] * (1.0 - amount) + b[1] * amount),
        clamp01(a[2] * (1.0 - amount) + b[2] * amount),
        a[3] * (1.0 - amount) + b[3] * amount,
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


def add_bevel(obj, width=0.008, segments=2):
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


def create_cylinder(parent, name, location, radius, depth, material, vertices=24, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    parent_keep_world(obj, parent)
    add_bevel(obj, bevel, 1)
    return obj


def create_lawn_base(parent, mat_lawn, mat_red, mat_path):
    base_z = GROUND_Z + BASE_HEIGHT / 2
    create_cube(
        parent,
        "Hotel_Grama_Base",
        (CENTER_X, CENTER_Y, base_z),
        (BASE_WIDTH, BASE_DEPTH, BASE_HEIGHT),
        mat_lawn,
        bevel=0.018,
        segments=3,
    )

    trim_z = GROUND_Z + BASE_HEIGHT + 0.012
    border_y = CENTER_Y - BASE_DEPTH / 2 + 0.018
    walkway_width = 0.33
    border_width = BASE_WIDTH * 0.92
    min_x = CENTER_X - border_width / 2
    max_x = CENTER_X + border_width / 2
    gap_min_x = CENTER_X - walkway_width / 2
    gap_max_x = CENTER_X + walkway_width / 2

    for suffix, part_min_x, part_max_x in [
        ("Izquierdo", min_x, gap_min_x),
        ("Derecho", gap_max_x, max_x),
    ]:
        width = part_max_x - part_min_x
        if width <= 0:
            continue

        create_cube(
            parent,
            f"Hotel_Borde_Base_Frontal_{suffix}",
            ((part_min_x + part_max_x) / 2, border_y, trim_z),
            (width, 0.032, 0.038),
            mat_red,
            bevel=0.004,
        )

    for name, y in [
        ("Hotel_Borde_Base_Trasero", CENTER_Y + BASE_DEPTH / 2 - 0.018),
        ("Hotel_Borde_Base_Lateral_Derecho", CENTER_Y),
        ("Hotel_Borde_Base_Lateral_Izquierdo", CENTER_Y),
    ]:
        if "Lateral_Derecho" in name:
            create_cube(
                parent,
                name,
                (CENTER_X + BASE_WIDTH / 2 - 0.018, y, trim_z),
                (0.032, BASE_DEPTH * 0.88, 0.038),
                mat_red,
                bevel=0.004,
            )
        elif "Lateral_Izquierdo" in name:
            create_cube(
                parent,
                name,
                (CENTER_X - BASE_WIDTH / 2 + 0.018, y, trim_z),
                (0.032, BASE_DEPTH * 0.88, 0.038),
                mat_red,
                bevel=0.004,
            )
        else:
            create_cube(
                parent,
                name,
                (CENTER_X, y, trim_z),
                (BASE_WIDTH * 0.92, 0.032, 0.038),
                mat_red,
                bevel=0.004,
            )

    front_y = CENTER_Y - BODY_DEPTH / 2
    path_y = (front_y + (CENTER_Y - BASE_DEPTH / 2)) / 2
    path_depth = abs(front_y - (CENTER_Y - BASE_DEPTH / 2))
    create_cube(
        parent,
        "Hotel_Camino_Entrada",
        (CENTER_X, path_y, GROUND_Z + BASE_HEIGHT + 0.005),
        (0.31, path_depth, 0.010),
        mat_path,
        bevel=0.006,
        segments=2,
    )

    for i in range(4):
        y = CENTER_Y - BASE_DEPTH / 2 + 0.055 + i * (path_depth / 4)
        create_cube(
            parent,
            f"Hotel_Camino_Losa_{i + 1}",
            (CENTER_X, y, GROUND_Z + BASE_HEIGHT + 0.011),
            (0.27, 0.034, 0.006),
            mat_path,
            bevel=0.004,
        )


def create_main_body(parent, mat_wall, mat_side, mat_red):
    body_z = GROUND_Z + BASE_HEIGHT + BODY_HEIGHT / 2
    create_cube(
        parent,
        "Hotel_Cuerpo_Principal",
        (CENTER_X, CENTER_Y, body_z),
        (BODY_WIDTH, BODY_DEPTH, BODY_HEIGHT),
        mat_wall,
        bevel=0.016,
        segments=3,
    )

    right_x = CENTER_X + BODY_WIDTH / 2 + 0.004
    create_cube(
        parent,
        "Hotel_Pared_Lateral_Azulada",
        (right_x, CENTER_Y, body_z),
        (0.014, BODY_DEPTH * 0.94, BODY_HEIGHT * 0.98),
        mat_side,
        bevel=0.004,
    )

    front_y = CENTER_Y - BODY_DEPTH / 2 - 0.012
    back_y = CENTER_Y + BODY_DEPTH / 2 + 0.012
    right_band_x = CENTER_X + BODY_WIDTH / 2 + 0.012
    left_band_x = CENTER_X - BODY_WIDTH / 2 - 0.012

    band_z_values = [
        GROUND_Z + BASE_HEIGHT + 0.035,
        GROUND_Z + BASE_HEIGHT + FLOOR_HEIGHT,
        GROUND_Z + BASE_HEIGHT + FLOOR_HEIGHT * 2,
    ]

    for idx, z in enumerate(band_z_values):
        name_suffix = idx + 1
        create_cube(
            parent,
            f"Hotel_Zocalo_Frontal_Nivel_{name_suffix}",
            (CENTER_X, front_y, z),
            (BODY_WIDTH + 0.045, 0.026, 0.058),
            mat_red,
            bevel=0.004,
        )
        create_cube(
            parent,
            f"Hotel_Zocalo_Trasero_Nivel_{name_suffix}",
            (CENTER_X, back_y, z),
            (BODY_WIDTH + 0.045, 0.026, 0.058),
            mat_red,
            bevel=0.004,
        )
        create_cube(
            parent,
            f"Hotel_Zocalo_Derecho_Nivel_{name_suffix}",
            (right_band_x, CENTER_Y, z),
            (0.026, BODY_DEPTH + 0.04, 0.058),
            mat_red,
            bevel=0.004,
        )
        create_cube(
            parent,
            f"Hotel_Zocalo_Izquierdo_Nivel_{name_suffix}",
            (left_band_x, CENTER_Y, z),
            (0.026, BODY_DEPTH + 0.04, 0.058),
            mat_red,
            bevel=0.004,
        )


def create_hip_roof(parent, name, center, width, depth, base_z, height, mat_roof, mat_trim, ridge_axis="x"):
    half_w = width / 2
    half_d = depth / 2
    top_z = base_z + height

    verts = [
        (center[0] - half_w, center[1] - half_d, base_z),
        (center[0] + half_w, center[1] - half_d, base_z),
        (center[0] + half_w, center[1] + half_d, base_z),
        (center[0] - half_w, center[1] + half_d, base_z),
    ]

    if ridge_axis == "x":
        ridge_half = max(0.0, half_w - half_d * 0.52)
        verts.extend([
            (center[0] - ridge_half, center[1], top_z),
            (center[0] + ridge_half, center[1], top_z),
        ])
        faces = [
            (0, 1, 2, 3),
            (0, 1, 5, 4),
            (1, 2, 5),
            (2, 3, 4, 5),
            (3, 0, 4),
        ]
        ridge_dims = (ridge_half * 2 + 0.06, 0.045, 0.030)
    else:
        ridge_half = max(0.0, half_d - half_w * 0.52)
        verts.extend([
            (center[0], center[1] - ridge_half, top_z),
            (center[0], center[1] + ridge_half, top_z),
        ])
        faces = [
            (0, 1, 2, 3),
            (0, 1, 4),
            (1, 2, 5, 4),
            (2, 3, 5),
            (3, 0, 4, 5),
        ]
        ridge_dims = (0.045, ridge_half * 2 + 0.06, 0.030)

    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    roof = bpy.data.objects.new(name, mesh)
    roof.data.materials.append(mat_roof)
    bpy.context.collection.objects.link(roof)
    parent_keep_world(roof, parent)
    add_bevel(roof, 0.012, 3)

    create_cube(
        parent,
        f"{name}_Cumbrera",
        (center[0], center[1], top_z + 0.012),
        ridge_dims,
        mat_trim,
        bevel=0.006,
        segments=2,
    )

    create_cube(
        parent,
        f"{name}_Fascia_Frontal",
        (center[0], center[1] - half_d - 0.012, base_z + 0.026),
        (width + 0.04, 0.026, 0.050),
        mat_trim,
        bevel=0.004,
    )
    create_cube(
        parent,
        f"{name}_Fascia_Trasera",
        (center[0], center[1] + half_d + 0.012, base_z + 0.026),
        (width + 0.04, 0.026, 0.050),
        mat_trim,
        bevel=0.004,
    )
    create_cube(
        parent,
        f"{name}_Fascia_Derecha",
        (center[0] + half_w + 0.012, center[1], base_z + 0.026),
        (0.026, depth + 0.04, 0.050),
        mat_trim,
        bevel=0.004,
    )
    create_cube(
        parent,
        f"{name}_Fascia_Izquierda",
        (center[0] - half_w - 0.012, center[1], base_z + 0.026),
        (0.026, depth + 0.04, 0.050),
        mat_trim,
        bevel=0.004,
    )

    return roof


def roof_height_at_x(x):
    half_w = ROOF_WIDTH / 2
    roof_base_z = GROUND_Z + BASE_HEIGHT + BODY_HEIGHT - 0.006
    return roof_base_z + ROOF_HEIGHT * max(0.0, 1.0 - abs(x) / half_w)


def create_segmented_roof_tile_line(parent, base_name, x, z, angle, length, mat_trim, obstacles):
    min_y = CENTER_Y - length / 2
    max_y = CENTER_Y + length / 2
    gaps = []

    for min_x, max_x, gap_min_y, gap_max_y in obstacles:
        if min_x <= x <= max_x:
            gaps.append((max(min_y, gap_min_y), min(max_y, gap_max_y)))

    gaps = sorted(gap for gap in gaps if gap[1] > gap[0])
    segments = []
    cursor = min_y
    for gap_min_y, gap_max_y in gaps:
        if gap_min_y > cursor:
            segments.append((cursor, gap_min_y))
        cursor = max(cursor, gap_max_y)
    if cursor < max_y:
        segments.append((cursor, max_y))

    if not segments:
        return

    for index, (part_min_y, part_max_y) in enumerate(segments, start=1):
        part_len = part_max_y - part_min_y
        if part_len <= 0.12:
            continue

        part_name = base_name if len(segments) == 1 else f"{base_name}_Parte_{index}"
        tile = create_cube(
            parent,
            part_name,
            (x, (part_min_y + part_max_y) / 2, z),
            (0.014, part_len, 0.014),
            mat_trim,
            bevel=0.003,
            segments=1,
        )
        tile.rotation_euler.y = angle


def create_roof_tile_lines(parent, mat_trim):
    half_w = ROOF_WIDTH / 2
    slope_angle = math.atan2(ROOF_HEIGHT, half_w)
    length = ROOF_DEPTH * 0.78

    obstacles = [
        # Torre central y su techo.
        (-0.12, 0.44, -0.31, 0.25),
        # Chimenea izquierda.
        (-0.59, -0.32, 0.08, 0.39),
        # Chimenea derecha.
        (0.39, 0.66, 0.12, 0.42),
    ]

    for side, angle in [(-1, slope_angle), (1, -slope_angle)]:
        for i, x_abs in enumerate([0.18, 0.36, 0.54]):
            x = side * x_abs
            z = roof_height_at_x(x) + 0.018
            create_segmented_roof_tile_line(
                parent,
                f"Hotel_Techo_Linea_Teja_{'Izq' if side < 0 else 'Der'}_{i + 1}",
                x,
                z,
                angle,
                length,
                mat_trim,
                obstacles,
            )


def create_roof_system(parent, mat_roof, mat_trim, mat_wall):
    roof_base_z = GROUND_Z + BASE_HEIGHT + BODY_HEIGHT - 0.006
    create_hip_roof(
        parent,
        "Hotel_Techo_Principal",
        (CENTER_X, CENTER_Y, 0),
        ROOF_WIDTH,
        ROOF_DEPTH,
        roof_base_z,
        ROOF_HEIGHT,
        mat_roof,
        mat_trim,
        ridge_axis="x",
    )
    create_roof_tile_lines(parent, mat_trim)

    # Torre central con techo rojo y asta de bandera.
    tower_z = roof_base_z + ROOF_HEIGHT * 0.52
    create_cube(
        parent,
        "Hotel_Torre_Central_Pared",
        (0.16, -0.02, tower_z + 0.10),
        (0.34, 0.30, 0.20),
        mat_wall,
        bevel=0.008,
        segments=2,
    )
    create_hip_roof(
        parent,
        "Hotel_Torre_Central_Techo",
        (0.16, -0.02, 0),
        0.42,
        0.38,
        tower_z + 0.20,
        0.12,
        mat_roof,
        mat_trim,
        ridge_axis="x",
    )


def create_chimney(parent, name, x, y, mat_wall, mat_roof, mat_dark):
    base_z = roof_height_at_x(x) + 0.055
    create_cube(
        parent,
        f"{name}_Cuerpo",
        (x, y, base_z),
        (0.13, 0.12, 0.18),
        mat_wall,
        bevel=0.008,
        segments=2,
    )
    create_cube(
        parent,
        f"{name}_Tapa_Roja",
        (x, y, base_z + 0.105),
        (0.17, 0.16, 0.035),
        mat_roof,
        bevel=0.006,
        segments=2,
    )
    create_cube(
        parent,
        f"{name}_Hueco",
        (x, y, base_z + 0.126),
        (0.082, 0.072, 0.008),
        mat_dark,
        bevel=0.003,
        segments=1,
    )


def create_front_window(parent, name, x, z, mat_glass, mat_blue):
    front_y = CENTER_Y - BODY_DEPTH / 2
    frame_y = front_y - WINDOW_DEPTH / 2 - 0.004
    glass_y = frame_y - 0.004

    create_cube(
        parent,
        f"{name}_Marco_Azul",
        (x, frame_y, z),
        (WINDOW_WIDTH + FRAME_THICKNESS * 2, WINDOW_DEPTH * 1.25, WINDOW_HEIGHT + FRAME_THICKNESS * 2),
        mat_blue,
        bevel=0.005,
        segments=2,
    )
    create_cube(
        parent,
        f"{name}_Cristal",
        (x, glass_y, z),
        (WINDOW_WIDTH, WINDOW_DEPTH, WINDOW_HEIGHT),
        mat_glass,
        bevel=0.004,
        segments=2,
    )
    create_cube(
        parent,
        f"{name}_Cruceta_Vertical",
        (x, glass_y - 0.004, z),
        (0.012, WINDOW_DEPTH * 1.1, WINDOW_HEIGHT * 0.90),
        mat_blue,
        bevel=0.002,
        segments=1,
    )
    create_cube(
        parent,
        f"{name}_Cruceta_Horizontal",
        (x, glass_y - 0.005, z),
        (WINDOW_WIDTH * 0.88, WINDOW_DEPTH * 1.1, 0.012),
        mat_blue,
        bevel=0.002,
        segments=1,
    )


def create_back_window(parent, name, x, z, mat_glass, mat_blue):
    back_y = CENTER_Y + BODY_DEPTH / 2
    frame_y = back_y + WINDOW_DEPTH / 2 + 0.004
    glass_y = frame_y + 0.004

    create_cube(
        parent,
        f"{name}_Marco_Azul",
        (x, frame_y, z),
        (WINDOW_WIDTH + FRAME_THICKNESS * 2, WINDOW_DEPTH * 1.25, WINDOW_HEIGHT + FRAME_THICKNESS * 2),
        mat_blue,
        bevel=0.005,
        segments=2,
    )
    create_cube(
        parent,
        f"{name}_Cristal",
        (x, glass_y, z),
        (WINDOW_WIDTH, WINDOW_DEPTH, WINDOW_HEIGHT),
        mat_glass,
        bevel=0.004,
        segments=2,
    )
    create_cube(
        parent,
        f"{name}_Cruceta_Vertical",
        (x, glass_y + 0.004, z),
        (0.012, WINDOW_DEPTH * 1.1, WINDOW_HEIGHT * 0.90),
        mat_blue,
        bevel=0.002,
        segments=1,
    )
    create_cube(
        parent,
        f"{name}_Cruceta_Horizontal",
        (x, glass_y + 0.005, z),
        (WINDOW_WIDTH * 0.88, WINDOW_DEPTH * 1.1, 0.012),
        mat_blue,
        bevel=0.002,
        segments=1,
    )


def create_side_window(parent, name, side, y, z, mat_glass, mat_blue):
    side_x = CENTER_X + side * (BODY_WIDTH / 2)
    frame_x = side_x + side * (WINDOW_DEPTH / 2 + 0.004)
    glass_x = frame_x + side * 0.004

    create_cube(
        parent,
        f"{name}_Marco_Azul",
        (frame_x, y, z),
        (WINDOW_DEPTH * 1.25, WINDOW_WIDTH + FRAME_THICKNESS * 2, WINDOW_HEIGHT + FRAME_THICKNESS * 2),
        mat_blue,
        bevel=0.005,
        segments=2,
    )
    create_cube(
        parent,
        f"{name}_Cristal",
        (glass_x, y, z),
        (WINDOW_DEPTH, WINDOW_WIDTH, WINDOW_HEIGHT),
        mat_glass,
        bevel=0.004,
        segments=2,
    )
    create_cube(
        parent,
        f"{name}_Cruceta_Vertical",
        (glass_x + side * 0.004, y, z),
        (WINDOW_DEPTH * 1.1, 0.012, WINDOW_HEIGHT * 0.90),
        mat_blue,
        bevel=0.002,
        segments=1,
    )
    create_cube(
        parent,
        f"{name}_Cruceta_Horizontal",
        (glass_x + side * 0.005, y, z),
        (WINDOW_DEPTH * 1.1, WINDOW_WIDTH * 0.88, 0.012),
        mat_blue,
        bevel=0.002,
        segments=1,
    )


def create_windows(parent, mat_glass, mat_blue):
    floor_centers = [
        GROUND_Z + BASE_HEIGHT + FLOOR_HEIGHT * 0.50,
        GROUND_Z + BASE_HEIGHT + FLOOR_HEIGHT * 1.50,
        GROUND_Z + BASE_HEIGHT + FLOOR_HEIGHT * 2.50,
    ]

    front_positions_by_floor = [
        [-0.46, 0.46],
        [-0.46, -0.23, 0.23, 0.46],
        [-0.46, -0.23, 0.23, 0.46],
    ]

    for floor_index, z in enumerate(floor_centers):
        for x in front_positions_by_floor[floor_index]:
            create_front_window(
                parent,
                f"Hotel_Ventana_Frontal_P{floor_index + 1}_{int((x + 1) * 100)}",
                x,
                z,
                mat_glass,
                mat_blue,
            )

    side_y_positions = [-0.30, -0.02, 0.26]
    for floor_index, z in enumerate(floor_centers):
        for side, side_name in [(1, "Derecha"), (-1, "Izquierda")]:
            for idx, y in enumerate(side_y_positions):
                create_side_window(
                    parent,
                    f"Hotel_Ventana_{side_name}_P{floor_index + 1}_{idx + 1}",
                    side,
                    y,
                    z,
                    mat_glass,
                    mat_blue,
                )

    back_x_positions = [-0.46, -0.23, 0.23, 0.46]
    for floor_index, z in enumerate(floor_centers):
        for idx, x in enumerate(back_x_positions):
            create_back_window(
                parent,
                f"Hotel_Ventana_Trasera_P{floor_index + 1}_{idx + 1}",
                x,
                z,
                mat_glass,
                mat_blue,
            )


def create_double_door(parent, mat_wood, mat_blue, mat_gold, mat_shadow):
    front_y = CENTER_Y - BODY_DEPTH / 2
    door_z = GROUND_Z + BASE_HEIGHT + DOOR_HEIGHT / 2
    door_y = front_y - DOOR_DEPTH / 2 - 0.005

    create_cube(
        parent,
        "Hotel_Puerta_Marco_Azul",
        (CENTER_X, door_y, door_z),
        (DOOR_WIDTH + FRAME_THICKNESS * 2, DOOR_DEPTH * 1.2, DOOR_HEIGHT + FRAME_THICKNESS * 2),
        mat_blue,
        bevel=0.005,
        segments=2,
    )

    for side in [-1, 1]:
        panel_x = side * DOOR_WIDTH * 0.25
        create_cube(
            parent,
            f"Hotel_Puerta_Hoja_{'Izq' if side < 0 else 'Der'}",
            (panel_x, door_y - 0.007, door_z),
            (DOOR_WIDTH * 0.48, DOOR_DEPTH, DOOR_HEIGHT),
            mat_wood,
            bevel=0.006,
            segments=2,
        )
        for i, panel_z in enumerate([door_z + DOOR_HEIGHT * 0.18, door_z - DOOR_HEIGHT * 0.18]):
            create_cube(
                parent,
                f"Hotel_Puerta_Panel_{'Izq' if side < 0 else 'Der'}_{i + 1}",
                (panel_x, door_y - 0.023, panel_z),
                (DOOR_WIDTH * 0.28, 0.010, DOOR_HEIGHT * 0.20),
                mat_wood,
                bevel=0.004,
                segments=1,
            )

    create_cube(
        parent,
        "Hotel_Puerta_Division_Central",
        (CENTER_X, door_y - 0.025, door_z),
        (0.012, 0.012, DOOR_HEIGHT * 0.92),
        mat_shadow,
        bevel=0.002,
        segments=1,
    )

    for side in [-1, 1]:
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=20,
            ring_count=10,
            radius=0.010,
            location=(side * 0.028, door_y - 0.038, door_z),
        )
        knob = bpy.context.active_object
        knob.name = f"Hotel_Puerta_Pomo_{'Izq' if side < 0 else 'Der'}"
        knob.data.materials.append(mat_gold)
        parent_keep_world(knob, parent)
        add_bevel(knob, 0.0, 1)


def create_terrace_door(parent, mat_wood, mat_blue, mat_glass, mat_gold, mat_shadow):
    front_y = CENTER_Y - BODY_DEPTH / 2
    door_height = 0.26
    door_width = 0.17
    door_z = GROUND_Z + BASE_HEIGHT + FLOOR_HEIGHT + door_height / 2 + 0.012
    door_y = front_y - DOOR_DEPTH / 2 - 0.006

    create_cube(
        parent,
        "Hotel_Puerta_Terraza_Marco_Azul",
        (CENTER_X, door_y, door_z),
        (door_width + FRAME_THICKNESS * 2, DOOR_DEPTH * 1.18, door_height + FRAME_THICKNESS * 2),
        mat_blue,
        bevel=0.005,
        segments=2,
    )
    create_cube(
        parent,
        "Hotel_Puerta_Terraza_Cuerpo_Madera",
        (CENTER_X, door_y - 0.007, door_z),
        (door_width, DOOR_DEPTH, door_height),
        mat_wood,
        bevel=0.005,
        segments=2,
    )
    create_cube(
        parent,
        "Hotel_Puerta_Terraza_Cristal",
        (CENTER_X, door_y - 0.021, door_z + door_height * 0.17),
        (door_width * 0.62, 0.010, door_height * 0.35),
        mat_glass,
        bevel=0.004,
        segments=2,
    )
    create_cube(
        parent,
        "Hotel_Puerta_Terraza_Panel_Inferior",
        (CENTER_X, door_y - 0.023, door_z - door_height * 0.22),
        (door_width * 0.60, 0.010, door_height * 0.22),
        mat_shadow,
        bevel=0.003,
        segments=1,
    )

    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=20,
        ring_count=10,
        radius=0.009,
        location=(door_width * 0.28, door_y - 0.038, door_z - 0.015),
    )
    knob = bpy.context.active_object
    knob.name = "Hotel_Puerta_Terraza_Pomo"
    knob.data.materials.append(mat_gold)
    parent_keep_world(knob, parent)
    add_bevel(knob, 0.0, 1)


def create_portico_and_balcony(parent, mat_red, mat_blue, mat_wall, mat_shadow):
    front_y = CENTER_Y - BODY_DEPTH / 2
    column_y = front_y - 0.13
    base_z = GROUND_Z + BASE_HEIGHT

    create_cube(
        parent,
        "Hotel_Entrada_Escalon",
        (CENTER_X, column_y - 0.04, base_z + 0.020),
        (0.38, 0.16, 0.040),
        mat_shadow,
        bevel=0.008,
        segments=2,
    )

    for side in [-1, 1]:
        x = side * 0.16
        create_cube(
            parent,
            f"Hotel_Columna_Base_{'Izq' if side < 0 else 'Der'}",
            (x, column_y, base_z + 0.035),
            (0.060, 0.060, 0.070),
            mat_red,
            bevel=0.006,
            segments=2,
        )
        create_cylinder(
            parent,
            f"Hotel_Columna_{'Izq' if side < 0 else 'Der'}",
            (x, column_y, base_z + 0.18),
            0.022,
            0.30,
            mat_wall,
            vertices=24,
            bevel=0.001,
        )
        create_cube(
            parent,
            f"Hotel_Columna_Capitel_{'Izq' if side < 0 else 'Der'}",
            (x, column_y, base_z + 0.335),
            (0.066, 0.066, 0.055),
            mat_blue,
            bevel=0.005,
            segments=2,
        )

    create_cube(
        parent,
        "Hotel_Portico_Viga_Azul",
        (CENTER_X, column_y, base_z + 0.365),
        (0.42, 0.058, 0.050),
        mat_blue,
        bevel=0.005,
        segments=2,
    )

    balcony_z = GROUND_Z + BASE_HEIGHT + FLOOR_HEIGHT + 0.03
    balcony_y = front_y - 0.115
    create_cube(
        parent,
        "Hotel_Balcon_Losa_Roja",
        (CENTER_X, balcony_y, balcony_z),
        (0.58, 0.12, 0.035),
        mat_red,
        bevel=0.006,
        segments=2,
    )

    railing_z = balcony_z + 0.095
    create_cube(
        parent,
        "Hotel_Balcon_Pasamanos_Azul",
        (CENTER_X, balcony_y - 0.06, railing_z),
        (0.56, 0.020, 0.034),
        mat_blue,
        bevel=0.004,
        segments=2,
    )
    for i, x in enumerate([-0.23, -0.15, -0.07, 0.00, 0.07, 0.15, 0.23]):
        create_cube(
            parent,
            f"Hotel_Balcon_Barrote_{i + 1}",
            (x, balcony_y - 0.06, railing_z - 0.060),
            (0.020, 0.020, 0.110),
            mat_blue,
            bevel=0.003,
            segments=1,
        )

    side_rail_x = 0.29
    side_rail_depth = 0.12
    for side, suffix in [(-1, "Izquierdo"), (1, "Derecho")]:
        x = side * side_rail_x
        create_cube(
            parent,
            f"Hotel_Balcon_Pasamanos_Lateral_{suffix}",
            (x, balcony_y, railing_z),
            (0.020, side_rail_depth, 0.034),
            mat_blue,
            bevel=0.004,
            segments=2,
        )

        for i, y in enumerate([balcony_y - 0.035, balcony_y + 0.015, balcony_y + 0.045]):
            create_cube(
                parent,
                f"Hotel_Balcon_Barrote_Lateral_{suffix}_{i + 1}",
                (x, y, railing_z - 0.060),
                (0.020, 0.020, 0.110),
                mat_blue,
                bevel=0.003,
                segments=1,
            )


def create_hotel_sign(parent, mat_white, mat_blue, mat_red, mat_text):
    front_y = CENTER_Y - BODY_DEPTH / 2 - 0.030
    sign_z = GROUND_Z + BASE_HEIGHT + FLOOR_HEIGHT * 2.55

    create_cube(
        parent,
        "Hotel_Letrero_Marco_Azul",
        (CENTER_X, front_y, sign_z),
        (0.39, 0.034, 0.145),
        mat_blue,
        bevel=0.006,
        segments=2,
    )
    create_cube(
        parent,
        "Hotel_Letrero_Fondo",
        (CENTER_X, front_y - 0.010, sign_z),
        (0.34, 0.026, 0.105),
        mat_white,
        bevel=0.004,
        segments=2,
    )

    curve_data = bpy.data.curves.new(name="Hotel_Texto_Data", type="FONT")
    curve_data.body = "HOTEL"
    curve_data.size = 0.065
    curve_data.extrude = 0.003
    curve_data.align_x = "CENTER"
    curve_data.align_y = "CENTER"
    curve_data.space_character = 0.98
    text = bpy.data.objects.new("Hotel_Texto_Fachada", curve_data)
    text.location = (CENTER_X, front_y - 0.028, sign_z - 0.002)
    text.rotation_euler = (math.radians(90), 0.0, 0.0)
    text.data.materials.append(mat_text)
    bpy.context.collection.objects.link(text)
    parent_keep_world(text, parent)

    # Remate triangular rojo sobre el letrero, inspirado en el fronton del hotel de referencia.
    roof_z = sign_z + 0.105
    left = create_cube(
        parent,
        "Hotel_Letrero_Techo_Izquierdo",
        (-0.095, front_y - 0.006, roof_z),
        (0.26, 0.040, 0.040),
        mat_red,
        bevel=0.004,
        segments=2,
    )
    left.rotation_euler.y = math.radians(-28)
    right = create_cube(
        parent,
        "Hotel_Letrero_Techo_Derecho",
        (0.095, front_y - 0.006, roof_z),
        (0.26, 0.040, 0.040),
        mat_red,
        bevel=0.004,
        segments=2,
    )
    right.rotation_euler.y = math.radians(28)


def create_flag(parent, mat_red, mat_white, mat_blue):
    pole_x = 0.16
    pole_y = -0.02
    pole_base_z = GROUND_Z + BASE_HEIGHT + BODY_HEIGHT + ROOF_HEIGHT + 0.08
    pole_height = 0.34

    create_cylinder(
        parent,
        "Hotel_Bandera_Asta",
        (pole_x, pole_y, pole_base_z + pole_height / 2),
        0.010,
        pole_height,
        mat_blue,
        vertices=20,
        bevel=0.0,
    )

    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=20,
        ring_count=10,
        radius=0.022,
        location=(pole_x, pole_y, pole_base_z + pole_height + 0.018),
    )
    top = bpy.context.active_object
    top.name = "Hotel_Bandera_Remate"
    top.data.materials.append(mat_blue)
    parent_keep_world(top, parent)

    flag_z = pole_base_z + pole_height * 0.76
    flag_width = 0.22
    flag_height = 0.13
    y = pole_y - 0.002
    verts = [
        (pole_x, y, flag_z + flag_height / 2),
        (pole_x + flag_width * 0.72, y, flag_z + flag_height * 0.42),
        (pole_x + flag_width, y, flag_z + flag_height * 0.18),
        (pole_x + flag_width * 0.72, y, flag_z - flag_height * 0.22),
        (pole_x, y, flag_z - flag_height / 2),
    ]
    mesh = bpy.data.meshes.new("Hotel_Bandera_Roja_Mesh")
    mesh.from_pydata(verts, [], [(0, 1, 2, 3, 4)])
    mesh.update()
    flag = bpy.data.objects.new("Hotel_Bandera_Roja", mesh)
    flag.data.materials.append(mat_red)
    bpy.context.collection.objects.link(flag)
    parent_keep_world(flag, parent)
    add_bevel(flag, 0.002, 1)

    create_star_mesh(
        parent,
        "Hotel_Bandera_Estrella",
        (pole_x + flag_width * 0.47, y - 0.004, flag_z),
        0.040,
        0.017,
        mat_white,
    )


def create_star_mesh(parent, name, center, outer_radius, inner_radius, material):
    verts = [center]
    points = []
    for i in range(10):
        angle = math.radians(90 + i * 36)
        radius = outer_radius if i % 2 == 0 else inner_radius
        points.append((
            center[0] + math.cos(angle) * radius,
            center[1],
            center[2] + math.sin(angle) * radius,
        ))
    verts.extend(points)
    faces = []
    for i in range(10):
        faces.append((0, i + 1, 1 + ((i + 1) % 10)))

    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    star = bpy.data.objects.new(name, mesh)
    star.data.materials.append(material)
    bpy.context.collection.objects.link(star)
    parent_keep_world(star, parent)
    add_bevel(star, 0.0, 1)


def create_shrubs(parent, mat_leaf, mat_flower):
    for i, (x, y) in enumerate([(-0.70, -0.52), (0.68, -0.50), (-0.70, 0.50), (0.70, 0.47)]):
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=24,
            ring_count=12,
            radius=0.055,
            location=(x, y, GROUND_Z + BASE_HEIGHT + 0.050),
        )
        shrub = bpy.context.active_object
        shrub.name = f"Hotel_Arbusto_{i + 1}"
        shrub.scale.z = 0.70
        shrub.data.materials.append(mat_leaf)
        parent_keep_world(shrub, parent)
        add_bevel(shrub, 0.0, 1)

    for i, (x, y) in enumerate([(-0.52, -0.56), (0.52, -0.56), (0.58, 0.52)]):
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=16,
            ring_count=8,
            radius=0.013,
            location=(x, y, GROUND_Z + BASE_HEIGHT + 0.052),
        )
        flower = bpy.context.active_object
        flower.name = f"Hotel_Flor_{i + 1}"
        flower.scale.z = 0.55
        flower.data.materials.append(mat_flower)
        parent_keep_world(flower, parent)
        add_bevel(flower, 0.0, 1)


def build_hotel(collection):
    red_dark = shade_color(COLOR_ROJO_COMPONENTES, 0.74)
    red_light = mix_color(COLOR_ROJO_COMPONENTES, (1.0, 1.0, 1.0, 1.0), 0.18)
    blue_dark = shade_color(COLOR_AZUL_VENTANAS, 0.78)
    wall_blue_tint = mix_color((0.95, 0.97, 0.98, 1), COLOR_AZUL_VENTANAS, 0.16)

    mat_lawn = get_or_create_material("Hotel_Grama", (0.43, 0.66, 0.37, 1), roughness=0.9)
    mat_path = get_or_create_material("Hotel_Acera", (0.78, 0.80, 0.82, 1), roughness=0.64)
    mat_wall = get_or_create_material("Hotel_Pared_Blanco", (0.94, 0.96, 0.97, 1), roughness=0.46)
    mat_side = get_or_create_material("Hotel_Pared_Lateral_Azulada", wall_blue_tint, roughness=0.50)
    mat_roof = get_or_create_material("Hotel_Rojo_Principal", COLOR_ROJO_COMPONENTES, roughness=0.48)
    mat_red_trim = get_or_create_material("Hotel_Rojo_Borde", red_dark, roughness=0.55)
    mat_red_light = get_or_create_material("Hotel_Rojo_Luz", red_light, roughness=0.48)
    mat_blue = get_or_create_material("Hotel_Azul_Ventanas", COLOR_AZUL_VENTANAS, roughness=0.42)
    mat_blue_dark = get_or_create_material("Hotel_Azul_Oscuro", blue_dark, roughness=0.46)
    mat_glass = get_or_create_material("Hotel_Cristal", (0.53, 0.79, 0.94, 0.86), roughness=0.18)
    mat_wood = get_or_create_material("Hotel_Madera_Puertas", (0.55, 0.30, 0.14, 1), roughness=0.62)
    mat_gold = get_or_create_material("Hotel_Pomos_Oro", (0.86, 0.64, 0.16, 1), roughness=0.18, metallic=1.0)
    mat_shadow = get_or_create_material("Hotel_Sombra_Detalles", (0.18, 0.12, 0.08, 1), roughness=0.78)
    mat_white = get_or_create_material("Hotel_Blanco_Letrero", (0.96, 0.98, 0.99, 1), roughness=0.4)
    mat_leaf = get_or_create_material("Hotel_Arbusto_Verde", (0.22, 0.48, 0.25, 1), roughness=0.85)
    mat_flower = get_or_create_material("Hotel_Flor_Amarilla", (0.95, 0.72, 0.16, 1), roughness=0.65)

    root = bpy.data.objects.new(ROOT_NAME, None)
    root.location = (CENTER_X, CENTER_Y, GROUND_Z)
    collection.objects.link(root)

    create_lawn_base(root, mat_lawn, mat_red_trim, mat_path)
    create_main_body(root, mat_wall, mat_side, mat_red_trim)
    create_windows(root, mat_glass, mat_blue)
    create_double_door(root, mat_wood, mat_blue, mat_gold, mat_shadow)
    create_terrace_door(root, mat_wood, mat_blue, mat_glass, mat_gold, mat_shadow)
    create_portico_and_balcony(root, mat_red_trim, mat_blue_dark, mat_wall, mat_shadow)
    create_hotel_sign(root, mat_white, mat_blue, mat_red_trim, mat_blue_dark)
    create_roof_system(root, mat_roof, mat_red_trim, mat_wall)
    create_chimney(root, "Hotel_Chimenea_Izquierda", -0.45, 0.22, mat_side, mat_red_trim, mat_shadow)
    create_chimney(root, "Hotel_Chimenea_Derecha", 0.52, 0.26, mat_side, mat_red_trim, mat_shadow)
    create_flag(root, mat_roof, mat_white, mat_blue_dark)
    create_shrubs(root, mat_leaf, mat_flower)

    # Pequeno brillo rojo adicional en los techos de chimenea y torre.
    for obj in bpy.data.objects:
        if obj.name.startswith("Hotel_Chimenea") and "Tapa_Roja" in obj.name:
            obj.data.materials.clear()
            obj.data.materials.append(mat_red_light)

    return root


def add_preview_camera_and_light():
    camera = bpy.context.scene.camera
    if not camera:
        bpy.ops.object.camera_add(location=(1.65, -2.40, 1.55))
        camera = bpy.context.active_object
        bpy.context.scene.camera = camera

    camera.name = "Hotel_Preview_Camera"
    camera.location = (1.90, -2.85, 1.72)
    direction = Vector((0.0, 0.0, 0.64)) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 40

    if "Hotel_Preview_Light" not in bpy.data.objects:
        bpy.ops.object.light_add(type="AREA", location=(-1.6, -1.8, 3.0))
        light = bpy.context.active_object
        light.name = "Hotel_Preview_Light"
        light.data.energy = 850
        light.data.size = 2.6


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
    build_hotel(collection)
    add_preview_camera_and_light()
    bpy.context.view_layer.update()
    frame_view_if_possible()
