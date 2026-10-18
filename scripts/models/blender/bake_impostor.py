"""
Bakes an enemy model into the cheap forms a crowd needs (docs/SPACE_TYPING_DEFENSE_PLAN_V2_2026-10-18.md §9):

  * an impostor atlas: the model photographed from `--yaws` directions round it
    at the game camera's `--elevation`, at `--frames` wing-beat phases (the same
    vertex displacement as src/campaign3d/actors.ts FLUTTER), one row per phase;
    a quad in the game shows the tile for the direction it is seen from;
  * a low-poly copy (`--lod-tris` triangles, no textures: the game keeps the
    full model's texture, the UVs are kept).

  D:\\Blender\\blender.exe -b --factory-startup -P scripts/models/blender/bake_impostor.py -- \\
      --input art-src/models/enemies/rainbow-scout-3d.glb --out src/bench/assets --id scout \\
      [--yaws 16] [--frames 4] [--tile 192] [--elevation 40] [--lod-tris 1500]

The model's nose is Blender +Y (model-contracts); yaw 0 is the tile seen from
straight ahead of it, and the yaw grows counter-clockwise seen from above.
"""
import argparse
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector


def parse():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--id", required=True)
    parser.add_argument("--yaws", type=int, default=16)
    parser.add_argument("--frames", type=int, default=4)
    parser.add_argument("--tile", type=int, default=192)
    parser.add_argument("--elevation", type=float, default=40.0)
    parser.add_argument("--lod-tris", type=int, default=1500)
    parser.add_argument("--flutter", action="store_true", help="beat the wings (actors.ts FLUTTER) across the frames")
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1:])


def smoothstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def main():
    args = parse()
    os.makedirs(args.out, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(args.input))
    scene = bpy.context.scene
    for obj in scene.objects:
        obj.animation_data_clear()
    meshes = [obj for obj in scene.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise SystemExit("expected one mesh, found %d" % len(meshes))
    mesh = meshes[0]
    rest = [v.co.copy() for v in mesh.data.vertices]
    world = mesh.matrix_world
    points = [world @ co for co in rest]
    lo = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    hi = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    centre = (lo + hi) / 2
    radius = max((p - centre).length for p in points)

    # Eevee, the lights riding with the camera: in the game the lights stay put
    # and the enemy turns, so the side it shows the camera is always lit the
    # same way, and the tiles do not flicker as it steps through them. A key
    # from above the camera, a cool fill, a warm rim behind (SpaceStage's key,
    # rimCyan and rimPink), and a dim sky for the shadows.
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.film_transparent = True
    world_data = bpy.data.worlds.new("ImpostorSky")
    world_data.use_nodes = True
    background = world_data.node_tree.nodes["Background"]
    background.inputs["Color"].default_value = (0.32, 0.34, 0.45, 1)
    background.inputs["Strength"].default_value = 0.9
    scene.world = world_data
    scene.render.resolution_x = args.tile
    scene.render.resolution_y = args.tile
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"
    camera_data = bpy.data.cameras.new("Impostor")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = radius * 2.05
    camera = bpy.data.objects.new("Impostor", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    # Where each light sits seen from the model, in camera space (+Z toward the
    # camera, +Y up the frame): key above and to the right of the camera, fill
    # low on the left, rim behind the model.
    for name, color, energy, to_light in (
        ("Key", (1.0, 0.96, 0.9), 4.2, (0.35, 0.75, 1.0)),
        ("Fill", (0.55, 0.85, 1.0), 1.6, (-0.8, -0.1, 1.0)),
        ("Rim", (1.0, 0.55, 0.85), 3.0, (0.2, 0.4, -1.0)),
    ):
        light_data = bpy.data.lights.new(name, "SUN")
        light_data.color = color
        light_data.energy = energy
        light = bpy.data.objects.new(name, light_data)
        scene.collection.objects.link(light)
        light.parent = camera
        # A sun shines down its own -Z, so its +Z points back at where it sits.
        light.rotation_euler = Vector(to_light).to_track_quat("Z", "Y").to_euler()

    tile = args.tile
    atlas = np.zeros((args.frames * tile, args.yaws * tile, 4), dtype=np.float32)
    temp = os.path.join(args.out, "_tile.png")
    elevation = math.radians(args.elevation)
    for frame in range(args.frames):
        phase = frame / args.frames * math.pi * 2
        for vertex, co in zip(mesh.data.vertices, rest):
            if not args.flutter:
                vertex.co = co
                continue
            # actors.ts FLUTTER in model space: glTF x = Blender x, glTF y = Blender z.
            x, y = co.x, co.z
            wing = smoothstep(0.32, 0.95, abs(x)) * smoothstep(-0.12, 0.3, y)
            beat = math.sin(phase - abs(x) * 1.4)
            y2 = y + beat * wing * 0.22 * abs(x)
            x2 = x - math.copysign(1, x) * (1 - math.cos(beat * wing * 0.5)) * abs(x) * 0.3
            vertex.co = Vector((x2, co.y, y2))
        mesh.data.update()
        for step in range(args.yaws):
            yaw = step / args.yaws * math.pi * 2
            # Seen from straight ahead at yaw 0 (nose +Y), going round counter-clockwise.
            direction = Vector((-math.sin(yaw) * math.cos(elevation), math.cos(yaw) * math.cos(elevation), math.sin(elevation)))
            camera.location = centre + direction * radius * 4
            camera.rotation_euler = (centre - camera.location).to_track_quat("-Z", "Y").to_euler()
            scene.render.filepath = temp
            bpy.ops.render.render(write_still=True)
            image = bpy.data.images.load(temp, check_existing=False)
            pixels = np.array(image.pixels[:], dtype=np.float32).reshape(tile, tile, 4)
            bpy.data.images.remove(image)
            # Blender rows run bottom-up; the atlas is written top row first below.
            row = args.frames - 1 - frame
            atlas[row * tile:(row + 1) * tile, step * tile:(step + 1) * tile] = pixels
    os.remove(temp)
    for vertex, co in zip(mesh.data.vertices, rest):
        vertex.co = co
    mesh.data.update()

    width, height = args.yaws * tile, args.frames * tile
    out_image = bpy.data.images.new(args.id + "-impostor", width=width, height=height, alpha=True)
    out_image.pixels = atlas.ravel()
    out_image.filepath_raw = os.path.join(args.out, args.id + "-impostor.png")
    out_image.file_format = "PNG"
    out_image.save()
    meta = {
        "id": args.id,
        "yaws": args.yaws,
        "frames": args.frames,
        "tile": tile,
        "elevationDeg": args.elevation,
        # Tile width in model units (the ortho frame): the quad's size for the model at scale 1.
        "frameSize": round(camera_data.ortho_scale, 4),
        "size": [round(v, 4) for v in (hi - lo)],
        "flutter": bool(args.flutter),
    }
    with open(os.path.join(args.out, args.id + "-impostor.json"), "w", encoding="utf-8") as handle:
        json.dump(meta, handle, indent=2)

    # The low-poly copy: geometry only (the game keeps the full model's texture).
    bpy.data.objects.remove(camera, do_unlink=True)
    triangles = sum(len(poly.vertices) - 2 for poly in mesh.data.polygons)
    modifier = mesh.modifiers.new("Lod", "DECIMATE")
    modifier.ratio = min(1.0, args.lod_tris / max(1, triangles))
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    lod_triangles = sum(len(poly.vertices) - 2 for poly in mesh.data.polygons)
    for obj in list(scene.objects):
        if obj is not mesh:
            bpy.data.objects.remove(obj, do_unlink=True)
    mesh.data.materials.clear()
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(args.out, args.id + "-lod.glb"),
        export_format="GLB",
        export_materials="NONE",
        export_animations=False,
        export_yup=True,
    )
    print("impostor %dx%d (%d yaws x %d frames), lod %d -> %d tris, in %s" % (width, height, args.yaws, args.frames, triangles, lod_triangles, args.out))


main()
