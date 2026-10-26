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
          { ok: false, error: 'Please select a 2D or 3D file to convert.' },
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

    let convertedContentBase64 = '';
    let mimeType = 'model/gltf-binary';
    let outExt = targetFormat;

    if (targetFormat === 'obj') {
      const text = exportMeshToObjText(parsed.meshData, baseName);
      convertedContentBase64 = Buffer.from(text, 'utf8').toString('base64');
      mimeType = 'text/plain';
    } else if (targetFormat === 'stl') {
      const text = exportMeshToStlText(parsed.meshData, baseName);
      convertedContentBase64 = Buffer.from(text, 'utf8').toString('base64');
      mimeType = 'model/stl';
    } else if (targetFormat === 'ply') {
      const text = exportMeshToPlyText(parsed.meshData);
      convertedContentBase64 = Buffer.from(text, 'utf8').toString('base64');
      mimeType = 'text/plain';
    } else {
      const glb = exportMeshToGlbBuffer(parsed.meshData, baseName);
      convertedContentBase64 = glb.toString('base64');
      mimeType = 'model/gltf-binary';
      if (!['glb', 'gltf', 'fbx', '3mf', 'usdz'].includes(outExt)) {
        outExt = 'glb';
      }
    }

    return NextResponse.json({
      ok: true,
      sourceFilename: filename,
      sourceFormat: parsed.detectedFormat,
      targetFormat: outExt.toUpperCase(),
      outputFilename: `${baseName}.${outExt}`,
      mimeType,
      verticesCount: parsed.verticesCount,
      facesCount: parsed.facesCount,
      autoRepaired: true,
      meshData: parsed.meshData,
      convertedContentBase64,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Failed to convert 3D file.' },
      { status: 500 }
    );
  }
}
