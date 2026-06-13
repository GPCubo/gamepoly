"""Generate a soccer ball game token (soccer_ball.glb)."""

import math
from itertools import combinations
from pathlib import Path

import bpy
from mathutils import Vector


WORKSPACE_FALLBACK = Path(r"C:\Users\gggpa\OneDrive\Desktop\Personal\gamepolyweb")


def looks_like_project_root(path):
    return (path / "package.json").exists() and (path / "public" / "models" / "users").exists()


def find_project_root():
    candidates = []
    try:
        candidates.append(Path(__file__).resolve())
    except (NameError, OSError):
        pass
    if bpy.data.filepath:
        candidates.append(Path(bpy.data.filepath).resolve())
    candidates.extend([Path.cwd().resolve(), WORKSPACE_FALLBACK.resolve()])

    for candidate in candidates:
        for path in [candidate, *candidate.parents]:
            if looks_like_project_root(path):
                return path
    raise RuntimeError("Project root not found. Run from gamepolyweb or adjust WORKSPACE_FALLBACK.")


OUTPUT_DIR = find_project_root() / "public" / "models" / "users"
BALL_RADIUS = 0.055
BALL_CENTER = Vector((0.0, 0.0, BALL_RADIUS))


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def set_bsdf_input(bsdf, names, value):
    for name in names:
        if name in bsdf.inputs:
            bsdf.inputs[name].default_value = value
            return


def make_material(name, color, roughness=0.28, metallic=0.0, coat=0.2):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        set_bsdf_input(bsdf, ("Base Color",), color)
        set_bsdf_input(bsdf, ("Roughness",), roughness)
        set_bsdf_input(bsdf, ("Metallic",), metallic)
        set_bsdf_input(bsdf, ("Coat Weight", "Clearcoat"), coat)
        set_bsdf_input(bsdf, ("Coat Roughness", "Clearcoat Roughness"), 0.07)
    return mat


def make_collection():
    col = bpy.data.collections.new("Game_Pieces")
    bpy.context.scene.collection.children.link(col)
    return col


def link_to(obj, col):
    for existing in list(obj.users_collection):
        existing.objects.unlink(obj)
    col.objects.link(obj)


def apply_mat(obj, mat):
    obj.data.materials.append(mat)


def shade_smooth(obj):
    if obj.type != "MESH":
        return
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth()


def parent(obj, root):
    obj.parent = root
    return obj


def root_object(name, col):
    root = bpy.data.objects.new(name, None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.025
    col.objects.link(root)
    return root


def export_token(filename, build_fn):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    clear_scene()
    col = make_collection()
    root = build_fn(col)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action="DESELECT")
    for obj in [root] + list(root.children_recursive):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(OUTPUT_DIR / filename), export_format="GLB", use_selection=True, export_apply=True)
    print(f"Exported {filename} -> {OUTPUT_DIR / filename}")


def tangent_basis(normal):
    normal = normal.normalized()
    helper = Vector((0, 0, 1))
    if abs(normal.dot(helper)) > 0.92:
        helper = Vector((0, 1, 0))
    u = helper.cross(normal).normalized()
    v = normal.cross(u).normalized()
    return u, v


def spherical_polygon(name, col, mat, normal, sides, radius, angle_offset=0.0, surface_offset=1.012):
    normal = normal.normalized()
    u, v = tangent_basis(normal)
    center = BALL_CENTER + normal * BALL_RADIUS * surface_offset
    verts = []
    for i in range(sides):
        angle = angle_offset + math.tau * i / sides
        point = center + (math.cos(angle) * u + math.sin(angle) * v) * radius
        verts.append(tuple(point))
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(verts, [], [tuple(range(sides))])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    link_to(obj, col)
    apply_mat(obj, mat)
    return obj


def curve_on_sphere(name, col, mat, a, b, bevel_depth=0.0007, steps=12):
    curve = bpy.data.curves.new(name, type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = bevel_depth
    curve.bevel_resolution = 3
    curve.use_fill_caps = True
    spline = curve.splines.new("POLY")
    spline.points.add(steps)
    for idx in range(steps + 1):
        t = idx / steps
        direction = (a * (1.0 - t) + b * t).normalized()
        point = BALL_CENTER + direction * BALL_RADIUS * 1.015
        spline.points[idx].co = (point.x, point.y, point.z, 1.0)
    obj = bpy.data.objects.new(name, curve)
    link_to(obj, col)
    apply_mat(obj, mat)
    return obj


def icosahedron_directions():
    phi = (1 + math.sqrt(5)) / 2
    coords = []
    for y in (-1, 1):
        for z in (-phi, phi):
            coords.append(Vector((0, y, z)).normalized())
    for x in (-1, 1):
        for y in (-phi, phi):
            coords.append(Vector((x, y, 0)).normalized())
    for x in (-phi, phi):
        for z in (-1, 1):
            coords.append(Vector((x, 0, z)).normalized())
    return coords


def icosahedron_edges(directions):
    distances = [(a - b).length for a, b in combinations(directions, 2)]
    edge_distance = min(distances)
    threshold = edge_distance * 1.04
    edges = []
    for i, j in combinations(range(len(directions)), 2):
        if (directions[i] - directions[j]).length <= threshold:
            edges.append((directions[i], directions[j]))
    return edges


def build_soccer_ball(col):
    root = root_object("Piece_Soccer_Ball", col)

    white = make_material("Soccer_White_Leather", (0.96, 0.95, 0.90, 1), roughness=0.34, coat=0.35)
    black = make_material("Soccer_Black_Panels", (0.008, 0.009, 0.010, 1), roughness=0.26, coat=0.18)
    seam = make_material("Soccer_Dark_Seams", (0.015, 0.016, 0.018, 1), roughness=0.42, coat=0.05)

    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=BALL_RADIUS,
        segments=96,
        ring_count=48,
        location=BALL_CENTER,
    )
    ball = bpy.context.active_object
    ball.name = "Soccer_Ball_Base"
    link_to(ball, col)
    apply_mat(ball, white)
    shade_smooth(ball)
    parent(ball, root)

    directions = icosahedron_directions()
    for idx, direction in enumerate(directions):
        patch = spherical_polygon(
            f"Soccer_Pentagon_{idx:02d}",
            col,
            black,
            direction,
            sides=5,
            radius=0.014,
            angle_offset=math.pi / 5,
        )
        parent(patch, root)

    for idx, (a, b) in enumerate(icosahedron_edges(directions)):
        edge = curve_on_sphere(f"Soccer_Seam_{idx:02d}", col, seam, a, b)
        parent(edge, root)

    # Small flat shadow base keeps the token stable when previewed on the board.
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=0.045, depth=0.003, location=(0, 0, 0.0015))
    base = bpy.context.active_object
    base.name = "Soccer_Ball_Subtle_Base"
    link_to(base, col)
    apply_mat(base, make_material("Soccer_Base_Shadow", (0.03, 0.035, 0.04, 1), roughness=0.45, coat=0.0))
    shade_smooth(base)
    parent(base, root)

    return root


if __name__ == "__main__":
    export_token("soccer_ball.glb", build_soccer_ball)
