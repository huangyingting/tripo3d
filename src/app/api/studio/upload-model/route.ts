import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { AccountAdmissionError, requireCreator } from '@/lib/account-admission';
import { parseUploaded3DFile } from '@/lib/engine3d';

const MAX_UPLOAD_BYTES = 150 * 1024 * 1024; // 150 MB

export async function POST(req: NextRequest) {
  try {
    const user = await requireCreator();
    const contentType = req.headers.get('content-type') || '';

    let filename = 'uploaded-model.obj';
    let fileBuffer: Buffer;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json(
          { ok: false, code: 'FILE_REQUIRED', error: 'No 3D file provided.' },
          { status: 400 }
        );
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          {
            ok: false,
            code: 'FILE_TOO_LARGE',
            error: 'Uploaded 3D model exceeds the 150MB limit.',
          },
          { status: 400 }
        );
      }
      filename = file.name || filename;
      fileBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      const body = await req.json();
      filename = String(body.filename || 'uploaded-model.obj');
      const content = String(body.content || '');
      fileBuffer = Buffer.from(content, 'utf8');
    }

    const ext = (filename.split('.').pop() || '').toLowerCase();
    if (!['obj', 'fbx', 'stl', 'glb', 'gltf', 'ply', '3mf', 'usdz'].includes(ext)) {
      return NextResponse.json(
        {
          ok: false,
          code: 'UNSUPPORTED_FORMAT',
          error: 'Supported 3D upload formats: OBJ, FBX, STL, GLB, PLY.',
        },
        { status: 400 }
      );
    }

    const parsed = parseUploaded3DFile(filename, fileBuffer);

    const asset = await prisma.asset3D.create({
      data: {
        ownerId: user.id,
        ownerName: user.name || user.email.split('@')[0],
        name: filename.replace(/\.[^.]+$/, ''),
        prompt: `Uploaded 3D model (${parsed.detectedFormat})`,
        category: 'props',
        generationMode: 'UPLOAD',
        inputMode: 'UPLOAD',
        aiModel: 'H3.1',
        topology: 'TRIANGLE',
        vertices: parsed.verticesCount,
        faces: parsed.facesCount,
        targetPolycount: parsed.facesCount,
        hasTexture: true,
        textureQuality: '4K',
        hasPbr: true,
        hasSmartUv: true,
        isSegmented: false,
        isRigged: false,
        privacy: 'PRIVATE',
        meshDataJson: JSON.stringify(parsed.meshData),
      },
    });

    await writeAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'MODEL_UPLOADED',
      targetType: 'ASSET_3D',
      targetId: asset.id,
      details: {
        filename,
        detectedFormat: parsed.detectedFormat,
        vertices: parsed.verticesCount,
        faces: parsed.facesCount,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        asset: {
          ...asset,
          meshData: parsed.meshData,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: 'Failed to upload 3D model.' },
      { status: 500 }
    );
  }
}
