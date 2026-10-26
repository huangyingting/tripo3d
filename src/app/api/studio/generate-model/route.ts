import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { AccountAdmissionError, requireCreator } from '@/lib/account-admission';
import {
  calculateGenerationCreditCost,
  inferCategoryFromPrompt,
  synthesizeProceduralMesh,
} from '@/lib/engine3d';

export async function POST(req: NextRequest) {
  try {
    const user = await requireCreator();
    const body = await req.json();

    const prompt = String(body.prompt || body.imageName || '').trim();
    if (!prompt) {
      return NextResponse.json(
        {
          ok: false,
          code: 'INPUT_REQUIRED',
          error: 'Please enter a prompt or upload an image to generate a 3D model.',
        },
        { status: 400 }
      );
    }

    const generationMode =
      body.generationMode === 'SMART_MESH' ? 'SMART_MESH' : 'HD_MODEL';
    const inputMode = String(
      body.inputMode || body.inputType || 'TEXT'
    ).toUpperCase();
    const aiModel =
      generationMode === 'SMART_MESH'
        ? String(body.aiModelVersion || body.aiModel || 'P2.0')
        : String(body.aiModelVersion || body.aiModel || 'H3.1');
    const topology =
      body.topology === 'QUAD' || generationMode === 'SMART_MESH'
        ? 'QUAD'
        : 'TRIANGLE';
    const targetPolycount = Math.max(
      500,
      Math.min(
        2_000_000,
        Number(
          body.targetPolycount ||
            (generationMode === 'SMART_MESH' ? 12480 : 148600)
        )
      )
    );
    const hasTexture = body.hasTexture !== false;
    const textureQuality = String(body.textureQuality || '4K');
    const hasPbr = body.hasPbr !== false && body.pbrEnabled !== false;
    const removeLighting = Boolean(body.removeLighting);
    const ultraMesh =
      body.meshQuality === 'ULTRA' || body.ultraMesh === true;
    const aiComplete = body.aiComplete !== false;
    const generateInParts = Boolean(body.generateInParts || body.inParts);
    const privacy =
      body.privacy === 'PRIVATE' || body.isPublic === false
        ? 'PRIVATE'
        : 'PUBLIC';
    const category =
      body.category || inferCategoryFromPrompt(prompt, 'character');

    const costCalc = calculateGenerationCreditCost({
      generationMode,
      aiModel,
      generateInParts,
      textureQuality,
      userTrials: {
        smartMeshTrials: user.smartMeshTrials,
        partGenTrials: user.partGenTrials,
        texture8kTrials: user.texture8kTrials,
      },
    });

    if (user.credits < costCalc.creditCost) {
      return NextResponse.json(
        {
          ok: false,
          code: 'INSUFFICIENT_CREDITS',
          error: `Insufficient credits (${user.credits} available, ${costCalc.creditCost} required).`,
        },
        { status: 402 }
      );
    }

    const { meshData, vertices, faces } = synthesizeProceduralMesh({
      prompt,
      category,
      generationMode,
      topology,
      targetPolycount,
      textureQuality,
      hasPbr,
      isSegmented: generateInParts,
      isRigged: false,
    });

    const modelName =
      String(body.name || '').trim() ||
      prompt
        .split(/\s+/)
        .slice(0, 5)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          credits: { decrement: costCalc.creditCost },
          smartMeshTrials: costCalc.usedSmartMeshTrial
            ? { decrement: 1 }
            : undefined,
          partGenTrials: costCalc.usedPartGenTrial
            ? { decrement: 1 }
            : undefined,
          texture8kTrials: costCalc.usedTexture8kTrial
            ? { decrement: 1 }
            : undefined,
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          delta: -costCalc.creditCost,
          balanceAfter: updatedUser.credits,
          reason:
            generationMode === 'SMART_MESH'
              ? 'SMART_MESH_GENERATION'
              : 'HD_MODEL_GENERATION',
          metadataJson: JSON.stringify({
            aiModel,
            topology,
            targetPolycount,
            usedSmartMeshTrial: costCalc.usedSmartMeshTrial,
            usedPartGenTrial: costCalc.usedPartGenTrial,
            usedTexture8kTrial: costCalc.usedTexture8kTrial,
          }),
        },
      });

      const asset = await tx.asset3D.create({
        data: {
          ownerId: user.id,
          ownerName: user.name || user.email.split('@')[0],
          name: modelName,
          prompt,
          category,
          generationMode,
          inputMode,
          aiModel,
          topology,
          vertices,
          faces,
          targetPolycount,
          hasTexture,
          textureQuality,
          hasPbr,
          removeLighting,
          ultraMesh,
          aiComplete,
          hasSmartUv: generationMode === 'SMART_MESH',
          isSegmented: generateInParts,
          isRigged: false,
          privacy,
          meshDataJson: JSON.stringify(meshData),
        },
      });

      return { asset, updatedUser };
    });

    await writeAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'MODEL_GENERATED',
      targetType: 'ASSET_3D',
      targetId: result.asset.id,
      details: {
        name: result.asset.name,
        generationMode,
        aiModel,
        topology,
        faces,
        creditCost: costCalc.creditCost,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        asset: {
          ...result.asset,
          aiModelVersion: result.asset.aiModel,
          inputType: result.asset.inputMode,
          pbrEnabled: result.asset.hasPbr,
          uvUnwrapped: result.asset.hasSmartUv,
          geometryJson: result.asset.meshDataJson,
          meshData,
        },
        creditCost: costCalc.creditCost,
        remainingCredits: result.updatedUser.credits,
        creditsBalance: result.updatedUser.credits,
        smartMeshTrials: result.updatedUser.smartMeshTrials,
        trials: {
          smartMeshTrials: result.updatedUser.smartMeshTrials,
          partGenTrials: result.updatedUser.partGenTrials,
          texture8kTrials: result.updatedUser.texture8kTrials,
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
      { ok: false, error: '3D model generation failed.' },
      { status: 500 }
    );
  }
}
