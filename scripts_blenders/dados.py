import bpy
import math
from mathutils import Vector

SPAWN_X = 0.0
SPAWN_Y = 0.0
SPAWN_Z = 0.80  # Ajustado al nivel del tablero

def build_boolean_die():
    # Eliminar si ya existe para evitar errores de duplicado
    if "Perfect_Dice" in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects["Perfect_Dice"], do_unlink=True)

    # 1. Crear el Cubo Base
    size = 0.16
    half = size / 2
    center = Vector((SPAWN_X, SPAWN_Y, SPAWN_Z + half))
    
    bpy.ops.mesh.primitive_cube_add(size=size, location=center)
    die = bpy.context.active_object
    die.name = "Perfect_Dice"
    
    # Biselado para que no sea un bloque filoso
    bevel = die.modifiers.new(name="Bivel", type='BEVEL')
    bevel.width = 0.016
    bevel.segments = 4
    bpy.ops.object.modifier_apply(modifier="Bivel")

    # 2. Configuración estricta de distancias
    # d = Desplazamiento de los puntos desde el centro de la cara
    # h = Posición exacta en la superficie. Al restarle 0.005, la esfera entra EXACTAMENTE lo mismo en cada cara.
    d = 0.038
    h = half - 0.005 
    r_dot = 0.014 

    pips_map = {
        "6_TOP":    [( d,  d,  h), ( d, 0.0,  h), ( d, -d,  h), (-d,  d,  h), (-d, 0.0,  h), (-d, -d,  h)],
        "1_BOTTOM": [(0.0, 0.0, -h)],
        "5_FRONT":  [( d,  h,  d), ( d,  h, -d), (-d,  h,  d), (-d,  h, -d), (0.0,  h, 0.0)],
        "2_BACK":   [( d, -h,  d), (-d, -h, -d)],
        "3_RIGHT":  [( h,  d,  d), ( h, 0.0, 0.0), ( h, -d, -d)],
        "4_LEFT":   [(-h,  d,  d), (-h,  d, -d), (-h, -d,  d), (-h, -d, -d)]
    }

    # 3. Taladrar cada punto
    for face, coordinates in pips_map.items():
        for coords in coordinates:
            # Crear la esfera temporal de corte
            global_pos = center + Vector(coords)
            bpy.ops.mesh.primitive_uv_sphere_add(radius=r_dot, location=global_pos)
            tool = bpy.context.active_object
            
            # Aplicar el taladro (Boolean) al dado
            bpy.context.view_layer.objects.active = die
            bool_mod = die.modifiers.new(name="Corte", type='BOOLEAN')
            bool_mod.operation = 'DIFFERENCE'
            bool_mod.object = tool
            bpy.ops.object.modifier_apply(modifier="Corte")
            
            # Borrar la herramienta de corte para que no ensucie
            bpy.data.objects.remove(tool, do_unlink=True)

if __name__ == "__main__":
    build_boolean_die()