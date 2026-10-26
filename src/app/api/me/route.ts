import { NextResponse } from 'next/server';
import { getCurrentViewer } from '@/lib/account-admission';

export async function GET() {
  const user = await getCurrentViewer();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  let dccConnections: Record<string, boolean> = {};
  try {
    dccConnections = JSON.parse(user.dccConnectionsJson || '{}');
  } catch {
    dccConnections = {};
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.toUpperCase(),
      rawRole: user.role,
      status: user.status,
      level: user.level,
      plan: user.plan,
      planTier: user.plan,
      credits: user.credits,
      creditsBalance: user.credits,
      smartMeshTrials: user.smartMeshTrials,
      partGenTrials: user.partGenTrials,
      texture8kTrials: user.texture8kTrials,
      onboardingCompleted: user.onboardingCompleted,
      onboardingCategory: user.onboardingCategory,
      primaryUseCase: user.onboardingCategory,
      onboardingSubCategory: user.onboardingSubCategory,
      subCategory: user.onboardingSubCategory,
      dccConnections,
    },
  });
}
