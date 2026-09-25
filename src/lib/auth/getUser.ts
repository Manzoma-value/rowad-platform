import { prisma } from "../prisma";
import { getVerifiedUser } from "./verified-user";

export async function getCurrentUserProfile() {
  const user = await getVerifiedUser();

  if (!user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  return profile;
}
