import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { AccountAdmissionError, requireCreator } from '@/lib/account-admission';
import {
  type PipelineStageAction,
  processAssetPipelineStage,
} from '@/lib/engine3d';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCreator();
    const { id } = await context.params;
    const asset = await prisma.asset3D.findUnique({ where: { id } });
    if (!asset) {
      return NextResponse.json(
        { ok: false, code: 'ASSET_NOT_FOUND', error: '3D asset not found.' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const action = String(body.action || body.stage || '') as PipelineStageAction;
    if (
      ![
        'segment',
        'fill_parts',
        'retopo',
        'smart_uv',
        'texture',
        'pbr_generate',
        'upscale_4k',
        'upscale_8k',
        'rig',
        'animate',
      ].includes(action)
    ) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_ACTION', error: `Unsupported pipeline action: ${action}` },
        { status: 400 }
      );
    }

    const currentMesh = JSON.parse(asset.meshDataJson || '{}');
    const processed = processAssetPipelineStage({
      action,
      currentTopology: asset.topology,
      currentFaces: asset.faces,
      currentVertices: asset.vertices,
      isRigged: asset.isRigged,
      isSegmented: asset.isSegmented,
      meshData: currentMesh,
      params: body.params || body,
    });

    if (user.credits < processed.creditCost) {
      return NextResponse.json(
        {
          ok: false,
          code: 'INSUFFICIENT_CREDITS',
          error: `Insufficient credits (${user.credits} available, ${processed.creditCost} required).`,
        },
        { status: 402 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { credits: { decrement: processed.creditCost } },
      });

      if (processed.creditCost > 0) {
        await tx.creditTransaction.create({
          data: {
            userId: user.id,
            delta: -processed.creditCost,
            balanceAfter: updatedUser.credits,
            reason: `PIPELINE_${action.toUpperCase()}`,
            metadataJson: JSON.stringify({
              assetId: asset.id,
              summary: processed.summary,
            }),
          },
        });
      }

      const updatedAsset = await tx.asset3D.update({
        where: { id: asset.id },
        data: {
          topology: processed.topology,
          faces: processed.faces,
          vertices: processed.vertices,
          hasTexture: processed.hasTexture,
          textureQuality: processed.textureQuality,
          hasPbr: processed.hasPbr,
          hasSmartUv: processed.hasSmartUv,
          isSegmented: processed.isSegmented,
          isRigged: processed.isRigged,
          activeAnimation: processed.activeAnimation,
          meshDataJson: JSON.stringify(processed.meshData),
        },
      });

      return { updatedAsset, remainingCredits: updatedUser.credits };
    });

    await writeAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: `MODEL_PIPELINE_${action.toUpperCase()}`,
      targetType: 'ASSET_3D',
      targetId: asset.id,
      details: {
        action,
        summary: processed.summary,
        creditCost: processed.creditCost,
      },
    });

    return NextResponse.json({
      ok: true,
      summary: processed.summary,
      creditCost: processed.creditCost,
      remainingCredits: updated.remainingCredits,
      creditsBalance: updated.remainingCredits,
      asset: {
        ...updated.updatedAsset,
        aiModelVersion: updated.updatedAsset.aiModel,
        inputType: updated.updatedAsset.inputMode,
        pbrEnabled: updated.updatedAsset.hasPbr,
        uvUnwrapped: updated.updatedAsset.hasSmartUv,
        geometryJson: updated.updatedAsset.meshDataJson,
        meshData: processed.meshData,
      },
    });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to process 3D pipeline stage.',
      },
      { status: 400 }
    );
  }
}
