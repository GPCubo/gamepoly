import bpy
import bmesh
import math

# CONFIGURACIÓN DE POSICIÓN (Casilla GO / Salida)
GO_X = 0  
GO_Y = 0  
SPAWN_Z = 0

def get_or_create_vibrant_material(name, color, roughness=0.05):
    if name in bpy.data.materials:
        mat = bpy.data.materials[name]
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = color
            bsdf.inputs["Roughness"].default_value = roughness
        return mat
        
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = 0.0       
    return mat

def create_pieces_collection():
    if "Game_Pieces" not in bpy.data.collections:
        pieces_col = bpy.data.collections.new("Game_Pieces")
        bpy.context.scene.collection.children.link(pieces_col)
    return bpy.data.collections["Game_Pieces"]

def clear_existing_piece(root_name):
    if root_name in bpy.data.objects:
        root_obj = bpy.data.objects[root_name]
        for child in list(root_obj.children):
            mesh_data = child.data
            bpy.data.objects.remove(child, do_unlink=True)
            if mesh_data and mesh_data.users == 0:
                bpy.data.meshes.remove(mesh_data)
        bpy.data.objects.remove(root_obj, do_unlink=True)

def build_top_hat(collection, x_offset, y_offset):
    red_mat = get_or_create_vibrant_material("Piece_Red_Vibrant", (1.0, 0.0, 0.05, 1))
    black_mat = get_or_create_vibrant_material("Piece_Black_Band", (0.05, 0.05, 0.05, 1), roughness=0.1)
    
    # Contenedor padre
    container = bpy.data.objects.new("Piece_TopHat", None)
    container.location = (GO_X + x_offset, GO_Y + y_offset, SPAWN_Z)
    collection.objects.link(container)
    
    # 1. Ala del sombrero (Radio balanceado a 0.09)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.09, depth=0.015)
    brim = bpy.context.active_object
    brim.name = "Hat_Brim"
    brim.parent = container
    brim.location = (0, 0, 0.0075)
    brim.data.materials.append(red_mat)
    
    # 2. Cinta (Radio balanceado a 0.056)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.056, depth=0.02)
    ribbon = bpy.context.active_object
    ribbon.name = "Hat_Ribbon"
    ribbon.parent = container
    ribbon.location = (0, 0, 0.025)
    ribbon.data.materials.append(black_mat)
    
    # 3. Copa (Radio balanceado a 0.056)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.056, depth=0.10)
    crown = bpy.context.active_object
    crown.name = "Hat_Crown"
    crown.parent = container
    crown.location = (0, 0, 0.065)
    crown.data.materials.append(red_mat)
    
    # Deformación de la copa con bmesh
    bpy.ops.object.select_all(action='DESELECT')
    crown.select_set(True)
    bpy.context.view_layer.objects.active = crown
    
    bm = bmesh.new()
    bm.from_mesh(crown.data)
    for v in bm.verts:
        if v.co.z > 0.0:
            v.co.x *= 1.15
            v.co.y *= 1.15
    bm.to_mesh(crown.data)
    bm.free()
    
    # --- PROCESO DE UNIFICACIÓN Y AJUSTE DE ORIGEN ---
    # Seleccionamos las tres partes
    bpy.ops.object.select_all(action='DESELECT')
    brim.select_set(True)
    ribbon.select_set(True)
    crown.select_set(True)
    
    # Ponemos el ala como objeto ACTIVO (Su origen está abajo en Z=0 de forma local)
    bpy.context.view_layer.objects.active = brim
    
    # Unimos las mallas en un solo objeto (El objeto activo absorbe a los demás)
    bpy.ops.object.join()
    
    # Renombramos la malla final limpia
    hat_mesh = brim
    hat_mesh.name = "TopHat_Mesh"
    
    # Desplazamos los vértices internamente de forma manual para que la base quede a ras de Z=0
    bm = bmesh.new()
    bm.from_mesh(hat_mesh.data)
    for v in bm.verts:
        v.co.z += 0.0075  # Desfase exacto de la mitad del ala
    bm.to_mesh(hat_mesh.data)
    bm.free()
    
    # Reseteamos la posición local de la malla unificada al origen del contenedor
    hat_mesh.location = (0, 0, 0)

if __name__ == "__main__":
    clear_existing_piece("Piece_TopHat")
    pieces_col = create_pieces_collection()
    build_top_hat(pieces_col, x_offset=-0.0, y_offset=-0.0)
    bpy.context.view_layer.update()