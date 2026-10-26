import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentViewer } from '@/lib/account-admission';
import { POST as uploadModelPost } from '@/app/api/studio/upload-model/route';

function mapAssetFields(a: any) {
  return {
    ...a,
    aiModelVersion: a.aiModel,
    inputType: a.inputMode,
    pbrEnabled: a.hasPbr,
    uvUnwrapped: a.hasSmartUv,
    inParts: a.isSegmented,
    isFavorite: a.featured,
    geometryJson: a.meshDataJson,
    meshData: JSON.parse(a.meshDataJson || '{}'),
  };
}

export async function GET(req: NextRequest) {
  const user = await getCurrentViewer();
  const filter = (req.nextUrl.searchParams.get('filter') || 'all').toLowerCase();
  const scope = (req.nextUrl.searchParams.get('scope') || '').toLowerCase();
  const type = (req.nextUrl.searchParams.get('type') || 'model').toLowerCase();

  if (!user) {
    const publicRaw = await prisma.asset3D.findMany({
      where: { privacy: 'PUBLIC' },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: 24,
    });
    return NextResponse.json({
      authenticated: false,
      assets: publicRaw.map(mapAssetFields),
      images: [],
    });
  }

  if (type === 'image') {
    const images = await prisma.pre3DImage.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ authenticated: true, images, assets: [] });
  }

  const where: Record<string, unknown> =
    scope === 'all'
      ? { OR: [{ ownerId: user.id }, { privacy: 'PUBLIC' }] }
      : { ownerId: user.id };
  if (filter === 'smart_mesh') where.generationMode = 'SMART_MESH';
  else if (filter === 'untextured') where.hasTexture = false;
  else if (filter === 'textured') where.hasTexture = true;
  else if (filter === 'rigged') where.isRigged = true;

  const rawAssets = await prisma.asset3D.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 48,
  });

  const assets = rawAssets.map(mapAssetFields);

  const images = await prisma.pre3DImage.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 24,
  });

  return NextResponse.json({
    authenticated: true,
    assets,
    images,
  });
}

export async function POST(req: NextRequest) {
  const res = await uploadModelPost(req);
  const data = await res.json();
  if (data.asset) {
    data.asset = mapAssetFields(data.asset);
  }
  return NextResponse.json(data, { status: res.status });
}
