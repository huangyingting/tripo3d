import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import {
  getCurrentViewer,
  hashOpaqueToken,
} from '@/lib/account-admission';
import {
  inferCategoryFromPrompt,
  synthesizeProceduralMesh,
} from '@/lib/engine3d';

async function resolveApiCaller(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const rawKey = authHeader.slice(7).trim();
    const keyHash = hashOpaqueToken(rawKey);
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: true },
    });
    if (!apiKey || apiKey.status !== 'ACTIVE') {
      return { error: 'Invalid or revoked Bearer API key.', status: 401 };
    }
    if (apiKey.user.status === 'REVOKED' || apiKey.user.revokedAt) {
      return { error: 'Owner account has been revoked.', status: 403 };
    }
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });
    return { user: apiKey.user, apiKeyId: apiKey.id };
  }

  const viewer = await getCurrentViewer();
  if (!viewer) {
    return { error: 'Missing Authorization Bearer key or active session.', status: 401 };
  }
  return { user: viewer, apiKeyId: null };
}

export async function POST(req: NextRequest) {
  const caller = await resolveApiCaller(req);
  if ('error' in caller) {
    return NextResponse.json(
      { code: 2001, message: caller.error },
      { status: caller.status }
    );
  }

  const { user, apiKeyId } = caller;
  if (user.role === 'Viewer') {
    return NextResponse.json(
      { code: 2003, message: 'Viewer role cannot submit OpenAPI v3 generation tasks.' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const type = String(body.type || 'text_to_model');
  const prompt = String(
    body.prompt || body.model_version || `OpenAPI v3 ${type} asset`
  ).trim();
  const creditCost = type === 'texture_model' ? 20 : type === 'animate_rig' ? 30 : 55;

  if (user.credits < creditCost) {
    return NextResponse.json(
      {
        code: 2002,
        message: `Insufficient credits (${user.credits} available, ${creditCost} required).`,
      },
      { status: 402 }
    );
  }

  const category = inferCategoryFromPrompt(prompt, 'character');
  const { meshData, vertices, faces } = synthesizeProceduralMesh({
    prompt,
    category,
    generationMode: 'HD_MODEL',
    topology: body.quad ? 'QUAD' : 'TRIANGLE',
    targetPolycount: Number(body.face_limit || 85000),
    textureQuality: '4K',
    hasPbr: body.pbr !== false,
    isSegmented: false,
    isRigged: type === 'animate_rig',
  });

  const created = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: { credits: { decrement: creditCost } },
    });

    await tx.creditTransaction.create({
      data: {
        userId: user.id,
        delta: -creditCost,
        balanceAfter: updatedUser.credits,
        reason: `OPENAPI_V3_${type.toUpperCase()}`,
        metadataJson: JSON.stringify({ apiKeyId, prompt }),
      },
    });

    const asset = await tx.asset3D.create({
      data: {
        ownerId: user.id,
        ownerName: user.name || user.email.split('@')[0],
        name: `[API] ${prompt.slice(0, 40)}`,
        prompt,
        category,
        generationMode: 'HD_MODEL',
        inputMode: type.startsWith('image') ? 'IMAGE' : 'TEXT',
        aiModel: String(body.model_version || 'v3.0-202508'),
        topology: body.quad ? 'QUAD' : 'TRIANGLE',
        vertices,
        faces,
        targetPolycount: faces,
        hasTexture: true,
        textureQuality: '4K',
        hasPbr: true,
        isRigged: type === 'animate_rig',
        privacy: 'PRIVATE',
        meshDataJson: JSON.stringify(meshData),
      },
    });

    const task = await tx.apiTask.create({
      data: {
        userId: user.id,
        apiKeyId,
        type,
        status: 'success',
        progress: 100,
        creditCost,
        inputJson: JSON.stringify(body),
        outputAssetId: asset.id,
      },
    });

    return { task, asset, remainingCredits: updatedUser.credits };
  });

  await writeAuditLog({
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'API_V3_TASK_CREATED',
    targetType: 'API_TASK',
    targetId: created.task.id,
    details: { type, creditCost, outputAssetId: created.asset.id },
  });

  return NextResponse.json({
    code: 0,
    data: {
      task_id: created.task.id,
      type: created.task.type,
      status: created.task.status,
      progress: 100,
      credit_cost: creditCost,
      remaining_credits: created.remainingCredits,
      output: {
        model: `/api/studio/assets/${created.asset.id}/export?format=glb`,
        pbr_model: `/api/studio/assets/${created.asset.id}/export?format=glb`,
        obj_model: `/api/studio/assets/${created.asset.id}/export?format=obj`,
        asset_id: created.asset.id,
      },
    },
  });
}

export async function GET(req: NextRequest) {
  const caller = await resolveApiCaller(req);
  if ('error' in caller) {
    return NextResponse.json(
      { code: 2001, message: caller.error },
      { status: caller.status }
    );
  }
  const tasks = await prisma.apiTask.findMany({
    where: { userId: caller.user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  return NextResponse.json({ code: 0, data: { tasks } });
}
