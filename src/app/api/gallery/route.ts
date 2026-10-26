import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const category = (req.nextUrl.searchParams.get('category') || 'all').toLowerCase();
  const search = (req.nextUrl.searchParams.get('search') || '').trim();

  const where: Record<string, unknown> = {
    privacy: 'PUBLIC',
  };

  if (category === 'featured') {
    where.featured = true;
  } else if (category && category !== 'all') {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { prompt: { contains: search } },
      { ownerName: { contains: search } },
    ];
  }

  const rawModels = await prisma.asset3D.findMany({
    where,
    orderBy: [{ featured: 'desc' }, { likesCount: 'desc' }, { createdAt: 'desc' }],
    take: 48,
  });

  const models = rawModels.map((m) => ({
    ...m,
    aiModelVersion: m.aiModel,
    inputType: m.inputMode,
    pbrEnabled: m.hasPbr,
    uvUnwrapped: m.hasSmartUv,
    viewsCount: (m as any).downloadsCount || m.likesCount * 4 || 120,
    geometryJson: m.meshDataJson,
    meshData: JSON.parse(m.meshDataJson || '{}'),
  }));

  return NextResponse.json({
    ok: true,
    models,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const assetId = String(body.assetId || '');
    if (!assetId) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const updated = await prisma.asset3D.update({
      where: { id: assetId },
      data: { likesCount: { increment: 1 } },
    });
    return NextResponse.json({ ok: true, likesCount: updated.likesCount });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
