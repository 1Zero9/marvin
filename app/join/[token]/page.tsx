import JoinForm from "@/components/JoinForm";
import { prisma } from "@/lib/prisma";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await prisma.invite.findUnique({ where: { token }, select: { email: true } });
  return <JoinForm token={token} invitedEmail={invite?.email} />;
}
