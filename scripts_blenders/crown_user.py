"""Generate a simple crown game token (crown.glb)."""

import math
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


def make_material(name, color, roughness=0.18, metallic=0.0, coat=0.35):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        set_bsdf_input(bsdf, ("Base Color",), color)
        set_bsdf_input(bsdf, ("Roughness",), roughness)
        set_bsdf_input(bsdf, ("Metallic",), metallic)
        set_bsdf_input(bsdf, ("Coat Weight", "Clearcoat"), coat)
        set_bsdf_input(bsdf, ("Coat Roughness", "Clearcoat Roughness"), 0.05)
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


def cylinder(name, col, mat, radius, depth, location, vertices=96):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.active_object
    obj.name = name
    link_to(obj, col)
    apply_mat(obj, mat)
    shade_smooth(obj)
    return obj


def sphere(name, col, mat, radius, location, scale=(1, 1, 1), segments=48, rings=24):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=segments, ring_count=rings, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    link_to(obj, col)
    apply_mat(obj, mat)
    shade_smooth(obj)
    return obj


def crown_wall(name, col, mat, bottom_radius=0.052, top_radius=0.044, base_z=0.018, wall_height=0.048, points=5):
    verts = []
    faces = []
    steps = points * 2

    for i in range(steps):
        angle = math.tau * i / steps
        is_tip = i % 2 == 0
        top_z = base_z + (wall_height if is_tip else wall_height * 0.52)
        top_r = top_radius * (1.05 if is_tip else 0.96)
        bottom = Vector((math.cos(angle) * bottom_radius, math.sin(angle) * bottom_radius, base_z))
        top = Vector((math.cos(angle) * top_r, math.sin(angle) * top_r, top_z))
        verts.extend([tuple(bottom), tuple(top)])

    for i in range(steps):
        next_i = (i + 1) % steps
        faces.append((i * 2, next_i * 2, next_i * 2 + 1, i * 2 + 1))

    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    link_to(obj, col)
    apply_mat(obj, mat)
    shade_smooth(obj)
    return obj


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


def build_crown(col):
    root = root_object("Piece_Crown", col)

    gold = make_material("Crown_Gold", (1.0, 0.68, 0.10, 1), roughness=0.16, metallic=0.72, coat=0.55)
    dark_gold = make_material("Crown_Dark_Gold", (0.55, 0.30, 0.03, 1), roughness=0.24, metallic=0.55, coat=0.25)
    ruby = make_material("Crown_Ruby", (0.90, 0.02, 0.16, 1), roughness=0.10, metallic=0.0, coat=0.75)
    emerald = make_material("Crown_Emerald", (0.02, 0.85, 0.40, 1), roughness=0.10, metallic=0.0, coat=0.75)

    parts = [
        cylinder("Crown_Foot", col, dark_gold, 0.060, 0.012, (0, 0, 0.006)),
        cylinder("Crown_Base_Band", col, gold, 0.055, 0.018, (0, 0, 0.019)),
        crown_wall("Crown_Pointed_Wall", col, gold),
    ]

    for i in range(5):
        angle = math.tau * i / 5
        gem_mat = ruby if i % 2 == 0 else emerald
        top = sphere(
            f"Crown_Top_Jewel_{i}",
            col,
            gem_mat,
            0.0065,
            (math.cos(angle) * 0.046, math.sin(angle) * 0.046, 0.070),
            scale=(1, 1, 0.85),
        )
        parts.append(top)

    for i in range(5):
        angle = math.tau * (i + 0.5) / 5
        gem = sphere(
            f"Crown_Band_Jewel_{i}",
            col,
            ruby,
            0.0045,
            (math.cos(angle) * 0.056, math.sin(angle) * 0.056, 0.022),
            scale=(0.8, 0.8, 0.6),
        )
        parts.append(gem)

    for obj in parts:
        parent(obj, root)

    return root


if __name__ == "__main__":
    export_token("crown.glb", build_crown)
