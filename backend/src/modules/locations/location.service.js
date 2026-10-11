import prisma from '../../lib/prisma.js';

export async function createLocation({ name, latitude, longitude, altitude }) {
  return prisma.location.create({
    data: { name, latitude, longitude, altitude },
  });
}

export async function listLocations({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.location.findMany({ skip, take: limit, orderBy: { id: 'asc' } }),
    prisma.location.count(),
  ]);

  return { data, total, page, limit };
}
