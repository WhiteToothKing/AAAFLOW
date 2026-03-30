"""Add new generation providers and seed ComfyUI workflow templates.

Revision ID: 20260330_0003
Revises: 20260329_0002
Create Date: 2026-03-30
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260330_0003"
down_revision = "0002_chat_llm"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new enum values to generation_provider
    # PostgreSQL requires explicit ALTER TYPE for adding enum values
    op.execute("ALTER TYPE generationprovider ADD VALUE IF NOT EXISTS 'jimeng'")
    op.execute("ALTER TYPE generationprovider ADD VALUE IF NOT EXISTS 'minimax'")
    op.execute("ALTER TYPE generationprovider ADD VALUE IF NOT EXISTS 'banana'")

    # Seed built-in ComfyUI workflow templates
    op.execute("""
    INSERT INTO comfyui_workflows (id, name, description, workflow_json, art_types, art_styles, is_active, version, created_at, updated_at)
    VALUES
    (
        'a0000001-0000-0000-0000-000000000001',
        '图标生成工作流',
        '使用 SD + ControlNet 生成游戏图标，支持扁平和半写实风格。512x512 输出，适合批量制作。',
        '{"3":{"class_type":"KSampler","inputs":{"cfg":7,"denoise":1.0,"model":["4",0],"negative":["7",0],"positive":["6",0],"sampler_name":"euler_ancestral","scheduler":"normal","seed":-1,"steps":25,"latent_image":["5",0]}},"4":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"dreamshaper_8.safetensors"}},"5":{"class_type":"EmptyLatentImage","inputs":{"batch_size":1,"height":512,"width":512}},"6":{"class_type":"CLIPTextEncode","inputs":{"clip":["4",1],"text":"game icon, flat design, clean background, centered, high quality"}},"7":{"class_type":"CLIPTextEncode","inputs":{"clip":["4",1],"text":"blurry, low quality, text, watermark"}},"8":{"class_type":"VAEDecode","inputs":{"samples":["3",0],"vae":["4",2]}},"9":{"class_type":"SaveImage","inputs":{"filename_prefix":"icon","images":["8",0]}}}',
        '["icon","ui"]',
        '["flat","semi_realistic","cartoon"]',
        true,
        '1.0',
        NOW(),
        NOW()
    ),
    (
        'a0000001-0000-0000-0000-000000000002',
        '角色线稿工作流',
        '使用 Lineart ControlNet 从描述生成干净的角色线稿，适合后续手动上色。',
        '{"3":{"class_type":"KSampler","inputs":{"cfg":7.5,"denoise":1.0,"model":["4",0],"negative":["7",0],"positive":["6",0],"sampler_name":"euler","scheduler":"normal","seed":-1,"steps":28,"latent_image":["5",0]}},"4":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"aingdiffusion_v13.safetensors"}},"5":{"class_type":"EmptyLatentImage","inputs":{"batch_size":1,"height":1024,"width":768}},"6":{"class_type":"CLIPTextEncode","inputs":{"clip":["4",1],"text":"character lineart, clean lines, white background, full body, detailed, manga style"}},"7":{"class_type":"CLIPTextEncode","inputs":{"clip":["4",1],"text":"color, shading, blurry, low quality, watermark, background"}},"8":{"class_type":"VAEDecode","inputs":{"samples":["3",0],"vae":["4",2]}},"9":{"class_type":"SaveImage","inputs":{"filename_prefix":"lineart","images":["8",0]}}}',
        '["character","concept"]',
        '["anime","cartoon"]',
        true,
        '1.0',
        NOW(),
        NOW()
    ),
    (
        'a0000001-0000-0000-0000-000000000003',
        '场景概念工作流',
        '使用 SDXL 或 SD1.5 生成宽幅游戏场景概念图，支持多种环境类型。',
        '{"3":{"class_type":"KSampler","inputs":{"cfg":7,"denoise":1.0,"model":["4",0],"negative":["7",0],"positive":["6",0],"sampler_name":"dpmpp_2m","scheduler":"karras","seed":-1,"steps":30,"latent_image":["5",0]}},"4":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"dreamshaper_8.safetensors"}},"5":{"class_type":"EmptyLatentImage","inputs":{"batch_size":1,"height":768,"width":1344}},"6":{"class_type":"CLIPTextEncode","inputs":{"clip":["4",1],"text":"game scene concept art, detailed environment, cinematic lighting, masterpiece"}},"7":{"class_type":"CLIPTextEncode","inputs":{"clip":["4",1],"text":"blurry, low quality, text, watermark, UI elements"}},"8":{"class_type":"VAEDecode","inputs":{"samples":["3",0],"vae":["4",2]}},"9":{"class_type":"SaveImage","inputs":{"filename_prefix":"scene","images":["8",0]}}}',
        '["scene","concept"]',
        '["realistic","semi_realistic","hand_painted"]',
        true,
        '1.0',
        NOW(),
        NOW()
    ),
    (
        'a0000001-0000-0000-0000-000000000004',
        'img2img 精修工作流',
        '基于参考图进行 AI 风格迁移和细节增强。需要上传参考图作为输入。可调节 denoise 控制变化幅度。',
        '{"3":{"class_type":"KSampler","inputs":{"cfg":7,"denoise":0.55,"model":["4",0],"negative":["7",0],"positive":["6",0],"sampler_name":"euler","scheduler":"normal","seed":-1,"steps":30,"latent_image":["10",0]}},"4":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"dreamshaper_8.safetensors"}},"6":{"class_type":"CLIPTextEncode","inputs":{"clip":["4",1],"text":"masterpiece, best quality, highly detailed"}},"7":{"class_type":"CLIPTextEncode","inputs":{"clip":["4",1],"text":"blurry, low quality, watermark"}},"8":{"class_type":"VAEDecode","inputs":{"samples":["3",0],"vae":["4",2]}},"9":{"class_type":"SaveImage","inputs":{"filename_prefix":"refined","images":["8",0]}},"10":{"class_type":"VAEEncode","inputs":{"pixels":["11",0],"vae":["4",2]}},"11":{"class_type":"LoadImage","inputs":{"image":"input.png"}}}',
        '["character","scene","prop","concept"]',
        '["realistic","semi_realistic","anime","hand_painted"]',
        true,
        '1.0',
        NOW(),
        NOW()
    ),
    (
        'a0000001-0000-0000-0000-000000000005',
        '角色概念画工作流',
        '生成高质量角色概念原画，支持动漫和半写实风格。768x1024 竖版构图。',
        '{"3":{"class_type":"KSampler","inputs":{"cfg":7.5,"denoise":1.0,"model":["4",0],"negative":["7",0],"positive":["6",0],"sampler_name":"dpmpp_2m","scheduler":"karras","seed":-1,"steps":30,"latent_image":["5",0]}},"4":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"dreamshaper_8.safetensors"}},"5":{"class_type":"EmptyLatentImage","inputs":{"batch_size":1,"height":1024,"width":768}},"6":{"class_type":"CLIPTextEncode","inputs":{"clip":["4",1],"text":"character concept art, full body, detailed design, fantasy, game art"}},"7":{"class_type":"CLIPTextEncode","inputs":{"clip":["4",1],"text":"blurry, low quality, deformed, watermark, bad anatomy"}},"8":{"class_type":"VAEDecode","inputs":{"samples":["3",0],"vae":["4",2]}},"9":{"class_type":"SaveImage","inputs":{"filename_prefix":"character","images":["8",0]}}}',
        '["character","concept"]',
        '["anime","semi_realistic","realistic","cartoon"]',
        true,
        '1.0',
        NOW(),
        NOW()
    ),
    (
        'a0000001-0000-0000-0000-000000000006',
        '纹理贴图工作流',
        '生成无缝纹理贴图，适用于3D模型材质。使用 tiling 节点确保无缝衔接。',
        '{"3":{"class_type":"KSampler","inputs":{"cfg":7,"denoise":1.0,"model":["4",0],"negative":["7",0],"positive":["6",0],"sampler_name":"euler","scheduler":"normal","seed":-1,"steps":30,"latent_image":["5",0]}},"4":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"dreamshaper_8.safetensors"}},"5":{"class_type":"EmptyLatentImage","inputs":{"batch_size":1,"height":1024,"width":1024}},"6":{"class_type":"CLIPTextEncode","inputs":{"clip":["4",1],"text":"seamless texture, tileable pattern, high quality, 4k, PBR material"}},"7":{"class_type":"CLIPTextEncode","inputs":{"clip":["4",1],"text":"text, watermark, borders, non-tileable"}},"8":{"class_type":"VAEDecode","inputs":{"samples":["3",0],"vae":["4",2]}},"9":{"class_type":"SaveImage","inputs":{"filename_prefix":"texture","images":["8",0]}}}',
        '["texture"]',
        '["realistic","hand_painted"]',
        true,
        '1.0',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    """)


def downgrade() -> None:
    op.execute("""
    DELETE FROM comfyui_workflows
    WHERE id IN (
        'a0000001-0000-0000-0000-000000000001',
        'a0000001-0000-0000-0000-000000000002',
        'a0000001-0000-0000-0000-000000000003',
        'a0000001-0000-0000-0000-000000000004',
        'a0000001-0000-0000-0000-000000000005',
        'a0000001-0000-0000-0000-000000000006'
    );
    """)
