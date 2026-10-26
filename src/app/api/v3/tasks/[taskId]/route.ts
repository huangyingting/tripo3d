import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await context.params;
  const task = await prisma.apiTask.findUnique({ where: { id: taskId } });
  if (!task) {
    return NextResponse.json(
      { code: 2004, message: 'Task not found.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    code: 0,
    data: {
      task_id: task.id,
      type: task.type,
      status: task.status,
      progress: task.progress,
      input: JSON.parse(task.inputJson || '{}'),
      output: task.outputAssetId
        ? {
            model: `/api/studio/assets/${task.outputAssetId}/export?format=glb`,
            pbr_model: `/api/studio/assets/${task.outputAssetId}/export?format=glb`,
            obj_model: `/api/studio/assets/${task.outputAssetId}/export?format=obj`,
            stl_model: `/api/studio/assets/${task.outputAssetId}/export?format=stl`,
            asset_id: task.outputAssetId,
          }
        : null,
      create_time: Math.floor(task.createdAt.getTime() / 1000),
    },
  });
}
