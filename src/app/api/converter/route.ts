import { NextRequest, NextResponse } from 'next/server';
import {
  exportMeshToGlbBuffer,
  exportMeshToObjText,
  exportMeshToPlyText,
  exportMeshToStlText,
  parseUploaded3DFile,
} from '@/lib/engine3d';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let filename = 'sample-model.obj';
    let targetFormat = 'glb';
    let buffer: Buffer;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      targetFormat = String(formData.get('targetFormat') || 'glb').toLowerCase();
      if (!file) {
        return NextResponse.json(
          { ok: false, error: 'No 3D file provided.' },
          { status: 400 }
        );
      }
      filename = file.name || filename;
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      const body = await req.json();
      filename = String(body.filename || 'sample-model.obj');
      targetFormat = String(body.targetFormat || 'glb').toLowerCase();
      buffer = Buffer.from(String(body.content || ''), 'utf8');
    }

    const parsed = parseUploaded3DFile(filename, buffer);
    const baseName = filename.replace(/\.[^.]+$/, '') || 'converted-model';

    if (targetFormat === 'obj') {
      const text = exportMeshToObjText(parsed.meshData, baseName);
      return new NextResponse(text, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${baseName}.obj"`,
        },
      });
    }
    if (targetFormat === 'stl') {
      const text = exportMeshToStlText(parsed.meshData, baseName);
      return new NextResponse(text, {
        status: 200,
        headers: {
          'Content-Type': 'model/stl; charset=utf-8',
          'Content-Disposition': `attachment; filename="${baseName}.stl"`,
        },
      });
    }
    if (targetFormat === 'ply') {
      const text = exportMeshToPlyText(parsed.meshData);
      return new NextResponse(text, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${baseName}.ply"`,
        },
      });
    }

    const glb = exportMeshToGlbBuffer(parsed.meshData, baseName);
    return new NextResponse(new Uint8Array(glb), {
      status: 200,
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Content-Disposition': `attachment; filename="${baseName}.glb"`,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Failed to convert 3D file.' },
      { status: 500 }
    );
  }
}
