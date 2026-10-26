import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import {
  AccountAdmissionError,
  requireCreator,
  requireViewer,
} from '@/lib/account-admission';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const asset = await prisma.asset3D.findUnique({ where: { id } });
  if (!asset) {
    return NextResponse.json({ ok: false, error: 'Model not found.' }, { status: 404 });
  }

  await prisma.asset3D.update({
    where: { id },
    data: { viewsCount: { increment: 1 } },
  });

  return NextResponse.json({
    ok: true,
    model: {
      ...asset,
      viewsCount: asset.viewsCount + 1,
      meshData: JSON.parse(asset.meshDataJson || '{}'),
    },
  });
}

// POST /api/gallery/[id] -> Like model
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireViewer();
    const { id } = await context.params;
    const updated = await prisma.asset3D.update({
      where: { id },
      data: { likesCount: { increment: 1 } },
    });
    return NextResponse.json({ ok: true, likesCount: updated.likesCount });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json({ ok: false, error: 'Failed to like model.' }, { status: 500 });
  }
}

// PUT /api/gallery/[id] -> Open in Workspace / Remix
export async function PUT(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCreator();
    const { id } = await context.params;
    const source = await prisma.asset3D.findUnique({ where: { id } });
    if (!source) {
      return NextResponse.json({ ok: false, error: 'Model not found.' }, { status: 404 });
    }

    const cloned = await prisma.asset3D.create({
      data: {
        ownerId: user.id,
        ownerName: user.name || user.email.split('@')[0],
        name: `${source.name} (Remix)`,
        prompt: source.prompt,
        category: source.category,
        generationMode: 'REMIX',
        inputMode: source.inputMode,
        aiModel: source.aiModel,
        topology: source.topology,
        vertices: source.vertices,
        faces: source.faces,
        targetPolycount: source.targetPolycount,
        hasTexture: source.hasTexture,
        textureQuality: source.textureQuality,
        hasPbr: source.hasPbr,
        hasSmartUv: source.hasSmartUv,
        isSegmented: source.isSegmented,
        isRigged: source.isRigged,
        activeAnimation: source.activeAnimation,
        privacy: 'PRIVATE',
        meshDataJson: source.meshDataJson,
      },
    });

    await writeAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'MODEL_REMIXED',
      targetType: 'ASSET_3D',
      targetId: cloned.id,
      details: { sourceId: source.id, sourceName: source.name },
    });

    return NextResponse.json({
      ok: true,
      asset: {
        ...cloned,
        meshData: JSON.parse(cloned.meshDataJson || '{}'),
      },
    });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json({ ok: false, error: 'Failed to remix model.' }, { status: 500 });
  }
}
