import bpy
import bmesh
import math

# CONFIGURACIÓN DE POSICIÓN (Casilla GO / Salida)
GO_X = -2.025  
GO_Y = -2.025  
SPAWN_Z = 0.82 

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
    """Elimina la pieza antigua y todas sus mallas hijas de forma segura"""
    if root_name in bpy.data.objects:
        root_obj = bpy.data.objects[root_name]
        # Primero borramos los objetos hijos (las mallas reales)
        for child in list(root_obj.children):
            mesh_data = child.data
            bpy.data.objects.remove(child, do_unlink=True)
            # Limpiamos la malla de la memoria interna si quedó huérfana
            if mesh_data and mesh_data.users == 0:
                bpy.data.meshes.remove(mesh_data)
        # Borramos el contenedor padre
        bpy.data.objects.remove(root_obj, do_unlink=True)

def build_thimble(collection, x_offset, y_offset):
    blue_mat = get_or_create_vibrant_material("Piece_Blue_Vibrant", (0.0, 0.15, 0.90, 1))
    
    # El contenedor se queda en su sitio
    container = bpy.data.objects.new("Piece_Thimble", None)
    container.location = (GO_X + x_offset, GO_Y + y_offset, SPAWN_Z)
    collection.objects.link(container)
    
    # Creamos el cilindro
    bpy.ops.mesh.primitive_cylinder_add(radius=0.09, depth=0.12)
    thimble = bpy.context.active_object
    thimble.name = "Thimble_Mesh"
    thimble.parent = container
    
    # --- CAMBIO IMPORTANTE ---
    # Ya no subimos el OBJETO con thimble.location = (0, 0, 0.06). 
    # Lo dejamos en (0, 0, 0) para que el origen (punto naranja) sea la base.
    thimble.location = (0, 0, 0)
    thimble.data.materials.append(blue_mat)
    
    bm = bmesh.new()
    bm.from_mesh(thimble.data)
    
    # Desplazamiento MANUAL de vértices hacia arriba y modelado
    for v in bm.verts:
        # 1. Subimos el vértice manualmente 0.06 para que la base toque el 0 local
        v.co.z += 0.06  
        
        # 2. Tu lógica original adaptada al nuevo espacio (ahora va de 0.0 a 0.12)
        # El centro original (0.0) ahora está en 0.06
        if v.co.z > 0.06:
            # Reajustamos el factor para que calcule la conicidad desde el nuevo centro (0.06)
            factor = 1.0 - ((v.co.z - 0.06) * 2.0)
            v.co.x *= max(0.75, factor)
            v.co.y *= max(0.75, factor)
            
        angle = math.atan2(v.co.y, v.co.x)
        # Las hendiduras originales estaban entre -0.04 y 0.04. 
        # Al sumarles 0.06, el nuevo rango es entre 0.02 y 0.10
        if v.co.z > 0.02 and v.co.z < 0.10:
            if math.sin(angle * 16) > 0.7:
                v.co.x *= 0.95
                v.co.y *= 0.95
                
    bm.to_mesh(thimble.data)
    bm.free()
    
    bpy.context.view_layer.update()

if __name__ == "__main__":
    # Limpiar solo su propia versión previa antes de reconstruir
    clear_existing_piece("Piece_Thimble")
    
    pieces_col = create_pieces_collection()
    # Lo posicionamos en su esquina opuesta de GO para que coexistan
    build_thimble(pieces_col, x_offset=0.09, y_offset=0.09)
    
    bpy.context.view_layer.update()