import { bootstrapAdmin, createInvitation } from '../src/lib/account-admission';

async function main() {
  const args = process.argv.slice(2);
  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    if (idx >= 0 && args[idx + 1]) return args[idx + 1];
    const inline = args.find((a) => a.startsWith(`${flag}=`));
    if (inline) return inline.slice(flag.length + 1);
    return undefined;
  };

  if (args.includes('--create-invite')) {
    const role = getArg('--role') || 'Creator';
    const emailHint = getArg('--email') || null;
    const customCode = getArg('--code') || null;
    const maxUses = Number(getArg('--max-uses') || 1);
    const expiresInDays = Number(getArg('--days') || 7);

    const { invitation, code } = await createInvitation({
      role,
      emailHint,
      customCode,
      maxUses,
      expiresInDays,
      createdByEmail: 'cli-bootstrap',
    });

    console.log(
      JSON.stringify(
        {
          action: 'invitation_created',
          code,
          role: invitation.role,
          maxUses: invitation.maxUses,
          expiresAt: invitation.expiresAt.toISOString(),
        },
        null,
        2
      )
    );
    return;
  }

  const email = getArg('--email') || process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = getArg('--password') || process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = getArg('--name') || process.env.BOOTSTRAP_ADMIN_NAME || 'Tripo Admin';

  if (!email || !password) {
    console.error(
      'Usage:\n' +
        '  npm run bootstrap:admin -- --email <admin@domain.com> --password <password> [--name "Name"]\n' +
        '  npm run bootstrap:admin -- --create-invite [--role Admin|Creator|Viewer] [--code TRIPO-XXXX-XXXX]'
    );
    process.exit(1);
  }

  const result = await bootstrapAdmin({ email, password, name });
  console.log(
    JSON.stringify(
      {
        action: result.created ? 'admin_created' : 'admin_updated',
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error('Bootstrap error:', err);
  process.exit(1);
});
