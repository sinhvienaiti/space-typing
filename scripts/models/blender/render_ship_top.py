"""Render an authored ship as a transparent orthographic sprite; no mesh processing.

blender -b --factory-startup -P render_ship_top.py -- --input <ship.glb> --output <ship-top.png>
Use --source-dir/--output-dir for raw orientation contact sheets. Mesh import/bounds
are shared with the existing Vanguard helper. The prepared model must face Blender +Y.
"""
import argparse
import importlib.util
import hashlib
import json
import os
import sys

import bpy
from mathutils import Vector

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("ship_tools", os.path.join(os.path.dirname(__file__), "space_typing_model_tools.py"))
tools = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tools)


def render_top(source, output, size):
    tools.import_input(source)
    scene = bpy.context.scene
    scene.frame_set(1)
    for obj in bpy.data.objects:
        if obj.animation_data:
            obj.animation_data_clear()
    meshes = tools.scene_meshes()
    # Workbench displays the active image node. The authoring helper adds an
    # emissive mask after the base map; explicitly select the painted map.
    for material in bpy.data.materials:
        if not material.use_nodes:
            continue
        for shader in material.node_tree.nodes:
            if shader.type == "BSDF_PRINCIPLED":
                color = shader.inputs.get("Base Color")
                if color and color.links and color.links[0].from_node.type == "TEX_IMAGE":
                    material.node_tree.nodes.active = color.links[0].from_node
    lo, hi = tools.world_bounds(meshes)
    centre = (lo + hi) / 2
    span = max(hi.x - lo.x, hi.y - lo.y, 0.001)
    print("SHIP_BOUNDS", os.path.basename(source), list(lo), list(hi), flush=True)
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "TEXTURE"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "BOTH"
    scene.render.film_transparent = True
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    camera_data = bpy.data.cameras.new("ShipTopOrthographic")
    camera = bpy.data.objects.new("ShipTopOrthographic", camera_data)
    scene.collection.objects.link(camera)
    camera.location = centre + Vector((0, 0, max(span * 4, 2)))
    camera.rotation_euler = (centre - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = span * 1.08
    camera_data.clip_end = max(span * 10, 100)
    scene.camera = camera
    os.makedirs(os.path.dirname(os.path.abspath(output)), exist_ok=True)
    scene.render.filepath = os.path.abspath(output)
    bpy.ops.render.render(write_still=True)
    def point(name):
        obj = bpy.data.objects.get(name)
        if obj is None:
            return None
        at = obj.matrix_world.translation
        return [round(0.5 + (at.x - centre.x) / camera_data.ortho_scale, 6),
                round(0.5 - (at.y - centre.y) / camera_data.ortho_scale, 6)]
    def points(names):
        return [p for p in (point(name) for name in names) if p is not None]
    with open(source, "rb") as handle:
        digest = hashlib.sha256(handle.read()).hexdigest()
    metadata = {
        "version": 1, "projection": "orthographic-top", "modelSha256": digest,
        "nozzles": [p + [round(0.035 / camera_data.ortho_scale, 6)]
                    for p in points(["FX_ENGINE_L", "FX_ENGINE_C", "FX_ENGINE_R"])],
        "anchors": {"nose": point("FX_MUZZLE"), "canopy": point("FX_CORE"),
                    "guns": points(["FX_MUZZLE_L", "FX_MUZZLE_R"]),
                    "wingtips": points(["FX_WING_L", "FX_WING_R"])},
    }
    with open(os.path.splitext(output)[0] + ".json", "w", encoding="utf-8") as handle:
        json.dump(metadata, handle, indent=2)
        handle.write("\n")


parser = argparse.ArgumentParser()
parser.add_argument("--input")
parser.add_argument("--output")
parser.add_argument("--source-dir")
parser.add_argument("--output-dir")
parser.add_argument("--size", type=int, default=1024)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
if args.source_dir:
    for file in sorted(os.listdir(args.source_dir)):
        if file.endswith(".glb"):
            render_top(os.path.join(args.source_dir, file), os.path.join(args.output_dir, file[:-4] + "-top.png"), args.size)
else:
    if not args.input or not args.output:
        parser.error("--input and --output are required")
    render_top(args.input, args.output, args.size)
