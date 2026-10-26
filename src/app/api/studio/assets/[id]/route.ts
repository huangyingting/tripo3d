import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import {
  AccountAdmissionError,
  getCurrentViewer,
  requireCreator,
} from '@/lib/account-admission';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const asset = await prisma.asset3D.findUnique({ where: { id } });
  if (!asset) {
    return NextResponse.json({ ok: false, error: 'Asset not found.' }, { status: 404 });
  }

  const viewer = await getCurrentViewer();
  if (asset.privacy === 'PRIVATE' && asset.ownerId && asset.ownerId !== viewer?.id && viewer?.role !== 'Admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    asset: {
      ...asset,
      aiModelVersion: asset.aiModel,
      inputType: asset.inputMode,
      pbrEnabled: asset.hasPbr,
      uvUnwrapped: asset.hasSmartUv,
      isFavorite: asset.featured,
      geometryJson: asset.meshDataJson,
      meshData: JSON.parse(asset.meshDataJson || '{}'),
    },
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCreator();
    const { id } = await context.params;
    const asset = await prisma.asset3D.findUnique({ where: { id } });
    if (!asset) {
      return NextResponse.json({ ok: false, error: 'Asset not found.' }, { status: 404 });
    }
    if (asset.ownerId !== user.id && user.role !== 'Admin') {
      return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name) data.name = String(body.name).trim().slice(0, 120);
    if (body.privacy === 'PUBLIC' || body.privacy === 'PRIVATE') {
      data.privacy = body.privacy;
    }
    if (typeof body.featured === 'boolean' && user.role === 'Admin') {
      data.featured = body.featured;
    }

    const updated = await prisma.asset3D.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      ok: true,
      asset: {
        ...updated,
        meshData: JSON.parse(updated.meshDataJson || '{}'),
      },
    });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json({ ok: false, error: 'Update failed.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCreator();
    const { id } = await context.params;
    const asset = await prisma.asset3D.findUnique({ where: { id } });
    if (!asset) {
      return NextResponse.json({ ok: false, error: 'Asset not found.' }, { status: 404 });
    }
    if (asset.ownerId !== user.id && user.role !== 'Admin') {
      return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
    }

    await prisma.asset3D.delete({ where: { id } });

    await writeAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'MODEL_DELETED',
      targetType: 'ASSET_3D',
      targetId: id,
      details: { name: asset.name },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json({ ok: false, error: 'Delete failed.' }, { status: 500 });
  }
}
