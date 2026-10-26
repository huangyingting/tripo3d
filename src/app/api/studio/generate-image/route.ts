import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { AccountAdmissionError, requireCreator } from '@/lib/account-admission';
import { generatePre3DImageSvgDataUri } from '@/lib/engine3d';

export async function POST(req: NextRequest) {
  try {
    const user = await requireCreator();
    const body = await req.json();
    const prompt = String(body.prompt || '').trim();
    if (!prompt) {
      return NextResponse.json(
        { ok: false, code: 'PROMPT_REQUIRED', error: 'Please enter a prompt to generate an image.' },
        { status: 400 }
      );
    }
    if (prompt.length > 10000) {
      return NextResponse.json(
        { ok: false, code: 'PROMPT_TOO_LONG', error: 'Prompt must be 10,000 characters or fewer.' },
        { status: 400 }
      );
    }

    const template = String(body.template || 'T Pose');
    const modelName = String(body.modelName || 'GPT Image 2.5');
    const aspectRatio = String(body.aspectRatio || '1:1');
    const resolution4k = Boolean(body.resolution4k);
    const count = Math.max(1, Math.min(4, Number(body.count || 1)));
    const creditCost = 40;

    if (user.credits < creditCost) {
      return NextResponse.json(
        {
          ok: false,
          code: 'INSUFFICIENT_CREDITS',
          error: `Insufficient credits (${user.credits} available, ${creditCost} required).`,
        },
        { status: 402 }
      );
    }

    const createdImages = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { credits: { decrement: creditCost } },
      });

      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          delta: -creditCost,
          balanceAfter: updatedUser.credits,
          reason: 'PRE3D_IMAGE_GENERATION',
          metadataJson: JSON.stringify({ prompt, template, modelName, count }),
        },
      });

      const imgs = [];
      for (let i = 0; i < count; i++) {
        const svgDataUri = generatePre3DImageSvgDataUri({
          prompt: count > 1 ? `${prompt} (#${i + 1})` : prompt,
          template,
          modelName,
          aspectRatio,
          resolution4k,
        });
        const img = await tx.pre3DImage.create({
          data: {
            ownerId: user.id,
            prompt,
            template,
            modelName,
            aspectRatio,
            resolution4k,
            svgDataUri,
          },
        });
        imgs.push(img);
      }
      return { imgs, remainingCredits: updatedUser.credits };
    });

    await writeAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'PRE3D_IMAGE_GENERATED',
      targetType: 'PRE3D_IMAGE',
      targetId: createdImages.imgs[0]?.id,
      details: { prompt, template, modelName, creditCost, count },
    });

    return NextResponse.json({
      ok: true,
      images: createdImages.imgs,
      creditCost,
      remainingCredits: createdImages.remainingCredits,
    });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: 'Image generation failed.' },
      { status: 500 }
    );
  }
}
