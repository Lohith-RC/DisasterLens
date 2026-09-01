import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  try {
    await db.sOS_Signal.deleteMany();
    await db.message.deleteMany();
    await db.user.deleteMany();

    const passwordHash = await bcrypt.hash('disaster123', 10);
    const usersData = [
      { name: 'Cmdr. Lohith', role: 'RESCUER', lat: 12.9716, lng: 77.5946 },
      { name: 'Cmdr. Rakshith', role: 'RESCUER', lat: 12.9716, lng: 77.5946 },
      { name: 'Chandana', role: 'VICTIM', lat: 12.9345, lng: 77.6265 },
      { name: 'Sindhu', role: 'VICTIM', lat: 12.9915, lng: 77.5925 },
      { name: 'Shalini', role: 'VICTIM', lat: 12.9141, lng: 77.5843 },
      { name: 'Keerthi', role: 'VICTIM', lat: 12.9354, lng: 77.5348 },
      { name: 'Madan', role: 'VICTIM', lat: 12.9784, lng: 77.6408 },
      { name: 'Meghana', role: 'VICTIM', lat: 12.9081, lng: 77.6476 },
      { name: 'Keertana', role: 'VICTIM', lat: 12.9850, lng: 77.5539 },
      { name: 'Maanya', role: 'VICTIM', lat: 13.0279, lng: 77.5409 },
    ];

    for (const u of usersData) {
      await db.user.create({
        data: {
          name: u.name,
          role: u.role,
          password: passwordHash,
          location_lat: u.lat,
          location_lng: u.lng,
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Seeded Indian User/Rescuer Data Successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to seed db' }, { status: 500 });
  }
}
