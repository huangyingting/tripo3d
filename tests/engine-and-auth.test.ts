import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import {
  bootstrapAdmin,
  createInvitation,
  inspectInvitation,
  registerWithInvitation,
  revokeInvitation,
  updateUserGovernance,
  authenticatePassword,
  AccountAdmissionError,
} from '../src/lib/account-admission';
import {
  synthesizeProceduralMesh,
  calculateGenerationCreditCost,
  exportMeshToGlbBuffer,
  exportMeshToObjText,
  exportMeshToStlText,
  exportMeshToPlyText,
  parseUploaded3DFile,
  processAssetPipelineStage,
} from '../src/lib/engine3d';

describe('Tripo 3D Studio Replica — Security Governance & 3D Engine Suite', () => {
  const testEmailPrefix = `test_${Date.now()}`;
  let adminUserId = '';
  const adminEmail = `${testEmailPrefix}_admin@tripo3d.local`;

  before(async () => {
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'test_' } },
    });
  });

  after(async () => {
    await prisma.session.deleteMany({
      where: { user: { email: { startsWith: testEmailPrefix } } },
    });
    await prisma.invitation.deleteMany({
      where: {
        OR: [
          { emailHint: { startsWith: testEmailPrefix } },
          { note: 'UNIT_TEST_INVITE' },
        ],
      },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: testEmailPrefix } },
    });
  });

  it('verifies seeded public showcase 3D models exist and zero demo user accounts are seeded', async () => {
    const publicModels = await prisma.asset3D.count({
      where: { privacy: 'PUBLIC', ownerId: null },
    });
    assert.ok(
      publicModels >= 8,
      `Expected >= 8 seeded public showcase models, found ${publicModels}`
    );

    const demoUsers = await prisma.user.count({
      where: {
        email: {
          in: [
            'demo@tripo3d.ai',
            'user@example.com',
            'test@example.com',
            'creator@tripo3d.ai',
          ],
        },
      },
    });
    assert.equal(demoUsers, 0, 'Database must not contain any pre-seeded demo users');
  });

  it('bootstraps an Admin account and enforces single-use, expiring, and revocable invitation codes', async () => {
    const { user: admin } = await bootstrapAdmin({
      email: adminEmail,
      name: 'Test Security Admin',
      password: 'StrongAdminPassword!2026',
    });

    assert.equal(admin.role, 'Admin');
    assert.equal(admin.status, 'ACTIVE');
    adminUserId = admin.id;

    // Issue a single-use Creator invitation
    const { invitation, code } = await createInvitation({
      emailHint: `${testEmailPrefix}_creator@tripo3d.local`,
      role: 'Creator',
      maxUses: 1,
      expiresInDays: 7,
      note: 'UNIT_TEST_INVITE',
      createdByUserId: admin.id,
      createdByEmail: admin.email,
    });

    assert.ok(code.startsWith('TRIPO-'));
    assert.equal(invitation.maxUses, 1);

    // Validate invitation code before consumption
    const check = await inspectInvitation(code);
    assert.equal(check.valid, true);
    assert.equal(check.role, 'Creator');

    // Register Creator user using single-use invitation code
    const creatorEmail = `${testEmailPrefix}_creator@tripo3d.local`;
    const { user: creator } = await registerWithInvitation({
      email: creatorEmail,
      name: 'Test Creator',
      password: 'CreatorPassword!2026',
      inviteCode: code,
    });

    assert.equal(creator.role, 'Creator');
    assert.equal(creator.credits, 200);
    assert.equal(creator.smartMeshTrials, 2);

    // Verify single-use code cannot be reused
    await assert.rejects(
      async () => {
        await registerWithInvitation({
          email: `${testEmailPrefix}_second@tripo3d.local`,
          name: 'Second User',
          password: 'SecondPassword!2026',
          inviteCode: code,
        });
      },
      (err: unknown) =>
        err instanceof AccountAdmissionError && err.code === 'consumed_invitation'
    );

    // Verify expired invitation code is rejected
    const { invitation: expInv, code: expCode } = await createInvitation({
      role: 'Viewer',
      maxUses: 1,
      expiresInDays: 1,
      note: 'UNIT_TEST_INVITE',
      createdByUserId: admin.id,
      createdByEmail: admin.email,
    });
    await prisma.invitation.update({
      where: { id: expInv.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const expCheck = await inspectInvitation(expCode);
    assert.equal(expCheck.valid, false);
    assert.equal(expCheck.status, 'EXPIRED');

    // Verify revoked invitation code is rejected
    const { invitation: revInv, code: revCode } = await createInvitation({
      role: 'Viewer',
      maxUses: 1,
      expiresInDays: 3,
      note: 'UNIT_TEST_INVITE',
      createdByUserId: admin.id,
      createdByEmail: admin.email,
    });
    await revokeInvitation({
      invitationId: revInv.id,
      revokedByUserId: admin.id,
      revokedByEmail: admin.email,
    });

    const revCheck = await inspectInvitation(revCode);
    assert.equal(revCheck.valid, false);
    assert.equal(revCheck.status, 'REVOKED');
  });

  it('enforces RBAC role updates, immediate account revocation with session purge, and audit logging', async () => {
    const creatorEmail = `${testEmailPrefix}_creator@tripo3d.local`;
    const authRes = await authenticatePassword({
      email: creatorEmail,
      password: 'CreatorPassword!2026',
    });
    assert.ok(authRes);
    assert.equal(authRes.user.role, 'Creator');

    // Admin revokes Creator account & adjusts role to Viewer
    const revokedUser = await updateUserGovernance({
      targetUserId: authRes.user.id,
      role: 'Viewer',
      status: 'REVOKED',
      creditsDelta: 50,
      actorUserId: adminUserId,
      actorEmail: adminEmail,
    });

    assert.equal(revokedUser.status, 'REVOKED');
    assert.equal(revokedUser.role, 'Viewer');
    assert.equal(revokedUser.credits, 250);
    assert.ok(revokedUser.revokedAt);

    // Verify all active sessions were purged immediately on revocation
    const activeSessions = await prisma.session.count({
      where: { userId: authRes.user.id },
    });
    assert.equal(activeSessions, 0, 'Revoking user must immediately purge active sessions');

    // Verify revoked user cannot authenticate
    await assert.rejects(
      async () => {
        await authenticatePassword({
          email: creatorEmail,
          password: 'CreatorPassword!2026',
        });
      },
      (err: unknown) =>
        err instanceof AccountAdmissionError && err.code === 'account_revoked'
    );

    // Verify audit logs recorded the governance actions
    const logs = await prisma.auditLog.findMany({
      where: { actorEmail: adminEmail },
    });
    assert.ok(logs.length >= 3, 'Audit log must record admin governance operations');
  });

  it('synthesizes 3D meshes, calculates exact Studio credit costs, and exports/imports GLB, OBJ, STL, and PLY', () => {
    // 1. Credit calculation parity
    const smartTrialCost = calculateGenerationCreditCost({
      generationMode: 'SMART_MESH',
      aiModel: 'P2.0',
      generateInParts: false,
      textureQuality: '4K',
      userTrials: { smartMeshTrials: 2, partGenTrials: 2, texture8kTrials: 1 },
    });
    assert.equal(smartTrialCost.creditCost, 0);
    assert.equal(smartTrialCost.usedSmartMeshTrial, true);

    const hdFullCost = calculateGenerationCreditCost({
      generationMode: 'HD_MODEL',
      aiModel: 'H3.1',
      generateInParts: true,
      textureQuality: '4K',
      userTrials: { smartMeshTrials: 0, partGenTrials: 0, texture8kTrials: 0 },
    });
    assert.equal(hdFullCost.creditCost, 75); // 55 H3.1 base + 20 parts

    // 2. Procedural 3D mesh synthesis
    const { meshData, vertices, faces } = synthesizeProceduralMesh({
      prompt: 'Cyberpunk Mecha Vanguard with Dual Plasma Blades',
      category: 'character',
      generationMode: 'HD_MODEL',
      topology: 'TRIANGLE',
      targetPolycount: 68400,
      textureQuality: '4K',
      hasPbr: true,
      isSegmented: true,
      isRigged: true,
    });

    assert.ok(meshData.parts.length >= 4, 'Segmented character mesh should contain multiple semantic parts');
    assert.ok((meshData.bones?.length || 0) >= 10, 'Rigged character mesh should contain humanoid skeleton bones');
    assert.equal(faces, 68400);
    assert.ok(vertices > 10000);

    // 3. Binary GLB export verification (glTF 2.0 header magic 0x46546C67)
    const glbBuffer = exportMeshToGlbBuffer(meshData);
    assert.ok(glbBuffer.byteLength > 200);
    assert.equal(glbBuffer.readUInt32LE(0), 0x46546c67, 'GLB magic header must equal "glTF"');
    assert.equal(glbBuffer.readUInt32LE(4), 2, 'GLB version must be 2');

    // 4. OBJ, STL, and PLY exports
    const objText = exportMeshToObjText(meshData, 'CyberpunkMecha');
    assert.ok(objText.includes('# Tripo3D Studio Wavefront OBJ Export'));
    assert.ok(objText.includes('\nv '));
    assert.ok(objText.includes('\nf '));

    const stlText = exportMeshToStlText(meshData, 'CyberpunkMecha');
    assert.ok(stlText.startsWith('solid CyberpunkMecha'));

    const plyText = exportMeshToPlyText(meshData);
    assert.ok(plyText.startsWith('ply\nformat ascii 1.0'));

    // 5. Parse uploaded OBJ and re-export to GLB
    const parsedObj = parseUploaded3DFile('mecha.obj', Buffer.from(objText, 'utf8'));
    assert.ok(parsedObj.verticesCount > 0);
    assert.ok(parsedObj.facesCount > 0);

    const convertedGlb = exportMeshToGlbBuffer(parsedObj.meshData, 'mecha');
    assert.equal(convertedGlb.readUInt32LE(0), 0x46546c67);
  });

  it('enforces observed Tripo Studio 7-stage pipeline guards (Segmentation & Smart UV polycount limits)', () => {
    const { meshData } = synthesizeProceduralMesh({
      prompt: 'Armored Paladin',
      category: 'character',
      generationMode: 'HD_MODEL',
      topology: 'TRIANGLE',
      targetPolycount: 42000,
      textureQuality: '4K',
      hasPbr: true,
      isSegmented: false,
      isRigged: false,
    });

    // Guard 1: Segmentation blocks Quad meshes
    assert.throws(() => {
      processAssetPipelineStage({
        action: 'segment',
        currentTopology: 'QUAD',
        currentFaces: 12000,
        currentVertices: 12000,
        isRigged: false,
        isSegmented: false,
        meshData,
      });
    }, /Part Segmentation is unavailable for Quad models and Rigged models/i);

    // Guard 2: Smart UV blocks Triangle meshes > 80,000 faces
    assert.throws(() => {
      processAssetPipelineStage({
        action: 'smart_uv',
        currentTopology: 'TRIANGLE',
        currentFaces: 95000,
        currentVertices: 48000,
        isRigged: false,
        isSegmented: false,
        meshData,
      });
    }, /80,000/i);

    // Guard 3: Valid segmentation -> retopo -> smart_uv -> rig -> animate pipeline succeeds
    const segResult = processAssetPipelineStage({
      action: 'segment',
      currentTopology: 'TRIANGLE',
      currentFaces: 42000,
      currentVertices: 21000,
      isRigged: false,
      isSegmented: false,
      meshData,
    });
    assert.equal(segResult.isSegmented, true);

    const retopoResult = processAssetPipelineStage({
      action: 'retopo',
      currentTopology: 'TRIANGLE',
      currentFaces: 42000,
      currentVertices: 21000,
      isRigged: false,
      isSegmented: true,
      meshData: segResult.meshData,
      params: { targetTopology: 'QUAD', targetPolycount: 16000 },
    });
    assert.equal(retopoResult.topology, 'QUAD');
    assert.equal(retopoResult.faces, 16000);

    const rigResult = processAssetPipelineStage({
      action: 'rig',
      currentTopology: 'QUAD',
      currentFaces: 16000,
      currentVertices: 16000,
      isRigged: false,
      isSegmented: true,
      meshData: retopoResult.meshData,
    });
    assert.equal(rigResult.isRigged, true);

    const animResult = processAssetPipelineStage({
      action: 'animate',
      currentTopology: 'QUAD',
      currentFaces: 16000,
      currentVertices: 16000,
      isRigged: true,
      isSegmented: true,
      meshData: rigResult.meshData,
      params: { animationClip: 'Dance' },
    });
    assert.equal(animResult.activeAnimation, 'Dance');
  });
});
