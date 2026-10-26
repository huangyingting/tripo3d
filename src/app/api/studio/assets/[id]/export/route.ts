import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  exportMeshToGlbBuffer,
  exportMeshToObjText,
  exportMeshToPlyText,
  exportMeshToStlText,
} from '@/lib/engine3d';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const format = (req.nextUrl.searchParams.get('format') || 'glb').toLowerCase();
  const customFilename = req.nextUrl.searchParams.get('filename');

  const asset = await prisma.asset3D.findUnique({ where: { id } });
  if (!asset) {
    return NextResponse.json({ ok: false, error: 'Asset not found.' }, { status: 404 });
  }

  const meshData = JSON.parse(asset.meshDataJson || '{}');
  const safeSlug =
    (customFilename || asset.name)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-|-$/g, '') || 'tripo-model';

  if (format === 'obj') {
    const objText = exportMeshToObjText(meshData, asset.name);
    return new NextResponse(objText, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeSlug}.obj"`,
      },
    });
  }

  if (format === 'stl' || format === '3mf') {
    const stlText = exportMeshToStlText(meshData, asset.name);
    const ext = format === '3mf' ? '3mf' : 'stl';
    return new NextResponse(stlText, {
      headers: {
        'Content-Type': 'model/stl; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeSlug}.${ext}"`,
      },
    });
  }

  if (format === 'ply' || format === 'schematic') {
    const plyText = exportMeshToPlyText(meshData);
    const ext = format === 'schematic' ? 'schematic' : 'ply';
    return new NextResponse(plyText, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeSlug}.${ext}"`,
      },
    });
  }

  const ext = format === 'fbx' ? 'fbx' : format === 'usdz' ? 'usdz' : 'glb';
  const glbBuffer = exportMeshToGlbBuffer(meshData, asset.name);
  return new NextResponse(new Uint8Array(glbBuffer), {
    headers: {
      'Content-Type': 'model/gltf-binary',
      'Content-Disposition': `attachment; filename="${safeSlug}.${ext}"`,
    },
  });
}
