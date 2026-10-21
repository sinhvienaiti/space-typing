"""
Space Typing — Blender helper for game-ready GLB models (Tripo3D / Meshy output → game GLB).

Two ways to run it (Blender 4.x and 5.x):

  * In the Blender UI: Scripting tab → open this file → edit the CONFIG block → Run.
  * Headless (what the AI uses), from any shell:
      blender --background --factory-startup --python space_typing_model_tools.py -- \
        --input art-src/3d/ships/ship-01-vanguard.glb --kind ships --id vanguard \
        --project <games/space-typing> [--nose +Y] [--tris 12000] [--auto-emissive 0.1] \
        [--boss-clips] [--keep-geometry] [--preview <dir>] \
        [--sockets-json <positions.json>] [--save-blend <work.blend>]

What it does, in order (each step can be switched off):
  1. Imports the Tripo/Meshy file (GLB/GLTF/FBX/OBJ) into an empty scene (headless).
  2. Joins the meshes into one object (skipped for rigged models).
  3. Centres the origin, faces the nose along Blender +Y, sets the longest edge to 2 m.
  4. Decimates to the triangle budget.
  5. Emission: boosts existing emissive parts, or (--auto-emissive) builds an emissive
     texture from the brightest, most saturated texels of the base colour, so the
     energy core, engines and glowing trims light up in the game (Tripo/Meshy PBR has
     no emission map).
  6. Creates the FX_ sockets (Empties) the game reads. Ships: engines at the two rear
     nozzle clusters, muzzle at the nose tip, core on the spine, wing lights at the tips,
     found from the geometry unless --sockets-json supplies authored positions
     in normalized Blender world coordinates. Existing sockets are kept.
  7. Clips as NLA tracks with the exact names the game reads (Ship_Idle, Enemy_Idle,
     Item_Idle; bosses: Boss_Hit, Boss_Death, Boss_Intro). With an armature and
     --boss-clips, the boss clips are posed on the bones (no root motion) starting from
     the idle pose; without one they move the root object.
  8. Exports art-src/models/<kind>/<id>.glb; --preview renders key poses to PNGs.

Then, in games/space-typing:  pnpm models:prepare --only <kind>/<id>
Prompts for Tripo3D / Meshy: docs/art-requests/3D_TRIPO_MESHY_PROMPTS_2026-10-16.md
"""

import argparse
import math
import os
import sys

import bpy
from mathutils import Quaternion, Vector

# ----------------------------------------------------------------------------
# CONFIG — edit for each model when running from the Blender UI
# ----------------------------------------------------------------------------
CONFIG = {
    # ships | enemies | bosses | skills | items
    "kind": "ships",
    # File id: lower-case, digits, dashes (vanguard, scout, tyrant-g01, micro-missile, pulse-laser…)
    "id": "vanguard",
    # Absolute path of games/space-typing (the export goes to art-src/models/<kind>/<id>.glb)
    "project": os.path.expanduser("~/htdocs/typing-game/games/space-typing"),
    "input": "",                # headless only: file to import into an empty scene
    "join_meshes": True,        # False for rigged models (bosses with an armature)
    "normalize": True,          # centre + scale longest edge to 2 m; nose along +Y
    "nose_axis": "+Y",          # where the nose points in the imported model: +Y, -Y, +X, -X
    "target_triangles": 12000,  # 0 = no decimation
    "emission_strength": 3.0,   # for materials that have an emission texture/colour
    "auto_emissive": 0.0,       # > 0: share of base-colour texels (0.02–0.2) turned into emission
    "auto_emissive_strength": 1.6,
    "neutralize": False,        # enemies: pearl-white ceramic + white glow, tinted per family in game
    "make_sockets": True,
    "socket_positions": {},     # optional authored positions in normalized Blender world space
    "save_blend": "",
    "make_clips": True,
    "boss_bone_clips": False,   # bosses with an armature: Hit/Death/Intro posed on the bones
    "export": True,
    "preview": "",              # folder for key-pose PNGs ("" = none)
}

# Fallback socket spots, as fractions of the bounding box:
# x: -1 left … +1 right, y: -1 tail … +1 nose, z: -1 bottom … +1 top.
SOCKETS = {
    "ships": {
        "FX_ENGINE_L": (-0.37, -0.95, 0.0),
        "FX_ENGINE_R": (0.37, -0.95, 0.0),
        "FX_MUZZLE": (0.0, 1.0, 0.0),
        "FX_CORE": (0.0, 0.23, 0.45),
        "FX_WING_L": (-0.94, -0.68, 0.0),
        "FX_WING_R": (0.94, -0.68, 0.0),
    },
    "enemies": {
        "FX_CORE": (0.0, 0.0, 0.3),
        "FX_MUZZLE": (0.0, 1.0, 0.0),
    },
    "bosses": {
        "FX_CORE": (0.0, 0.1, 0.2),
        "FX_CAST_L": (-0.7, 0.3, 0.2),
        "FX_CAST_R": (0.7, 0.3, 0.2),
        "FX_HALO": (0.0, 0.0, 1.0),
    },
    "skills": {
        "FX_TRAIL": (0.0, -1.0, 0.0),
    },
    "items": {},
}

FPS = 24


# ----------------------------------------------------------------------------
# Command line (headless)
# ----------------------------------------------------------------------------
def apply_command_line():
    if "--" not in sys.argv:
        return False
    parser = argparse.ArgumentParser(prog="space_typing_model_tools.py")
    parser.add_argument("--input", default="")
    parser.add_argument("--kind", required=True, choices=["ships", "enemies", "bosses", "skills", "items", "heroes", "guides"])
    parser.add_argument("--id", required=True)
    parser.add_argument("--project", required=True)
    parser.add_argument("--nose", default="+Y", choices=["+Y", "-Y", "+X", "-X"])
    parser.add_argument("--yaw", type=float, default=0.0,
                        help="extra turn about Z in degrees, for models generated slightly turned (Meshy/Tripo)")
    parser.add_argument("--rotate", default="",
                        help="row-major 3x3 world rotation applied before --nose, e.g. for generated models lying on their back")
    parser.add_argument("--facing", default="+Y", choices=["+Y", "-Y"],
                        help="side the visible front faces after normalizing; -Y (glTF +Z) mirrors socket fractions front/back")
    parser.add_argument("--rig-json", default="",
                        help="heroes: build a winged-biped armature (bones, part split, sockets) from this JSON")
    parser.add_argument("--tris", type=int, default=None, help="triangle budget (0 = keep)")
    parser.add_argument("--emission", type=float, default=3.0)
    parser.add_argument("--auto-emissive", type=float, default=0.0)
    parser.add_argument("--auto-emissive-strength", type=float, default=1.6)
    parser.add_argument("--neutralize", action="store_true",
                        help="enemies: pearl-white ceramic base colour and white glow (the game tints by family)")
    parser.add_argument("--keep-geometry", action="store_true", help="no join, centring, scaling or decimation")
    parser.add_argument("--no-sockets", action="store_true")
    parser.add_argument("--sockets-json", default="", help="optional FX_ socket positions in normalized Blender world coordinates")
    parser.add_argument("--save-blend", default="", help="optional editable Blender work file")
    parser.add_argument("--no-clips", action="store_true")
    parser.add_argument("--boss-clips", action="store_true")
    parser.add_argument("--hero-clips", action="store_true",
                        help="with --boss-clips on a winged rig: flight loops and attack/cast/victory clips for a player character")
    parser.add_argument("--no-export", action="store_true")
    parser.add_argument("--preview", default="")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    budgets = {"ships": 12000, "enemies": 3500, "bosses": 32000, "skills": 1500, "items": 4000, "heroes": 22000, "guides": 32000}
    CONFIG.update({
        "kind": args.kind,
        "id": args.id,
        "project": os.path.abspath(args.project),
        "input": os.path.abspath(args.input) if args.input else "",
        "nose_axis": args.nose,
        "yaw": args.yaw,
        "facing": args.facing,
        "target_triangles": budgets[args.kind] if args.tris is None else args.tris,
        "emission_strength": args.emission,
        "auto_emissive": args.auto_emissive,
        "auto_emissive_strength": args.auto_emissive_strength,
        "neutralize": args.neutralize,
        "join_meshes": not args.keep_geometry,
        "normalize": not args.keep_geometry,
        "make_sockets": not args.no_sockets,
        "save_blend": os.path.abspath(args.save_blend) if args.save_blend else "",
        "make_clips": not args.no_clips,
        "boss_bone_clips": args.boss_clips,
        "hero_bone_clips": args.hero_clips,
        "export": not args.no_export,
        "preview": os.path.abspath(args.preview) if args.preview else "",
    })
    if args.sockets_json:
        import json
        with open(args.sockets_json, encoding="utf-8") as handle:
            positions = json.load(handle)
        if not isinstance(positions, dict) or any(
            not isinstance(name, str) or not name.startswith("FX_") or
            not isinstance(point, list) or len(point) != 3 or
            any(not isinstance(value, (int, float)) or not math.isfinite(value) for value in point)
            for name, point in positions.items()
        ):
            raise SystemExit("Socket positions must map FX_ names to three finite coordinates")
        CONFIG["socket_positions"] = positions
    if args.rotate:
        values = [float(part) for part in args.rotate.split(",")]
        if len(values) != 9 or any(not math.isfinite(value) for value in values):
            raise SystemExit("--rotate needs nine finite numbers (row-major 3x3)")
        from mathutils import Matrix
        rows = Matrix((values[0:3], values[3:6], values[6:9]))
        if abs(rows.determinant() - 1.0) > 1e-3:
            raise SystemExit("--rotate must be a proper rotation (determinant 1)")
        CONFIG["pre_rotation"] = rows
    if args.rig_json:
        import json
        with open(args.rig_json, encoding="utf-8") as handle:
            CONFIG["rig_spec"] = json.load(handle)
        if "yaw" in CONFIG["rig_spec"] and args.yaw == 0.0:
            # The rig is measured in the turned frame: use its yaw unless one is given.
            CONFIG["yaw"] = float(CONFIG["rig_spec"]["yaw"])
    if args.keep_geometry:
        CONFIG["target_triangles"] = 0
    return True


def import_input(path):
    """Empty scene, then the Tripo/Meshy file."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    extension = os.path.splitext(path)[1].lower()
    if extension in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=path)
    elif extension == ".fbx":
        bpy.ops.import_scene.fbx(filepath=path)
    elif extension == ".obj":
        bpy.ops.wm.obj_import(filepath=path)
    else:
        raise SystemExit("Unsupported input: " + path)
    # Importers may add lights/cameras; the game file must not carry any.
    for obj in list(bpy.context.scene.objects):
        if obj.type in ("LIGHT", "CAMERA"):
            bpy.data.objects.remove(obj, do_unlink=True)
    print("imported", path)


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
def scene_meshes():
    return [o for o in bpy.context.scene.objects if o.type == "MESH"]


def armature():
    for o in bpy.context.scene.objects:
        if o.type == "ARMATURE":
            return o
    return None


def root_object():
    """The object that carries clips and sockets: the armature, else the mesh."""
    rig = armature()
    if rig is not None:
        return rig
    meshes = scene_meshes()
    return meshes[0] if meshes else None


def world_bounds(objects):
    lo = Vector((math.inf, math.inf, math.inf))
    hi = Vector((-math.inf, -math.inf, -math.inf))
    for o in objects:
        for corner in o.bound_box:
            p = o.matrix_world @ Vector(corner)
            lo = Vector((min(lo.x, p.x), min(lo.y, p.y), min(lo.z, p.z)))
            hi = Vector((max(hi.x, p.x), max(hi.y, p.y), max(hi.z, p.z)))
    return lo, hi


def triangle_count(obj):
    mesh = obj.data
    mesh.calc_loop_triangles()
    return len(mesh.loop_triangles)


def select_only(objects):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.select_set(True)
    if objects:
        bpy.context.view_layer.objects.active = objects[0]


def world_vertices(obj):
    matrix = obj.matrix_world
    return [matrix @ v.co for v in obj.data.vertices]


# ----------------------------------------------------------------------------
# Steps
# ----------------------------------------------------------------------------
def join_meshes():
    meshes = scene_meshes()
    if len(meshes) <= 1:
        return meshes[0] if meshes else None
    select_only(meshes)
    bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    return obj


def normalize(obj_list):
    rotations = {"+Y": 0.0, "-Y": math.pi, "+X": math.pi / 2, "-X": -math.pi / 2}
    turn = rotations.get(CONFIG["nose_axis"], 0.0) + math.radians(CONFIG.get("yaw", 0.0))
    root = root_object()
    if CONFIG.get("pre_rotation") is not None and root is not None:
        root.matrix_world = CONFIG["pre_rotation"].to_4x4() @ root.matrix_world
        bpy.context.view_layer.update()
    if turn != 0.0 and root is not None:
        # glTF imports often use QUATERNION rotation mode. Updating Euler
        # angles alone has no effect on those objects; rotate in world space.
        from mathutils import Matrix
        root.matrix_world = Matrix.Rotation(turn, 4, "Z") @ root.matrix_world
        bpy.context.view_layer.update()
    before = root.matrix_world.copy() if root is not None else None
    lo, hi = world_bounds(obj_list)
    size = hi - lo
    # Heroes stand: their height is 2 m. Everything else: the longest edge.
    longest = max(size.z, 1e-6) if CONFIG["kind"] in ("heroes", "guides") else max(size.x, size.y, size.z, 1e-6)
    centre = (lo + hi) / 2
    if root is not None:
        root.location -= centre
        root.scale *= 2.0 / longest
    bpy.context.view_layer.update()
    if root is not None:
        # Turned-frame point → normalized point (what --rig-json coordinates go through).
        CONFIG["_norm_matrix"] = root.matrix_world.copy() @ before.inverted()
    if armature() is not None:
        # Rigged: applying transforms would break bone animation. The root
        # keeps its transform; the game centres and scales by bounds anyway.
        return
    select_only([o for o in obj_list])
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def decimate(obj, target):
    if target <= 0 or obj is None:
        return
    count = triangle_count(obj)
    if count <= target:
        print(f"  {obj.name}: {count} tris, under budget")
        return
    modifier = obj.modifiers.new("SpaceTypingDecimate", "DECIMATE")
    modifier.decimate_type = "COLLAPSE"
    modifier.ratio = target / count
    modifier.use_collapse_triangulate = True
    # Keep the UV seams so the texture does not tear.
    modifier.delimit = {"UV"}
    select_only([obj])
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    print(f"  {obj.name}: {count} → {triangle_count(obj)} tris")


def principled_nodes():
    for material in bpy.data.materials:
        if not material.use_nodes:
            continue
        for node in material.node_tree.nodes:
            if node.type == "BSDF_PRINCIPLED":
                yield material, node


def boost_emission(strength):
    for _material, node in principled_nodes():
        emission = node.inputs.get("Emission Color") or node.inputs.get("Emission")
        power = node.inputs.get("Emission Strength")
        if emission is None or power is None:
            continue
        linked = emission.is_linked
        colour = tuple(emission.default_value)[:3] if not linked else (1, 1, 1)
        if linked or max(colour) > 0.01:
            power.default_value = strength


def base_colour_image(node):
    socket = node.inputs.get("Base Color")
    if socket is None or not socket.is_linked:
        return None
    source = socket.links[0].from_node
    # Tripo/Meshy sometimes put a colour-mix node in between.
    for _ in range(3):
        if source.type == "TEX_IMAGE":
            return source.image
        inputs = [i for i in source.inputs if i.is_linked]
        if not inputs:
            return None
        source = inputs[0].links[0].from_node
    return None


def auto_emissive(coverage, strength):
    """Emission map = base colour where the texels are brightest and most saturated.

    `coverage` is the share of texels allowed to glow (the threshold is the
    matching quantile of a glow score), so a pastel model does not turn into
    one big light. Materials that already have emission are left alone.
    """
    import numpy as np

    for material, node in principled_nodes():
        emission = node.inputs.get("Emission Color") or node.inputs.get("Emission")
        power = node.inputs.get("Emission Strength")
        if emission is None or power is None or emission.is_linked:
            continue
        image = base_colour_image(node)
        if image is None or image.size[0] == 0:
            continue
        width, height = image.size
        pixels = np.empty(width * height * 4, dtype=np.float32)
        image.pixels.foreach_get(pixels)
        rgba = pixels.reshape(-1, 4)
        rgb = rgba[:, :3]
        value = rgb.max(axis=1)
        saturation = np.where(value > 1e-4, (value - rgb.min(axis=1)) / np.maximum(value, 1e-4), 0)
        # Bright and coloured wins; near-white highlights count a little.
        score = value * value * (0.35 + saturation) + np.clip(value - 0.94, 0, 1) * 4
        threshold = float(np.quantile(score, 1 - coverage))
        soft = max(1e-4, threshold * 0.15)
        mask = np.clip((score - threshold) / soft, 0, 1)
        glow = np.empty_like(rgba)
        glow[:, :3] = rgb * mask[:, None]
        glow[:, 3] = 1
        out = bpy.data.images.new(material.name + "_emissive", width, height, alpha=False)
        out.pixels.foreach_set(glow.ravel())
        out.pack()
        tree = material.node_tree
        texture = tree.nodes.new("ShaderNodeTexImage")
        texture.image = out
        texture.label = "Space Typing emission"
        texture.location = (node.location.x - 300, node.location.y - 300)
        uv = node.inputs["Base Color"].links[0].from_node
        if uv.type == "TEX_IMAGE" and uv.inputs["Vector"].is_linked:
            tree.links.new(uv.inputs["Vector"].links[0].from_socket, texture.inputs["Vector"])
        tree.links.new(texture.outputs["Color"], emission)
        power.default_value = strength
        print(f"  emission map for {material.name}: {width}x{height}, {float((mask > 0.5).mean()) * 100:.1f}% texels glow")


def neutralize_colours():
    """Base colour → pearl-white ceramic that keeps the painted shading; emission → white.

    One enemy model serves all 8 families: the game tints it with family rim
    lights, so the texture must carry form (light and shade), not hue.
    """
    import numpy as np

    done = set()
    for material, node in principled_nodes():
        image = base_colour_image(node)
        if image is not None and image.name not in done and image.size[0] > 0:
            done.add(image.name)
            pixels = np.empty(image.size[0] * image.size[1] * 4, dtype=np.float32)
            image.pixels.foreach_get(pixels)
            rgba = pixels.reshape(-1, 4)
            luma = rgba[:, 0] * 0.2126 + rgba[:, 1] * 0.7152 + rgba[:, 2] * 0.0722
            # Stretch the painted shading into a bright, slightly warm ceramic range.
            low, high = np.quantile(luma, 0.02), np.quantile(luma, 0.98)
            tone = np.clip((luma - low) / max(1e-4, high - low), 0, 1)
            shade = 0.56 + tone * 0.41
            rgba[:, 0] = shade * 1.0
            rgba[:, 1] = shade * 0.985
            rgba[:, 2] = shade * 0.96
            image.pixels.foreach_set(rgba.ravel())
            image.pack()
            print(f"  neutralized {image.name}")
        emission = node.inputs.get("Emission Color") or node.inputs.get("Emission")
        if emission is not None and emission.is_linked:
            source = emission.links[0].from_node
            if source.type == "TEX_IMAGE" and source.image is not None and source.image.name not in done:
                glow = source.image
                done.add(glow.name)
                pixels = np.empty(glow.size[0] * glow.size[1] * 4, dtype=np.float32)
                glow.pixels.foreach_get(pixels)
                rgba = pixels.reshape(-1, 4)
                value = rgba[:, :3].max(axis=1)
                rgba[:, 0] = rgba[:, 1] = rgba[:, 2] = value
                glow.pixels.foreach_set(rgba.ravel())
                glow.pack()
        metallic = node.inputs.get("Metallic")
        if metallic is not None and not metallic.is_linked:
            metallic.default_value = min(metallic.default_value, 0.25)


def ship_socket_spots(mesh):
    """Engine exits, muzzle, core and wing tips from the geometry (+Y nose, +Z up)."""
    points = world_vertices(mesh)
    if len(points) < 16:
        return {}
    lo, hi = world_bounds([mesh])
    size = hi - lo
    spots = {}
    # Rear 7 %: the nozzle exits; one cluster per side unless it sits on the centre line.
    rear = [p for p in points if p.y <= lo.y + size.y * 0.07]
    left = [p for p in rear if p.x < -size.x * 0.04]
    right = [p for p in rear if p.x > size.x * 0.04]

    def centroid(group):
        total = Vector((0, 0, 0))
        for p in group:
            total += p
        return total / max(1, len(group))

    if left and right:
        spots["FX_ENGINE_L"] = centroid(left)
        spots["FX_ENGINE_R"] = centroid(right)
    elif rear:
        middle = centroid(rear)
        spots["FX_ENGINE_L"] = middle + Vector((-size.x * 0.03, 0, 0))
        spots["FX_ENGINE_R"] = middle + Vector((size.x * 0.03, 0, 0))
    front = [p for p in points if p.y >= hi.y - size.y * 0.04]
    if front:
        spots["FX_MUZZLE"] = centroid(front)
    spine = [p for p in points if abs(p.x) < size.x * 0.08 and lo.y + size.y * 0.35 < p.y < lo.y + size.y * 0.75]
    if spine:
        top = max(p.z for p in spine)
        spots["FX_CORE"] = centroid([p for p in spine if p.z >= top - size.z * 0.12])
    tips = sorted(points, key=lambda p: p.x)
    count = max(1, len(points) // 200)
    spots["FX_WING_L"] = centroid(tips[:count])
    spots["FX_WING_R"] = centroid(tips[-count:])
    return spots


def make_sockets(kind):
    overrides = CONFIG["socket_positions"]
    spots = {**SOCKETS.get(kind, {}), **{name: (0, 0, 0) for name in overrides}}
    if not spots:
        return
    meshes = scene_meshes()
    lo, hi = world_bounds(meshes)
    centre = (lo + hi) / 2
    half = (hi - lo) / 2
    found = ship_socket_spots(meshes[0]) if kind == "ships" and len(meshes) == 1 else {}
    parent = root_object()
    front = -1.0 if CONFIG.get("facing") == "-Y" else 1.0
    for name, (fx, fy, fz) in spots.items():
        fy *= front
        empty = bpy.data.objects.get(name)
        if empty is not None:
            print(f"  socket {name} kept")
            continue
        empty = bpy.data.objects.new(name, None)
        bpy.context.scene.collection.objects.link(empty)
        empty.empty_display_type = "SPHERE"
        empty.empty_display_size = 0.05
        empty.location = Vector(overrides[name]) if name in overrides else found.get(name, centre + Vector((fx * half.x, fy * half.y, fz * half.z)))
        if parent is not None:
            # Flush the new location before preserving its world transform.
            # Otherwise matrix_world is still identity and all sockets land
            # at the origin after parenting on Blender 5.2.
            bpy.context.view_layer.update()
            matrix = empty.matrix_world.copy()
            empty.parent = parent
            empty.matrix_world = matrix
        print(f"  socket {name} at {tuple(round(v, 3) for v in empty.location)}{' (from geometry)' if name in found else ''}")


def push_to_track(obj, action, name):
    track = obj.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, int(action.frame_range[0]), action)
    strip.name = name
    return track


def clip(obj, name, frames, keys):
    """Root-object clip. keys: list of (frame, location_delta, rotation_delta_degrees, scale_factor)."""
    if obj.rotation_mode != "XYZ":
        basis = obj.matrix_basis.copy()
        obj.rotation_mode = "XYZ"
        obj.matrix_basis = basis
    base_loc = obj.location.copy()
    base_rot = obj.rotation_euler.copy()
    base_scale = obj.scale.copy()
    action = bpy.data.actions.new(name)
    obj.animation_data_create()
    obj.animation_data.action = action
    for frame, dloc, drot, s in keys:
        obj.location = base_loc + Vector(dloc)
        obj.rotation_euler = (
            base_rot.x + math.radians(drot[0]),
            base_rot.y + math.radians(drot[1]),
            base_rot.z + math.radians(drot[2]),
        )
        obj.scale = base_scale * s
        obj.keyframe_insert("location", frame=frame)
        obj.keyframe_insert("rotation_euler", frame=frame)
        obj.keyframe_insert("scale", frame=frame)
    obj.location, obj.rotation_euler, obj.scale = base_loc, base_rot, base_scale
    obj.animation_data.action = None
    push_to_track(obj, action, name)
    print(f"  clip {name}: frames {keys[0][0]}–{frames}")


# ---------- Boss clips on the bones ----------
def bone_roles(rig):
    """Head, arms, spine, wings and lower chains, found from the FX_ sockets and the tree."""
    bones = rig.data.bones
    socket_parent = {}
    for obj in bpy.context.scene.objects:
        if obj.name.startswith("FX_") and obj.parent == rig and obj.parent_type == "BONE" and obj.parent_bone:
            socket_parent[obj.name] = obj.parent_bone
    head = socket_parent.get("FX_HALO")
    core = socket_parent.get("FX_CORE")
    roles = {"head": head, "core": core, "arm_l": [], "arm_r": [], "spine": [], "wing_l": [], "wing_r": [], "lower": []}

    def chain_up(name, stop_at_branch=True):
        chain = []
        bone = bones.get(name)
        while bone is not None:
            chain.append(bone.name)
            parent = bone.parent
            if parent is None or (stop_at_branch and len(parent.children) > 1):
                break
            bone = parent
        return list(reversed(chain))

    for side, socket in (("arm_l", "FX_CAST_L"), ("arm_r", "FX_CAST_R")):
        if socket in socket_parent:
            roles[side] = chain_up(socket_parent[socket])
    if head and core:
        bone = bones.get(head)
        spine = []
        while bone is not None and bone.name != core:
            spine.append(bone.name)
            bone = bone.parent
        roles["spine"] = list(reversed(spine))
    used = set(roles["arm_l"] + roles["arm_r"] + roles["spine"]) | {core, head}
    # Every other branch: above the core it is a wing (by side), below it hangs.
    spine_set = set(roles["spine"])
    for bone in bones:
        if bone.name in used or bone.parent is None or bone.parent.name not in (spine_set | {core}):
            continue
        if bone.name in used:
            continue
        chain = [bone.name]
        child = bone
        while len(child.children) == 1:
            child = child.children[0]
            chain.append(child.name)
        x = (rig.matrix_world @ bone.head_local).x - (rig.matrix_world @ bones[core].head_local).x if core else bone.head_local.x
        if bone.parent.name == core:
            roles["lower"].append(chain)
        elif x < -1e-3:
            roles["wing_l"].append(chain)
        elif x > 1e-3:
            roles["wing_r"].append(chain)
        else:
            # Centre branches (e.g. wings that split later): split their own children by side.
            for grand in child.children:
                gx = (rig.matrix_world @ grand.head_local).x
                sub = [grand.name]
                g = grand
                while len(g.children) == 1:
                    g = g.children[0]
                    sub.append(g.name)
                target = roles["wing_l"] if gx < 0 else roles["wing_r"]
                # Only the split-off part: the shared trunk must not turn once per wing.
                target.append(sub)
    return roles


def idle_action(rig):
    if rig.animation_data is None:
        return None
    for track in rig.animation_data.nla_tracks:
        for strip in track.strips:
            if strip.action and "Idle" in strip.action.name:
                return strip.action
    for action in bpy.data.actions:
        if "Idle" in action.name:
            return action
    return rig.animation_data.action


def pose_snapshot(rig, action, frame):
    """Every bone at `frame` of `action`: local rotation and location, posed
    armature-space orientation, and posed head/tail positions."""
    data = rig.animation_data
    saved_action = data.action
    mutes = [(t, t.mute) for t in data.nla_tracks]
    for t, _ in mutes:
        t.mute = True
    data.action = action
    bpy.context.scene.frame_set(int(frame))
    bpy.context.view_layer.update()
    snapshot = {}
    for pose_bone in rig.pose.bones:
        pose_bone.rotation_mode = "QUATERNION"
        snapshot[pose_bone.name] = {
            "rotation": pose_bone.rotation_quaternion.copy(),
            "location": pose_bone.location.copy(),
            "orientation": pose_bone.matrix.to_quaternion(),
            "head": pose_bone.head.copy(),
            "tail": pose_bone.tail.copy(),
        }
    data.action = saved_action
    for t, mute in mutes:
        t.mute = mute
    return snapshot


def bone_clip(rig, name, base, keys):
    """keys: list of (frame, {bone: quaternion}) local rotations added on top of
    the idle pose; every bone is keyed so blends start and end cleanly."""
    action = bpy.data.actions.new(name)
    data = rig.animation_data
    saved = data.action
    data.action = action
    for frame, offsets in keys:
        for pose_bone in rig.pose.bones:
            pose = base[pose_bone.name]
            pose_bone.rotation_mode = "QUATERNION"
            delta = offsets.get(pose_bone.name)
            pose_bone.rotation_quaternion = pose["rotation"] @ delta if delta is not None else pose["rotation"]
            pose_bone.location = pose["location"]
            pose_bone.keyframe_insert("rotation_quaternion", frame=frame)
            pose_bone.keyframe_insert("location", frame=frame)
    data.action = saved
    push_to_track(rig, action, name)
    print(f"  bone clip {name}: frames {keys[0][0]}–{keys[-1][0]}")


class BossFrame:
    """The boss's own directions in armature space: up (core → head), front
    (towards the camera, glTF +Z = Blender -Y) and side, plus a way to turn a
    chain so that its tip moves a chosen way, whatever each bone's local axes are."""

    def __init__(self, base, roles):
        self.base = base
        core = base[roles["core"]]["head"] if roles["core"] else Vector((0, 0, 0))
        top = base[roles["head"]]["head"] if roles["head"] else core + Vector((0, 0, 1))
        self.up = (top - core).normalized()
        front = Vector((0, -1, 0))
        self.front = (front - self.up * front.dot(self.up)).normalized()
        self.side = self.front.cross(self.up).normalized()

    def tip(self, chain):
        return self.base[chain[-1]]["tail"] - self.base[chain[0]]["head"]

    def turn(self, chain, axis, degrees, goal):
        """Rotate `chain` about `axis` (armature space) by `degrees`, signed so the
        tip moves along `goal`; 60 % at the root, the rest curls along the chain."""
        if not chain or abs(degrees) < 1e-3:
            return {}
        reach = self.tip(chain)
        probe = Quaternion(axis, math.radians(5)) @ reach
        sign = 1.0 if (probe - reach).dot(goal) >= 0 else -1.0
        total = math.radians(degrees) * sign
        shares = [0.6] + [0.4 / max(1, len(chain) - 1)] * (len(chain) - 1) if len(chain) > 1 else [1.0]
        out = {}
        for bone, share in zip(chain, shares):
            world = Quaternion(axis, total * share)
            orientation = self.base[bone]["orientation"]
            out[bone] = orientation.inverted() @ world @ orientation
        return out


def merge(*parts):
    out = {}
    for part in parts:
        for bone, value in part.items():
            out[bone] = out[bone] @ value if bone in out else value
    return out


def make_boss_bone_clips(rig):
    roles = bone_roles(rig)
    print("  bone roles:", {k: (v if isinstance(v, str) else len(v)) for k, v in roles.items()})
    idle = idle_action(rig)
    if idle is None:
        print("  no idle clip: boss bone clips skipped")
        return
    base = pose_snapshot(rig, idle, idle.frame_range[0])
    frame = BossFrame(base, roles)
    up, front, side = frame.up, frame.front, frame.side
    spine = roles["spine"]
    torso = spine[1:-1] if len(spine) > 2 else spine
    head = [roles["head"]] if roles["head"] else []
    wings = roles["wing_l"] + roles["wing_r"]
    arms = [chain for chain in (roles["arm_l"], roles["arm_r"]) if chain]

    def pose(lean=0.0, nod=0.0, droop=0.0, sweep=0.0, arms_down=0.0, trail=0.0):
        """lean: + chest back / - forward; nod: + head back / - down;
        droop: + wing tips down / - up; sweep: + wings swept back / - forward;
        arms_down: + hands drop / - rise; trail: + robes stream back."""
        parts = [frame.turn(torso, side, lean, -front) if torso else {}]
        if head:
            parts.append(frame.turn(head, side, nod, -front))
        for chain in wings:
            parts.append(frame.turn(chain, front, droop, -up))
            parts.append(frame.turn(chain, up, sweep, -front))
        for chain in arms:
            parts.append(frame.turn(chain, front, arms_down, -up))
        for chain in roles["lower"]:
            parts.append(frame.turn(chain, side, trail, -front))
        return merge(*parts)

    # Hit, 0.5 s: snap back, wings flinch back and up, then a small rebound.
    bone_clip(rig, "Boss_Hit", base, [
        (1, pose()),
        (3, pose(lean=12, nod=10, droop=-8, sweep=12, arms_down=-14, trail=8)),
        (6, pose(lean=-3, nod=-3, droop=3, sweep=-3, arms_down=4, trail=-2)),
        (12, pose()),
    ])
    # Death, 2 s: a spasm back, then the wings droop and the body slumps forward.
    bone_clip(rig, "Boss_Death", base, [
        (1, pose()),
        (5, pose(lean=14, nod=16, droop=-12, sweep=8, arms_down=-20)),
        (9, pose(lean=5, nod=5, droop=-3, sweep=4, arms_down=-6)),
        (20, pose(lean=-14, nod=-18, droop=22, sweep=14, arms_down=26, trail=8)),
        (34, pose(lean=-26, nod=-32, droop=40, sweep=24, arms_down=44, trail=14)),
        (48, pose(lean=-32, nod=-38, droop=50, sweep=28, arms_down=52, trail=18)),
    ])
    # Intro, 2.5 s: wings folded down and back, a breath, then a wide flare into idle.
    bone_clip(rig, "Boss_Intro", base, [
        (1, pose(lean=-10, nod=-14, droop=38, sweep=32, arms_down=34, trail=10)),
        (20, pose(lean=-5, nod=-8, droop=28, sweep=22, arms_down=22, trail=6)),
        (40, pose(lean=8, nod=6, droop=-12, sweep=-8, arms_down=-14, trail=-4)),
        (52, pose(lean=2, nod=1, droop=-3, sweep=-2, arms_down=-3)),
        (60, pose()),
    ])


def make_hero_bone_clips(rig):
    """A winged character flown by the player (seen from behind): flight loops
    and action one-shots on the bones, no root motion (the game moves the body).

    Hero_Fly (1 s loop, two wing beats), Hero_Boost (0.5 s loop, wings swept
    back), Hero_Attack_L / Hero_Attack_R (0.42 s hand thrust forward),
    Hero_Cast (1.5 s gather and release), Hero_Victory (2 s wings flared).
    Hit and Death reuse the boss clips (--boss-clips) on the same rig.
    """
    roles = bone_roles(rig)
    idle = idle_action(rig)
    if idle is None:
        print("  no idle clip: hero clips skipped")
        return
    base = pose_snapshot(rig, idle, idle.frame_range[0])
    frame = BossFrame(base, roles)
    up, front, side = frame.up, frame.front, frame.side
    spine = roles["spine"]
    torso = spine[1:-1] if len(spine) > 2 else spine
    head = [roles["head"]] if roles["head"] else []
    wings = roles["wing_l"] + roles["wing_r"]

    def pose(lean=0.0, nod=0.0, droop=0.0, sweep=0.0, arms_down=0.0, reach_l=0.0, reach_r=0.0, trail=0.0):
        """As the boss pose, plus reach_l / reach_r: + that hand thrusts forward."""
        parts = [frame.turn(torso, side, lean, -front) if torso else {}]
        if head:
            parts.append(frame.turn(head, side, nod, -front))
        for chain in wings:
            parts.append(frame.turn(chain, front, droop, -up))
            parts.append(frame.turn(chain, up, sweep, -front))
        for chain, reach in ((roles["arm_l"], reach_l), (roles["arm_r"], reach_r)):
            if not chain:
                continue
            parts.append(frame.turn(chain, front, arms_down, -up))
            parts.append(frame.turn(chain, side, reach, front))
        for chain in roles["lower"]:
            parts.append(frame.turn(chain, side, trail, -front))
        return merge(*parts)

    # Flight posture shared by the loops: leaning into the flight, robes streaming back.
    glide = dict(lean=-10, nod=-4, arms_down=18, trail=16)
    bone_clip(rig, "Hero_Fly", base, [
        (1, pose(**glide, droop=-24, sweep=4)),
        (4, pose(**glide, droop=6, sweep=-2)),
        (7, pose(**glide, droop=26, sweep=-6)),
        (10, pose(**glide, droop=4, sweep=2)),
        (13, pose(**glide, droop=-24, sweep=4)),
        (16, pose(**glide, droop=6, sweep=-2)),
        (19, pose(**glide, droop=26, sweep=-6)),
        (22, pose(**glide, droop=4, sweep=2)),
        (25, pose(**glide, droop=-24, sweep=4)),
    ])
    dash = dict(lean=-20, nod=-8, arms_down=34, trail=30, sweep=36)
    bone_clip(rig, "Hero_Boost", base, [
        (1, pose(**dash, droop=-6)),
        (4, pose(**dash, droop=8)),
        (7, pose(**dash, droop=-6)),
        (10, pose(**dash, droop=8)),
        (13, pose(**dash, droop=-6)),
    ])
    for side_name, key in (("L", "reach_l"), ("R", "reach_r")):
        bone_clip(rig, "Hero_Attack_" + side_name, base, [
            (1, pose(**glide, droop=0)),
            (3, pose(lean=-14, nod=-6, arms_down=4, trail=18, droop=-10, sweep=10, **{key: 62})),
            (6, pose(lean=-12, nod=-5, arms_down=8, trail=17, droop=-6, sweep=6, **{key: 48})),
            (11, pose(**glide, droop=0)),
        ])
    bone_clip(rig, "Hero_Cast", base, [
        (1, pose(**glide, droop=0)),
        (10, pose(lean=10, nod=10, droop=-26, sweep=-12, arms_down=-46, trail=6)),
        (22, pose(lean=12, nod=12, droop=-30, sweep=-16, arms_down=-58, trail=4)),
        (26, pose(lean=-16, nod=-8, droop=10, sweep=20, arms_down=10, reach_l=55, reach_r=55, trail=24)),
        (36, pose(**glide, droop=0)),
    ])
    bone_clip(rig, "Hero_Victory", base, [
        (1, pose(**glide, droop=0)),
        (14, pose(lean=14, nod=16, droop=-34, sweep=-14, arms_down=-72, trail=4)),
        (30, pose(lean=12, nod=14, droop=-30, sweep=-12, arms_down=-66, trail=6)),
        (48, pose(**glide, droop=0)),
    ])


# ---------- Heroes: an armature for a winged biped (Meshy/Tripo give no wing bones) ----------
def segment_distance(point, head, tail):
    """Distance from point to the bone segment, and where along it (0 head … 1 tail)."""
    along = tail - head
    t = max(0.0, min(1.0, (point - head).dot(along) / max(along.length_squared, 1e-12)))
    return (point - (head + along * t)).length, t


def smoothstep(edge0, edge1, value):
    t = max(0.0, min(1.0, (value - edge0) / max(edge1 - edge0, 1e-9)))
    return t * t * (3 - 2 * t)


def classify_part(p, split, segments):
    """Body part of a point in the rig's (turned, source) coordinates."""
    mid = split["mid_x"]
    lateral = abs(p.x - mid)
    side = "L" if p.x < mid else "R"
    # Hands hanging below the hips, close to the body (arm_first), are arms, not legs.
    if split.get("arm_first") and p.y < split["arm_y"]:
        reach = min(segment_distance(p, *segments[name])[0] for name in ("upperarm_" + side, "forearm_" + side))
        if reach < split["arm_reach"]:
            return "arm_" + side
    # Tail: behind the hips and low; beside the body only below the wings.
    if p.y > split["tail_y"] and p.z < split["tail_z"] and (lateral < split["tail_max_x"] or p.z < split["wing_low_z"]):
        return "tail"
    if p.z < split["leg_z"] and lateral < (split["leg_max_x_high"] if p.z > split["leg_wide_z"] else split["leg_max_x_low"]):
        return "leg_" + side
    if p.z > split["head_z"] and lateral < split["head_half_width"]:
        return "head"
    if p.y < split["arm_y"]:
        reach = min(segment_distance(p, *segments[name])[0] for name in ("upperarm_" + side, "forearm_" + side))
        if reach < split["arm_reach"]:
            return "arm_" + side
    if lateral > split["wing_x"] and (p.y > split["wing_y"] or lateral > split["wing_outer_x"]):
        return "wing_" + side
    return "body"


QUADRUPED_PARTS = {
    "hips": "body", "spine": "body", "chest": "body",
    "neck1": "neck", "neck2": "neck", "neck3": "neck", "head": "head", "jaw": "head",
    "upperarm": "front", "forearm": "front", "hand": "front",
    "thigh": "hind", "shin": "hind", "foot": "hind",
    "wing1": "wing", "wing2": "wing", "wing3": "wing",
}


def classify_quadruped(p, split, segments, radii):
    """Body part of a point of a four-legged winged dragon: the lower jaw by the
    line through the open mouth, the membranes by their reach to the side, the
    rest by the nearest bone (distance over that bone's thickness)."""
    mid = split["mid_x"]
    lateral = abs(p.x - mid)
    side = "L" if p.x < mid else "R"
    # The lower jaw: in front of the hinge, above the throat, and below the
    # line that halves the open mouth (jaw_slope tilts it down toward the
    # tip, so the upper teeth stay with the skull and the lower with the jaw).
    hinge_y = split["jaw_hinge_y"]
    split_z = split["jaw_line_z"] + split.get("jaw_slope", 0.0) * (p.y - hinge_y)
    floor = split.get("jaw_floor_z", 0.1)
    if lateral < split["jaw_half_width"] and p.y < hinge_y and floor < p.z < split_z:
        return "jaw"
    # The skin under the chin follows the jaw part of the way, like a throat.
    if lateral < split["jaw_half_width"] * 1.2 and p.y < hinge_y + 0.02 and floor - split.get("chin_depth", 0.0) < p.z <= floor:
        return "chin"
    # Boxes that are tail whatever lies nearer: a tail tuft curled beside a
    # wing would otherwise be read as membrane and torn off by the beat.
    for (x0, x1), (y0, y1), (z0, z1) in split.get("tail_boxes", ()):
        if x0 <= p.x <= x1 and y0 <= p.y <= y1 and z0 <= p.z <= z1:
            return "tail"
    # Boxes (in |x|, y, z) of spikes beside the neck and shoulders that hang
    # near the wings but must not beat with them.
    not_wing = any(
        l0 <= lateral <= l1 and y0 <= p.y <= y1 and z0 <= p.z <= z1
        for (l0, l1), (y0, y1), (z0, z1) in split.get("not_wing_boxes", ())
    )
    best, best_score = None, 1e9
    for name, (head, tail) in segments.items():
        if name == "jaw" or (not_wing and name.startswith("wing")):
            continue
        base = name.split("_")[0]
        radius = radii.get(name, radii.get(base, 0.08))
        score = segment_distance(p, head, tail)[0] / radius
        if score < best_score:
            best, best_score = name, score
    base = best.split("_")[0]
    if base.startswith("tail"):
        part = "tail"
    else:
        group = QUADRUPED_PARTS.get(base, "body")
        part = group + "_" + side if group in ("front", "hind", "wing") else group
    # Membranes reach far from the wing bones; legs and tail keep what hugs them,
    # and nothing below the wings' lowest edge is membrane.
    if not not_wing and lateral > split["wing_x"] and p.z > split.get("wing_min_z", -1e9) and not ((part.startswith(("front", "hind")) or part == "tail") and best_score < 1.2):
        return "wing_" + side
    return part


def part_weights(part, p, split, chains, segments):
    """Up to three bone weights for a point of a part (they sum to 1)."""
    if part == "jaw":
        # Rigid lower jaw, eased into the skull at the hinge.
        hinge = split["jaw_hinge_y"]
        h = 0.5 * smoothstep(hinge - 0.04, hinge, p.y)
        return {"jaw": 1 - h, "head": h}
    if part == "chin":
        # From the jaw at its floor to the neck below it and behind the hinge.
        floor = split.get("jaw_floor_z", 0.1)
        depth = max(1e-6, split.get("chin_depth", 0.05))
        k = smoothstep(floor - depth, floor, p.z) * (1 - smoothstep(split["jaw_hinge_y"] - 0.01, split["jaw_hinge_y"] + 0.02, p.y))
        return {"jaw": k * 0.85, "head": k * 0.15, "neck3": 1 - k}
    if part.startswith("wing_"):
        side = part[-1]
        lateral = abs(p.x - split["mid_x"])
        # Along the span, so every feather (even those hanging low) bends with
        # the wing section above it, and the root blends into the chest.
        chest = 1 - smoothstep(*split["wing_root"], lateral)
        first = 1 - smoothstep(*split["wing_mid"], lateral)
        tip = smoothstep(*split["wing_tip"], lateral)
        middle = max(0.0, 1 - first - tip)
        rest = 1 - chest
        weights = {"chest": chest, "wing1_" + side: first * rest, "wing2_" + side: middle * rest, "wing3_" + side: tip * rest}
    else:
        chain = chains[{"body": "body", "head": "head", "tail": "tail"}.get(part, part)]
        sigma = split["sigma"] * (1.3 if part == "tail" else 1.0)
        weights = {}
        for name in chain:
            distance, _t = segment_distance(p, *segments[name])
            weights[name] = math.exp(-(distance / sigma) ** 2)
        if max(weights.values()) < 1e-6:
            nearest = min(chain, key=lambda name: segment_distance(p, *segments[name])[0])
            weights = {nearest: 1.0}
    top = sorted(weights.items(), key=lambda item: -item[1])[:3]
    total = sum(value for _name, value in top) or 1.0
    return {name: value / total for name, value in top if value / total > 0.002}


PART_BONES = {
    # Which chains may move each body part (the rest of the heat weight is dropped).
    "head": ("head",),
    "body": ("body", "head", "arm_L", "arm_R", "wing_L", "wing_R", "leg_L", "leg_R", "tail"),
    "arm_L": ("arm_L",), "arm_R": ("arm_R",),
    "wing_L": ("wing_L",), "wing_R": ("wing_R",),
    "leg_L": ("leg_L",), "leg_R": ("leg_R",),
    "tail": ("tail",),
}


def heat_weights(mesh, rig, names, column, part_of, chains, fallback):
    """Blender's bone-heat weights (smooth along the surface at shoulders,
    elbows and hips), kept to the bones of each vertex's own part so an arm
    never drags a wing; vertices heat leaves empty keep the fallback."""
    import numpy as np
    select_only([mesh, rig])
    bpy.context.view_layer.objects.active = rig
    try:
        bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    except RuntimeError as error:
        print("  bone heat failed, keeping part weights:", error)
        return fallback
    heat = np.zeros_like(fallback)
    index_of = {group.index: group.name for group in mesh.vertex_groups}
    for vertex in mesh.data.vertices:
        for item in vertex.groups:
            name = index_of.get(item.group)
            if name in column:
                heat[vertex.index, column[name]] = item.weight
    # Undo the auto parenting; build_winged_rig adds its own groups and modifier.
    keep = mesh.matrix_world.copy()
    mesh.parent = None
    mesh.matrix_world = keep
    for modifier in list(mesh.modifiers):
        if modifier.type == "ARMATURE":
            mesh.modifiers.remove(modifier)
    mesh.vertex_groups.clear()
    allowed = {}
    for part, chain_names in PART_BONES.items():
        mask = np.zeros(len(names), dtype=np.float32)
        for chain in chain_names:
            for bone in chains.get(chain, ()):
                mask[column[bone]] = 1
        allowed[part] = mask
    out = fallback.copy()
    empty = 0
    for index, part in enumerate(part_of):
        row = heat[index] * allowed.get(part, 1)
        total = row.sum()
        if total < 0.05:
            empty += 1
            continue
        out[index] = row / total
    print(f"  bone heat: {len(part_of) - empty} vertices, {empty} kept their part weights")
    return out


def cut_contacts(mesh, part_of, to_source, split):
    """A scan fuses parts that only touch (a hand resting on the hip, a wing
    tip on a foot, the tail on a foot): moving them apart stretches that
    skin into long shards. Delete the faces that bridge two limbs, and the
    faces bridging an arm and the body below `arm_cut_z` (the shoulder
    stays joined). The vertices stay, so vertex indices are unchanged."""
    import bmesh

    def group(part):
        return part.split("_")[0] if part not in ("body", "head", "jaw", "chin", "neck") else "body"

    bm = bmesh.new()
    bm.from_mesh(mesh.data)
    bm.verts.ensure_lookup_table()
    cut_z = split.get("arm_cut_z", -1e9)
    doomed = []
    for face in bm.faces:
        groups = {group(part_of[vertex.index]) for vertex in face.verts}
        limbs = groups - {"body"}
        sides = {part_of[vertex.index][-1] for vertex in face.verts if part_of[vertex.index][-2:] in ("_L", "_R")}
        bridge = len(limbs) > 1 or (len(limbs) == 1 and len(sides) > 1)
        if not bridge and limbs & {"arm", "front"} and "body" in groups:
            centre = to_source @ (mesh.matrix_world @ face.calc_center_median())
            bridge = centre.z < cut_z
        if bridge:
            doomed.append(face)
    bmesh.ops.delete(bm, geom=doomed, context="FACES_ONLY")
    bm.to_mesh(mesh.data)
    bm.free()
    mesh.data.update()
    print(f"  contacts cut: {len(doomed)} bridging faces removed")


def build_winged_rig(spec):
    """Armature from spec["bones"] ({name: [head, tail, parent]}), vertex weights
    from a per-part split (head, arms, wings, legs, tail, body), and FX_ sockets
    parented to bones. Coordinates are the source file's after --yaw; they go
    through the same normalization as the mesh."""
    from mathutils import Matrix
    meshes = scene_meshes()
    if len(meshes) != 1:
        raise SystemExit("--rig-json needs one mesh (got " + str(len(meshes)) + ")")
    mesh = meshes[0]
    to_world = CONFIG.get("_norm_matrix", Matrix.Identity(4))
    to_source = to_world.inverted()

    def world(point):
        return to_world @ Vector(point)

    data = bpy.data.armatures.new(CONFIG["id"] + "_rig")
    rig = bpy.data.objects.new(CONFIG["id"] + "_rig", data)
    bpy.context.scene.collection.objects.link(rig)
    select_only([rig])
    bpy.ops.object.mode_set(mode="EDIT")
    for name, (head, tail, parent) in spec["bones"].items():
        bone = data.edit_bones.new(name)
        bone.head = world(head)
        bone.tail = world(tail)
        if parent:
            bone.parent = data.edit_bones[parent]
            bone.use_connect = (bone.parent.tail - bone.head).length < 1e-5
    bpy.ops.object.mode_set(mode="OBJECT")

    segments = {name: (Vector(head), Vector(tail)) for name, (head, tail, _parent) in spec["bones"].items()}
    split = {
        "tail_max_x": 0.17, "wing_low_z": -0.12, "leg_wide_z": -0.2,
        "leg_max_x_high": 0.15, "leg_max_x_low": 0.26, **spec["split"],
    }
    import numpy as np
    names = list(spec["bones"])
    column = {name: index for index, name in enumerate(names)}
    vertices = mesh.data.vertices
    weights = np.zeros((len(vertices), len(names)), dtype=np.float32)
    parts = {}
    part_of = []
    for vertex in vertices:
        point = to_source @ (mesh.matrix_world @ vertex.co)
        if spec.get("body") == "quadruped":
            part = classify_quadruped(point, split, segments, spec.get("radii", {}))
        else:
            part = classify_part(point, split, segments)
        parts[part] = parts.get(part, 0) + 1
        part_of.append(part)
        for name, weight in part_weights(part, point, split, spec["chains"], segments).items():
            weights[vertex.index, column[name]] = weight
    print("  rig parts:", dict(sorted(parts.items())))
    pre_cut_edges = None
    if split.get("cut_contacts"):
        pre_cut_edges = np.array([edge.vertices[:] for edge in mesh.data.edges], dtype=np.int64)
        cut_contacts(mesh, part_of, to_source, split)
    if spec.get("weights") == "heat":
        weights = heat_weights(mesh, rig, names, column, part_of, spec["chains"], weights)
    # Vertices split at UV seams sit on the same spot but share no edge: they
    # must move together, or the skin opens into white cracks when posed.
    keys = np.round(np.array([v.co[:] for v in vertices], dtype=np.float64) * 1e5).astype(np.int64)
    _unique, seam_group = np.unique(keys, axis=0, return_inverse=True)
    seam_group = seam_group.ravel()
    seam_count = np.bincount(seam_group).astype(np.float32)[:, None]

    def weld(values):
        summed = np.zeros((len(seam_count), values.shape[1]), dtype=np.float32)
        np.add.at(summed, seam_group, values)
        return (summed / seam_count)[seam_group]

    weights = weld(weights)
    print(f"  seam groups: {len(vertices) - len(seam_count)} split vertices welded")
    # Smooth across mesh edges, so faces that straddle two parts (wrist and
    # wing, hip and tail) bend instead of tearing into long streaks.
    edges = np.array([edge.vertices[:] for edge in mesh.data.edges], dtype=np.int64)
    if split.get("cut_contacts"):
        # Only edges still on a face: the edges of the cut faces would carry
        # the smoothing (and the rigid pieces below) straight back across the
        # contact, so a hand would still drag the hip and an arm its wing.
        on_faces = {key for polygon in mesh.data.polygons for key in polygon.edge_keys}
        edges = np.array(sorted(on_faces), dtype=np.int64).reshape(-1, 2)
        print(f"  smoothing over {len(edges)} face edges ({len(mesh.data.edges) - len(edges)} loose edges of cut faces left out)")
    if len(edges):
        degree = np.bincount(edges.ravel(), minlength=len(vertices)).astype(np.float32)[:, None]
        degree[degree == 0] = 1
        for _ in range(int(split.get("smooth_passes", 6))):
            total = np.zeros_like(weights)
            np.add.at(total, edges[:, 0], weights[edges[:, 1]])
            np.add.at(total, edges[:, 1], weights[edges[:, 0]])
            weights = weld(weights * 0.5 + (total / degree) * 0.5)
    # Loose pieces (spikes, scales, feather blades a decimated scan falls
    # into) move as one rigid piece: a piece that straddles two bones would
    # otherwise stretch into a long shard. Seam-split vertices count as joined.
    rigid_max = int(split.get("rigid_islands", 0))
    if rigid_max > 0 and len(edges):
        parent = list(range(len(vertices)))

        def find(a):
            while parent[a] != a:
                parent[a] = parent[parent[a]]
                a = parent[a]
            return a

        links = edges.tolist()
        first = {}
        for index, group in enumerate(seam_group.tolist()):
            if group in first:
                links.append((first[group], index))
            else:
                first[group] = index
        for a, b in links:
            ra, rb = find(a), find(b)
            if ra != rb:
                parent[ra] = rb
        roots = np.array([find(index) for index in range(len(vertices))])
        _labels, island, sizes = np.unique(roots, return_inverse=True, return_counts=True)
        small = sizes[island] <= rigid_max
        summed = np.zeros((len(sizes), weights.shape[1]), dtype=np.float32)
        np.add.at(summed, island, weights)
        mean = summed / sizes[:, None]
        if pre_cut_edges is not None and len(pre_cut_edges):
            # Pieces the cut set loose beside an arm (spikes wedged between the
            # arm and the hip, wing or flank) ride with that arm: left with the
            # body they would hang in the air when the arm lifts. Only pieces
            # whose nearest bone is that arm's (a hip spike the hand touched
            # stays on the hip); each goes rigidly on the arm.
            arm_columns = [column[name] for chain in ("arm_L", "arm_R") for name in spec["chains"].get(chain, ()) if name.startswith(("upperarm", "forearm", "hand"))]
            a, b = pre_cut_edges[:, 0], pre_cut_edges[:, 1]
            across = island[a] != island[b]
            touches = {}
            for left, right in zip(a[across].tolist(), b[across].tolist()):
                for here, there in ((left, right), (right, left)):
                    if sizes[island[here]] <= rigid_max and part_of[there].startswith("arm_"):
                        key = int(island[here])
                        touches.setdefault(key, []).append(part_of[there])
            moved = 0
            for label, arms in touches.items():
                if mean[label, arm_columns].sum() >= 0.5:
                    continue
                side = max(set(arms), key=arms.count)
                members = np.nonzero(island == label)[0]
                centre = Vector(np.mean([tuple(to_source @ (mesh.matrix_world @ vertices[int(i)].co)) for i in members], axis=0).tolist())
                nearest = min(segments, key=lambda name: segment_distance(centre, *segments[name])[0])
                if not nearest.startswith(("upperarm_" + side[-1], "forearm_" + side[-1], "hand_" + side[-1])):
                    continue
                row = np.zeros(weights.shape[1], dtype=np.float32)
                for name, weight in part_weights(side, centre, split, spec["chains"], segments).items():
                    row[column[name]] = weight
                mean[label] = row
                moved += 1
            print(f"  loose pieces beside an arm put on it: {moved}")
        weights[small] = mean[island[small]]
        print(f"  islands: {len(sizes)}, {int(np.count_nonzero(sizes <= rigid_max))} rigid (<= {rigid_max} vertices, {int(small.sum())} vertices)")
    groups = {name: mesh.vertex_groups.new(name=name) for name in names}
    for index in range(len(vertices)):
        row = weights[index]
        top = np.argsort(row)[-4:]
        total = float(row[top].sum()) or 1.0
        for bone in top:
            value = float(row[bone]) / total
            if value > 0.004:
                groups[names[bone]].add([index], value, "REPLACE")
    modifier = mesh.modifiers.new("Armature", "ARMATURE")
    modifier.object = rig
    keep = mesh.matrix_world.copy()
    mesh.parent = rig
    mesh.matrix_world = keep

    for name, (point, bone) in spec.get("sockets", {}).items():
        empty = bpy.data.objects.new(name, None)
        bpy.context.scene.collection.objects.link(empty)
        empty.empty_display_type = "SPHERE"
        empty.empty_display_size = 0.05
        empty.location = world(point)
        bpy.context.view_layer.update()
        placed = empty.matrix_world.copy()
        empty.parent = rig
        empty.parent_type = "BONE"
        empty.parent_bone = bone
        bpy.context.view_layer.update()
        empty.matrix_world = placed
        print(f"  socket {name} on {bone} at {tuple(round(v, 3) for v in empty.matrix_world.translation)}")
    bpy.context.view_layer.update()
    print(f"  rig: {len(spec['bones'])} bones, {len(mesh.data.vertices)} vertices weighted")
    return rig


def make_hero_idle(rig):
    """Hero_Idle_Hover (2 s) for a rig built without clips: slow wing breath,
    head and chest bob, tail and legs sway. The other clips start from it."""
    rig.animation_data_create()
    data = rig.animation_data
    rest = bpy.data.actions.new("SpaceTypingRest")
    data.action = rest
    for pose_bone in rig.pose.bones:
        pose_bone.rotation_mode = "QUATERNION"
        pose_bone.rotation_quaternion = Quaternion()
        pose_bone.location = Vector()
        pose_bone.keyframe_insert("rotation_quaternion", frame=1)
        pose_bone.keyframe_insert("location", frame=1)
    data.action = None
    base = pose_snapshot(rig, rest, 1)
    roles = bone_roles(rig)
    print("  hero roles:", {k: (v if isinstance(v, str) else len(v)) for k, v in roles.items()})
    frame = BossFrame(base, roles)
    up, front, side = frame.up, frame.front, frame.side
    spine = roles["spine"]
    torso = spine[1:-1] if len(spine) > 2 else spine
    head = [roles["head"]] if roles["head"] else []

    def pose(lean=0.0, nod=0.0, droop=0.0, sweep=0.0, arms_down=0.0, trail=0.0):
        parts = [frame.turn(torso, side, lean, -front) if torso else {}]
        if head:
            parts.append(frame.turn(head, side, nod, -front))
        for chain in roles["wing_l"] + roles["wing_r"]:
            parts.append(frame.turn(chain, front, droop, -up))
            parts.append(frame.turn(chain, up, sweep, -front))
        for chain in (roles["arm_l"], roles["arm_r"]):
            if chain:
                parts.append(frame.turn(chain, front, arms_down, -up))
        for chain in roles["lower"]:
            parts.append(frame.turn(chain, side, trail, -front))
        return merge(*parts)

    bone_clip(rig, "Hero_Idle_Hover", base, [
        (1, pose(droop=-5, nod=1, trail=4)),
        (13, pose(lean=2, nod=-2, droop=7, sweep=3, arms_down=3, trail=8)),
        (25, pose(droop=-5, nod=1, trail=4)),
        (37, pose(lean=-1, nod=2, droop=4, sweep=-2, arms_down=-2, trail=1)),
        (49, pose(droop=-5, nod=1, trail=4)),
    ])
    bpy.data.actions.remove(rest)


def make_flight_clips(rig):
    """Flight clips for a winged biped (rig from --rig-json with "flight": true,
    bones named as in draconis-v2-rig.json), sampled every frame from smooth
    cycles rather than a few keys, so nothing moves in lockstep:

    - the wing beats fast down (the power stroke, ~42 % of the cycle) and
      slower up, the wrist and the outer wing folding on the way up; the tip
      lags the root, so the wing whips instead of swinging like a board;
    - the body heaves up after each downstroke and pitches and arches a little
      with the beat; the head counters the body, steady like a bird's;
    - the tail runs a wave from base to tip, the legs trail with a lag, the
      whole body rolls and yaws slowly.

    The flight posture lives in the clips: the hips pitch the body forward
    (about +X; the model faces -Y). The one-shots (attacks, cast, hit) start
    and end in the still glide pose G0 and are played additively in the game
    over the fly loop, so the wings keep beating while an arm throws.

    Rotations are in each bone's rest (armature) frame, carried by its
    parents: +X pitches forward / flexes a knee, -X lifts the head and raises
    an arm forward; about Z a left (-X) wing tip goes to the front (world down
    once the body lies flat) for +, a right one for -; about Z on the hips +
    rolls the left side down.
    """
    rig.animation_data_create()
    data = rig.animation_data
    rest = bpy.data.actions.new("SpaceTypingRest")
    data.action = rest
    for pose_bone in rig.pose.bones:
        pose_bone.rotation_mode = "QUATERNION"
        pose_bone.rotation_quaternion = Quaternion()
        pose_bone.location = Vector()
        pose_bone.keyframe_insert("rotation_quaternion", frame=1)
        pose_bone.keyframe_insert("location", frame=1)
    data.action = None
    base = pose_snapshot(rig, rest, 1)
    bpy.data.actions.remove(rest)
    X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
    bones = set(base)
    tau = math.pi * 2

    def turn(bone, axis, degrees):
        if bone not in bones or abs(degrees) < 1e-4:
            return {}
        orientation = base[bone]["orientation"]
        return {bone: orientation.inverted() @ Quaternion(axis, math.radians(degrees)) @ orientation}

    def build(p):
        """Pose from parameters → ({bone: local rotation}, {bone: local location})."""
        g = p.get
        parts = [
            turn("hips", X, g("pitch", 0)), turn("hips", Z, g("roll", 0)), turn("hips", Y, g("yaw", 0)),
            turn("spine", X, -g("arch", 0) * 0.4), turn("chest", X, -g("arch", 0) * 0.6), turn("chest", Z, g("twist", 0)),
            turn("neck", X, -g("look", 0) * 0.45), turn("head", X, -g("look", 0) * 0.55), turn("head", Z, g("head_turn", 0)),
        ]
        for side, sign in (("L", 1.0), ("R", -1.0)):
            f1, f2, f3, spread, wrist, fold = g("wing_" + side, (0, 0, 0, 0, 0, 0))
            parts += [
                turn("wing1_" + side, Z, f1 * sign), turn("wing2_" + side, Z, f2 * sign), turn("wing3_" + side, Z, f3 * sign),
                turn("wing1_" + side, Y, -spread * sign), turn("wing2_" + side, Y, -wrist * sign), turn("wing3_" + side, Y, -fold * sign),
            ]
            raise_, bend, out = g("arm_" + side, (0, 0, 0))
            parts += [turn("upperarm_" + side, X, -raise_), turn("upperarm_" + side, Y, out * sign), turn("forearm_" + side, X, -bend)]
            hip, knee, close = g("leg_" + side, (0, 0, 0))
            parts += [turn("thigh_" + side, X, hip), turn("thigh_" + side, Y, -close * sign),
                      turn("shin_" + side, X, knee), turn("foot_" + side, X, -knee * 0.5)]
        for index, (lift, sway) in enumerate(g("tail", [(0, 0)] * 4)):
            bone = "tail" + str(index + 1)
            parts += [turn(bone, X, -lift), turn(bone, Z, sway)]
        locations = {}
        if g("heave", 0) or g("surge", 0):
            world = Vector((0, -g("surge", 0), g("heave", 0)))
            locations["hips"] = base["hips"]["orientation"].inverted() @ world
        return merge(*parts), locations

    def sampled(name, frames, fn):
        """Key every frame of fn(t seconds) → params."""
        action = bpy.data.actions.new(name)
        saved = data.action
        data.action = action
        for frame in range(1, frames + 1):
            rotations, locations = build(fn((frame - 1) / FPS))
            for pose_bone in rig.pose.bones:
                pose_bone.rotation_mode = "QUATERNION"
                pose_bone.rotation_quaternion = rotations.get(pose_bone.name, Quaternion())
                pose_bone.location = locations.get(pose_bone.name, Vector())
                pose_bone.keyframe_insert("rotation_quaternion", frame=frame)
                pose_bone.keyframe_insert("location", frame=frame)
        data.action = saved
        push_to_track(rig, action, name)
        print(f"  flight clip {name}: {frames} frames")

    def blend(a, b, k):
        if isinstance(a, (int, float)):
            return a + (b - a) * k
        return type(a)(blend(x, y, k) for x, y in zip(a, b))

    def keyed(keys, duration):
        """keys: [(share of the clip, params)]; smoothstep between them (eases into and out of each)."""
        def fn(t):
            u = min(1.0, max(0.0, t / duration))
            for (u0, p0), (u1, p1) in zip(keys, keys[1:]):
                if u <= u1:
                    k = smoothstep(0, 1, (u - u0) / max(u1 - u0, 1e-6))
                    return {key: blend(p0[key], p1.get(key, p0[key]), k) for key in p0}
            return dict(keys[-1][1])
        return fn

    def stroke(t, period, lag=0.0, down=0.42):
        """Wing phase: 0 top → π bottom over `down` of the beat, back up over the rest."""
        u = ((t - lag) / period) % 1.0
        return math.pi * u / down if u < down else math.pi + math.pi * (u - down) / (1 - down)

    def wing(total, spread=0.0, wrist=0.0, fold=0.0, lag2=None, lag3=None):
        return (total * 0.6, (lag2 if lag2 is not None else total) * 0.25, (lag3 if lag3 is not None else total) * 0.15, spread, wrist, fold)

    TAIL = (32.0, 11.6, 8.7, 5.8)
    # The still glide: body flat, head up, forelimbs held under the chest
    # ready to throw, legs together trailing, tail streaming back. The source
    # wings sweep back ~45°, which turns upward once the body lies flat; a
    # total flap of ~32° brings them out level.
    G0 = {
        "pitch": 70.0, "roll": 0.0, "yaw": 0.0, "arch": 6.0, "twist": 0.0, "look": 46.0, "head_turn": 0.0,
        "wing_L": wing(32, spread=10), "wing_R": wing(32, spread=10),
        "arm_L": (80.0, 75.0, 14.0), "arm_R": (80.0, 75.0, 14.0),
        "leg_L": (52.0, 4.0, 12.0), "leg_R": (48.0, 2.0, 12.0),
        "tail": [(lift, 0.0) for lift in TAIL], "heave": 0.0, "surge": 0.0,
    }

    def G(**changes):
        values = {key: (list(value) if isinstance(value, list) else value) for key, value in G0.items()}
        values.update(changes)
        return values

    # ---- Fly: 1.75 s loop, two beats of 0.875 s.
    BEAT, LOOP = 0.875, 1.75

    def fly(t):
        s0 = stroke(t, BEAT)
        w = lambda lag: -math.cos(stroke(t, BEAT, lag))  # -1 top … +1 bottom
        up = max(0.0, math.sin(stroke(t, BEAT, 0.05) - math.pi))  # 0 … 1 … 0 on the upstroke
        slow = tau * t / LOOP
        pitch = 70 + 3 * math.sin(s0 + 0.4)
        arch = 6 + 3 * math.sin(s0 - 0.8)
        p = G(
            pitch=pitch, arch=arch, roll=2.5 * math.sin(slow + 0.5), yaw=1.5 * math.sin(slow + 1.4),
            twist=2 * math.sin(slow), look=46 - (pitch - 70) * 0.9 - (arch - 6) * 0.6 + 1.5 * math.sin(slow + 2.0),
            heave=0.05 * -math.cos(s0 - 0.35),
            arm_L=(80 + 5 * math.sin(s0 - 1.2), 75 + 7 * math.sin(s0 - 1.7), 14),
            arm_R=(80 + 5 * math.sin(s0 - 0.9), 75 + 7 * math.sin(s0 - 1.4), 14),
            leg_L=(52 + 4 * math.sin(s0 - 1.4), 4 + 6 * (1 + math.sin(s0 - 2.0)), 12),
            leg_R=(48 + 4 * math.sin(s0 - 1.7), 2 + 6 * (1 + math.sin(s0 - 2.3)), 12),
            tail=[(TAIL[i] + (3, 5, 7, 9)[i] * math.sin(s0 - 1.0 - 0.6 * i), (2, 4, 6, 8)[i] * math.sin(slow - 0.7 * i)) for i in range(4)],
        )
        for side in ("L", "R"):
            p["wing_" + side] = wing(34 + 34 * w(0.0), spread=10 + 8 * up, wrist=10 * up, fold=22 * up,
                                     lag2=34 + 34 * w(0.05), lag3=34 + 34 * w(0.10))
        return p

    sampled("Hero_Fly", round(LOOP * FPS) + 1, fly)

    # ---- Hover (menu, show camera, results): upright, slow beats, 2 s loop.
    def hover(t):
        s0 = stroke(t, 1.0, down=0.45)
        w = lambda lag: -math.cos(stroke(t, 1.0, lag, down=0.45))
        up = max(0.0, math.sin(stroke(t, 1.0, 0.05, down=0.45) - math.pi))
        slow = tau * t / 2.0
        p = G(
            pitch=4 + 2 * math.sin(s0 + 0.4), arch=2 + 2 * math.sin(s0 - 0.8), look=-2 * math.sin(s0 + 0.4),
            roll=1.5 * math.sin(slow), heave=0.035 * -math.cos(s0 - 0.35),
            arm_L=(18 + 4 * math.sin(s0 - 1.2), 32 + 6 * math.sin(s0 - 1.7), 6),
            arm_R=(18 + 4 * math.sin(s0 - 0.9), 32 + 6 * math.sin(s0 - 1.4), 6),
            leg_L=(4 + 3 * math.sin(s0 - 1.4), 10 + 6 * math.sin(s0 - 2.0), 0),
            leg_R=(2 + 3 * math.sin(s0 - 1.7), 6 + 6 * math.sin(s0 - 2.3), 0),
            tail=[((8, 3, 2, 1)[i] + (2, 3, 4, 5)[i] * math.sin(s0 - 1.0 - 0.6 * i), (3, 5, 7, 9)[i] * math.sin(slow - 0.7 * i)) for i in range(4)],
        )
        for side in ("L", "R"):
            p["wing_" + side] = wing(2 + 16 * w(0.0), spread=-4 + 6 * up, wrist=8 * up, fold=14 * up,
                                     lag2=2 + 16 * w(0.06), lag3=2 + 16 * w(0.12))
        return p

    sampled("Hero_Idle_Hover", 49, hover)

    # ---- Boost: 0.5 s loop, a flat dive with the wings half folded back and
    # short fast beats (not swept edge-on, which reads as two sticks).
    def boost(t):
        s0 = stroke(t, 0.25)
        w = lambda lag: -math.cos(stroke(t, 0.25, lag))
        p = G(pitch=80, look=56, arch=2, heave=0.02 * -math.cos(s0),
              arm_L=(45, 100, 8), arm_R=(45, 100, 8), leg_L=(48, 4, 14), leg_R=(46, 2, 14),
              tail=[(TAIL[i] + 8 + (1, 2, 3, 4)[i] * math.sin(s0 - 0.8 * i), (1, 2, 3, 4)[i] * math.sin(tau * t / 0.5 - 0.7 * i)) for i in range(4)])
        for side in ("L", "R"):
            p["wing_" + side] = wing(24 + 9 * w(0.0), spread=22, wrist=10, fold=26, lag2=24 + 9 * w(0.03), lag3=24 + 9 * w(0.06))
        return p

    sampled("Hero_Boost", 13, boost)

    # ---- Attacks (additive): the throwing arm draws the hand back up by the
    # shoulder, then throws it forward ahead of the chest, towards the middle
    # where a camera beside and behind still sees it, as the body rolls that
    # side up and the wing on that side lifts out of the way; the fireball
    # leaves the palm at 38 % (frame 6 of 14). Played at 1.6× in the game.
    for side, other, sign in (("L", "R", 1.0), ("R", "L", -1.0)):
        arm, far, wing_key = "arm_" + side, "arm_" + other, "wing_" + side
        roll = -sign  # the throwing side rises
        sampled("Hero_Attack_" + side, 14, keyed([
            (0.0, G()),
            (0.22, G(**{arm: (48, 122, 18), far: (84, 78, 14), wing_key: wing(24, spread=6)},
                     twist=-10 * sign, roll=-8 * roll, look=44)),
            (0.38, G(**{arm: (158, 6, -6), far: (70, 88, 14), wing_key: wing(12, spread=2)},
                     twist=18 * sign, roll=18 * roll, look=50, head_turn=8 * sign)),
            (0.52, G(**{arm: (164, 12, -4), far: (74, 84, 14), wing_key: wing(16, spread=4)},
                     twist=14 * sign, roll=14 * roll, look=49, head_turn=6 * sign)),
            (1.0, G()),
        ], 13 / FPS))

    # ---- Both palms (additive) for a word's last letter: chest out, both
    # hands drawn back, then pushed out together with a power stroke (release
    # at 42 %, frame 7 of 16).
    sampled("Hero_Attack_Both", 16, keyed([
        (0.0, G()),
        (0.25, G(arm_L=(50, 120, 10), arm_R=(50, 120, 10), arch=14, look=44,
                 wing_L=wing(20, spread=4), wing_R=wing(20, spread=4))),
        (0.42, G(arm_L=(158, 6, 10), arm_R=(158, 6, 10), arch=-2, look=52,
                 wing_L=wing(46, spread=14), wing_R=wing(46, spread=14))),
        (0.58, G(arm_L=(162, 12, 10), arm_R=(162, 12, 10), arch=0, look=51,
                 wing_L=wing(40, spread=12), wing_R=wing(40, spread=12))),
        (1.0, G()),
    ], 15 / FPS))

    # ---- Nova breath (additive): rear up and draw the head back, wings
    # flaring, then snap forward and breathe (release at 46 %, frame 19 of 40).
    rear = dict(pitch=38, arch=24, look=86, arm_L=(60, 80, 30), arm_R=(60, 80, 30),
                wing_L=wing(4, spread=-16), wing_R=wing(4, spread=-16),
                tail=[(TAIL[0] - 12, 0), (TAIL[1] - 6, 6), (TAIL[2] - 4, 10), (TAIL[3], 14)])
    sampled("Hero_Cast", 40, keyed([
        (0.0, G()),
        (0.30, G(**rear)),
        (0.40, G(**{**rear, "pitch": 36, "look": 96, "arch": 26})),
        (0.46, G(pitch=48, arch=2, look=38, arm_L=(76, 70, 26), arm_R=(76, 70, 26),
                 wing_L=wing(52, spread=4), wing_R=wing(52, spread=4))),
        (0.78, G(pitch=50, arch=4, look=40, arm_L=(76, 70, 26), arm_R=(76, 70, 26),
                 wing_L=wing(40, spread=6), wing_R=wing(40, spread=6))),
        (1.0, G()),
    ], 39 / FPS))

    # ---- Hit (additive): knocked up and over, wings flinch, a damped recovery.
    sampled("Hero_Hit", 14, keyed([
        (0.0, G()),
        (0.15, G(pitch=50, roll=12, arch=16, look=62, arm_L=(60, 100, 30), arm_R=(60, 100, 30),
                 wing_L=wing(8, spread=-6, fold=18), wing_R=wing(8, spread=-6, fold=18),
                 tail=[(TAIL[i] - (6, 4, 3, 2)[i], (6, 8, 10, 12)[i]) for i in range(4)])),
        (0.42, G(pitch=74, roll=-5, arch=4, look=44)),
        (1.0, G()),
    ], 13 / FPS))

    # ---- Victory (show camera, upright): chest out, head up in a roar, arms
    # thrown wide (not overhead: the shoulder skin tears past ~120°), wings
    # flared and beating slowly, tail lashing.
    def victory(t):
        k = smoothstep(0, 1, t / 0.5)
        s0 = stroke(t, 1.0, down=0.45)
        w = lambda lag: -math.cos(stroke(t, 1.0, lag, down=0.45))
        p = blend_dicts(G(pitch=0, look=0, arch=0, arm_L=(18, 32, 6), arm_R=(18, 32, 6), leg_L=(4, 10, 0), leg_R=(2, 6, 0),
                          tail=[(8, 0), (3, 0), (2, 0), (1, 0)], wing_L=wing(2), wing_R=wing(2)),
                        G(pitch=2 + 2 * math.sin(s0), arch=14, look=-20 + 3 * math.sin(s0 + 1.0), roll=2 * math.sin(tau * t / 2),
                          arm_L=(70, 26, 58), arm_R=(70, 26, 58), leg_L=(4, 12, 0), leg_R=(2, 8, 0), heave=0.04 * -math.cos(s0 - 0.35),
                          tail=[((10, 4, 2, 1)[i], (6, 10, 14, 18)[i] * math.sin(tau * t / 1.0 - 0.8 * i)) for i in range(4)],
                          wing_L=wing(-14 + 14 * w(0), spread=-12, lag2=-14 + 14 * w(0.06), lag3=-14 + 14 * w(0.12)),
                          wing_R=wing(-14 + 14 * w(0), spread=-12, lag2=-14 + 14 * w(0.06), lag3=-14 + 14 * w(0.12))), k)
        return p

    def blend_dicts(a, b, k):
        return {key: blend(a[key], b.get(key, a[key]), k) for key in a}

    sampled("Hero_Victory", 49, victory)

    # ---- Death (held): a jolt that throws the head back (never face down),
    # then a slow backward tumble onto the side while sinking, wings going
    # limp and trailing up, limbs loose, tail curling.
    sampled("Hero_Death", 56, keyed([
        (0.0, G()),
        (0.12, G(pitch=52, arch=24, look=40, roll=10, arm_L=(100, 40, 50), arm_R=(100, 40, 50),
                 wing_L=wing(-8, spread=-10), wing_R=wing(-8, spread=-10))),
        (0.55, G(pitch=28, arch=10, look=22, roll=42, heave=-0.25, arm_L=(60, 40, 34), arm_R=(70, 46, 30),
                 wing_L=wing(10, spread=26, wrist=14, fold=24), wing_R=wing(14, spread=30, wrist=16, fold=28),
                 leg_L=(22, 34, 6), leg_R=(18, 40, 6), tail=[(TAIL[i] - (14, 8, 6, 4)[i], (6, 10, 14, 18)[i]) for i in range(4)])),
        (1.0, G(pitch=12, arch=-4, look=10, roll=70, heave=-0.6, arm_L=(40, 40, 30), arm_R=(50, 44, 26),
                wing_L=wing(18, spread=40, wrist=20, fold=32), wing_R=wing(22, spread=44, wrist=22, fold=34),
                leg_L=(16, 44, 4), leg_R=(12, 50, 4), tail=[(TAIL[i] - (20, 10, 8, 6)[i], (10, 14, 18, 22)[i]) for i in range(4)])),
    ], 55 / FPS))

    # ---- Intro: dives in with the wings half folded, flares them open and
    # lands in the glide with one strong downstroke.
    tuck = dict(pitch=82, look=58, arch=2, arm_L=(45, 100, 8), arm_R=(45, 100, 8), leg_L=(48, 4, 14), leg_R=(46, 2, 14),
                wing_L=wing(24, spread=22, wrist=10, fold=26), wing_R=wing(24, spread=22, wrist=10, fold=26))
    sampled("Hero_Intro", 37, keyed([
        (0.0, G(**tuck)),
        (0.45, G(**tuck)),
        (0.62, G(pitch=66, look=48, arch=12, wing_L=wing(-4, spread=-8), wing_R=wing(-4, spread=-8))),
        (0.80, G(pitch=72, look=44, wing_L=wing(66, spread=12, fold=-4), wing_R=wing(66, spread=12, fold=-4))),
        (1.0, G()),
    ], 36 / FPS))



def make_dragon_clips(rig):
    """Flight clips for a four-legged winged dragon (rig from --rig-json with
    "flight": "dragon", bones as in draconis-v3-rig.json), sampled every frame
    from smooth cycles like make_flight_clips:

    - wings beat about the body's long axis, fast down and slower up with the
      outer wing folding back on the way up and the tip lagging the root;
    - the body heaves after each downstroke; the neck reaches forward in a
      curve and the head counters every body motion, steady and level;
    - the jaw stays nearly shut in flight and gapes for each shot (the source
      mouth is modelled open, ~30°; the jaw bone closes it);
    - forelegs fold under the chest, hind legs trail, the tail (curled to one
      side in the source) is straightened and runs a wave from base to tip.

    Shots (spit, big spit, breath, hit) start and end in the still glide G0 and
    are played additively over the fly loop in the game.

    Rotations are in each bone's rest frame (the body lies along -Y, Z up): +X
    pitches a forward-pointing bone down / a backward one up, -X lifts the
    chest; about Y on a left (-X) wing + raises the tip (so a downstroke is -
    on the left, + on the right); about Z + turns a left wing's tip forward.
    """
    rig.animation_data_create()
    data = rig.animation_data
    rest = bpy.data.actions.new("SpaceTypingRest")
    data.action = rest
    for pose_bone in rig.pose.bones:
        pose_bone.rotation_mode = "QUATERNION"
        pose_bone.rotation_quaternion = Quaternion()
        pose_bone.location = Vector()
        pose_bone.keyframe_insert("rotation_quaternion", frame=1)
        pose_bone.keyframe_insert("location", frame=1)
    data.action = None
    base = pose_snapshot(rig, rest, 1)
    bpy.data.actions.remove(rest)
    X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
    bones = set(base)
    tau = math.pi * 2
    NECK = (24.0, 12.0, 6.0)
    LIMB = 0.6

    def turn(bone, axis, degrees):
        if bone not in bones or abs(degrees) < 1e-4:
            return {}
        orientation = base[bone]["orientation"]
        return {bone: orientation.inverted() @ Quaternion(axis, math.radians(degrees)) @ orientation}

    def build(p):
        g = p.get
        reach = g("reach", 0)
        parts = [
            turn("hips", X, g("pitch", 0)), turn("hips", Y, g("roll", 0)), turn("hips", Z, g("yaw", 0)),
            turn("spine", X, -g("arch", 0) * 0.4), turn("chest", X, -g("arch", 0) * 0.6),
            # The neck leans forward from upright, spread over three joints;
            # the head counters it to stay level. (Folding it flat tore the
            # mane: the scan's skin only bends so far.)
            turn("neck1", X, NECK[0] * reach + g("neck_wave", 0)), turn("neck2", X, NECK[1] * reach - g("neck_wave", 0) * 0.5),
            turn("neck3", X, NECK[2] * reach), turn("neck1", Z, g("neck_turn", 0) * 0.5), turn("neck2", Z, g("neck_turn", 0) * 0.5),
            turn("head", X, -sum(NECK) * reach - g("look", 0)),
            # bite: the mouth is modelled ~32° open (the jaw region follows the
            # line halving it, jaw_slope); 0 shuts it, 1 is as modelled, 1.3
            # gapes ~10° wider for a spit.
            turn("jaw", X, -32 + 32 * min(1.3, g("bite", 0))),
        ]
        for side, sign in (("L", 1.0), ("R", -1.0)):
            f1, f2, f3, sweep, wrist, fold = g("wing_" + side, (0, 0, 0, 0, 0, 0))
            parts += [
                turn("wing1_" + side, Y, -f1 * sign), turn("wing2_" + side, Y, -f2 * sign), turn("wing3_" + side, Y, -f3 * sign),
                turn("wing1_" + side, Z, -sweep * sign), turn("wing2_" + side, Z, -wrist * sign), turn("wing3_" + side, Z, -fold * sign),
            ]
            # Legs tuck by LIMB of the authored angles (fully folded, the hip and shoulder skin tore).
            upper, fore, hand = (value * LIMB * 0.65 for value in g("front_" + side, (0, 0, 0)))
            parts += [turn("upperarm_" + side, X, upper), turn("forearm_" + side, X, fore), turn("hand_" + side, X, hand)]
            thigh, shin, foot = (value * LIMB for value in g("hind_" + side, (0, 0, 0)))
            parts += [turn("thigh_" + side, X, thigh), turn("shin_" + side, X, shin), turn("foot_" + side, X, foot)]
        for index, (lift, sway) in enumerate(g("tail", [(0, 0)] * 6)):
            parts += [turn("tail" + str(index + 1), X, lift), turn("tail" + str(index + 1), Z, sway)]
        locations = {}
        if g("heave", 0) or g("surge", 0):
            world = Vector((0, -g("surge", 0), g("heave", 0)))
            locations["hips"] = base["hips"]["orientation"].inverted() @ world
        return merge(*parts), locations

    def sampled(name, frames, fn):
        action = bpy.data.actions.new(name)
        saved = data.action
        data.action = action
        for frame in range(1, frames + 1):
            rotations, locations = build(fn((frame - 1) / FPS))
            for pose_bone in rig.pose.bones:
                pose_bone.rotation_mode = "QUATERNION"
                pose_bone.rotation_quaternion = rotations.get(pose_bone.name, Quaternion())
                pose_bone.location = locations.get(pose_bone.name, Vector())
                pose_bone.keyframe_insert("rotation_quaternion", frame=frame)
                pose_bone.keyframe_insert("location", frame=frame)
        data.action = saved
        push_to_track(rig, action, name)
        print(f"  dragon clip {name}: {frames} frames")

    def blend(a, b, k):
        if isinstance(a, (int, float)):
            return a + (b - a) * k
        return type(a)(blend(x, y, k) for x, y in zip(a, b))

    def keyed(keys, duration):
        def fn(t):
            u = min(1.0, max(0.0, t / duration))
            for (u0, p0), (u1, p1) in zip(keys, keys[1:]):
                if u <= u1:
                    k = smoothstep(0, 1, (u - u0) / max(u1 - u0, 1e-6))
                    return {key: blend(p0[key], p1.get(key, p0[key]), k) for key in p0}
            return dict(keys[-1][1])
        return fn

    def stroke(t, period, lag=0.0, down=0.42):
        u = ((t - lag) / period) % 1.0
        return math.pi * u / down if u < down else math.pi + math.pi * (u - down) / (1 - down)

    def wing(total, sweep=0.0, wrist=0.0, fold=0.0, lag2=None, lag3=None):
        return (total * 0.6, (lag2 if lag2 is not None else total) * 0.25, (lag3 if lag3 is not None else total) * 0.15, sweep, wrist, fold)

    # The source tail curls to the right over its last three segments; these
    # turns straighten it behind the body and lift it in line with the back.
    # The tail keeps the curl it was modelled with (straightening it tore the
    # tuft); it only lifts a little in line with the back and waves.
    TAIL = [(6, 0), (3, 0), (2, 0), (1, 0), (0, 0), (0, 0)]
    WING_LEVEL = 16  # the source wings are raised; this lowers them toward level
    G0 = {
        "pitch": 4.0, "roll": 0.0, "yaw": 0.0, "arch": 0.0, "reach": 1.0, "look": 0.0, "neck_wave": 0.0, "neck_turn": 0.0,
        "bite": 0.0,
        "wing_L": wing(WING_LEVEL, sweep=6), "wing_R": wing(WING_LEVEL, sweep=6),
        "front_L": (60.0, -85.0, 30.0), "front_R": (60.0, -85.0, 30.0),
        "hind_L": (62.0, -30.0, 40.0), "hind_R": (58.0, -26.0, 38.0),
        "tail": [tuple(item) for item in TAIL], "heave": 0.0, "surge": 0.0,
    }

    def G(**changes):
        values = {key: (list(value) if isinstance(value, list) else value) for key, value in G0.items()}
        values.update(changes)
        return values

    def tail_wave(s0, slow, lift_amp=(2, 3, 4, 5, 6, 7), sway_amp=(2, 3, 4, 6, 8, 10), bias=None):
        bias = bias or TAIL
        return [(bias[i][0] + lift_amp[i] * math.sin(s0 - 1.0 - 0.55 * i), bias[i][1] + sway_amp[i] * math.sin(slow - 0.7 * i)) for i in range(6)]

    # ---- Fly: an air gallop, 1.75 s loop, two strides of 0.875 s.
    # The legs run a rotary gallop (hind left, hind right, fore left, fore
    # right): each reaches forward, pulls back, then folds at the knee and
    # elbow as it swings forward again, the foot flicking. One wing beat per
    # stride, its downstroke on the hind legs' push. The spine gathers when
    # the fore and hind legs meet under the body and stretches as they part;
    # the body heaves after each downstroke and rolls with the legs. The neck
    # rides a little behind the body, the head nods with the stride but keeps
    # level, and the tail waves from base to tip against the body.
    BEAT, LOOP = 0.875, 1.75
    FRONT_K, HIND_K = LIMB * 0.65, LIMB  # build() scales the leg angles by these

    def bump(u, centre, width=0.16):
        d = (u - centre + 0.5) % 1.0 - 0.5
        return math.exp(-((d / width) ** 2))

    def leg(u, mean, swing, flex, base_mid, base_tip, tip_amp, k):
        """(upper, mid, tip) final angles for stride phase u, divided by build's scale k."""
        upper = mean - swing * math.cos(tau * u)
        mid = base_mid + flex * bump(u, 0.8)
        tip = base_tip + tip_amp * math.sin(tau * u - 0.8)
        return (upper / k, mid / k, tip / k)

    def fly(t):
        stride = (t / BEAT) % 1.0
        s0 = stroke(t, BEAT, 0.3 * BEAT)
        w = lambda lag: -math.cos(stroke(t, BEAT, 0.3 * BEAT + lag))
        up = max(0.0, math.sin(stroke(t, BEAT, 0.3 * BEAT + 0.05) - math.pi))
        slow = tau * t / LOOP
        gait = tau * stride
        pitch = 4 + 2.5 * math.sin(gait - 0.5)
        arch = -4 * math.cos(gait)
        p = G(
            pitch=pitch, arch=arch, roll=1.8 * math.sin(gait + 0.3), yaw=1.2 * math.sin(slow + 1.4),
            heave=0.03 * -math.cos(s0 - 0.35),
            neck_wave=4 * math.sin(gait - 1.2), neck_turn=4 * math.sin(slow + 0.8),
            look=-(pitch - 4) * 0.9 - arch * 0.5 + 2 * math.sin(gait - 2.0),
            bite=0.0,
            hind_L=leg(stride, 28, 18, 30, -18, 24, 15, HIND_K),
            hind_R=leg((stride - 0.1) % 1.0, 28, 18, 30, -18, 24, 15, HIND_K),
            front_L=leg((stride - 0.45) % 1.0, 15, 20, 35, -30, 12, 15, FRONT_K),
            front_R=leg((stride - 0.55) % 1.0, 15, 20, 35, -30, 12, 15, FRONT_K),
            # The tail: an up-down wave driven by the stride and a wide, slow
            # side-to-side S travelling from base to tip, each segment a
            # little later and further than the one before it.
            tail=[(TAIL[i][0] + (3, 4, 5, 6, 7, 8)[i] * math.sin(gait - 1.2 - 0.75 * i),
                   (5, 7, 9, 11, 13, 15)[i] * math.sin(slow - 0.8 * i) + (2, 2.5, 3, 3.5, 4, 4.5)[i] * math.sin(gait - 1.0 * i))
                  for i in range(6)],
        )
        for side in ("L", "R"):
            p["wing_" + side] = wing(WING_LEVEL + 24 * w(0.0), sweep=6 + 6 * up, wrist=8 * up, fold=16 * up,
                                     lag2=WING_LEVEL + 24 * w(0.06), lag3=WING_LEVEL + 24 * w(0.12))
        return p

    sampled("Hero_Fly", round(LOOP * FPS) + 1, fly)

    # ---- Hover (menu, results): chest raised, neck up, slow deep beats.
    def hover(t):
        s0 = stroke(t, 1.2, down=0.45)
        w = lambda lag: -math.cos(stroke(t, 1.2, lag, down=0.45))
        up = max(0.0, math.sin(stroke(t, 1.2, 0.06, down=0.45) - math.pi))
        slow = tau * t / 2.4
        pitch = -22 + 2 * math.sin(s0 + 0.4)
        p = G(pitch=pitch, reach=0.45, look=-(pitch + 22) * 0.9 - 8, heave=0.03 * -math.cos(s0 - 0.35),
              roll=1.5 * math.sin(slow), neck_wave=2 * math.sin(s0 - 1.2), bite=0.0,
              front_L=(30 + 5 * math.sin(s0 - 1.3), -50 + 8 * math.sin(s0 - 1.8), 20),
              front_R=(30 + 5 * math.sin(s0 - 1.0), -50 + 8 * math.sin(s0 - 1.5), 20),
              hind_L=(20 + 5 * math.sin(s0 - 1.5), -10 + 6 * math.sin(s0 - 2.0), 20),
              hind_R=(18 + 5 * math.sin(s0 - 1.8), -8 + 6 * math.sin(s0 - 2.3), 20),
              tail=tail_wave(s0, slow, sway_amp=(3, 5, 7, 9, 11, 13)))
        for side in ("L", "R"):
            p["wing_" + side] = wing(WING_LEVEL - 4 + 30 * w(0.0), sweep=-4 + 8 * up, wrist=10 * up, fold=18 * up,
                                     lag2=WING_LEVEL - 4 + 30 * w(0.07), lag3=WING_LEVEL - 4 + 30 * w(0.14))
        return p

    sampled("Hero_Idle_Hover", round(2.4 * FPS) + 1, hover)

    # ---- Boost: a dive with the wings half folded back, quick short beats.
    def boost(t):
        s0 = stroke(t, 0.3)
        w = lambda lag: -math.cos(stroke(t, 0.3, lag))
        p = G(pitch=12, look=-8, heave=0.015 * -math.cos(s0), bite=0.0,
              front_L=(75, -100, 35), front_R=(75, -100, 35), hind_L=(78, -10, 50), hind_R=(76, -8, 48),
              tail=tail_wave(s0, tau * t / 0.6, lift_amp=(1, 1, 2, 2, 3, 3), sway_amp=(1, 2, 2, 3, 4, 5)))
        for side in ("L", "R"):
            p["wing_" + side] = wing(WING_LEVEL + 14 + 8 * w(0.0), sweep=30, wrist=14, fold=30,
                                     lag2=WING_LEVEL + 14 + 8 * w(0.03), lag3=WING_LEVEL + 14 + 8 * w(0.06))
        return p

    sampled("Hero_Boost", round(0.6 * FPS) + 1, boost)

    # ---- Spit (additive): the head draws back with the jaw shut, then snaps
    # forward with the jaw gaping as the fireball leaves (42 %, frame 6 of 12).
    sampled("Hero_Spit", 12, keyed([
        (0.0, G()),
        (0.25, G(reach=0.86, look=-16, bite=0.0, arch=4)),
        (0.42, G(reach=1.08, look=6, bite=1.25, arch=-2, surge=0.03)),
        (0.6, G(reach=1.04, look=3, bite=1.0, surge=0.02)),
        (1.0, G()),
    ], 11 / FPS))

    # ---- Big spit (additive) for a word's last letter: a deeper wind-up with
    # the chest rising and wings lifting, a lunge with a power stroke (45 %).
    sampled("Hero_Spit_Big", 16, keyed([
        (0.0, G()),
        (0.28, G(reach=0.72, look=-24, bite=0.0, arch=10, pitch=-4, wing_L=wing(WING_LEVEL - 18, sweep=-4), wing_R=wing(WING_LEVEL - 18, sweep=-4))),
        (0.45, G(reach=1.12, look=8, bite=1.35, arch=-4, pitch=8, surge=0.05, wing_L=wing(WING_LEVEL + 26, sweep=10), wing_R=wing(WING_LEVEL + 26, sweep=10))),
        (0.62, G(reach=1.08, look=5, bite=1.3, surge=0.03, wing_L=wing(WING_LEVEL + 20, sweep=8), wing_R=wing(WING_LEVEL + 20, sweep=8))),
        (1.0, G()),
    ], 15 / FPS))

    # ---- Breath (additive, Nova): rear up and draw the head high and back,
    # wings flaring, then lunge and breathe with the jaw wide (46 %, frame 19
    # of 40), hold the stream, settle back.
    rear = dict(pitch=-24, arch=14, reach=0.5, look=-30, bite=0.0,
                wing_L=wing(WING_LEVEL - 26, sweep=-12), wing_R=wing(WING_LEVEL - 26, sweep=-12),
                tail=[(TAIL[i][0] - (6, 4, 3, 2, 2, 1)[i], TAIL[i][1]) for i in range(6)])
    sampled("Hero_Cast", 40, keyed([
        (0.0, G()),
        (0.30, G(**rear)),
        (0.40, G(**{**rear, "pitch": -28, "look": -38, "reach": 0.42})),
        (0.46, G(pitch=6, arch=-2, reach=1.12, look=4, bite=1.4, surge=0.05,
                 wing_L=wing(WING_LEVEL + 30, sweep=10), wing_R=wing(WING_LEVEL + 30, sweep=10))),
        (0.80, G(pitch=6, arch=0, reach=1.1, look=3, bite=1.35, surge=0.04,
                 wing_L=wing(WING_LEVEL + 20, sweep=8), wing_R=wing(WING_LEVEL + 20, sweep=8))),
        (1.0, G()),
    ], 39 / FPS))

    # ---- Hit (additive), 0.9 s: a soft flinch, not a jolt. The body gives a
    # little up and over, the head pulls back a touch, the wings check; then
    # it settles in two smaller and smaller sways, the tail lashing behind
    # and catching up last. Mouth shut.
    def hit(t):
        u = t / (21 / FPS)
        # A damped sway: a quick but small give, two decaying rebounds.
        give = math.sin(min(1.0, u) * math.pi * 2.6) * math.exp(-3.4 * u) * smoothstep(0, 0.12, u)
        tail_give = math.sin(max(0.0, u - 0.08) * math.pi * 2.2) * math.exp(-2.6 * u)
        p = G(pitch=4 - 7 * give, roll=5 * give, arch=4 * give, reach=1 - 0.08 * give, look=-6 * give,
              tail=[(TAIL[i][0] - 3 * tail_give, TAIL[i][1] + (3, 5, 7, 9, 11, 13)[i] * math.sin(max(0.0, u - 0.05 * i) * math.pi * 2.2) * math.exp(-2.6 * u)) for i in range(6)])
        for side in ("L", "R"):
            p["wing_" + side] = wing(WING_LEVEL - 10 * give, sweep=6 - 4 * give, fold=8 * max(0.0, give))
        return p

    sampled("Hero_Hit", 22, hit)

    # ---- Victory (show camera): rears up and roars, wings flared high and
    # beating slowly, tail lashing.
    def victory(t):
        k = smoothstep(0, 1, t / 0.6)
        s0 = stroke(t, 1.2, down=0.45)
        w = lambda lag: -math.cos(stroke(t, 1.2, lag, down=0.45))
        slow = tau * t / 2.0
        start = G(pitch=-22, reach=0.45, look=-8, bite=0.0, front_L=(30, -50, 20), front_R=(30, -50, 20),
                  hind_L=(20, -10, 20), hind_R=(18, -8, 20), wing_L=wing(WING_LEVEL - 4), wing_R=wing(WING_LEVEL - 4))
        roar = G(pitch=-34 + 2 * math.sin(s0), arch=12, reach=0.2, look=-34 + 3 * math.sin(s0 + 1.0), bite=0.0,
                 roll=2 * math.sin(slow), heave=0.04 * -math.cos(s0 - 0.35),
                 front_L=(10, -30, 10), front_R=(10, -30, 10), hind_L=(14, -6, 16), hind_R=(12, -4, 16),
                 tail=tail_wave(s0, tau * t / 1.0, sway_amp=(4, 7, 10, 13, 16, 19)),
                 wing_L=wing(WING_LEVEL - 26 + 14 * w(0), sweep=-14, lag2=WING_LEVEL - 26 + 14 * w(0.07), lag3=WING_LEVEL - 26 + 14 * w(0.14)),
                 wing_R=wing(WING_LEVEL - 26 + 14 * w(0), sweep=-14, lag2=WING_LEVEL - 26 + 14 * w(0.07), lag3=WING_LEVEL - 26 + 14 * w(0.14)))
        return {key: blend(start[key], roar[key], k) for key in start}

    sampled("Hero_Victory", 49, victory)

    # ---- Death (held, dissolving): a jolt that throws the head up (never
    # nose down), then a slow, gentle roll as it sinks, the wings folding in
    # and the tail going slack; limbs stay loosely tucked, not flung about.
    sampled("Hero_Death", 56, keyed([
        (0.0, G()),
        (0.12, G(pitch=-14, arch=12, reach=0.7, look=-26, bite=0.25, roll=6,
                 wing_L=wing(WING_LEVEL - 26, sweep=-8), wing_R=wing(WING_LEVEL - 26, sweep=-8))),
        (0.55, G(pitch=-10, arch=4, reach=0.7, look=-10, bite=0.2, roll=22, heave=-0.18,
                 wing_L=wing(WING_LEVEL + 6, sweep=22, wrist=12, fold=20), wing_R=wing(WING_LEVEL + 4, sweep=24, wrist=12, fold=22),
                 tail=[(TAIL[i][0] - 4, TAIL[i][1] + (3, 4, 5, 6, 7, 8)[i]) for i in range(6)])),
        (1.0, G(pitch=-6, arch=0, reach=0.65, look=-4, bite=0.15, roll=36, heave=-0.42,
                wing_L=wing(WING_LEVEL + 12, sweep=34, wrist=16, fold=28), wing_R=wing(WING_LEVEL + 10, sweep=36, wrist=16, fold=30),
                front_L=(66, -90, 34), front_R=(66, -90, 34), hind_L=(56, -34, 36), hind_R=(52, -30, 34),
                tail=[(TAIL[i][0] - 6, TAIL[i][1] + (5, 7, 9, 11, 13, 15)[i]) for i in range(6)])),
    ], 55 / FPS))

    # ---- Intro: dives in half folded, flares the wings open, settles into the glide.
    tuck = dict(pitch=12, look=-8, bite=0.0, front_L=(75, -100, 35), front_R=(75, -100, 35), hind_L=(78, -10, 50), hind_R=(76, -8, 48),
                wing_L=wing(WING_LEVEL + 14, sweep=30, wrist=14, fold=30), wing_R=wing(WING_LEVEL + 14, sweep=30, wrist=14, fold=30))
    sampled("Hero_Intro", 37, keyed([
        (0.0, G(**tuck)),
        (0.45, G(**tuck)),
        (0.62, G(pitch=-6, arch=6, look=-6, bite=0.0, wing_L=wing(WING_LEVEL - 28, sweep=-8), wing_R=wing(WING_LEVEL - 28, sweep=-8))),
        (0.80, G(pitch=6, wing_L=wing(WING_LEVEL + 34, sweep=10, fold=-4), wing_R=wing(WING_LEVEL + 34, sweep=10, fold=-4))),
        (1.0, G()),
    ], 36 / FPS))


def make_guide_clips(rig):
    """Clips for a standing winged biped used as a guide on a menu (rig from
    --rig-json with "flight": "guide", bones as in draconis-v4-rig.json),
    sampled every frame like make_flight_clips. Guide_Idle loops; every action
    (Guide_Wave, Guide_Flap, Guide_Hop, Guide_Bow, Guide_Talk) starts and ends
    in the idle's first pose, so a cross-fade in and out of it is seamless.

    Rest frame: Z up, the model faces -Y. +X on the hips bows forward; about
    Z turns the body; about Y leans it. Arms: -X raises forward, Y lifts out to
    the side (signed per side), -X on the forearm bends the elbow. Wings: about
    Y + lifts the tip up and in, about Z + folds it back behind the body (both
    signed per side). Legs: -X swings a thigh forward, +X bends the knee.
    """
    rig.animation_data_create()
    data = rig.animation_data
    rest = bpy.data.actions.new("SpaceTypingRest")
    data.action = rest
    for pose_bone in rig.pose.bones:
        pose_bone.rotation_mode = "QUATERNION"
        pose_bone.rotation_quaternion = Quaternion()
        pose_bone.location = Vector()
        pose_bone.keyframe_insert("rotation_quaternion", frame=1)
        pose_bone.keyframe_insert("location", frame=1)
    data.action = None
    base = pose_snapshot(rig, rest, 1)
    bpy.data.actions.remove(rest)
    X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
    bones = set(base)
    tau = math.pi * 2

    def turn(bone, axis, degrees):
        if bone not in bones or abs(degrees) < 1e-4:
            return {}
        orientation = base[bone]["orientation"]
        return {bone: orientation.inverted() @ Quaternion(axis, math.radians(degrees)) @ orientation}

    def build(p):
        g = p.get
        parts = [
            turn("hips", X, g("bow", 0)), turn("hips", Z, g("turn", 0)), turn("hips", Y, g("lean", 0)),
            turn("spine", X, -g("arch", 0) * 0.4), turn("chest", X, -g("arch", 0) * 0.6), turn("chest", Z, g("twist", 0)),
            turn("neck", X, -g("look", 0) * 0.4), turn("head", X, -g("look", 0) * 0.6),
            turn("head", Z, g("head_turn", 0)), turn("head", Y, g("tilt", 0)),
        ]
        for side, sign in (("L", 1.0), ("R", -1.0)):
            lift, fold, wrist = g("wing_" + side, (0, 0, 0))
            parts += [
                turn("wing1_" + side, Y, lift * 0.6 * sign), turn("wing2_" + side, Y, lift * 0.25 * sign), turn("wing3_" + side, Y, lift * 0.15 * sign),
                turn("wing1_" + side, Z, -fold * 0.7 * sign), turn("wing3_" + side, Z, -fold * 0.3 * sign), turn("wing2_" + side, Y, wrist * sign),
            ]
            raise_, out, bend, swing = g("arm_" + side, (0, 0, 0, 0))
            parts += [turn("upperarm_" + side, X, -raise_), turn("upperarm_" + side, Y, out * sign),
                      turn("forearm_" + side, X, -bend), turn("forearm_" + side, Z, swing * sign)]
            thigh, knee, foot = g("leg_" + side, (0, 0, 0))
            parts += [turn("thigh_" + side, X, -thigh), turn("shin_" + side, X, knee), turn("foot_" + side, X, -foot)]
        for index, (lift, sway) in enumerate(g("tail", [(0, 0)] * 4)):
            parts += [turn("tail" + str(index + 1), X, lift), turn("tail" + str(index + 1), Z, sway)]
        locations = {}
        if g("heave", 0):
            locations["hips"] = base["hips"]["orientation"].inverted() @ Vector((0, 0, g("heave", 0)))
        return merge(*parts), locations

    def sampled(name, frames, fn):
        action = bpy.data.actions.new(name)
        saved = data.action
        data.action = action
        for frame in range(1, frames + 1):
            rotations, locations = build(fn((frame - 1) / FPS))
            for pose_bone in rig.pose.bones:
                pose_bone.rotation_mode = "QUATERNION"
                pose_bone.rotation_quaternion = rotations.get(pose_bone.name, Quaternion())
                pose_bone.location = locations.get(pose_bone.name, Vector())
                pose_bone.keyframe_insert("rotation_quaternion", frame=frame)
                pose_bone.keyframe_insert("location", frame=frame)
        data.action = saved
        push_to_track(rig, action, name)
        print(f"  guide clip {name}: {frames} frames")

    def blend(a, b, k):
        if isinstance(a, (int, float)):
            return a + (b - a) * k
        return type(a)(blend(x, y, k) for x, y in zip(a, b))

    def keyed(keys, duration, extra=None):
        """keys: [(share, params)] eased with smoothstep; extra(t, u, params) adds overlays."""
        def fn(t):
            u = min(1.0, max(0.0, t / duration))
            p = dict(keys[-1][1])
            for (u0, p0), (u1, p1) in zip(keys, keys[1:]):
                if u <= u1:
                    k = smoothstep(0, 1, (u - u0) / max(u1 - u0, 1e-6))
                    p = {key: blend(p0[key], p1.get(key, p0[key]), k) for key in p0}
                    break
            return extra(t, u, p) if extra else p
        return fn

    REST = {
        "bow": 0.0, "turn": 0.0, "lean": 0.0, "arch": 0.0, "twist": 0.0, "look": 0.0, "head_turn": 0.0, "tilt": 0.0,
        "wing_L": (0.0, 0.0, 0.0), "wing_R": (0.0, 0.0, 0.0),
        "arm_L": (6.0, 4.0, 14.0, 0.0), "arm_R": (6.0, 4.0, 14.0, 0.0),
        "leg_L": (0.0, 0.0, 0.0), "leg_R": (0.0, 0.0, 0.0),
        "tail": [(0.0, 0.0)] * 4, "heave": 0.0,
    }

    def R(**changes):
        values = {key: (list(value) if isinstance(value, list) else value) for key, value in REST.items()}
        values.update(changes)
        return values

    IDLE = 3.0

    def idle_overlay(t, amount=1.0):
        """The breathing, weight shift, wing and tail sway every pose carries."""
        b = tau * t / IDLE
        return {
            "arch": 1.5 * math.sin(b) * amount, "heave": 0.003 * math.sin(b) * amount,
            "lean": 1.2 * math.sin(b * 0.5 + 0.4) * amount,
            "head_turn": 6 * math.sin(b * 0.5 + 1.1) * amount, "look": 2 * math.sin(b + 0.7) * amount,
            "tail": [(2 * math.sin(b - 0.6 * i) * amount, (4, 6, 8, 10)[i] * math.sin(b - 0.7 * i) * amount) for i in range(4)],
            "wing": (3 * math.sin(b - 0.5) * amount, 4 * math.sin(b - 0.9) * amount),
        }

    def with_idle(p, t, amount=1.0):
        o = idle_overlay(t, amount)
        p = dict(p)
        for key in ("arch", "heave", "lean", "head_turn", "look"):
            p[key] = p[key] + o[key]
        p["tail"] = [(a + c, b + d) for (a, b), (c, d) in zip(p["tail"], o["tail"])]
        for side, phase in (("L", 0.0), ("R", 0.3)):
            lift, fold, wrist = p["wing_" + side]
            p["wing_" + side] = (lift + o["wing"][0], fold + o["wing"][1], wrist)
        arm_l, arm_r = p["arm_L"], p["arm_R"]
        p["arm_L"] = (arm_l[0] + 2 * math.sin(tau * t / IDLE - 0.8) * amount, arm_l[1], arm_l[2] + 3 * math.sin(tau * t / IDLE - 1.2) * amount, arm_l[3])
        p["arm_R"] = (arm_r[0] + 2 * math.sin(tau * t / IDLE - 0.5) * amount, arm_r[1], arm_r[2] + 3 * math.sin(tau * t / IDLE - 0.9) * amount, arm_r[3])
        return p

    sampled("Guide_Idle", round(IDLE * FPS) + 1, lambda t: with_idle(R(), t))

    def action(name, duration, keys, extra=None):
        """An action over the idle: it fades the idle sway out and back in."""
        base_fn = keyed(keys, duration, extra)

        def fn(t):
            u = min(1.0, t / duration)
            fade = 1 - math.sin(math.pi * u) * 0.8  # keep a little life in the pose
            return with_idle(base_fn(t), t, fade)

        sampled(name, round(duration * FPS) + 1, fn)

    # Wave: the right arm swings out and up, the forearm waves three times; the
    # body leans away, the head tilts, the near wing lifts, the tail wags.
    def wave_extra(t, u, p):
        p = dict(p)
        if 0.22 < u < 0.82:
            k = math.sin(math.pi * (u - 0.22) / 0.6)
            raise_, out, bend, swing = p["arm_R"]
            p["arm_R"] = (raise_, out, bend, swing + 20 * k * math.sin(tau * 3.2 * (u - 0.22) / 0.6 * 1.0))
            p["tail"] = [(a, b + 10 * k * math.sin(tau * 2 * u - 0.6 * i)) for i, (a, b) in enumerate(p["tail"])]
        return p

    action("Guide_Wave", 2.2, [
        (0.0, R()),
        # The hand goes high by the elbow more than by the shoulder: a wide
        # shoulder lift stretches the scan's armpit.
        (0.2, R(arm_R=(40, 50, 94, 0), lean=-4, tilt=-6, head_turn=-8, wing_R=(10, -4, 0), look=4)),
        (0.8, R(arm_R=(42, 53, 98, 0), lean=-5, tilt=-8, head_turn=-10, wing_R=(12, -4, 0), look=5)),
        (1.0, R()),
    ], wave_extra)

    # Flap: wings open wide, two big beats lifting the body a little.
    def flap_extra(t, u, p):
        p = dict(p)
        if 0.15 < u < 0.85:
            k = math.sin(math.pi * (u - 0.15) / 0.7)
            beat = math.sin(tau * 2 * (u - 0.15) / 0.7)
            for side in ("L", "R"):
                lift, fold, wrist = p["wing_" + side]
                p["wing_" + side] = (lift + 22 * k * beat, fold, wrist + 8 * k * max(0.0, beat))
            p["heave"] = p["heave"] + 0.02 * k * (1 + math.sin(tau * 2 * (u - 0.15) / 0.7 - 1.2)) * 0.5
        return p

    action("Guide_Flap", 1.8, [
        (0.0, R()),
        (0.15, R(wing_L=(-14, -10, 0), wing_R=(-14, -10, 0), arch=6, look=10, arm_L=(9, 8, 22, 0), arm_R=(9, 8, 22, 0))),
        (0.85, R(wing_L=(-14, -10, 0), wing_R=(-14, -10, 0), arch=6, look=10, arm_L=(9, 8, 22, 0), arm_R=(9, 8, 22, 0))),
        (1.0, R()),
    ], flap_extra)

    # Hop: crouch, spring up tucking the legs with the wings flaring and
    # beating once, hang, land softly into a small crouch, stand. The arms
    # only swing a little by the sides: the scan's arms are fused to the
    # wings behind them, and a big lift shows the seams.
    crouch = dict(heave=-0.035, bow=8, arch=-3, leg_L=(24, 44, 18), leg_R=(24, 44, 18),
                  arm_L=(-4, 6, 20, 0), arm_R=(-4, 6, 20, 0), wing_L=(12, 8, 0), wing_R=(12, 8, 0), look=-5)
    action("Guide_Hop", 1.5, [
        (0.0, R()),
        (0.22, R(**crouch)),
        (0.42, R(heave=0.1, bow=-2, arch=5, leg_L=(24, 40, 16), leg_R=(24, 40, 16), arm_L=(12, 8, 24, 0), arm_R=(12, 8, 24, 0),
                 wing_L=(-18, -8, 0), wing_R=(-18, -8, 0), look=10, tail=[(8, 0), (5, 0), (4, 0), (3, 0)])),
        (0.6, R(heave=0.085, bow=0, arch=4, leg_L=(20, 34, 12), leg_R=(20, 34, 12), arm_L=(10, 7, 22, 0), arm_R=(10, 7, 22, 0),
                wing_L=(14, -3, 4), wing_R=(14, -3, 4), look=6)),
        (0.78, R(**{**crouch, "heave": -0.02, "bow": 5})),
        (1.0, R()),
    ])

    # Bow: a greeting with the right hand across the chest, wings folding back.
    action("Guide_Bow", 1.8, [
        (0.0, R()),
        (0.3, R(bow=15, arch=-4, look=-12, arm_R=(40, -10, 88, 0), arm_L=(-8, 10, 18, 0), wing_L=(4, 12, 0), wing_R=(4, 12, 0),
                tail=[(4, 6), (3, 8), (2, 10), (1, 12)])),
        (0.6, R(bow=16, arch=-4, look=-13, arm_R=(42, -10, 90, 0), arm_L=(-9, 11, 18, 0), wing_L=(4, 13, 0), wing_R=(4, 13, 0),
                tail=[(4, 6), (3, 8), (2, 10), (1, 12)])),
        (1.0, R()),
    ])

    # Talk: an open-hand gesture and a nod while a line is shown.
    action("Guide_Talk", 1.4, [
        (0.0, R()),
        (0.3, R(arm_L=(30, 22, 52, 0), look=6, tilt=4, head_turn=6, wing_L=(3, -2, 0))),
        (0.55, R(arm_L=(26, 24, 48, 0), look=-4, tilt=2, head_turn=4, wing_L=(3, -2, 0))),
        (0.75, R(arm_L=(22, 18, 42, 0), look=3, tilt=0, head_turn=2)),
        (1.0, R()),
    ])


def render_game_view(folder, model_id):
    """Each clip from the fight camera (three-quarter: behind, on the model's
    -X side, above, as SpaceStage "flank" sees it) and from that side, at six
    moments, for reviewing the flight clips the way the player sees them."""
    os.makedirs(folder, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "TEXTURE"
    scene.render.film_transparent = False
    scene.display.shading.background_type = "VIEWPORT"
    scene.display.shading.background_color = (0.12, 0.12, 0.16)
    scene.render.resolution_x = 900
    scene.render.resolution_y = 600
    meshes = scene_meshes()
    lo, hi = world_bounds(meshes)
    centre = (lo + hi) / 2
    radius = max((hi - lo).length / 2, 1e-3) * 0.8
    camera_data = bpy.data.cameras.new("SpaceTypingGameView")
    camera = bpy.data.objects.new("SpaceTypingGameView", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera_data.lens = 50
    # The game turns the model to face away (-Z); its camera at (+5.4, 2.7,
    # +3.9) from the hero is (-5.4, +3.9, +2.7) in the model's Blender frame.
    views = {
        "game": Vector((-5.4, 3.9, 2.7)),
        "side": Vector((-1, 0.1, 0.15)),
    }
    obj = root_object()
    tracks = list(obj.animation_data.nla_tracks) if obj is not None and obj.animation_data else []
    for track in tracks:
        if not track.strips or track.strips[0].action is None:
            continue
        start, end = track.strips[0].action.frame_range
        frames = sorted({int(round(start + (end - start) * share)) for share in (0.0, 0.2, 0.38, 0.5, 0.7, 0.9)})
        for other in tracks:
            other.mute = other is not track
        for frame in frames:
            scene.frame_set(frame)
            for label, direction in views.items():
                camera.location = centre + direction.normalized() * radius * 3.2
                camera.rotation_euler = (centre - camera.location).to_track_quat("-Z", "Y").to_euler()
                safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in track.name)
                scene.render.filepath = os.path.join(folder, f"{model_id}-{label}-{safe}-f{frame:03d}.png")
                bpy.ops.render.render(write_still=True)
    for other in tracks:
        other.mute = False
    bpy.data.objects.remove(camera, do_unlink=True)
    print("game-view previews in", folder)


def rename_boss_clips_for_hero(rig):
    """Boss_Hit/Death/Intro made on a hero rig become Hero_Hit/Death/Intro."""
    if rig.animation_data is None:
        return
    for track in rig.animation_data.nla_tracks:
        if not track.name.startswith("Boss_"):
            continue
        name = "Hero_" + track.name[len("Boss_"):]
        track.name = name
        for strip in track.strips:
            strip.name = name
            if strip.action is not None:
                strip.action.name = name


def action_has_keys(action):
    """Blender 4.x keeps F-curves on the action; 5.x keeps them in layer/strip channel bags."""
    curves = getattr(action, "fcurves", None)
    if curves is not None:
        return len(curves) > 0
    for layer in getattr(action, "layers", []):
        for strip in layer.strips:
            for bag in getattr(strip, "channelbags", []):
                if len(bag.fcurves) > 0:
                    return True
    return False


def ensure_imported_clip_tracks(obj):
    """Imported glTF clips → NLA tracks named exactly like the clip, so they export as-is."""
    if obj is None or obj.animation_data is None:
        return
    data = obj.animation_data
    named = {s.action.name for t in data.nla_tracks for s in t.strips if s.action}
    candidates = [a for a in bpy.data.actions if a.name not in named and action_has_keys(a)]
    if data.action is not None and data.action.name not in named:
        candidates = [data.action] + [a for a in candidates if a != data.action]
    for action in candidates:
        if action.users == 0:
            continue
        push_to_track(obj, action, action.name)
    data.action = None
    # Stashed tracks from the importer carry "[Action Stash]"; rename them to the clip.
    for track in data.nla_tracks:
        if track.strips and track.strips[0].action:
            track.name = track.strips[0].action.name
            track.mute = False


def make_clips(kind):
    obj = root_object()
    if obj is None:
        return
    obj.animation_data_create()
    if kind == "ships":
        # 2 s gentle float; the game adds banking and recoil itself.
        clip(obj, "Ship_Idle", 48, [
            (1, (0, 0, 0), (0, 0, 0), 1.0),
            (24, (0, 0, 0.02), (1.5, 0, 0), 1.0),
            (48, (0, 0, 0), (0, 0, 0), 1.0),
        ])
    elif kind == "enemies":
        # 1 s pulse; the game pre-renders 16 frames of it.
        clip(obj, "Enemy_Idle", 24, [
            (1, (0, 0, 0), (0, 0, 0), 1.0),
            (12, (0, 0, 0.03), (0, 4, 0), 1.04),
            (24, (0, 0, 0), (0, 0, 0), 1.0),
        ])
    elif kind == "bosses":
        if obj.type == "ARMATURE" and CONFIG["boss_bone_clips"]:
            make_boss_bone_clips(obj)
            if CONFIG.get("hero_bone_clips"):
                make_hero_bone_clips(obj)
            return
        clip(obj, "Boss_Hit", 12, [
            (1, (0, 0, 0), (0, 0, 0), 1.0),
            (3, (0, -0.08, 0.02), (-6, 0, 3), 0.97),
            (7, (0, 0.02, 0), (2, 0, -2), 1.01),
            (12, (0, 0, 0), (0, 0, 0), 1.0),
        ])
        clip(obj, "Boss_Death", 48, [
            (1, (0, 0, 0), (0, 0, 0), 1.0),
            (10, (0, -0.05, 0.05), (-8, 0, 6), 1.03),
            (30, (0, -0.2, -0.3), (-25, 10, 25), 0.9),
            (48, (0, -0.4, -0.9), (-45, 20, 60), 0.6),
        ])
        clip(obj, "Boss_Intro", 60, [
            (1, (0, 0.6, 0.4), (20, 0, 0), 0.4),
            (36, (0, -0.05, 0), (-4, 0, 0), 1.04),
            (60, (0, 0, 0), (0, 0, 0), 1.0),
        ])
        # 3 s hover with a slow sway; the contract requires it on every boss.
        # Pushed last: the top NLA track's first frame is the exported rest pose,
        # and Boss_Intro starts shrunken.
        clip(obj, "Boss_Idle_Hover", 72, [
            (1, (0, 0, 0), (0, 0, 0), 1.0),
            (18, (0, 0, 0.035), (1.2, 0, 1.5), 1.0),
            (36, (0, 0, 0.06), (0, 0, 0), 1.0),
            (54, (0, 0, 0.035), (-1.2, 0, -1.5), 1.0),
            (72, (0, 0, 0), (0, 0, 0), 1.0),
        ])
    elif kind in ("heroes", "guides"):
        if obj.type != "ARMATURE":
            print("  heroes need an armature (--rig-json): clips skipped")
            return
        flight = (CONFIG.get("rig_spec") or {}).get("flight")
        if flight == "dragon":
            make_dragon_clips(obj)
            return
        if flight == "guide":
            make_guide_clips(obj)
            return
        if flight:
            make_flight_clips(obj)
            return
        if idle_action(obj) is None:
            make_hero_idle(obj)
        make_boss_bone_clips(obj)
        rename_boss_clips_for_hero(obj)
        make_hero_bone_clips(obj)
    elif kind == "items":
        clip(obj, "Item_Idle", 48, [
            (1, (0, 0, 0), (0, 0, 0), 1.0),
            (24, (0, 0, 0.03), (0, 0, 0), 1.0),
            (48, (0, 0, 0), (0, 0, 0), 1.0),
        ])


# ---------- Preview renders (AI review) ----------
def render_previews(folder, kind, model_id):
    """Front-ish view of each NLA clip at a few frames (Workbench, transparent)."""
    os.makedirs(folder, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "TEXTURE"
    # Mid-grey backdrop: dark and light parts both read in the review images.
    scene.render.film_transparent = False
    scene.display.shading.background_type = "VIEWPORT"
    scene.display.shading.background_color = (0.32, 0.33, 0.36)
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    meshes = scene_meshes()
    lo, hi = world_bounds(meshes)
    centre = (lo + hi) / 2
    radius = max((hi - lo).length / 2, 1e-3)
    camera_data = bpy.data.cameras.new("SpaceTypingPreview")
    camera = bpy.data.objects.new("SpaceTypingPreview", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    # Ships/enemies/items: from above and behind (game view); bosses: from the front.
    direction = Vector((0, -0.55, 1)) if kind in ("ships", "enemies", "skills", "items") else Vector((0, -1, 0.18))
    camera.location = centre + direction.normalized() * radius * 4
    camera.rotation_euler = (centre - camera.location).to_track_quat("-Z", "Y").to_euler()
    # Long lens: little perspective, the object fills about 70 % of the frame.
    camera_data.lens = 85
    obj = root_object()
    data = obj.animation_data if obj is not None else None
    tracks = list(data.nla_tracks) if data is not None else []
    shots = [("rest", None, 1)]
    for track in tracks:
        if not track.strips or track.strips[0].action is None:
            continue
        start, end = track.strips[0].action.frame_range
        for share in (0.0, 0.33, 0.66, 1.0):
            shots.append((track.name, track, int(start + (end - start) * share)))
    for label, track, frame in shots:
        for other in tracks:
            other.mute = other is not track
        scene.frame_set(frame)
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in label)
        scene.render.filepath = os.path.join(folder, f"{model_id}-{safe}-f{frame:03d}.png")
        bpy.ops.render.render(write_still=True)
    for other in tracks:
        other.mute = False
    bpy.data.objects.remove(camera, do_unlink=True)
    print("previews in", folder)


def export(kind, model_id, project):
    folder = os.path.join(project, "art-src", "models", kind)
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, model_id + ".glb")
    options = dict(
        filepath=path,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_animations=True,
        export_skins=True,
        export_morph=False,
        use_selection=False,
    )
    try:
        bpy.ops.export_scene.gltf(**options, export_animation_mode="NLA_TRACKS")
    except TypeError:
        bpy.ops.export_scene.gltf(**options, export_nla_strips=True)
    print("exported", path)


def main():
    headless = apply_command_line()
    if headless and CONFIG["input"]:
        import_input(CONFIG["input"])
    bpy.context.scene.render.fps = FPS
    if bpy.context.object is not None and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    kind = CONFIG["kind"]
    print(f"Space Typing model: {kind}/{CONFIG['id']}")
    main_mesh = join_meshes() if CONFIG["join_meshes"] and armature() is None else None
    if main_mesh is not None:
        main_mesh.name = CONFIG["id"] + "_mesh"
    if CONFIG["normalize"]:
        normalize(scene_meshes() + ([armature()] if armature() else []))
    for mesh in scene_meshes():
        decimate(mesh, CONFIG["target_triangles"] if len(scene_meshes()) == 1 else 0)
    if CONFIG["auto_emissive"] > 0:
        # The glow mask is taken from the original colours, before any neutralizing.
        auto_emissive(CONFIG["auto_emissive"], CONFIG["auto_emissive_strength"])
    else:
        boost_emission(CONFIG["emission_strength"])
    if CONFIG["neutralize"]:
        neutralize_colours()
    if CONFIG.get("rig_spec") and armature() is None:
        build_winged_rig(CONFIG["rig_spec"])
    if CONFIG["make_sockets"]:
        make_sockets(kind)
    ensure_imported_clip_tracks(root_object())
    if CONFIG["make_clips"]:
        make_clips(kind)
    if CONFIG["save_blend"]:
        os.makedirs(os.path.dirname(CONFIG["save_blend"]), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=CONFIG["save_blend"])
    if CONFIG["preview"]:
        if (CONFIG.get("rig_spec") or {}).get("flight"):
            render_game_view(CONFIG["preview"], CONFIG["id"])
        else:
            render_previews(CONFIG["preview"], kind, CONFIG["id"])
    if CONFIG["export"]:
        export(kind, CONFIG["id"], CONFIG["project"])


if __name__ == "__main__":
    main()
